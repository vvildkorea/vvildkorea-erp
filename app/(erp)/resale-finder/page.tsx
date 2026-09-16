import { createClient } from "@/lib/supabase/server";
import {
  DEFAULT_RESALE_SETTINGS,
  type ResaleCandidate,
  type ResaleSettings,
} from "@/lib/resale";
import ResaleFinderClient from "./resale-finder-client";

export const dynamic = "force-dynamic";

function normalizeCandidate(row: any): ResaleCandidate {
  return {
    id: String(row.id),
    brand: String(row.brand || ""),
    product_name: String(row.product_name || ""),
    model_number: row.model_number ? String(row.model_number) : null,
    size: String(row.size || ""),
    purchase_source: row.purchase_source ? String(row.purchase_source) : null,
    purchase_url: row.purchase_url ? String(row.purchase_url) : null,
    purchase_price: Number(row.purchase_price || 0),
    discount_rate: Number(row.discount_rate || 0),
    kream_sale_price: Number(row.kream_sale_price || 0),
    kream_30d_sales: Number(row.kream_30d_sales || 0),
    kream_url: row.kream_url ? String(row.kream_url) : null,
    poizon_sale_price: Number(row.poizon_sale_price || 0),
    poizon_30d_sales: Number(row.poizon_30d_sales || 0),
    poizon_url: row.poizon_url ? String(row.poizon_url) : null,
    memo: row.memo ? String(row.memo) : null,
    created_at: String(row.created_at || ""),
    updated_at: String(row.updated_at || ""),
  };
}

function normalizeSettings(row: any): ResaleSettings {
  if (!row) return DEFAULT_RESALE_SETTINGS;

  return {
    id: 1,
    min_profit: Number(row.min_profit ?? DEFAULT_RESALE_SETTINGS.min_profit),
    min_margin_rate: Number(row.min_margin_rate ?? DEFAULT_RESALE_SETTINGS.min_margin_rate),
    min_30d_sales: Number(row.min_30d_sales ?? DEFAULT_RESALE_SETTINGS.min_30d_sales),
    kream_fee_rate: Number(row.kream_fee_rate ?? DEFAULT_RESALE_SETTINGS.kream_fee_rate),
    kream_fixed_fee: Number(row.kream_fixed_fee ?? DEFAULT_RESALE_SETTINGS.kream_fixed_fee),
    kream_shipping_fee: Number(row.kream_shipping_fee ?? DEFAULT_RESALE_SETTINGS.kream_shipping_fee),
    poizon_fee_rate: Number(row.poizon_fee_rate ?? DEFAULT_RESALE_SETTINGS.poizon_fee_rate),
    poizon_fixed_fee: Number(row.poizon_fixed_fee ?? DEFAULT_RESALE_SETTINGS.poizon_fixed_fee),
    poizon_shipping_fee: Number(row.poizon_shipping_fee ?? DEFAULT_RESALE_SETTINGS.poizon_shipping_fee),
  };
}

export default async function ResaleFinderPage() {
  const supabase = createClient();

  const [candidatesResult, settingsResult] = await Promise.all([
    supabase
      .from("resale_candidates")
      .select("*")
      .order("updated_at", { ascending: false }),
    supabase.from("resale_settings").select("*").eq("id", 1).maybeSingle(),
  ]);

  if (candidatesResult.error) {
    throw new Error(`리셀 상품 조회 실패: ${candidatesResult.error.message}`);
  }

  if (settingsResult.error) {
    throw new Error(`리셀 설정 조회 실패: ${settingsResult.error.message}`);
  }

  const candidates = (candidatesResult.data || []).map(normalizeCandidate);
  const settings = normalizeSettings(settingsResult.data);

  return <ResaleFinderClient initialCandidates={candidates} initialSettings={settings} />;
}
