/**
 * Cache layer pras queries do admin.
 * Estratégia:
 *  - unstable_cache memoriza resultado em memória do edge/serverless
 *  - tags permitem invalidar de forma cirúrgica em mutations
 *  - revalidate curto (30-60s) garante consistência mesmo sem invalidação manual
 *
 * Tags usadas:
 *   - "orders"    → toda lista/agregação de pedidos
 *   - "products"  → toda lista de produtos
 *   - "webhooks"  → toda lista de webhooks
 *   - "topbar"    → faturamento exibido no topbar
 */

import { unstable_cache } from "next/cache";
import { prisma } from "@/lib/prisma";

// ── Topbar (faturamento total pago) ──────────────────────────────────────────
export const getTopbarRevenue = unstable_cache(
  async (): Promise<number> => {
    const agg = await prisma.order.aggregate({
      where: { status: "paid" },
      _sum: { totalCents: true },
    });
    return agg._sum.totalCents ?? 0;
  },
  ["admin:topbar:revenue"],
  { tags: ["orders", "topbar"], revalidate: 60 }
);

// ── Lista de produtos (admin) ────────────────────────────────────────────────
export const getProductsForAdmin = unstable_cache(
  async () => {
    return prisma.product.findMany({
      where: { deletedAt: null },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        slug: true,
        imageUrl: true,
        priceCents: true,
        active: true,
        _count: { select: { orderBumps: true, coproducers: true } },
      },
    });
  },
  ["admin:products:list"],
  { tags: ["products"], revalidate: 60 }
);

// ── Lista compacta de produtos (pra selects/filters) ─────────────────────────
export const getProductsCompact = unstable_cache(
  async () => {
    return prisma.product.findMany({
      where: { deletedAt: null },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    });
  },
  ["admin:products:compact"],
  { tags: ["products"], revalidate: 60 }
);

// ── Lista de webhooks ────────────────────────────────────────────────────────
export const getWebhooks = unstable_cache(
  async () => {
    return prisma.outgoingWebhook.findMany({
      orderBy: { createdAt: "desc" },
    });
  },
  ["admin:webhooks:list"],
  { tags: ["webhooks"], revalidate: 60 }
);

// ── Coprodutores (overview) ──────────────────────────────────────────────────
export const getProductsWithCoproducers = unstable_cache(
  async () => {
    return prisma.product.findMany({
      where: { coproducers: { some: {} }, deletedAt: null },
      include: { coproducers: true },
      orderBy: { name: "asc" },
    });
  },
  ["admin:coprodutores:list"],
  { tags: ["products"], revalidate: 60 }
);
