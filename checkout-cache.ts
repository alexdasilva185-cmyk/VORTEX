import { unstable_cache } from "next/cache";
import { prisma } from "@/lib/prisma";

/**
 * Cache em memória do produto + bumps por slug.
 * - Revalidate por tag `product:<slug>` quando admin atualiza (em route handlers do produto/bump)
 * - TTL conservador de 60s pra suportar tráfego enorme sem martelar o Postgres
 */
export const getProductBySlug = (slug: string) =>
  unstable_cache(
    async () => {
      return prisma.product.findFirst({
        where: { slug, deletedAt: null },
        include: {
          orderBumps: {
            include: { bumpProduct: true },
            orderBy: { position: "asc" },
          },
          offers: {
            where: { active: true },
            orderBy: { createdAt: "asc" },
          },
        },
      });
    },
    [`product-by-slug:${slug}`],
    {
      tags: [`product:${slug}`],
      revalidate: 60,
    }
  )();
