export type ResalePlatform = "KREAM" | "POIZON" | "NONE";
export type ResaleDecision = "BUY" | "SLOW" | "PASS" | "NO_DATA";

export type ResaleSettings = {
  id: number;
  min_profit: number;
  min_margin_rate: number;
  min_30d_sales: number;
  kream_fee_rate: number;
  kream_fixed_fee: number;
  kream_shipping_fee: number;
  poizon_fee_rate: number;
  poizon_fixed_fee: number;
  poizon_shipping_fee: number;
};

export type ResaleCandidate = {
  id: string;
  brand: string;
  product_name: string;
  model_number: string | null;
  size: string;
  purchase_source: string | null;
  purchase_url: string | null;
  purchase_price: number;
  discount_rate: number;
  kream_sale_price: number;
  kream_30d_sales: number;
  kream_url: string | null;
  poizon_sale_price: number;
  poizon_30d_sales: number;
  poizon_url: string | null;
  memo: string | null;
  created_at: string;
  updated_at: string;
};

export type PlatformResult = {
  platform: Exclude<ResalePlatform, "NONE">;
  salePrice: number;
  sales30d: number;
  fee: number;
  shippingFee: number;
  netReceipt: number;
  profit: number;
  marginRate: number;
  maxPurchasePrice: number;
};

export type CandidateAnalysis = {
  actualPurchasePrice: number;
  kream: PlatformResult;
  poizon: PlatformResult;
  bestPlatform: ResalePlatform;
  bestProfit: number;
  bestMarginRate: number;
  bestSales30d: number;
  bestMaxPurchasePrice: number;
  purchaseHeadroom: number;
  decision: ResaleDecision;
};

export const DEFAULT_RESALE_SETTINGS: ResaleSettings = {
  id: 1,
  min_profit: 20_000,
  min_margin_rate: 15,
  min_30d_sales: 10,
  kream_fee_rate: 6,
  kream_fixed_fee: 2_500,
  kream_shipping_fee: 3_000,
  poizon_fee_rate: 0,
  poizon_fixed_fee: 15_000,
  poizon_shipping_fee: 2_000,
};

function safeNumber(value: unknown) {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function platformResult({
  platform,
  salePrice,
  sales30d,
  actualPurchasePrice,
  feeRate,
  fixedFee,
  shippingFee,
  settings,
}: {
  platform: Exclude<ResalePlatform, "NONE">;
  salePrice: number;
  sales30d: number;
  actualPurchasePrice: number;
  feeRate: number;
  fixedFee: number;
  shippingFee: number;
  settings: ResaleSettings;
}): PlatformResult {
  const normalizedSalePrice = Math.max(0, safeNumber(salePrice));
  const variableFee = normalizedSalePrice * (Math.max(0, safeNumber(feeRate)) / 100);
  const fee = variableFee + Math.max(0, safeNumber(fixedFee));
  const normalizedShippingFee = Math.max(0, safeNumber(shippingFee));
  const netReceipt = Math.max(0, normalizedSalePrice - fee - normalizedShippingFee);
  const profit = normalizedSalePrice > 0 ? netReceipt - actualPurchasePrice : 0;
  const marginRate = normalizedSalePrice > 0 ? (profit / normalizedSalePrice) * 100 : 0;

  const maxByProfit = netReceipt - Math.max(0, settings.min_profit);
  const maxByMargin = netReceipt - normalizedSalePrice * (Math.max(0, settings.min_margin_rate) / 100);
  const maxPurchasePrice = normalizedSalePrice > 0 ? Math.max(0, Math.min(maxByProfit, maxByMargin)) : 0;

  return {
    platform,
    salePrice: normalizedSalePrice,
    sales30d: Math.max(0, Math.trunc(safeNumber(sales30d))),
    fee,
    shippingFee: normalizedShippingFee,
    netReceipt,
    profit,
    marginRate,
    maxPurchasePrice,
  };
}

export function analyzeCandidate(
  candidate: ResaleCandidate,
  settings: ResaleSettings = DEFAULT_RESALE_SETTINGS,
): CandidateAnalysis {
  const purchasePrice = Math.max(0, safeNumber(candidate.purchase_price));
  const discountRate = Math.min(100, Math.max(0, safeNumber(candidate.discount_rate)));
  const actualPurchasePrice = purchasePrice * (1 - discountRate / 100);

  const kream = platformResult({
    platform: "KREAM",
    salePrice: candidate.kream_sale_price,
    sales30d: candidate.kream_30d_sales,
    actualPurchasePrice,
    feeRate: settings.kream_fee_rate,
    fixedFee: settings.kream_fixed_fee,
    shippingFee: settings.kream_shipping_fee,
    settings,
  });

  const poizon = platformResult({
    platform: "POIZON",
    salePrice: candidate.poizon_sale_price,
    sales30d: candidate.poizon_30d_sales,
    actualPurchasePrice,
    feeRate: settings.poizon_fee_rate,
    fixedFee: settings.poizon_fixed_fee,
    shippingFee: settings.poizon_shipping_fee,
    settings,
  });

  const available = [kream, poizon].filter((item) => item.salePrice > 0);

  if (available.length === 0) {
    return {
      actualPurchasePrice,
      kream,
      poizon,
      bestPlatform: "NONE",
      bestProfit: 0,
      bestMarginRate: 0,
      bestSales30d: 0,
      bestMaxPurchasePrice: 0,
      purchaseHeadroom: 0,
      decision: "NO_DATA",
    };
  }

  const best = [...available].sort((a, b) => {
    if (b.profit !== a.profit) return b.profit - a.profit;
    if (b.marginRate !== a.marginRate) return b.marginRate - a.marginRate;
    return b.sales30d - a.sales30d;
  })[0];

  const meetsProfit = best.profit >= settings.min_profit;
  const meetsMargin = best.marginRate >= settings.min_margin_rate;
  const meetsSales = best.sales30d >= settings.min_30d_sales;

  let decision: ResaleDecision = "PASS";
  if (meetsProfit && meetsMargin && meetsSales) decision = "BUY";
  else if (meetsProfit && meetsMargin && !meetsSales) decision = "SLOW";

  return {
    actualPurchasePrice,
    kream,
    poizon,
    bestPlatform: best.platform,
    bestProfit: best.profit,
    bestMarginRate: best.marginRate,
    bestSales30d: best.sales30d,
    bestMaxPurchasePrice: best.maxPurchasePrice,
    purchaseHeadroom: best.maxPurchasePrice - actualPurchasePrice,
    decision,
  };
}
