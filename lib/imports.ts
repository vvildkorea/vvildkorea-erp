import { supabaseAdmin } from "@/lib/supabase/admin";

export type ImportOrderItemInput = {
  product_model_id: string;
  product_variant_id: string;
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
  product_variant_id: string | null;
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
  } | null;
  product_variants?: Record<string, unknown> | null;
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
        ),
        product_variants(*)
      )
    `
    )
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return data as ImportOrder[];
}

export async function updateVariantLandedCost(input: {
  product_variant_id: string;
  landed_cost_unit: number;
}) {
  const { data: existingRows, error: selectError } = await supabaseAdmin
    .from("product_variant_prices")
    .select("id")
    .eq("product_variant_id", input.product_variant_id)
    .eq("partner_type", "headquarters")
    .limit(1);

  if (selectError) {
    throw new Error(selectError.message);
  }

  const existingId = existingRows?.[0]?.id;

  if (existingId) {
    const { error: updateError } = await supabaseAdmin
      .from("product_variant_prices")
      .update({
        price: input.landed_cost_unit,
        updated_at: new Date().toISOString(),
      })
      .eq("id", existingId);

    if (updateError) {
      throw new Error(updateError.message);
    }

    return;
  }

  const { error: insertError } = await supabaseAdmin
    .from("product_variant_prices")
    .insert({
      product_variant_id: input.product_variant_id,
      partner_type: "headquarters",
      price: input.landed_cost_unit,
      updated_at: new Date().toISOString(),
    });

  if (insertError) {
    throw new Error(insertError.message);
  }
}

export async function createImportOrder(input: ImportOrderInput) {
  const validItems = input.items.filter(
    (item) =>
      item.product_model_id &&
      item.product_variant_id &&
      Number(item.quantity) > 0 &&
      Number(item.product_cost) >= 0
  );

  if (validItems.length === 0) {
    throw new Error("수입 품목을 1개 이상 추가해야 합니다.");
  }

  const calculatedProductCostTotal = validItems.reduce(
    (sum, item) => sum + Number(item.product_cost || 0),
    0
  );

  const productCostTotal =
    input.product_cost_total > 0
      ? input.product_cost_total
      : calculatedProductCostTotal;

  const extraCostTotal =
    Number(input.duty_amount || 0) +
    Number(input.vat_amount || 0) +
    Number(input.freight_amount || 0) +
    Number(input.customs_broker_fee || 0) +
    Number(input.tobacco_tax_amount || 0);

  const totalCost = productCostTotal + extraCostTotal;

  const itemProductCostSum = validItems.reduce(
    (sum, item) => sum + Number(item.product_cost || 0),
    0
  );

  const totalQuantity = validItems.reduce(
    (sum, item) => sum + Number(item.quantity || 0),
    0
  );

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
    let allocationRatio = 0;

    if (itemProductCostSum > 0) {
      allocationRatio = Number(item.product_cost || 0) / itemProductCostSum;
    } else if (totalQuantity > 0) {
      allocationRatio = Number(item.quantity || 0) / totalQuantity;
    }

    const allocatedProductCost = productCostTotal * allocationRatio;
    const allocatedExtraCost = extraCostTotal * allocationRatio;
    const landedCostTotal = allocatedProductCost + allocatedExtraCost;
    const landedCostUnit =
      item.quantity > 0 ? landedCostTotal / item.quantity : 0;

    const roundedAllocatedProductCost = Math.round(allocatedProductCost);
    const roundedAllocatedExtraCost = Math.round(allocatedExtraCost);
    const roundedLandedCostTotal = Math.round(landedCostTotal);
    const roundedLandedCostUnit = Math.round(landedCostUnit);

    const { data: savedItem, error: itemError } = await supabaseAdmin
      .from("import_order_items")
      .insert({
        import_order_id: importOrder.id,
        product_model_id: item.product_model_id,
        product_variant_id: item.product_variant_id,

        quantity: item.quantity,
        product_cost: roundedAllocatedProductCost,

        allocated_extra_cost: roundedAllocatedExtraCost,
        landed_cost_total: roundedLandedCostTotal,
        landed_cost_unit: roundedLandedCostUnit,
      })
      .select("id")
      .single();

    if (itemError) {
      throw new Error(itemError.message);
    }

    await updateVariantLandedCost({
      product_variant_id: item.product_variant_id,
      landed_cost_unit: roundedLandedCostUnit,
    });

    const { error: inventoryError } = await supabaseAdmin
      .from("inventory_movements")
      .insert({
        product_variant_id: item.product_variant_id,
        import_order_id: importOrder.id,
        import_order_item_id: savedItem.id,
        movement_type: "in",
        quantity: item.quantity,
        memo: `${input.po_number} 수입 입고`,
      });

    if (inventoryError) {
      throw new Error(inventoryError.message);
    }
  }

  return importOrder as ImportOrder;
}