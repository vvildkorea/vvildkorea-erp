"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { calculateOrderTotal } from "@/lib/orders";

type OrderType = "order" | "sample";

type OrderItemInput = {
  id?: string | null;
  productModelId: string;
  productVariantId?: string | null;
  productCategory: string;
  modelName: string;
  optionName?: string | null;
  priceType: string;
  unitPrice: number;
  quantity: number;
};

type CreateOrderInput = {
  orderType?: OrderType;
  partnerId?: string | null;
  partnerName?: string | null;
  partnerType?: string | null;
  recipientName?: string | null;
  orderDate: string;
  memo?: string;
  items: OrderItemInput[];
};

type UpdateOrderInput = {
  orderId: string;
  partnerId?: string | null;
  partnerName?: string | null;
  partnerType?: string | null;
  recipientName?: string | null;
  orderDate: string;
  memo?: string;
  items: OrderItemInput[];
};

function createOrderNumber(orderType: OrderType) {
  const now = new Date();
  const date = now.toISOString().slice(0, 10).replaceAll("-", "");
  const time = now.getTime().toString().slice(-6);

  return `${orderType === "sample" ? "SMP" : "ORD"}-${date}-${time}`;
}

function normalizeOrderType(value: unknown): OrderType {
  return String(value || "").trim().toLowerCase() === "sample"
    ? "sample"
    : "order";
}

function validateAndNormalizeItems(orderType: OrderType, items: OrderItemInput[]) {
  const validItems = items.filter((item) => {
    return item.productModelId && Number(item.quantity || 0) > 0;
  });

  if (validItems.length === 0) {
    throw new Error("주문 품목을 1개 이상 입력해주세요.");
  }

  const itemWithoutVariant = validItems.find((item) => !item.productVariantId);

  if (itemWithoutVariant) {
    throw new Error("주문 품목의 맛/색상을 선택해주세요.");
  }

  return orderType === "sample"
    ? validItems.map((item) => ({
        ...item,
        priceType: "sample",
        unitPrice: 0,
      }))
    : validItems.map((item) => ({
        ...item,
        unitPrice: Math.max(0, Number(item.unitPrice || 0)),
      }));
}

function validateOrderParty(
  orderType: OrderType,
  input: {
    partnerId?: string | null;
    partnerName?: string | null;
    partnerType?: string | null;
    recipientName?: string | null;
  },
) {
  if (orderType === "order") {
    if (!input.partnerId) {
      throw new Error("거래처를 선택해주세요.");
    }

    if (!input.partnerName) {
      throw new Error("거래처명이 없습니다.");
    }

    if (!input.partnerType) {
      throw new Error("거래처 구분이 없습니다.");
    }
  }

  if (orderType === "sample") {
    if (!input.partnerId && !input.recipientName) {
      throw new Error("샘플 수령 거래처를 선택하거나 수령자명을 입력해주세요.");
    }
  }
}

function getOrderPartyValues(
  orderType: OrderType,
  input: {
    partnerId?: string | null;
    partnerName?: string | null;
    partnerType?: string | null;
    recipientName?: string | null;
  },
) {
  const displayName =
    orderType === "sample"
      ? input.recipientName || input.partnerName || "샘플"
      : input.partnerName || "";

  const displayType =
    orderType === "sample"
      ? input.partnerType || "직접입력"
      : input.partnerType || "";

  return {
    partner_id: input.partnerId || null,
    partner_name: displayName,
    partner_type: displayType,
    recipient_name:
      orderType === "sample"
        ? input.recipientName || input.partnerName || null
        : input.partnerName || null,
  };
}

function getOrderItemRow(orderId: string, item: OrderItemInput) {
  const quantity = Number(item.quantity || 0);
  const unitPrice = Number(item.unitPrice || 0);

  return {
    order_id: orderId,
    product_model_id: item.productModelId,
    product_variant_id: item.productVariantId || null,
    product_category: item.productCategory,
    model_name: item.modelName,
    option_name: item.optionName || null,
    price_type: item.priceType,
    unit_price: unitPrice,
    quantity,
    amount: quantity * unitPrice,
  };
}

async function syncInventoryMovementForOrderItem(input: {
  supabase: any;
  orderId: string;
  orderItemId: string;
  productVariantId: string;
  quantity: number;
  orderType: OrderType;
}) {
  const movementType = input.orderType === "sample" ? "sample_out" : "out";
  const movementMemo = input.orderType === "sample" ? "샘플출고" : "주문출고";

  const { data: movements, error: movementSelectError } = await input.supabase
    .from("inventory_movements")
    .select("id, created_at")
    .eq("order_id", input.orderId)
    .eq("order_item_id", input.orderItemId)
    .in("movement_type", ["out", "sample_out"])
    .order("created_at", { ascending: true });

  if (movementSelectError) {
    throw new Error(movementSelectError.message);
  }

  const movementRows = movements || [];
  const primaryMovement = movementRows[0];

  if (primaryMovement) {
    const { error: movementUpdateError } = await input.supabase
      .from("inventory_movements")
      .update({
        product_variant_id: input.productVariantId,
        movement_type: movementType,
        quantity: Number(input.quantity || 0),
        memo: movementMemo,
      })
      .eq("id", primaryMovement.id);

    if (movementUpdateError) {
      throw new Error(movementUpdateError.message);
    }

    const duplicateMovementIds = movementRows
      .slice(1)
      .map((movement: any) => movement.id)
      .filter(Boolean);

    if (duplicateMovementIds.length > 0) {
      const { error: duplicateDeleteError } = await input.supabase
        .from("inventory_movements")
        .delete()
        .in("id", duplicateMovementIds);

      if (duplicateDeleteError) {
        throw new Error(duplicateDeleteError.message);
      }
    }

    return;
  }

  const { error: movementInsertError } = await input.supabase
    .from("inventory_movements")
    .insert({
      product_variant_id: input.productVariantId,
      order_id: input.orderId,
      order_item_id: input.orderItemId,
      movement_type: movementType,
      quantity: Number(input.quantity || 0),
      memo: movementMemo,
    });

  if (movementInsertError) {
    throw new Error(movementInsertError.message);
  }
}

function revalidateOrderRelatedPaths() {
  revalidatePath("/orders");
  revalidatePath("/inventory");
  revalidatePath("/dashboard");
  revalidatePath("/accounting-network");
}

export async function createOrder(input: CreateOrderInput) {
  const supabase = createClient();
  const orderType: OrderType = input.orderType || "order";

  const normalizedItems = validateAndNormalizeItems(orderType, input.items);
  validateOrderParty(orderType, input);

  const { totalQuantity, totalAmount } = calculateOrderTotal(
    normalizedItems.map((item) => ({
      quantity: Number(item.quantity || 0),
      unitPrice: Number(item.unitPrice || 0),
    })),
  );

  const orderNumber = createOrderNumber(orderType);
  const partyValues = getOrderPartyValues(orderType, input);

  const { data: order, error: orderError } = await supabase
    .from("orders")
    .insert({
      order_type: orderType,
      order_number: orderNumber,
      ...partyValues,
      order_date: input.orderDate,
      status: orderType === "sample" ? "샘플출고" : "주문완료",
      total_quantity: totalQuantity,
      total_amount: totalAmount,
      memo: input.memo || null,
    })
    .select("id")
    .single();

  if (orderError) {
    throw new Error(orderError.message);
  }

  const orderItems = normalizedItems.map((item) => getOrderItemRow(order.id, item));

  const { data: savedOrderItems, error: itemsError } = await supabase
    .from("order_items")
    .insert(orderItems)
    .select("id, order_id, product_variant_id, quantity");

  if (itemsError) {
    throw new Error(itemsError.message);
  }

  if (!savedOrderItems || savedOrderItems.length === 0) {
    throw new Error("주문 품목 저장 결과가 없습니다.");
  }

  const movementType = orderType === "sample" ? "sample_out" : "out";

  const inventoryMovements = savedOrderItems.map((item) => ({
    product_variant_id: item.product_variant_id,
    order_id: item.order_id,
    order_item_id: item.id,
    movement_type: movementType,
    quantity: Number(item.quantity || 0),
    memo: orderType === "sample" ? "샘플출고" : "주문출고",
  }));

  const { error: inventoryError } = await supabase
    .from("inventory_movements")
    .insert(inventoryMovements);

  if (inventoryError) {
    throw new Error(inventoryError.message);
  }

  revalidateOrderRelatedPaths();

  return {
    success: true,
    orderId: order.id,
  };
}

export async function updateOrder(input: UpdateOrderInput) {
  const supabase = createClient();

  if (!input.orderId) {
    throw new Error("수정할 주문 ID가 없습니다.");
  }

  const { data: existingOrder, error: orderSelectError } = await supabase
    .from("orders")
    .select("id, order_type, order_number, status")
    .eq("id", input.orderId)
    .single();

  if (orderSelectError) {
    throw new Error(orderSelectError.message);
  }

  const orderType = normalizeOrderType(existingOrder.order_type);
  const normalizedItems = validateAndNormalizeItems(orderType, input.items);
  validateOrderParty(orderType, input);

  const { data: existingItems, error: existingItemsError } = await supabase
    .from("order_items")
    .select("id")
    .eq("order_id", input.orderId);

  if (existingItemsError) {
    throw new Error(existingItemsError.message);
  }

  const existingItemIds = new Set(
    (existingItems || []).map((item: any) => String(item.id)),
  );

  for (const item of normalizedItems) {
    if (item.id && !existingItemIds.has(String(item.id))) {
      throw new Error("수정하려는 주문 품목 정보가 현재 주문과 일치하지 않습니다.");
    }
  }

  const { totalQuantity, totalAmount } = calculateOrderTotal(
    normalizedItems.map((item) => ({
      quantity: Number(item.quantity || 0),
      unitPrice: Number(item.unitPrice || 0),
    })),
  );

  const partyValues = getOrderPartyValues(orderType, input);

  const { error: orderUpdateError } = await supabase
    .from("orders")
    .update({
      ...partyValues,
      order_date: input.orderDate,
      total_quantity: totalQuantity,
      total_amount: totalAmount,
      memo: input.memo || null,
    })
    .eq("id", input.orderId);

  if (orderUpdateError) {
    throw new Error(orderUpdateError.message);
  }

  const submittedExistingItemIds = new Set<string>();

  for (const item of normalizedItems) {
    const row = getOrderItemRow(input.orderId, item);

    if (item.id) {
      const itemId = String(item.id);
      submittedExistingItemIds.add(itemId);

      const { error: itemUpdateError } = await supabase
        .from("order_items")
        .update({
          product_model_id: row.product_model_id,
          product_variant_id: row.product_variant_id,
          product_category: row.product_category,
          model_name: row.model_name,
          option_name: row.option_name,
          price_type: row.price_type,
          unit_price: row.unit_price,
          quantity: row.quantity,
          amount: row.amount,
        })
        .eq("id", itemId)
        .eq("order_id", input.orderId);

      if (itemUpdateError) {
        throw new Error(itemUpdateError.message);
      }

      await syncInventoryMovementForOrderItem({
        supabase,
        orderId: input.orderId,
        orderItemId: itemId,
        productVariantId: String(item.productVariantId),
        quantity: Number(item.quantity || 0),
        orderType,
      });

      continue;
    }

    const { data: savedItem, error: itemInsertError } = await supabase
      .from("order_items")
      .insert(row)
      .select("id")
      .single();

    if (itemInsertError) {
      throw new Error(itemInsertError.message);
    }

    await syncInventoryMovementForOrderItem({
      supabase,
      orderId: input.orderId,
      orderItemId: savedItem.id,
      productVariantId: String(item.productVariantId),
      quantity: Number(item.quantity || 0),
      orderType,
    });
  }

  const removedItemIds = Array.from(existingItemIds).filter(
    (itemId) => !submittedExistingItemIds.has(itemId),
  );

  if (removedItemIds.length > 0) {
    const { error: movementDeleteError } = await supabase
      .from("inventory_movements")
      .delete()
      .eq("order_id", input.orderId)
      .in("order_item_id", removedItemIds)
      .in("movement_type", ["out", "sample_out"]);

    if (movementDeleteError) {
      throw new Error(movementDeleteError.message);
    }

    const { error: itemDeleteError } = await supabase
      .from("order_items")
      .delete()
      .eq("order_id", input.orderId)
      .in("id", removedItemIds);

    if (itemDeleteError) {
      throw new Error(itemDeleteError.message);
    }
  }

  revalidateOrderRelatedPaths();

  return {
    success: true,
    orderId: input.orderId,
  };
}

export async function deleteOrder(orderId: string) {
  const supabase = createClient();

  if (!orderId) {
    throw new Error("삭제할 주문 ID가 없습니다.");
  }

  const { error: inventoryDeleteError } = await supabase
    .from("inventory_movements")
    .delete()
    .eq("order_id", orderId);

  if (inventoryDeleteError) {
    throw new Error(inventoryDeleteError.message);
  }

  const { error: itemsDeleteError } = await supabase
    .from("order_items")
    .delete()
    .eq("order_id", orderId);

  if (itemsDeleteError) {
    throw new Error(itemsDeleteError.message);
  }

  const { error: orderDeleteError } = await supabase
    .from("orders")
    .delete()
    .eq("id", orderId);

  if (orderDeleteError) {
    throw new Error(orderDeleteError.message);
  }

  revalidateOrderRelatedPaths();

  return {
    success: true,
  };
}