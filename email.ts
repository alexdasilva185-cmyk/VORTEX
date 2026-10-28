import { Resend } from "resend";

let cached: Resend | null = null;

function getClient(): Resend | null {
  const key = process.env.RESEND_API_KEY;
  if (!key) return null;
  if (!cached) cached = new Resend(key);
  return cached;
}

export function isEmailConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY && process.env.RESEND_FROM_EMAIL);
}

export async function sendEmail({
  to,
  subject,
  html,
  text,
}: {
  to: string;
  subject: string;
  html: string;
  text: string;
}) {
  const client = getClient();
  const from = process.env.RESEND_FROM_EMAIL;
  if (!client || !from) {
    // Em produção nunca despejamos o conteúdo (que inclui links de reset e
    // e-mails de leads) no log — só um aviso de configuração.
    if (process.env.NODE_ENV === "production") {
      console.warn(
        "[email] RESEND_API_KEY/RESEND_FROM_EMAIL ausentes — e-mail não enviado."
      );
    } else {
      console.warn(
        "[email] Resend não configurado — simulando envio:",
        { to, subject, text }
      );
    }
    return { id: "sim_" + Date.now().toString(36) };
  }
  const res = await client.emails.send({
    from,
    to,
    subject,
    html,
    text,
  });
  if (res.error) {
    throw new Error(`Resend: ${res.error.message}`);
  }
  return { id: res.data?.id ?? "" };
}
