"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

type InventoryMovementType = "in" | "return" | "adjustment";

const movementLabels: Record<InventoryMovementType, string> = {
  in: "입고",
  return: "반품",
  adjustment: "재고조정",
};

export async function createInventoryMovement(formData: FormData): Promise<void> {
  const supabase = createClient();

  const productVariantId = String(formData.get("productVariantId") || "");
  const movementType = String(
    formData.get("movementType") || "in"
  ) as InventoryMovementType;
  const quantity = Number(formData.get("quantity") || 0);
  const memo = String(formData.get("memo") || "").trim();

  if (!productVariantId) {
    throw new Error("제품 옵션 ID가 없습니다.");
  }

  if (!["in", "return", "adjustment"].includes(movementType)) {
    throw new Error("재고 처리 구분이 올바르지 않습니다.");
  }

  if (!Number.isInteger(quantity) || quantity === 0) {
    throw new Error("수량은 0이 아닌 정수로 입력해주세요.");
  }

  if ((movementType === "in" || movementType === "return") && quantity < 0) {
    throw new Error("입고와 반품 수량은 양수로 입력해주세요.");
  }

  const { error } = await supabase.from("inventory_movements").insert({
    product_variant_id: productVariantId,
    movement_type: movementType,
    quantity,
    memo: memo || movementLabels[movementType],
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