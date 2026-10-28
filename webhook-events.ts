/**
 * Eventos de webhook (nomes comuns no mercado de infoprodutos).
 * Arquivo separado pra ser importável tanto em server quanto client components.
 */

export type WebhookEvent =
  | "compra_aprovada"
  | "compra_recusada"
  | "compra_reembolsada"
  | "pix_gerado"
  | "boleto_gerado"
  | "carrinho_abandonado"
  | "chargeback"
  | "subscription_canceled"
  | "subscription_late"
  | "subscription_renewed";

export const WEBHOOK_EVENTS: { id: WebhookEvent; label: string }[] = [
  { id: "compra_aprovada", label: "Compra aprovada" },
  { id: "compra_recusada", label: "Compra recusada" },
  { id: "compra_reembolsada", label: "Compra reembolsada" },
  { id: "pix_gerado", label: "Pix gerado" },
  { id: "boleto_gerado", label: "Boleto gerado" },
  { id: "carrinho_abandonado", label: "Carrinho abandonado" },
  { id: "chargeback", label: "Chargeback" },
  { id: "subscription_canceled", label: "Assinatura cancelada" },
  { id: "subscription_late", label: "Assinatura atrasada" },
  { id: "subscription_renewed", label: "Assinatura renovada" },
];
