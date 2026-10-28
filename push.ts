import webpush from "web-push";
import { prisma } from "@/lib/prisma";
import { formatBRL } from "@/lib/utils";

/**
 * Notificação push de venda no celular do admin (app instalado na Tela de
 * Início do iPhone / Android).
 *
 * Chaves VAPID (geradas uma vez com `npx web-push generate-vapid-keys`):
 *   VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT (mailto:…)
 * Sem as chaves, nada é enviado (e nada quebra).
 */

let configured: boolean | null = null;

function ensureConfigured(): boolean {
  if (configured !== null) return configured;
  const pub = process.env.VAPID_PUBLIC_KEY;
  const priv = process.env.VAPID_PRIVATE_KEY;
  if (!pub || !priv) return (configured = false);
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT || "mailto:admin@example.com",
    pub,
    priv
  );
  return (configured = true);
}

export function pushPublicKey(): string | null {
  return process.env.VAPID_PUBLIC_KEY || null;
}

export type PushPayload = {
  title: string;
  body: string;
  url?: string;
  tag?: string;
};

/** Manda pra todos os aparelhos cadastrados. Remove os que expiraram. */
export async function sendPushToAll(payload: PushPayload): Promise<number> {
  if (!ensureConfigured()) return 0;
  const subs = await prisma.pushSubscription.findMany();
  let sent = 0;
  await Promise.all(
    subs.map(async (s) => {
      try {
        await webpush.sendNotification(
          { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
          JSON.stringify(payload),
          { TTL: 60 * 60 * 24, urgency: "high" }
        );
        sent++;
      } catch (err) {
        const status = (err as { statusCode?: number }).statusCode;
        if (status === 404 || status === 410) {
          // aparelho desinstalou o app / revogou a permissão
          await prisma.pushSubscription
            .delete({ where: { id: s.id } })
            .catch(() => {});
        } else {
          console.error("[push] falha ao enviar", { status, endpoint: s.endpoint.slice(0, 60) });
        }
      }
    })
  );
  return sent;
}

/** "💰 Venda aprovada! R$ 1.997,00" — chamado na transição pra pago. */
export async function notifySale(order: {
  id: string;
  totalCents: number;
  customerName: string;
  paymentMethod: string;
  cardCount: number;
  pixAmountCents: number | null;
  product: { name: string };
}): Promise<void> {
  const how =
    order.paymentMethod === "pix"
      ? "Pix"
      : order.pixAmountCents
        ? "Cartão + Pix"
        : order.cardCount > 1
          ? "2 cartões"
          : "Cartão";
  const firstName = order.customerName.trim().split(/\s+/)[0] ?? "";
  await sendPushToAll({
    title: `💰 Venda aprovada! ${formatBRL(order.totalCents)}`,
    body: `${order.product.name} · ${firstName} · ${how}`,
    url: `/admin/vendas/${order.id}`,
    tag: `venda-${order.id}`,
  });
}
