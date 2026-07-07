"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

type InventoryActionType =
  | "in"
  | "return"
  | "adjustment_in"
  | "adjustment_out";

const actionLabels: Record<InventoryActionType, string> = {
  in: "입고",
  return: "반품입고",
  adjustment_in: "재고증가",
  adjustment_out: "재고차감",
};

function normalizeInventoryAction(input: {
  actionType: InventoryActionType;
  quantity: number;
}) {
  const absoluteQuantity = Math.abs(Number(input.quantity || 0));

  if (input.actionType === "in") {
    return {
      movement_type: "in",
      quantity: absoluteQuantity,
    };
  }

  if (input.actionType === "return") {
    return {
      movement_type: "return",
      quantity: absoluteQuantity,
    };
  }

  if (input.actionType === "adjustment_in") {
    return {
      movement_type: "adjustment",
      quantity: absoluteQuantity,
    };
  }

  return {
    movement_type: "adjustment",
    quantity: -absoluteQuantity,
  };
}

function getInventoryActionType(value: FormDataEntryValue | null) {
  const actionType = String(value || "in") as InventoryActionType;

  if (
    !["in", "return", "adjustment_in", "adjustment_out"].includes(actionType)
  ) {
    throw new Error("재고 처리 구분이 올바르지 않습니다.");
  }

  return actionType;
}

export async function createInventoryMovement(formData: FormData): Promise<void> {
  const supabase = createClient();

  const productVariantId = String(formData.get("productVariantId") || "");
  const actionType = getInventoryActionType(formData.get("movementType"));
  const quantity = Number(formData.get("quantity") || 0);
  const memo = String(formData.get("memo") || "").trim();

  if (!productVariantId) {
    throw new Error("제품 옵션 ID가 없습니다.");
  }

  if (!Number.isInteger(quantity) || quantity <= 0) {
    throw new Error("수량은 1개 이상 정수로 입력해주세요.");
  }

  const normalized = normalizeInventoryAction({
    actionType,
    quantity,
  });

  const { error } = await supabase.from("inventory_movements").insert({
    product_variant_id: productVariantId,
    movement_type: normalized.movement_type,
    quantity: normalized.quantity,
    memo: memo || actionLabels[actionType],
  });

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/inventory");
}

export async function createBulkInventoryInMovements(
  formData: FormData
): Promise<void> {
  const supabase = createClient();

  const productVariantIds = formData
    .getAll("productVariantIds")
    .map((value) => String(value))
    .filter(Boolean);

  const quantity = Number(formData.get("bulkQuantity") || 0);
  const memo = String(formData.get("bulkMemo") || "").trim();

  if (productVariantIds.length === 0) {
    throw new Error("입고등록할 항목을 선택해주세요.");
  }

  if (!Number.isInteger(quantity) || quantity <= 0) {
    throw new Error("일괄 입고 수량은 1개 이상 정수로 입력해주세요.");
  }

  const inventoryMovements = productVariantIds.map((productVariantId) => ({
    product_variant_id: productVariantId,
    movement_type: "in",
    quantity,
    memo: memo || `선택항목 일괄 입고 ${quantity}개`,
  }));

  const { error } = await supabase
    .from("inventory_movements")
    .insert(inventoryMovements);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/inventory");
}

export async function updateInventoryMovement(formData: FormData): Promise<void> {
  const supabase = createClient();

  const movementId = String(formData.get("movementId") || "");
  const actionType = getInventoryActionType(formData.get("movementType"));
  const quantity = Number(formData.get("quantity") || 0);
  const memo = String(formData.get("memo") || "").trim();

  if (!movementId) {
    throw new Error("수정할 재고 이력 ID가 없습니다.");
  }

  if (!Number.isInteger(quantity) || quantity <= 0) {
    throw new Error("수량은 1개 이상 정수로 입력해주세요.");
  }

  const { data: movement, error: readError } = await supabase
    .from("inventory_movements")
    .select("id, order_id, import_order_id")
    .eq("id", movementId)
    .single();

  if (readError) {
    throw new Error(readError.message);
  }

  if (!movement) {
    throw new Error("수정할 재고 이력을 찾을 수 없습니다.");
  }

  if (movement.order_id || movement.import_order_id) {
    throw new Error(
      "주문 또는 수입/포워딩에서 자동 생성된 재고 이력은 여기서 수정할 수 없습니다."
    );
  }

  const normalized = normalizeInventoryAction({
    actionType,
    quantity,
  });

  const { error } = await supabase
    .from("inventory_movements")
    .update({
      movement_type: normalized.movement_type,
      quantity: normalized.quantity,
      memo: memo || actionLabels[actionType],
    })
    .eq("id", movementId);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/inventory");
}