import { revalidateTag } from "next/cache";
import { after } from "next/server";
import { prisma } from "@/lib/prisma";
import { pagarme, type PagarmeOrder } from "@/lib/pagarme";
import {
  deliverWebhooks,
  enqueueOrderWebhooks,
  ensureOrderWebhooks,
  eventForOrderStatus,
} from "@/lib/webhooks";
import { notifySale } from "@/lib/push";
import { sendAccessEmail } from "@/lib/access-email";

/**
 * Fonte única de "qual é o status deste pedido" a partir da Pagar.me.
 *
 * Checkout, polling da página de obrigado, webhook e o botão de sincronizar do
 * admin passam todos por aqui — antes cada um tinha o seu `mapStatus` e eles
 * discordavam (ex.: `charge.paid` marcava pago sem olhar o pedido).
 *
 * Regras:
 *  - O status vem das COBRANÇAS, não do evento: numa compra em 2 cartões o
 *    `charge.paid` do 1º cartão chega mesmo que o 2º seja recusado.
 *  - Compra em 2 cartões com um aprovado e outro recusado → estorna o aprovado
 *    na hora (o cliente não pode ficar cobrado pela metade sem o produto).
 *  - Pedido pago nunca volta pra recusado (evento de falha atrasado).
 *  - Reembolsado é final.
 *  - A transição é gravada com `updateMany ... where status = anterior`: se o
 *    webhook e o polling chegarem juntos, só um vence e só um dispara o
 *    webhook externo (compra_aprovada 1x).
 *  - As entregas dos webhooks externos são gravadas na MESMA transação da
 *    transição: ou a venda vira paga com as entregas na fila, ou nada muda e
 *    quem chamou recebe o erro (o webhook da Pagar.me responde 500 e ela
 *    reenvia). O envio em si roda depois da resposta (`after`) e, se falhar,
 *    o cron reenvia.
 */

export type LocalStatus = "pending" | "paid" | "refused" | "cancelled" | "refunded";

const PAID = new Set(["paid", "overpaid"]);

export function statusFromPagarme(pm: PagarmeOrder): LocalStatus {
  const charges = pm.charges ?? [];
  if (charges.length === 0) return mapOrderStatus(pm.status);

  const st = charges.map((c) => c.status);
  if (st.some((s) => s === "chargedback")) return "refunded";
  if (st.every((s) => PAID.has(s))) return "paid";
  if (st.some((s) => s === "failed")) return "refused";
  if (st.every((s) => s === "canceled")) return "cancelled";
  if (st.some((s) => s === "pending" || s === "processing")) return "pending";
  return mapOrderStatus(pm.status);
}

function mapOrderStatus(s: string): LocalStatus {
  switch (s) {
    case "paid":
      return "paid";
    case "canceled":
    case "voided":
      return "cancelled";
    case "refunded":
      return "refunded";
    case "failed":
    case "refused":
      return "refused";
    default:
      return "pending";
  }
}

/** Qual status gravar, dado o atual e o que a Pagar.me diz agora. */
function nextStatus(current: string, incoming: LocalStatus): string | null {
  if (incoming === current) return null;
  if (current === "refunded") return null;
  if (current === "paid") {
    // pago → cancelado na Pagar.me = estornaram pelo painel
    if (incoming === "cancelled" || incoming === "refunded") return "refunded";
    return null; // falha atrasada / pending não rebaixa quem pagou
  }
  // nunca pagou: estorno/chargeback não vira "reembolsada" pro cliente
  if (incoming === "refunded") return current === "cancelled" ? null : "cancelled";
  return incoming;
}

/**
 * Pedido com mais de um pagamento (2 cartões ou Cartão + Pix): se alguma
 * cobrança falhou, cancela as outras — estorna o cartão aprovado e cancela o
 * Pix pendente. Também cobre o Pix que expirou sem pagamento no "Cartão +
 * Pix": o cartão já cobrado é estornado. Devolve quantas cancelou.
 */
export async function rollbackPartialCardPayment(pm: PagarmeOrder): Promise<number> {
  const charges = pm.charges ?? [];
  if (charges.length < 2) return 0;
  if (!charges.some((c) => c.status === "failed")) return 0;
  let n = 0;
  for (const c of charges) {
    if (c.status === "failed" || c.status === "canceled") continue;
    try {
      await pagarme.refundCharge(c.id);
      c.status = "canceled";
      n++;
    } catch (err) {
      // não derruba o fluxo: fica no log pra estornar pelo painel
      console.error("[order-sync] falha ao cancelar cobrança de pedido parcialmente recusado", {
        orderId: pm.id,
        chargeId: c.id,
        err,
      });
    }
  }
  return n;
}

/**
 * Estado da venda na Pagar.me. No "Cartão + Pix" são 2 pedidos lá (cartão e
 * Pix): junta as cobranças dos dois num pedido só, pra que status, estorno
 * e QR do Pix funcionem do mesmo jeito que nos outros casos.
 */
export async function loadPagarmeState(o: {
  pagarmeOrderId: string;
  pagarmePixOrderId?: string | null;
}): Promise<PagarmeOrder> {
  const main = await pagarme.getOrder(o.pagarmeOrderId);
  if (!o.pagarmePixOrderId) return main;
  const pix = await pagarme.getOrder(o.pagarmePixOrderId);
  return mergeOrders(main, pix);
}

export function mergeOrders(card: PagarmeOrder, pix: PagarmeOrder): PagarmeOrder {
  return { ...card, charges: [...(card.charges ?? []), ...(pix.charges ?? [])] };
}

/**
 * Envia as entregas logo depois da resposta. Na Vercel o `after` segura a
 * função viva até terminar (um `void` solto congelava junto com a função e
 * a entrega se perdia). Fora de uma request, envia na hora.
 */
export function deliverAfterResponse(ids: string[]) {
  if (!ids.length) return;
  try {
    after(() => deliverWebhooks(ids).then(() => undefined));
  } catch {
    void deliverWebhooks(ids);
  }
}

/**
 * Aplica o estado da Pagar.me no pedido local. Idempotente.
 * Devolve o status final gravado.
 *
 * `ensureWebhooks`: se a venda já está no status final (reaviso da Pagar.me,
 * botão sincronizar), confere se os webhooks externos foram entregues e
 * recria/reenvia os que não foram. Fica desligado no polling da página de
 * obrigado pra não consultar a fila a cada poucos segundos.
 */
export async function applyPagarmeOrder(
  orderId: string,
  pm: PagarmeOrder,
  { ensureWebhooks = false }: { ensureWebhooks?: boolean } = {}
): Promise<string> {
  await rollbackPartialCardPayment(pm);
  const incoming = statusFromPagarme(pm);

  const order = await prisma.order.findUnique({ where: { id: orderId } });
  if (!order) return incoming;

  const next = nextStatus(order.status, incoming);
  const chargeId = pm.charges?.[0]?.id ?? null;
  // QR do Pix: no "Cartão + Pix" a cobrança Pix não é a primeira
  const tx = (
    pm.charges?.find((c) => c.payment_method === "pix") ?? pm.charges?.[0]
  )?.last_transaction;

  // ids da Pagar.me (e QR do Pix) sempre que ainda não estiverem gravados
  const idsPatch = {
    ...(order.pagarmeOrderId ? {} : { pagarmeOrderId: pm.id }),
    ...(order.pagarmeChargeId || !chargeId ? {} : { pagarmeChargeId: chargeId }),
    ...(order.pixQrCode || !tx?.qr_code
      ? {}
      : {
          pixQrCode: tx.qr_code,
          pixQrCodeUrl: tx.qr_code_url ?? null,
          pixExpiresAt: tx.expires_at ? new Date(tx.expires_at) : null,
        }),
  };

  if (!next) {
    if (Object.keys(idsPatch).length) {
      await prisma.order.update({ where: { id: order.id }, data: idsPatch });
    }
    if (ensureWebhooks) deliverAfterResponse(await ensureOrderWebhooks(order.id));
    return order.status;
  }

  const event = eventForOrderStatus(next);
  const { won, deliveryIds } = await prisma.$transaction(
    async (tx) => {
      const won = await tx.order.updateMany({
        where: { id: order.id, status: order.status },
        data: {
          ...idsPatch,
          status: next,
          ...(next === "paid" && !order.paidAt ? { paidAt: new Date() } : {}),
        },
      });
      const deliveryIds =
        won.count === 1 && event ? await enqueueOrderWebhooks(tx, order.id, event) : [];
      return { won: won.count === 1, deliveryIds };
    },
    // banco em outra região: algumas idas e voltas de ~70ms cada
    { timeout: 15_000, maxWait: 10_000 }
  );
  if (!won) {
    // outro caminho (webhook × polling) gravou primeiro — ele dispara o evento
    const fresh = await prisma.order.findUnique({
      where: { id: order.id },
      select: { status: true },
    });
    return fresh?.status ?? next;
  }
  revalidateTag("orders");
  deliverAfterResponse(deliveryIds);

  // e-mail de acesso pro comprador + push no celular do admin, só na venda
  // aprovada; a trava acima (updateMany) garante 1x por venda. Aguardado (e
  // não `void`): na Vercel a função pode congelar logo após a resposta.
  if (next === "paid") {
    const updated = await prisma.order.findUnique({
      where: { id: order.id },
      include: { product: true },
    });
    if (updated) {
      await Promise.all([
        sendAccessEmail(updated).catch((err) =>
          console.error("[email] sendAccessEmail", { orderId: updated.id, err })
        ),
        notifySale(updated).catch((err) => console.error("[push] notifySale", err)),
      ]);
    }
  }
  return next;
}
