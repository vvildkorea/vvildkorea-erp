import { supabaseAdmin } from "@/lib/supabase/admin";

export type ProductCategory = "disposable" | "pod" | "device" | "liquid";

export type PricePartnerType =
  | "headquarters"
  | "wholesale"
  | "retail"
  | "direct_store"
  | "etc";

export type ProductVariantPrice = {
  id: string;
  product_variant_id: string;
  partner_type: PricePartnerType;
  price: number | null;
  created_at: string;
  updated_at: string;
};

export type ProductVariant = {
  id: string;
  product_model_id: string;
  sku: string | null;
  flavor: string | null;
  color: string | null;
  nicotine_content: string | null;
  barcode: string | null;
  box_quantity: number | null;
  memo: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  product_variant_prices?: ProductVariantPrice[];
};

export type ProductModel = {
  id: string;
  category: ProductCategory;
  model_name: string;
  brand: string | null;
  english_name: string | null;
  origin_country: string | null;
  specification: string | null;
  unit: string;
  hs_code: string | null;
  memo: string | null;
  is_active: boolean;
  created_by_operator_id: string | null;
  created_at: string;
  updated_at: string;
  product_variants?: ProductVariant[];
};

export type ProductModelFilters = {
  q?: string;
  category?: ProductCategory | "all";
  active?: "all" | "active" | "inactive";
};

export type ProductVariantPriceInput = {
  headquarters?: number | null;
  wholesale?: number | null;
  retail?: number | null;
  direct_store?: number | null;
  etc?: number | null;
};

const pricePartnerTypes: PricePartnerType[] = [
  "headquarters",
  "wholesale",
  "retail",
  "direct_store",
  "etc",
];

export async function getProductModels(filters?: ProductModelFilters) {
  let query = supabaseAdmin
    .from("product_models")
    .select("*, product_variants(*, product_variant_prices(*))")
    .order("created_at", { ascending: false });

  if (filters?.q) {
    query = query.or(
      `model_name.ilike.%${filters.q}%,brand.ilike.%${filters.q}%,english_name.ilike.%${filters.q}%`
    );
  }

  if (filters?.category && filters.category !== "all") {
    query = query.eq("category", filters.category);
  }

  if (filters?.active === "active") {
    query = query.eq("is_active", true);
  }

  if (filters?.active === "inactive") {
    query = query.eq("is_active", false);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(error.message);
  }

  return data as ProductModel[];
}

export async function createProductModel(input: {
  category: ProductCategory;
  model_name: string;
  brand?: string;
  english_name?: string;
  origin_country?: string;
  specification?: string;
  unit?: string;
  hs_code?: string;
  memo?: string;
  created_by_operator_id?: string;
}) {
  const { data, error } = await supabaseAdmin
    .from("product_models")
    .insert({
      category: input.category,
      model_name: input.model_name,
      brand: input.brand || null,
      english_name: input.english_name || null,
      origin_country: input.origin_country || null,
      specification: input.specification || null,
      unit: input.unit || "ea",
      hs_code: input.hs_code || null,
      memo: input.memo || null,
      created_by_operator_id: input.created_by_operator_id || null,
    })
    .select("*")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return data as ProductModel;
}

async function upsertVariantPrices(
  productVariantId: string,
  prices: ProductVariantPriceInput
) {
  const rows = pricePartnerTypes.map((partnerType) => ({
    product_variant_id: productVariantId,
    partner_type: partnerType,
    price: prices[partnerType] ?? null,
    updated_at: new Date().toISOString(),
  }));

  const { error } = await supabaseAdmin
    .from("product_variant_prices")
    .upsert(rows, {
      onConflict: "product_variant_id,partner_type",
    });

  if (error) {
    throw new Error(error.message);
  }
}

export async function createProductVariant(input: {
  product_model_id: string;
  sku?: string;
  flavor?: string;
  color?: string;
  nicotine_content?: string;
  barcode?: string;
  box_quantity?: number | null;
  memo?: string;
  prices: ProductVariantPriceInput;
}) {
  const { data, error } = await supabaseAdmin
    .from("product_variants")
    .insert({
      product_model_id: input.product_model_id,
      sku: input.sku || null,
      flavor: input.flavor || null,
      color: input.color || null,
      nicotine_content: input.nicotine_content || null,
      barcode: input.barcode || null,
      box_quantity: input.box_quantity ?? null,
      memo: input.memo || null,
    })
    .select("*")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  await upsertVariantPrices(data.id, input.prices);

  return data as ProductVariant;
}

export async function setProductModelActive(input: {
  id: string;
  is_active: boolean;
}) {
  const { data, error } = await supabaseAdmin
    .from("product_models")
    .update({
      is_active: input.is_active,
      updated_at: new Date().toISOString(),
    })
    .eq("id", input.id)
    .select("*")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return data as ProductModel;
}

export async function setProductVariantActive(input: {
  id: string;
  is_active: boolean;
}) {
  const { data, error } = await supabaseAdmin
    .from("product_variants")
    .update({
      is_active: input.is_active,
      updated_at: new Date().toISOString(),
    })
    .eq("id", input.id)
    .select("*")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return data as ProductVariant;
}

export async function deleteProductModel(id: string) {
  const { error } = await supabaseAdmin
    .from("product_models")
    .delete()
    .eq("id", id);

  if (error) {
    throw new Error(error.message);
  }
}

export async function deleteProductVariant(id: string) {
  const { error } = await supabaseAdmin
    .from("product_variants")
    .delete()
    .eq("id", id);

  if (error) {
    throw new Error(error.message);
  }
}