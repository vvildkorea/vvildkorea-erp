import { supabaseAdmin } from "@/lib/supabase/admin";

export type ImportOrderItemInput = {
  product_model_id: string;
  quantity: number;
  product_cost: number;
};

export type ImportOrderInput = {
  po_number: string;
  supplier_name?: string;
  import_date?: string;
  product_cost_total: number;
  duty_amount: number;
  vat_amount: number;
  freight_amount: number;
  customs_broker_fee: number;
  tobacco_tax_amount: number;
  memo?: string;
  created_by_operator_id?: string;
  items: ImportOrderItemInput[];
};

export type ImportOrderItem = {
  id: string;
  import_order_id: string;
  product_model_id: string;
  quantity: number;
  product_cost: number;
  allocated_extra_cost: number;
  landed_cost_total: number;
  landed_cost_unit: number;
  created_at: string;
  updated_at: string;
  product_models?: {
    id: string;
    category: string;
    model_name: string;
  };
};

export type ImportOrder = {
  id: string;
  po_number: string;
  supplier_name: string | null;
  import_date: string | null;
  product_cost_total: number;
  duty_amount: number;
  vat_amount: number;
  freight_amount: number;
  customs_broker_fee: number;
  tobacco_tax_amount: number;
  total_cost: number;
  memo: string | null;
  created_by_operator_id: string | null;
  created_at: string;
  updated_at: string;
  import_order_items?: ImportOrderItem[];
};

export async function getImportOrders() {
  const { data, error } = await supabaseAdmin
    .from("import_orders")
    .select(
      `
      *,
      import_order_items(
        *,
        product_models(
          id,
          category,
          model_name
        )
      )
    `
    )
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return data as ImportOrder[];
}

export async function updateModelLandedCost(input: {
  product_model_id: string;
  landed_cost_unit: number;
}) {
  const { data: variants, error: variantsError } = await supabaseAdmin
    .from("product_variants")
    .select("id")
    .eq("product_model_id", input.product_model_id);

  if (variantsError) {
    throw new Error(variantsError.message);
  }

  if (!variants || variants.length === 0) {
    return;
  }

  const rows = variants.map((variant) => ({
    product_variant_id: variant.id,
    partner_type: "headquarters",
    price: input.landed_cost_unit,
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

export async function createImportOrder(input: ImportOrderInput) {
  const validItems = input.items.filter(
    (item) =>
      item.product_model_id &&
      Number(item.quantity) > 0 &&
      Number(item.product_cost) >= 0
  );

  if (validItems.length === 0) {
    throw new Error("수입 품목을 1개 이상 추가해야 합니다.");
  }

  const calculatedProductCostTotal = validItems.reduce(
    (sum, item) => sum + item.product_cost,
    0
  );

  const productCostTotal =
    input.product_cost_total > 0
      ? input.product_cost_total
      : calculatedProductCostTotal;

  const extraCostTotal =
    input.duty_amount +
    input.vat_amount +
    input.freight_amount +
    input.customs_broker_fee +
    input.tobacco_tax_amount;

  const totalCost = productCostTotal + extraCostTotal;

  const { data: importOrder, error: importOrderError } = await supabaseAdmin
    .from("import_orders")
    .insert({
      po_number: input.po_number,
      supplier_name: input.supplier_name || null,
      import_date: input.import_date || null,

      product_cost_total: productCostTotal,
      duty_amount: input.duty_amount,
      vat_amount: input.vat_amount,
      freight_amount: input.freight_amount,
      customs_broker_fee: input.customs_broker_fee,
      tobacco_tax_amount: input.tobacco_tax_amount,
      total_cost: totalCost,

      memo: input.memo || null,
      created_by_operator_id: input.created_by_operator_id || null,
    })
    .select("*")
    .single();

  if (importOrderError) {
    throw new Error(importOrderError.message);
  }

  for (const item of validItems) {
      const itemProductCostSum = validItems.reduce(
    (sum, item) => sum + item.product_cost,
    0
  );

  const totalQuantity = validItems.reduce(
    (sum, item) => sum + item.quantity,
    0
  );

  for (const item of validItems) {
    let allocationRatio = 0;

    if (itemProductCostSum > 0) {
      allocationRatio = item.product_cost / itemProductCostSum;
    } else if (totalQuantity > 0) {
      allocationRatio = item.quantity / totalQuantity;
    }

    const allocatedProductCost = productCostTotal * allocationRatio;
    const allocatedExtraCost = extraCostTotal * allocationRatio;
    const landedCostTotal = allocatedProductCost + allocatedExtraCost;
    const landedCostUnit =
      item.quantity > 0 ? landedCostTotal / item.quantity : 0;

    const { error: itemError } = await supabaseAdmin
      .from("import_order_items")
      .insert({
        import_order_id: importOrder.id,
        product_model_id: item.product_model_id,

        quantity: item.quantity,
        product_cost: Math.round(allocatedProductCost),

        allocated_extra_cost: Math.round(allocatedExtraCost),
        landed_cost_total: Math.round(landedCostTotal),
        landed_cost_unit: Math.round(landedCostUnit),
      });

    if (itemError) {
      throw new Error(itemError.message);
    }

    await updateModelLandedCost({
      product_model_id: item.product_model_id,
      landed_cost_unit: Math.round(landedCostUnit),
    });
  }
}

  return importOrder as ImportOrder;
}