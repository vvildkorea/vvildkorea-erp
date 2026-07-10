"use server";

import { revalidatePath } from "next/cache";
import { syncCurrentOperator } from "@/lib/operators";
import { supabaseAdmin } from "@/lib/supabase/admin";

const editableRoles = [
  "owner",
  "admin",
  "staff",
  "viewer",
  "pending",
] as const;

type OperatorRole = (typeof editableRoles)[number];

type OperatorWithPermissions = {
  id: string;
  email: string;
  role: OperatorRole;
  is_active?: boolean | null;
  can_access_operators?: boolean | null;
};

function isOperatorRole(value: string): value is OperatorRole {
  return editableRoles.includes(value as OperatorRole);
}

function getBooleanValue(formData: FormData, key: string) {
  return formData.get(key) === "on";
}

function canManageOperators(
  operator: OperatorWithPermissions | null,
): operator is OperatorWithPermissions {
  if (!operator) {
    return false;
  }

  if (operator.is_active === false || operator.role === "pending") {
    return false;
  }

  return (
    operator.role === "owner" ||
    operator.role === "admin" ||
    operator.can_access_operators === true
  );
}

export async function updateOperatorPermissions(formData: FormData) {
  const currentOperator =
    (await syncCurrentOperator()) as OperatorWithPermissions | null;

  if (!currentOperator) {
    throw new Error("로그인 정보를 확인할 수 없습니다.");
  }

  if (!canManageOperators(currentOperator)) {
    throw new Error("운영자 권한을 수정할 수 있는 권한이 없습니다.");
  }

  const operatorId = String(formData.get("operatorId") ?? "");
  const role = String(formData.get("role") ?? "");

  if (!operatorId) {
    throw new Error("운영자 ID가 없습니다.");
  }

  if (!isOperatorRole(role)) {
    throw new Error("올바르지 않은 권한입니다.");
  }

  const { data: targetOperator, error: targetError } = await supabaseAdmin
    .from("operators")
    .select("id, email, role")
    .eq("id", operatorId)
    .single();

  if (targetError || !targetOperator) {
    throw new Error("수정할 운영자를 찾을 수 없습니다.");
  }

  const targetRole = String(targetOperator.role ?? "") as OperatorRole;

  if (currentOperator.role !== "owner" && targetRole === "owner") {
    throw new Error("최고관리자 권한은 최고관리자만 수정할 수 있습니다.");
  }

  if (currentOperator.role !== "owner" && role === "owner") {
    throw new Error("최고관리자 권한은 최고관리자만 부여할 수 있습니다.");
  }

  const isSelf = currentOperator.id === operatorId;

  const nextIsActive = isSelf
    ? true
    : getBooleanValue(formData, "is_active");

  const nextPermissions =
    role === "owner"
      ? {
          can_access_dashboard: true,
          can_access_orders: true,
          can_access_partners: true,
          can_access_products: true,
          can_access_import_forwarding: true,
          can_access_inventory: true,
          can_access_accounting_network: true,
          can_access_operators: true,
        }
      : {
          can_access_dashboard: getBooleanValue(
            formData,
            "can_access_dashboard",
          ),
          can_access_orders: getBooleanValue(
            formData,
            "can_access_orders",
          ),
          can_access_partners: getBooleanValue(
            formData,
            "can_access_partners",
          ),
          can_access_products: getBooleanValue(
            formData,
            "can_access_products",
          ),
          can_access_import_forwarding: getBooleanValue(
            formData,
            "can_access_import_forwarding",
          ),
          can_access_inventory: getBooleanValue(
            formData,
            "can_access_inventory",
          ),
          can_access_accounting_network: getBooleanValue(
            formData,
            "can_access_accounting_network",
          ),
          can_access_operators: getBooleanValue(
            formData,
            "can_access_operators",
          ),
        };

  const { error } = await supabaseAdmin
    .from("operators")
    .update({
      role,
      is_active: nextIsActive,
      ...nextPermissions,
      updated_at: new Date().toISOString(),
    })
    .eq("id", operatorId);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/operators");
  revalidatePath("/dashboard");
}

export async function deleteOperator(formData: FormData) {
  const currentOperator =
    (await syncCurrentOperator()) as OperatorWithPermissions | null;

  if (!currentOperator) {
    throw new Error("로그인 정보를 확인할 수 없습니다.");
  }

  if (!canManageOperators(currentOperator)) {
    throw new Error("운영자를 삭제할 수 있는 권한이 없습니다.");
  }

  const operatorId = String(formData.get("operatorId") ?? "");

  if (!operatorId) {
    throw new Error("삭제할 운영자 ID가 없습니다.");
  }

  if (currentOperator.id === operatorId) {
    throw new Error("현재 로그인한 본인 계정은 삭제할 수 없습니다.");
  }

  const { data: targetOperator, error: targetError } = await supabaseAdmin
    .from("operators")
    .select("id, email, name, role")
    .eq("id", operatorId)
    .single();

  if (targetError || !targetOperator) {
    throw new Error("삭제할 운영자를 찾을 수 없습니다.");
  }

  const targetRole = String(targetOperator.role ?? "") as OperatorRole;

  if (targetRole === "owner") {
    throw new Error("최고관리자 계정은 삭제할 수 없습니다.");
  }

  const { error: deleteError } = await supabaseAdmin
    .from("operators")
    .delete()
    .eq("id", operatorId);

  if (deleteError) {
    throw new Error(deleteError.message);
  }

  revalidatePath("/operators");
  revalidatePath("/dashboard");
}