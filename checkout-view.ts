import type { Product, OrderBump } from "@prisma/client";
import type { CheckoutProduct } from "@/app/c/[slug]/_components/checkout-client";

/**
 * Mapeia uma linha de Product (Prisma) para as props que o CheckoutClient
 * espera. `priceCents` pode ser sobrescrito (ex.: quando o checkout é de uma
 * oferta — o preço da oferta entra no lugar do preço base).
 */
export function toCheckoutProduct(
  product: Product,
  opts?: { priceCents?: number }
): CheckoutProduct {
  let sideBanners: string[] = [];
  try {
    sideBanners = JSON.parse(product.sideBannersJson || "[]") as string[];
  } catch {
    sideBanners = [];
  }

  return {
    id: product.id,
    name: product.name,
    slug: product.slug,
    description: product.description ?? "",
    imageUrl: product.imageUrl ?? "",
    priceCents: opts?.priceCents ?? product.priceCents,
    primaryColor: product.primaryColor ?? "#10b981",
    bannerImageUrl: product.bannerImageUrl ?? "",
    showTopBanner: product.showTopBanner,
    sideBanners,
    showSideBanners: product.showSideBanners,
    headline: product.headline ?? "",
    subheadline: product.subheadline ?? "",
    showHighlightBox: product.showHighlightBox,
    footerText: product.footerText ?? "",
    defaultInstallments: product.defaultInstallments ?? 1,
    showCountdown: product.showCountdown,
    countdownMinutes: product.countdownMinutes ?? null,
    countdownLabel: product.countdownLabel ?? "Oferta por tempo limitado",
  };
}

/** Mapeia os order bumps (com bumpProduct incluído) para as props do checkout. */
export function toCheckoutBumps(
  orderBumps: (OrderBump & { bumpProduct: Product })[]
) {
  return orderBumps.map((b) => ({
    id: b.id,
    position: b.position,
    ctaText: b.ctaText || "SIM, EU ACEITO ESSA OFERTA ESPECIAL!",
    title: b.title || b.bumpProduct.name,
    description: b.description ?? "",
    imageUrl: b.imageUrl || b.bumpProduct.imageUrl || "",
    bumpProductId: b.bumpProduct.id,
    bumpProductName: b.bumpProduct.name,
    bumpProductPrice: b.priceCents ?? b.bumpProduct.priceCents,
  }));
}
