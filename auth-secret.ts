/**
 * Segredo de assinatura da sessão (JWT). Compartilhado entre `lib/auth.ts`
 * (Node) e `middleware.ts` (Edge).
 *
 * Em produção, a ausência de AUTH_SECRET é um erro fatal — sem isso, qualquer
 * pessoa que conheça o fallback público poderia forjar uma sessão de admin.
 * Em dev, mantemos um fallback pra não travar o ambiente local.
 */
const raw = process.env.AUTH_SECRET;

if (!raw && process.env.NODE_ENV === "production") {
  throw new Error(
    "AUTH_SECRET ausente em produção. Defina uma string aleatória de 32+ caracteres."
  );
}

export const AUTH_SECRET_KEY = new TextEncoder().encode(
  raw || "dev-only-fallback-secret-change-me-please"
);
