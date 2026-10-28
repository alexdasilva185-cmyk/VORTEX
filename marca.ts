/**
 * Nome do sistema nas telas do painel e nos e-mails.
 * Troque pela variável NEXT_PUBLIC_APP_NAME (ex.: "Pagamentos Sua Empresa").
 * O ícone do app e o nome no celular ficam em public/icons/ e
 * public/vortex-pay.webmanifest (troque lá também, se quiser).
 */
export const NOME_DO_APP = process.env.NEXT_PUBLIC_APP_NAME?.trim() || "Vórtex Pay";

/** Letra do quadradinho de logo no painel. */
export const INICIAL_DO_APP = NOME_DO_APP.charAt(0).toUpperCase();
