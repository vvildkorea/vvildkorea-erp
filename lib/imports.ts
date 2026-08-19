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

export type ImportOrderUpdateInput = ImportOrderInput & {
  id: string;
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

type PreparedImportOrder = {
  validItems: ImportOrderItemInput[];
  productCostTotal: number;
  extraCostTotal: number;
  totalCost: number;
  itemProductCostSum: number;
  totalQuantity: number;
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
    `,
    )
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return data as ImportOrder[];
}

export async function updateVariantLandedCost(input: {
  product_variant_id: string;
  landed_cost_unit: number | null;
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

function prepareImportOrder(input: ImportOrderInput): PreparedImportOrder {
  const validItems = input.items.filter(
    (item) =>
      item.product_model_id &&
      item.product_variant_id &&
      Number(item.quantity) > 0 &&
      Number(item.product_cost) >= 0,
  );

  if (validItems.length === 0) {
    throw new Error("수입 품목을 1개 이상 추가해야 합니다.");
  }

  const calculatedProductCostTotal = validItems.reduce(
    (sum, item) => sum + Number(item.product_cost || 0),
    0,
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
    0,
  );

  const totalQuantity = validItems.reduce(
    (sum, item) => sum + Number(item.quantity || 0),
    0,
  );

  return {
    validItems,
    productCostTotal,
    extraCostTotal,
    totalCost,
    itemProductCostSum,
    totalQuantity,
  };
}

function calculateImportItem(input: {
  item: ImportOrderItemInput;
  productCostTotal: number;
  extraCostTotal: number;
  itemProductCostSum: number;
  totalQuantity: number;
}) {
  const {
    item,
    productCostTotal,
    extraCostTotal,
    itemProductCostSum,
    totalQuantity,
  } = input;

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

  return {
    allocatedProductCost: Math.round(allocatedProductCost),
    allocatedExtraCost: Math.round(allocatedExtraCost),
    landedCostTotal: Math.round(landedCostTotal),
    landedCostUnit: Math.round(landedCostUnit),
  };
}

async function refreshVariantLandedCost(productVariantId: string) {
  const { data: itemRows, error: itemError } = await supabaseAdmin
    .from("import_order_items")
    .select("id, import_order_id, landed_cost_unit, created_at")
    .eq("product_variant_id", productVariantId);

  if (itemError) {
    throw new Error(itemError.message);
  }

  if (!itemRows || itemRows.length === 0) {
    await updateVariantLandedCost({
      product_variant_id: productVariantId,
      landed_cost_unit: null,
    });
    return;
  }

  const importOrderIds = Array.from(
    new Set(itemRows.map((row) => String(row.import_order_id)).filter(Boolean)),
  );

  const { data: orderRows, error: orderError } = await supabaseAdmin
    .from("import_orders")
    .select("id, import_date, created_at")
    .in("id", importOrderIds);

  if (orderError) {
    throw new Error(orderError.message);
  }

  const orderDateMap = new Map<string, { importDate: string; createdAt: string }>();

  (orderRows || []).forEach((row) => {
    orderDateMap.set(String(row.id), {
      importDate: String(row.import_date || ""),
      createdAt: String(row.created_at || ""),
    });
  });

  const sortedItems = [...itemRows].sort((a, b) => {
    const aOrder = orderDateMap.get(String(a.import_order_id));
    const bOrder = orderDateMap.get(String(b.import_order_id));

    const aDate = aOrder?.importDate || aOrder?.createdAt || String(a.created_at || "");
    const bDate = bOrder?.importDate || bOrder?.createdAt || String(b.created_at || "");

    if (aDate !== bDate) {
      return bDate.localeCompare(aDate);
    }

    const aCreatedAt = aOrder?.createdAt || String(a.created_at || "");
    const bCreatedAt = bOrder?.createdAt || String(b.created_at || "");

    return bCreatedAt.localeCompare(aCreatedAt);
  });

  const latestItem = sortedItems[0];

  await updateVariantLandedCost({
    product_variant_id: productVariantId,
    landed_cost_unit: Number(latestItem?.landed_cost_unit || 0),
  });
}

export async function createImportOrder(input: ImportOrderInput) {
  const prepared = prepareImportOrder(input);

  const { data: importOrder, error: importOrderError } = await supabaseAdmin
    .from("import_orders")
    .insert({
      po_number: input.po_number,
      supplier_name: input.supplier_name || null,
      import_date: input.import_date || null,
      product_cost_total: prepared.productCostTotal,
      duty_amount: input.duty_amount,
      vat_amount: input.vat_amount,
      freight_amount: input.freight_amount,
      customs_broker_fee: input.customs_broker_fee,
      tobacco_tax_amount: input.tobacco_tax_amount,
      total_cost: prepared.totalCost,
      memo: input.memo || null,
      created_by_operator_id: input.created_by_operator_id || null,
    })
    .select("*")
    .single();

  if (importOrderError) {
    throw new Error(importOrderError.message);
  }

  const affectedVariantIds = new Set<string>();

  for (const item of prepared.validItems) {
    const calculated = calculateImportItem({
      item,
      productCostTotal: prepared.productCostTotal,
      extraCostTotal: prepared.extraCostTotal,
      itemProductCostSum: prepared.itemProductCostSum,
      totalQuantity: prepared.totalQuantity,
    });

    const { data: savedItem, error: itemError } = await supabaseAdmin
      .from("import_order_items")
      .insert({
        import_order_id: importOrder.id,
        product_model_id: item.product_model_id,
        product_variant_id: item.product_variant_id,
        quantity: item.quantity,
        product_cost: calculated.allocatedProductCost,
        allocated_extra_cost: calculated.allocatedExtraCost,
        landed_cost_total: calculated.landedCostTotal,
        landed_cost_unit: calculated.landedCostUnit,
      })
      .select("id")
      .single();

    if (itemError) {
      throw new Error(itemError.message);
    }

    affectedVariantIds.add(item.product_variant_id);

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

  for (const variantId of affectedVariantIds) {
    await refreshVariantLandedCost(variantId);
  }

  return importOrder as ImportOrder;
}

export async function updateImportOrder(input: ImportOrderUpdateInput) {
  if (!input.id) {
    throw new Error("수정할 수입 건 ID가 없습니다.");
  }

  const prepared = prepareImportOrder(input);

  const { data: existingItems, error: existingItemsError } = await supabaseAdmin
    .from("import_order_items")
    .select("id, product_variant_id")
    .eq("import_order_id", input.id);

  if (existingItemsError) {
    throw new Error(existingItemsError.message);
  }

  const affectedVariantIds = new Set<string>();

  (existingItems || []).forEach((item) => {
    if (item.product_variant_id) {
      affectedVariantIds.add(String(item.product_variant_id));
    }
  });

  const { data: updatedOrder, error: orderUpdateError } = await supabaseAdmin
    .from("import_orders")
    .update({
      po_number: input.po_number,
      supplier_name: input.supplier_name || null,
      import_date: input.import_date || null,
      product_cost_total: prepared.productCostTotal,
      duty_amount: input.duty_amount,
      vat_amount: input.vat_amount,
      freight_amount: input.freight_amount,
      customs_broker_fee: input.customs_broker_fee,
      tobacco_tax_amount: input.tobacco_tax_amount,
      total_cost: prepared.totalCost,
      memo: input.memo || null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", input.id)
    .select("*")
    .single();

  if (orderUpdateError) {
    throw new Error(orderUpdateError.message);
  }

  const { error: inventoryDeleteError } = await supabaseAdmin
    .from("inventory_movements")
    .delete()
    .eq("import_order_id", input.id);

  if (inventoryDeleteError) {
    throw new Error(inventoryDeleteError.message);
  }

  const { error: itemsDeleteError } = await supabaseAdmin
    .from("import_order_items")
    .delete()
    .eq("import_order_id", input.id);

  if (itemsDeleteError) {
    throw new Error(itemsDeleteError.message);
  }

  for (const item of prepared.validItems) {
    const calculated = calculateImportItem({
      item,
      productCostTotal: prepared.productCostTotal,
      extraCostTotal: prepared.extraCostTotal,
      itemProductCostSum: prepared.itemProductCostSum,
      totalQuantity: prepared.totalQuantity,
    });

    const { data: savedItem, error: itemError } = await supabaseAdmin
      .from("import_order_items")
      .insert({
        import_order_id: input.id,
        product_model_id: item.product_model_id,
        product_variant_id: item.product_variant_id,
        quantity: item.quantity,
        product_cost: calculated.allocatedProductCost,
        allocated_extra_cost: calculated.allocatedExtraCost,
        landed_cost_total: calculated.landedCostTotal,
        landed_cost_unit: calculated.landedCostUnit,
      })
      .select("id")
      .single();

    if (itemError) {
      throw new Error(itemError.message);
    }

    affectedVariantIds.add(item.product_variant_id);

    const { error: inventoryError } = await supabaseAdmin
      .from("inventory_movements")
      .insert({
        product_variant_id: item.product_variant_id,
        import_order_id: input.id,
        import_order_item_id: savedItem.id,
        movement_type: "in",
        quantity: item.quantity,
        memo: `${input.po_number} 수입 입고`,
      });

    if (inventoryError) {
      throw new Error(inventoryError.message);
    }
  }

  for (const variantId of affectedVariantIds) {
    await refreshVariantLandedCost(variantId);
  }

  return updatedOrder as ImportOrder;
}