"use server";

import { revalidatePath } from "next/cache";
import {
  createPartner,
  deletePartner,
  setPartnerActive,
  updatePartner,
  type PartnerType,
} from "@/lib/partners";
import { syncCurrentOperator } from "@/lib/operators";

const allowedPartnerTypes: PartnerType[] = [
  "headquarters",
  "wholesale",
  "retail",
  "direct_store",
  "etc",
];

function getStringValue(formData: FormData, key: string) {
  const value = formData.get(key);

  if (typeof value !== "string") {
    return "";
  }

  return value.trim();
}

function getPartnerType(formData: FormData) {
  const partnerTypeValue = getStringValue(formData, "partner_type");

  const partnerType: PartnerType = allowedPartnerTypes.includes(
    partnerTypeValue as PartnerType
  )
    ? (partnerTypeValue as PartnerType)
    : "retail";

  return partnerType;
}

export async function createPartnerAction(formData: FormData) {
  const currentOperator = await syncCurrentOperator();

  if (!currentOperator) {
    throw new Error("로그인이 필요합니다.");
  }

  const name = getStringValue(formData, "name");

  if (!name) {
    throw new Error("거래처명은 필수입니다.");
  }

  await createPartner({
    partner_type: getPartnerType(formData),
    name,
    business_number: getStringValue(formData, "business_number"),
    manager_name: getStringValue(formData, "manager_name"),
    phone: getStringValue(formData, "phone"),
    email: getStringValue(formData, "email"),
    address: getStringValue(formData, "address"),
    settlement_terms: getStringValue(formData, "settlement_terms"),
    memo: getStringValue(formData, "memo"),
    created_by_operator_id: currentOperator.id,
  });

  revalidatePath("/partners");
}

export async function updatePartnerAction(formData: FormData) {
  await syncCurrentOperator();

  const id = getStringValue(formData, "id");
  const name = getStringValue(formData, "name");

  if (!id) {
    throw new Error("거래처 ID가 없습니다.");
  }

  if (!name) {
    throw new Error("거래처명은 필수입니다.");
  }

  await updatePartner({
    id,
    partner_type: getPartnerType(formData),
    name,
    business_number: getStringValue(formData, "business_number"),
    manager_name: getStringValue(formData, "manager_name"),
    phone: getStringValue(formData, "phone"),
    email: getStringValue(formData, "email"),
    address: getStringValue(formData, "address"),
    settlement_terms: getStringValue(formData, "settlement_terms"),
    memo: getStringValue(formData, "memo"),
  });

  revalidatePath("/partners");
}

export async function togglePartnerActiveAction(formData: FormData) {
  await syncCurrentOperator();

  const id = getStringValue(formData, "id");
  const nextIsActive = getStringValue(formData, "next_is_active");

  if (!id) {
    throw new Error("거래처 ID가 없습니다.");
  }

  await setPartnerActive({
    id,
    is_active: nextIsActive === "true",
  });

  revalidatePath("/partners");
}

export async function deletePartnerAction(formData: FormData) {
  await syncCurrentOperator();

  const id = getStringValue(formData, "id");

  if (!id) {
    throw new Error("거래처 ID가 없습니다.");
  }

  await deletePartner(id);

  revalidatePath("/partners");
}