"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { calculateOrderTotal } from "@/lib/orders";

type OrderType = "order" | "sample";

type CreateOrderItemInput = {
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
  items: CreateOrderItemInput[];
};

function createOrderNumber(orderType: OrderType) {
  const now = new Date();
  const date = now.toISOString().slice(0, 10).replaceAll("-", "");
  const time = now.getTime().toString().slice(-6);

  return `${orderType === "sample" ? "SMP" : "ORD"}-${date}-${time}`;
}

export async function createOrder(input: CreateOrderInput) {
  const supabase = createClient();

  const orderType: OrderType = input.orderType || "order";

  const validItems = input.items.filter((item) => {
    return item.productModelId && Number(item.quantity || 0) > 0;
  });

  if (validItems.length === 0) {
    throw new Error("주문 품목을 1개 이상 입력해주세요.");
  }

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

  const normalizedItems =
    orderType === "sample"
      ? validItems.map((item) => ({
          ...item,
          priceType: "sample",
          unitPrice: 0,
        }))
      : validItems;

  const { totalQuantity, totalAmount } = calculateOrderTotal(
    normalizedItems.map((item) => ({
      quantity: Number(item.quantity || 0),
      unitPrice: Number(item.unitPrice || 0),
    }))
  );

  const orderNumber = createOrderNumber(orderType);

  const displayName =
    orderType === "sample"
      ? input.recipientName || input.partnerName || "샘플"
      : input.partnerName || "";

  const displayType =
    orderType === "sample"
      ? input.partnerType || "직접입력"
      : input.partnerType || "";

  const { data: order, error: orderError } = await supabase
    .from("orders")
    .insert({
      order_type: orderType,
      order_number: orderNumber,
      partner_id: input.partnerId || null,
      partner_name: displayName,
      partner_type: displayType,
      recipient_name:
        orderType === "sample"
          ? input.recipientName || input.partnerName || null
          : input.partnerName || null,
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

  const orderItems = normalizedItems.map((item) => {
    const quantity = Number(item.quantity || 0);
    const unitPrice = Number(item.unitPrice || 0);

    return {
      order_id: order.id,
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
  });

  const { error: itemsError } = await supabase
    .from("order_items")
    .insert(orderItems);

  if (itemsError) {
    throw new Error(itemsError.message);
  }

  revalidatePath("/orders");

  return {
    success: true,
    orderId: order.id,
  };
}

export async function deleteOrder(orderId: string) {
  const supabase = createClient();

  if (!orderId) {
    throw new Error("삭제할 주문 ID가 없습니다.");
  }

  const { error } = await supabase.from("orders").delete().eq("id", orderId);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/orders");

  return {
    success: true,
  };
}