"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

type CandidateInput = {
  id?: string;
  brand: string;
  productName: string;
  modelNumber?: string;
  size: string;
  purchaseSource?: string;
  purchaseUrl?: string;
  purchasePrice: number;
  discountRate: number;
  kreamSalePrice: number;
  kream30dSales: number;
  kreamUrl?: string;
  poizonSalePrice: number;
  poizon30dSales: number;
  poizonUrl?: string;
  memo?: string;
};

type SettingsInput = {
  minProfit: number;
  minMarginRate: number;
  min30dSales: number;
  kreamFeeRate: number;
  kreamFixedFee: number;
  kreamShippingFee: number;
  poizonFeeRate: number;
  poizonFixedFee: number;
  poizonShippingFee: number;
};

function cleanText(value?: string) {
  const normalized = String(value ?? "").trim();
  return normalized || null;
}

function numberOrZero(value: unknown) {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? Math.max(0, parsed) : 0;
}

function candidatePayload(input: CandidateInput) {
  const brand = String(input.brand || "").trim();
  const productName = String(input.productName || "").trim();
  const size = String(input.size || "").trim();

  if (!brand) throw new Error("브랜드를 입력해주세요.");
  if (!productName) throw new Error("상품명을 입력해주세요.");
  if (!size) throw new Error("사이즈를 입력해주세요.");
  if (numberOrZero(input.purchasePrice) <= 0) throw new Error("매입가를 입력해주세요.");

  return {
    brand,
    product_name: productName,
    model_number: cleanText(input.modelNumber),
    size,
    purchase_source: cleanText(input.purchaseSource),
    purchase_url: cleanText(input.purchaseUrl),
    purchase_price: numberOrZero(input.purchasePrice),
    discount_rate: Math.min(100, numberOrZero(input.discountRate)),
    kream_sale_price: numberOrZero(input.kreamSalePrice),
    kream_30d_sales: Math.trunc(numberOrZero(input.kream30dSales)),
    kream_url: cleanText(input.kreamUrl),
    poizon_sale_price: numberOrZero(input.poizonSalePrice),
    poizon_30d_sales: Math.trunc(numberOrZero(input.poizon30dSales)),
    poizon_url: cleanText(input.poizonUrl),
    memo: cleanText(input.memo),
    updated_at: new Date().toISOString(),
  };
}

export async function saveResaleCandidate(input: CandidateInput) {
  const supabase = createClient();
  const payload = candidatePayload(input);

  if (input.id) {
    const { error } = await supabase
      .from("resale_candidates")
      .update(payload)
      .eq("id", input.id);

    if (error) throw new Error(error.message);
  } else {
    const { error } = await supabase.from("resale_candidates").insert(payload);
    if (error) throw new Error(error.message);
  }

  revalidatePath("/resale-finder");
  return { success: true };
}

export async function deleteResaleCandidate(id: string) {
  if (!id) throw new Error("삭제할 상품 ID가 없습니다.");

  const supabase = createClient();
  const { error } = await supabase.from("resale_candidates").delete().eq("id", id);

  if (error) throw new Error(error.message);

  revalidatePath("/resale-finder");
  return { success: true };
}

export async function saveResaleSettings(input: SettingsInput) {
  const supabase = createClient();

  const payload = {
    id: 1,
    min_profit: numberOrZero(input.minProfit),
    min_margin_rate: numberOrZero(input.minMarginRate),
    min_30d_sales: Math.trunc(numberOrZero(input.min30dSales)),
    kream_fee_rate: numberOrZero(input.kreamFeeRate),
    kream_fixed_fee: numberOrZero(input.kreamFixedFee),
    kream_shipping_fee: numberOrZero(input.kreamShippingFee),
    poizon_fee_rate: numberOrZero(input.poizonFeeRate),
    poizon_fixed_fee: numberOrZero(input.poizonFixedFee),
    poizon_shipping_fee: numberOrZero(input.poizonShippingFee),
    updated_at: new Date().toISOString(),
  };

  const { error } = await supabase
    .from("resale_settings")
    .upsert(payload, { onConflict: "id" });

  if (error) throw new Error(error.message);

  revalidatePath("/resale-finder");
  return { success: true };
}
