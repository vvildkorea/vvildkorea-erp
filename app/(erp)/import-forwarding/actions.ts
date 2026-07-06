"use server";

import { revalidatePath } from "next/cache";
import { createImportOrder } from "@/lib/imports";
import { syncCurrentOperator } from "@/lib/operators";

function getStringValue(formData: FormData, key: string) {
  const value = formData.get(key);

  if (typeof value !== "string") {
    return "";
  }

  return value.trim();
}

function getNumberValue(formData: FormData, key: string) {
  const value = getStringValue(formData, key);

  if (!value) {
    return 0;
  }

  const numberValue = Number(value.replaceAll(",", ""));

  if (Number.isNaN(numberValue)) {
    return 0;
  }

  return numberValue;
}

function getNumberFromArray(values: FormDataEntryValue[], index: number) {
  const value = values[index];

  if (typeof value !== "string" || !value.trim()) {
    return 0;
  }

  const numberValue = Number(value.replaceAll(",", ""));

  if (Number.isNaN(numberValue)) {
    return 0;
  }

  return numberValue;
}

export async function createImportOrderAction(formData: FormData) {
  const currentOperator = await syncCurrentOperator();

  if (!currentOperator) {
    throw new Error("로그인이 필요합니다.");
  }

  const poNumber = getStringValue(formData, "po_number");

  if (!poNumber) {
    throw new Error("P/O 번호는 필수입니다.");
  }

  const productModelIds = formData.getAll("product_model_id");
  const quantities = formData.getAll("quantity");
  const productCosts = formData.getAll("product_cost");

  const items = productModelIds.map((productModelId, index) => ({
    product_model_id:
      typeof productModelId === "string" ? productModelId.trim() : "",
    quantity: getNumberFromArray(quantities, index),
    product_cost: getNumberFromArray(productCosts, index),
  }));

  await createImportOrder({
    po_number: poNumber,
    supplier_name: getStringValue(formData, "supplier_name"),
    import_date: getStringValue(formData, "import_date"),

    product_cost_total: getNumberValue(formData, "product_cost_total"),
    duty_amount: getNumberValue(formData, "duty_amount"),
    vat_amount: getNumberValue(formData, "vat_amount"),
    freight_amount: getNumberValue(formData, "freight_amount"),
    customs_broker_fee: getNumberValue(formData, "customs_broker_fee"),
    tobacco_tax_amount: getNumberValue(formData, "tobacco_tax_amount"),

    memo: getStringValue(formData, "memo"),
    created_by_operator_id: currentOperator.id,

    items,
  });

  revalidatePath("/import-forwarding");
  revalidatePath("/products");
}