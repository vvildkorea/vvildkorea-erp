export type OrderPriceType =
  | "headquarters"
  | "wholesale"
  | "retail"
  | "direct_store"
  | "etc";

export function getPriceKeyByPartnerType(partnerType: string): OrderPriceType {
  const type = String(partnerType || "").trim();

  const map: Record<string, OrderPriceType> = {
    판매처: "headquarters",
    도매점: "wholesale",
    소매점: "retail",
    직영점: "direct_store",
    기타: "etc",

    seller: "wholesale",
    sales: "wholesale",

    wholesale: "wholesale",
    retail: "retail",
    direct_store: "direct_store",
    etc: "etc",
  };

  return map[type] || "etc";
}

export function getPriceLabel(priceType: string) {
  const labels: Record<string, string> = {
    headquarters: "도착원가",
    wholesale: "공급가",
    retail: "도매가",
    direct_store: "직영점가",
    etc: "판매가",
  };

  return labels[String(priceType || "").trim()] || priceType;
}

export function getPartnerTypeLabel(partnerType: string) {
  const labels: Record<string, string> = {
    판매처: "판매처",
    도매점: "도매점",
    소매점: "소매점",
    직영점: "직영점",
    기타: "기타",

    seller: "판매처",
    sales: "판매처",
    wholesale: "도매점",
    retail: "소매점",
    direct_store: "직영점",
    etc: "기타",
  };

  return labels[String(partnerType || "").trim()] || partnerType;
}

export function getProductCategoryLabel(category: string) {
  const labels: Record<string, string> = {
    일회용기기: "일회용기기",
    팟: "팟",
    디바이스: "디바이스",
    액상: "액상",

    disposable: "일회용기기",
    pod: "팟",
    device: "디바이스",
    liquid: "액상",
    e_liquid: "액상",
    eLiquid: "액상",
  };

  return labels[String(category || "").trim()] || category;
}

export function calculateOrderItemAmount(
  quantity: number,
  unitPrice: number
): number {
  return Number(quantity || 0) * Number(unitPrice || 0);
}

export function calculateOrderTotal(
  items: {
    quantity: number;
    unitPrice: number;
  }[]
) {
  return items.reduce(
    (acc, item) => {
      const quantity = Number(item.quantity || 0);
      const unitPrice = Number(item.unitPrice || 0);
      const amount = quantity * unitPrice;

      return {
        totalQuantity: acc.totalQuantity + quantity,
        totalAmount: acc.totalAmount + amount,
      };
    },
    {
      totalQuantity: 0,
      totalAmount: 0,
    }
  );
}

export function formatKrw(value: number | string | null | undefined): string {
  return `${Number(value || 0).toLocaleString()}원`;
}