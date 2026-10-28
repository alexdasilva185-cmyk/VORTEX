import crypto from "crypto";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import type { WebhookEvent } from "@/lib/webhook-events";

export type { WebhookEvent } from "@/lib/webhook-events";
export { WEBHOOK_EVENTS } from "@/lib/webhook-events";

/**
 * Webhooks de saída — eventos com os nomes comuns no mercado de infoprodutos
 * (compra_aprovada, pix_gerado…), com a opção de escolher vários produtos
 * por webhook. Formato do payload documentado em /admin/webhooks/docs.
 */

// ─── Construção do payload ──────────────────────────────────────────────────

type OrderForPayload = {
  id: string;
  productId: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  customerDocument: string;
  paymentMethod: string;
  status: string;
  totalCents: number;
  bumpsTotalCents: number;
  bumpsJson: string | null;
  pagarmeOrderId: string | null;
  createdAt: Date;
  updatedAt: Date;
  paidAt: Date | null;
  refundedAt?: Date | null;
  cardLastDigits?: string | null;
  cardType?: string | null;
  installments?: number | null;
};

type ProductForPayload = {
  id: string;
  name: string;
};

type CoproducerForPayload = {
  pagarmeRecipientId: string;
  name: string;
  percentage: number; // basis points
};

export function buildOrderPayload({
  event,
  order,
  product,
  coproducers,
  token,
}: {
  event: WebhookEvent;
  order: OrderForPayload;
  product: ProductForPayload;
  coproducers: CoproducerForPayload[];
  token: string | null;
}) {
  const fullName = order.customerName;
  const [first, ...rest] = fullName.split(" ");
  const lastName = rest.join(" ");

  const phone = order.customerPhone || "";
  const mobile = phone.startsWith("+")
    ? phone
    : phone.length >= 10
      ? `+55${phone}`
      : phone;

  const bumps = order.bumpsJson
    ? (JSON.parse(order.bumpsJson) as Array<{
        productId: string;
        name: string;
        priceCents: number;
      }>)
    : [];

  // splits → commissioned_stores (quanto cada um recebe)
  const totalSplitBps = coproducers.reduce((s, c) => s + c.percentage, 0);
  const producerBps = 10000 - totalSplitBps;

  const commissioned = [
    {
      id: "producer",
      type: "producer" as const,
      custom_name: "Produtor principal",
      email: null as string | null,
      value: Math.round((order.totalCents * producerBps) / 10000),
    },
    ...coproducers.map((c) => ({
      id: c.pagarmeRecipientId,
      type: "coproducer" as const,
      custom_name: c.name,
      email: null as string | null,
      value: Math.round((order.totalCents * c.percentage) / 10000),
    })),
  ];

  const myCommission = commissioned[0]?.value ?? order.totalCents;

  return {
    webhook_event_type: event,
    order_id: order.id,
    order_ref: order.id.slice(0, 7).toUpperCase(),
    order_status: mapOrderStatusForPayload(order.status),
    payment_method: order.paymentMethod, // "credit_card" | "pix" | "boleto"
    store_id: process.env.STORE_ID ?? "default",
    sale_type: "producer",
    created_at: order.createdAt.toISOString(),
    updated_at: order.updatedAt.toISOString(),
    approved_date: order.paidAt?.toISOString() ?? null,
    refunded_at: order.refundedAt?.toISOString() ?? null,
    card_type: order.cardType ?? null,
    card_last4digits: order.cardLastDigits ?? null,
    installments: order.installments ?? null,
    Customer: {
      first_name: first ?? "",
      last_name: lastName ?? "",
      full_name: fullName,
      email: order.customerEmail,
      mobile,
      CPF: order.customerDocument,
      ip: null,
    },
    Product: {
      product_id: product.id,
      product_name: product.name,
    },
    Commissions: {
      charge_amount: order.totalCents,
      product_base_price: order.totalCents - order.bumpsTotalCents,
      platform_fee: 0,
      commissioned_stores: commissioned,
      my_commission: myCommission,
      currency: "BRL",
    },
    // order bumps comprados na mesma venda (pra quem integra saber
    // quais produtos extras liberar)
    OrderBumps: bumps.map((b) => ({
      product_id: b.productId,
      product_name: b.name,
      price: b.priceCents,
    })),
    Subscription: null,
    TrackingParameters: {
      sck: null,
      src: null,
      utm_campaign: null,
      utm_content: null,
      utm_medium: null,
      utm_source: null,
      utm_term: null,
      s1: null,
      s2: null,
      s3: null,
    },
    access_token: token,
  };
}

function mapOrderStatusForPayload(status: string): string {
  switch (status) {
    case "paid":
      return "paid";
    case "pending":
      return "waiting_payment";
    case "refused":
      return "refused";
    case "refunded":
      return "refunded";
    case "cancelled":
      return "canceled";
    default:
      return status;
  }
}

// ─── Fila de entregas ────────────────────────────────────────────────────────
//
// Toda entrega vira uma linha `WebhookDelivery` ANTES de qualquer envio — de
// preferência na mesma transação que muda o status da venda. Assim nenhum
// evento se perde se a função morrer, o banco cair ou o destino estiver fora:
//  1. `enqueueWebhooks` grava as entregas pendentes (status "pending");
//  2. `deliverWebhooks` tenta na hora (aguardado ou via `after()`);
//  3. o cron `/api/cron/webhooks` reenvia as que falharam, com backoff.
// Payload, eventos e assinatura são os mesmos em todo envio e reenvio.

type Db = Prisma.TransactionClient | typeof prisma;

/** Espera depois da N-ésima tentativa falha, em minutos (10 tentativas, ~2 dias). */
const BACKOFF_MINUTES = [1, 5, 15, 60, 120, 240, 480, 720, 1440];
export const MAX_ATTEMPTS = BACKOFF_MINUTES.length + 1;
/** Trava enquanto uma tentativa está em andamento (evita envio duplo cron × imediato). */
const LEASE_MS = 2 * 60_000;
const TIMEOUT_MS = 10_000;

/** Evento que corresponde ao status atual da venda (reenvio/reaviso). */
export function eventForOrderStatus(
  status: string,
  paymentMethod?: string
): WebhookEvent | null {
  switch (status) {
    case "paid":
      return "compra_aprovada";
    case "refused":
      return "compra_recusada";
    case "refunded":
      return "compra_reembolsada";
    case "pending":
      return paymentMethod === "pix" ? "pix_gerado" : null;
    default:
      return null;
  }
}

/** Webhooks ativos que recebem `event` para `productId` ([] = todos os produtos). */
async function matchingWebhooks(db: Db, event: WebhookEvent, productId: string) {
  const webhooks = await db.outgoingWebhook.findMany({ where: { active: true } });
  return webhooks.filter((w) => {
    const ids = JSON.parse(w.productIds || "[]") as string[];
    if (ids.length && !ids.includes(productId)) return false;
    return (JSON.parse(w.events) as string[]).includes(event);
  });
}

/**
 * Grava uma entrega pendente por webhook interessado. Passe o `tx` da
 * transação que muda o status da venda: ou grava tudo, ou nada.
 * Devolve os ids pra `deliverWebhooks`.
 */
export async function enqueueWebhooks(
  db: Db,
  {
    event,
    productId,
    orderId,
    payload,
    onlyWebhookIds,
  }: {
    event: WebhookEvent;
    productId: string;
    orderId: string | null;
    payload: Record<string, unknown>;
    onlyWebhookIds?: string[];
  }
): Promise<string[]> {
  let webhooks = await matchingWebhooks(db, event, productId);
  if (onlyWebhookIds) webhooks = webhooks.filter((w) => onlyWebhookIds.includes(w.id));
  const now = new Date();
  const ids: string[] = [];
  // sequencial: dentro de transação interativa a conexão é uma só
  for (const w of webhooks) {
    const d = await db.webhookDelivery.create({
      data: {
        webhookId: w.id,
        orderId,
        event,
        payload: JSON.stringify({ ...payload, access_token: w.token }),
        status: "pending",
        nextAttemptAt: now,
      },
      select: { id: true },
    });
    ids.push(d.id);
  }
  return ids;
}

/** Payload da venda no estado atual. */
async function orderPayload(db: Db, orderId: string, event: WebhookEvent) {
  const order = await db.order.findUnique({
    where: { id: orderId },
    include: { product: { include: { coproducers: true } } },
  });
  if (!order) return null;
  const payload = buildOrderPayload({
    event,
    order,
    product: order.product,
    coproducers: order.product.coproducers,
    token: null,
  });
  return { order, payload };
}

/** Grava as entregas do evento de uma venda (lendo a venda pelo `db`). */
export async function enqueueOrderWebhooks(
  db: Db,
  orderId: string,
  event: WebhookEvent,
  onlyWebhookIds?: string[]
): Promise<string[]> {
  const built = await orderPayload(db, orderId, event);
  if (!built) return [];
  return enqueueWebhooks(db, {
    event,
    productId: built.order.productId,
    orderId,
    payload: built.payload,
    onlyWebhookIds,
  });
}

/** Entregas de uma venda, incluindo as antigas (sem orderId, só no payload). */
export function orderDeliveriesWhere(orderId: string): Prisma.WebhookDeliveryWhereInput {
  return {
    OR: [
      { orderId },
      { orderId: null, payload: { contains: `"order_id":"${orderId}"` } },
    ],
  };
}

/**
 * Reaviso da Pagar.me de uma venda que já está no status final: garante que
 * cada webhook interessado tenha uma entrega bem-sucedida ou na fila. Os que
 * não têm (ex.: o envio se perdeu, ou desistiu após as tentativas) ganham uma
 * entrega nova; as pendentes já vencidas são devolvidas pra tentar agora.
 */
export async function ensureOrderWebhooks(orderId: string): Promise<string[]> {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: { status: true, paymentMethod: true, productId: true },
  });
  if (!order) return [];
  const event = eventForOrderStatus(order.status);
  if (!event) return [];

  const webhooks = await matchingWebhooks(prisma, event, order.productId);
  if (!webhooks.length) return [];
  const existing = await prisma.webhookDelivery.findMany({
    where: { event, ...orderDeliveriesWhere(orderId) },
    select: { id: true, webhookId: true, success: true, status: true, nextAttemptAt: true },
  });

  const now = Date.now();
  const due: string[] = [];
  const missing: string[] = [];
  for (const w of webhooks) {
    const mine = existing.filter((d) => d.webhookId === w.id);
    if (mine.some((d) => d.success)) continue;
    const pending = mine.filter((d) => d.status === "pending" && d.nextAttemptAt);
    if (pending.length) {
      due.push(...pending.filter((d) => d.nextAttemptAt!.getTime() <= now).map((d) => d.id));
      continue;
    }
    missing.push(w.id);
  }
  if (missing.length) {
    console.warn("[webhooks] venda sem entrega bem-sucedida — recriando", {
      orderId,
      event,
      webhookIds: missing,
    });
    due.push(...(await enqueueOrderWebhooks(prisma, orderId, event, missing)));
  }
  return due;
}

function sign(payload: string, secret: string): string {
  return crypto.createHmac("sha256", secret).update(payload).digest("hex");
}

export type DeliveryResult = {
  id: string;
  /** false = outra execução já estava tentando esta entrega */
  attempted: boolean;
  success?: boolean;
  status?: number | null;
  error?: string;
};

/**
 * Uma tentativa de entrega. Nunca lança: falha de rede/HTTP vai pro registro
 * e reagenda; falha de banco é logada e a entrega continua pendente (o cron
 * pega quando a trava expirar).
 */
async function attemptDelivery(id: string, retry: boolean): Promise<DeliveryResult> {
  try {
    // trava: só quem conseguir empurrar o nextAttemptAt tenta
    const now = new Date();
    const claimed = await prisma.webhookDelivery.updateMany({
      where: { id, status: "pending", nextAttemptAt: { lte: now } },
      data: { nextAttemptAt: new Date(now.getTime() + LEASE_MS) },
    });
    if (claimed.count === 0) return { id, attempted: false };

    const d = await prisma.webhookDelivery.findUnique({
      where: { id },
      include: { webhook: true },
    });
    if (!d) return { id, attempted: false };

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      "User-Agent": "Vortex-Webhook/1.0",
      "X-Webhook-Event": d.event,
    };
    if (d.webhook.secret) {
      headers["X-Webhook-Signature"] = sign(d.payload, d.webhook.secret);
    }

    let status: number | null = null;
    let responseBody = "";
    let success = false;
    const started = Date.now();
    try {
      const res = await fetch(d.webhook.url, {
        method: "POST",
        headers,
        body: d.payload,
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });
      status = res.status;
      responseBody = (await res.text()).slice(0, 2000);
      success = res.ok;
    } catch (err) {
      responseBody = err instanceof Error ? `${err.name}: ${err.message}` : String(err);
    }
    const durationMs = Date.now() - started;

    const number = d.attempts + 1;
    const giveUp = !success && (!retry || number >= MAX_ATTEMPTS);
    const finishedAt = new Date();
    await prisma.$transaction([
      prisma.webhookAttempt.create({
        data: { deliveryId: d.id, number, responseStatus: status, responseBody, durationMs },
      }),
      prisma.webhookDelivery.update({
        where: { id: d.id },
        data: {
          attempts: number,
          lastAttemptAt: finishedAt,
          responseStatus: status,
          responseBody,
          success,
          status: success ? "success" : giveUp ? "failed" : "pending",
          nextAttemptAt:
            success || giveUp
              ? null
              : new Date(finishedAt.getTime() + BACKOFF_MINUTES[number - 1] * 60_000),
        },
      }),
    ]);
    if (!success) {
      console.warn("[webhooks] entrega falhou", {
        deliveryId: d.id,
        webhookId: d.webhookId,
        orderId: d.orderId,
        event: d.event,
        attempt: number,
        status,
        error: status ? undefined : responseBody,
        giveUp,
      });
    }
    return { id, attempted: true, success, status, error: success ? undefined : responseBody };
  } catch (err) {
    console.error("[webhooks] erro ao registrar entrega", { deliveryId: id, err });
    return { id, attempted: false, error: err instanceof Error ? err.message : String(err) };
  }
}

/**
 * Tenta agora as entregas indicadas. Nunca lança (nenhuma rejeição solta).
 * `retry: false` = uma tentativa só (botão de teste do webhook).
 */
export async function deliverWebhooks(
  ids: string[],
  { retry = true }: { retry?: boolean } = {}
): Promise<DeliveryResult[]> {
  if (!ids.length) return [];
  const settled = await Promise.allSettled(ids.map((id) => attemptDelivery(id, retry)));
  return settled.map((r, i) =>
    r.status === "fulfilled"
      ? r.value
      : { id: ids[i], attempted: false, error: String(r.reason) }
  );
}

/**
 * Cron: tenta as entregas pendentes vencidas, em lotes, até o prazo.
 */
export async function deliverDueWebhooks({
  limit = 50,
  concurrency = 4,
  budgetMs = 45_000,
}: { limit?: number; concurrency?: number; budgetMs?: number } = {}) {
  const deadline = Date.now() + budgetMs;
  const due = await prisma.webhookDelivery.findMany({
    where: { status: "pending", nextAttemptAt: { lte: new Date() } },
    orderBy: { nextAttemptAt: "asc" },
    take: limit,
    select: { id: true },
  });
  const queue = due.map((d) => d.id);
  const results: DeliveryResult[] = [];
  async function worker() {
    while (queue.length && Date.now() < deadline) {
      const id = queue.shift()!;
      results.push(await attemptDelivery(id, true));
    }
  }
  await Promise.all(Array.from({ length: concurrency }, worker));
  return {
    due: due.length,
    attempted: results.filter((r) => r.attempted).length,
    delivered: results.filter((r) => r.success).length,
    failed: results.filter((r) => r.attempted && !r.success).length,
    left: queue.length,
  };
}
