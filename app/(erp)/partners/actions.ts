"use server";

import { revalidatePath } from "next/cache";
import { createPartner, type PartnerType } from "@/lib/partners";
import { syncCurrentOperator } from "@/lib/operators";

const allowedPartnerTypes: PartnerType[] = [
  "buyer",
  "supplier",
  "forwarder",
  "warehouse",
  "etc",
];

function getStringValue(formData: FormData, key: string) {
  const value = formData.get(key);

  if (typeof value !== "string") {
    return "";
  }

  return value.trim();
}

export async function createPartnerAction(formData: FormData) {
  const currentOperator = await syncCurrentOperator();

  if (!currentOperator) {
    throw new Error("로그인이 필요합니다.");
  }

  const partnerTypeValue = getStringValue(formData, "partner_type");

  const partnerType: PartnerType = allowedPartnerTypes.includes(
    partnerTypeValue as PartnerType
  )
    ? (partnerTypeValue as PartnerType)
    : "buyer";

  const name = getStringValue(formData, "name");

  if (!name) {
    throw new Error("거래처명은 필수입니다.");
  }

  await createPartner({
    partner_type: partnerType,
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