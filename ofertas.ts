import { prisma } from "@/lib/prisma";
import { slugify } from "@/lib/utils";

/** Garante um slug único dentro do produto, anexando -2, -3… se preciso. */
export async function uniqueOfferSlug(productId: string, base: string): Promise<string> {
  const root = slugify(base) || "oferta";
  let candidate = root;
  let n = 1;
  // poucas iterações na prática
  while (await prisma.offer.findFirst({ where: { productId, slug: candidate }, select: { id: true } })) {
    n += 1;
    candidate = `${root}-${n}`;
  }
  return candidate;
}

/**
 * Link público da oferta: /c/<produto>/<oferta> no domínio do checkout.
 * Usa INTEGRACAO_URL_PUBLICA (se o checkout abre num domínio diferente) ou
 * NEXT_PUBLIC_APP_URL. Sem nenhuma das duas, devolve só o caminho.
 */
export function urlDaOferta(productSlug: string, offerSlug: string): string {
  const base = (process.env.INTEGRACAO_URL_PUBLICA || process.env.NEXT_PUBLIC_APP_URL || "").trim().replace(/\/+$/, "");
  return `${base}/c/${productSlug}/${offerSlug}`;
}
