import { sendEmail } from "@/lib/email";
import { formatBRL } from "@/lib/utils";

function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * E-mail de "compra aprovada" pro comprador, com o botão de acesso ao
 * produto (Product.accessUrl). Sem accessUrl, não envia nada.
 *
 * Chamado em applyPagarmeOrder na transição pra pago — a trava do
 * updateMany garante 1 e-mail por venda.
 */
export async function sendAccessEmail(order: {
  id: string;
  customerName: string;
  customerEmail: string;
  totalCents: number;
  product: { name: string; accessUrl: string | null };
}): Promise<void> {
  const url = order.product.accessUrl?.trim();
  if (!url) return;

  const firstName = order.customerName.trim().split(/\s+/)[0] || "";
  const product = order.product.name;
  const orderCode = order.id.slice(0, 8).toUpperCase();
  const button = `Acessar a ${product}`;

  await sendEmail({
    to: order.customerEmail,
    subject: `Compra aprovada! Acesse a ${product}`,
    text: [
      `Olá${firstName ? `, ${firstName}` : ""}!`,
      ``,
      `Seu pagamento foi aprovado e a sua compra da ${product} está confirmada.`,
      ``,
      `Acesse a plataforma por este link:`,
      url,
      ``,
      `Pedido #${orderCode} · ${formatBRL(order.totalCents)}`,
      ``,
      `Guarde este e-mail: é por ele que você volta pra plataforma.`,
    ].join("\n"),
    html: `<!doctype html>
<html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head><body style="margin:0;">
<div style="background:#f3f4f6;padding:32px 16px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <div style="max-width:520px;margin:0 auto;background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #e5e7eb;">
    <div style="background:#0a0a0a;padding:20px 28px;">
      <span style="color:#ffffff;font-size:18px;font-weight:700;letter-spacing:.2px;">${esc(product)}</span>
    </div>
    <div style="padding:28px;">
      <div style="display:inline-block;background:#dcfce7;color:#166534;font-size:13px;font-weight:600;padding:6px 12px;border-radius:999px;margin-bottom:16px;">
        ✓ Pagamento aprovado
      </div>
      <h1 style="margin:0 0 12px;font-size:22px;line-height:1.3;color:#111827;">
        ${firstName ? `${esc(firstName)}, sua` : "Sua"} compra está confirmada!
      </h1>
      <p style="margin:0 0 24px;font-size:15px;line-height:1.6;color:#374151;">
        Seu acesso à <strong>${esc(product)}</strong> já está liberado.
        Clique no botão abaixo pra entrar na plataforma.
      </p>
      <p style="margin:0 0 28px;">
        <a href="${esc(url)}" style="display:inline-block;background:#28b463;color:#ffffff;font-size:16px;font-weight:700;text-decoration:none;padding:14px 28px;border-radius:8px;">
          ${esc(button)}
        </a>
      </p>
      <p style="margin:0 0 6px;font-size:12px;color:#6b7280;">Se o botão não funcionar, copie e cole este link no navegador:</p>
      <p style="margin:0 0 24px;font-size:12px;word-break:break-all;"><a href="${esc(url)}" style="color:#2563eb;">${esc(url)}</a></p>
      <div style="border-top:1px solid #e5e7eb;padding-top:16px;font-size:13px;color:#6b7280;">
        Pedido <strong style="color:#111827;">#${orderCode}</strong> · ${formatBRL(order.totalCents)}<br>
        Guarde este e-mail: é por ele que você volta pra plataforma.
      </div>
    </div>
  </div>
</div>
</body></html>`,
  });
}
