import { unstable_cache } from "next/cache";
import { prisma } from "@/lib/prisma";
import { brDateParts, startOfTodayBR } from "@/lib/utils";

export type DashboardPeriod = "today" | "7d" | "30d" | "all";

function getDateGte(period: DashboardPeriod): Date | undefined {
  if (period === "all") return undefined;
  if (period === "today") return startOfTodayBR();
  const d = new Date();
  d.setDate(d.getDate() - (period === "7d" ? 7 : 30));
  return d;
}

export type DashboardData = {
  totalRevenue: number;
  paidCount: number;
  ticketMedio: number;
  cardOrdersCount: number;
  cardApprovedCount: number;
  cardApprovalPct: number;
  pixOrdersCount: number;
  pixPaidCount: number;
  pixConversionPct: number;
  refundedCount: number;
  refundPct: number;
  totalAttempts: number;
  chartData: { label: string; value: number }[];
};

/**
 * Carrega todas as métricas e o gráfico em uma única query enxuta.
 * Cache por (período, productId) — 30s + tag-based invalidation em "orders".
 */
export function getDashboardData(
  period: DashboardPeriod,
  productId?: string
): Promise<DashboardData> {
  const cacheKey = `admin:dashboard:${period}:${productId ?? "all"}`;
  return unstable_cache(
    async () => {
      const gte = getDateGte(period);
      const where: Record<string, unknown> = {};
      if (gte) where.createdAt = { gte };
      if (productId) where.productId = productId;

      // 1 query: pega só os campos necessários
      const orders = await prisma.order.findMany({
        where,
        select: {
          totalCents: true,
          status: true,
          paymentMethod: true,
          createdAt: true,
        },
        orderBy: { createdAt: "asc" },
      });

      const paid = orders.filter((o) => o.status === "paid");
      const totalRevenue = paid.reduce((s, o) => s + o.totalCents, 0);
      const ticketMedio = paid.length > 0 ? totalRevenue / paid.length : 0;

      const cardOrders = orders.filter((o) => o.paymentMethod === "credit_card");
      const cardApproved = cardOrders.filter((o) => o.status === "paid").length;
      const cardApprovalPct = cardOrders.length
        ? (cardApproved / cardOrders.length) * 100
        : 0;

      const pixOrders = orders.filter((o) => o.paymentMethod === "pix");
      const pixPaid = pixOrders.filter((o) => o.status === "paid").length;
      const pixConversionPct = pixOrders.length
        ? (pixPaid / pixOrders.length) * 100
        : 0;

      const refunded = orders.filter((o) => o.status === "refunded").length;
      const refundPct = paid.length ? (refunded / paid.length) * 100 : 0;

      const chartData = buildChartData(paid, period);

      return {
        totalRevenue,
        paidCount: paid.length,
        ticketMedio,
        cardOrdersCount: cardOrders.length,
        cardApprovedCount: cardApproved,
        cardApprovalPct,
        pixOrdersCount: pixOrders.length,
        pixPaidCount: pixPaid,
        pixConversionPct,
        refundedCount: refunded,
        refundPct,
        totalAttempts: orders.length,
        chartData,
      };
    },
    [cacheKey],
    { tags: ["orders"], revalidate: 30 }
  )();
}

function buildChartData(
  orders: { totalCents: number; createdAt: Date }[],
  period: DashboardPeriod
) {
  if (orders.length === 0) {
    return Array.from({ length: 7 }).map((_, i) => ({
      label: `${i + 1}`,
      value: 0,
    }));
  }
  if (period === "today") {
    const buckets = new Array(24).fill(0);
    for (const o of orders) {
      const h = brDateParts(o.createdAt).hour;
      buckets[h] += o.totalCents;
    }
    return buckets.map((v, i) => ({
      label: `${i.toString().padStart(2, "0")}h`,
      value: v / 100,
    }));
  }
  const map = new Map<string, number>();
  for (const o of orders) {
    const d = brDateParts(o.createdAt);
    const key = `${d.month}/${d.day}`;
    map.set(key, (map.get(key) || 0) + o.totalCents);
  }
  return Array.from(map.entries()).map(([label, cents]) => ({
    label,
    value: cents / 100,
  }));
}
