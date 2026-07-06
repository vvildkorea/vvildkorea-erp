"use server";

import { revalidatePath } from "next/cache";
import {
  createProductModel,
  createProductVariant,
  deleteProductModel,
  deleteProductVariant,
  setProductModelActive,
  setProductVariantActive,
  type ProductCategory,
} from "@/lib/products";
import { syncCurrentOperator } from "@/lib/operators";

const allowedCategories: ProductCategory[] = [
  "disposable",
  "pod",
  "device",
  "liquid",
];

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
    return null;
  }

  const numberValue = Number(value.replaceAll(",", ""));

  if (Number.isNaN(numberValue)) {
    return null;
  }

  return numberValue;
}

function getCategory(formData: FormData) {
  const value = getStringValue(formData, "category");

  return allowedCategories.includes(value as ProductCategory)
    ? (value as ProductCategory)
    : "disposable";
}

function getPriceValues(formData: FormData) {
  return {
    headquarters: null, // 도착원가는 수입 건에서 자동 계산
    wholesale: getNumberValue(formData, "price_wholesale"),
    retail: getNumberValue(formData, "price_retail"),
    direct_store: getNumberValue(formData, "price_direct_store"),
    etc: getNumberValue(formData, "price_etc"),
  };
}

export async function createProductModelAction(formData: FormData) {
  const currentOperator = await syncCurrentOperator();

  if (!currentOperator) {
    throw new Error("로그인이 필요합니다.");
  }

  const modelName = getStringValue(formData, "model_name");

  if (!modelName) {
    throw new Error("모델명은 필수입니다.");
  }

  await createProductModel({
    category: getCategory(formData),
    model_name: modelName,
    brand: getStringValue(formData, "brand"),
    english_name: getStringValue(formData, "english_name"),
    origin_country: getStringValue(formData, "origin_country"),
    specification: getStringValue(formData, "specification"),
    unit: getStringValue(formData, "unit") || "ea",
    hs_code: getStringValue(formData, "hs_code"),
    memo: getStringValue(formData, "memo"),
    created_by_operator_id: currentOperator.id,
  });

  revalidatePath("/products");
}

export async function createProductVariantAction(formData: FormData) {
  await syncCurrentOperator();

  const productModelId = getStringValue(formData, "product_model_id");

  if (!productModelId) {
    throw new Error("제품 모델 ID가 없습니다.");
  }

  await createProductVariant({
    product_model_id: productModelId,
    sku: getStringValue(formData, "sku"),
    flavor: getStringValue(formData, "flavor"),
    color: getStringValue(formData, "color"),
    nicotine_content: getStringValue(formData, "nicotine_content"),
    barcode: getStringValue(formData, "barcode"),
    box_quantity: getNumberValue(formData, "box_quantity"),
    memo: getStringValue(formData, "variant_memo"),
    prices: getPriceValues(formData),
  });

  revalidatePath("/products");
}

export async function toggleProductModelActiveAction(formData: FormData) {
  await syncCurrentOperator();

  const id = getStringValue(formData, "id");
  const nextIsActive = getStringValue(formData, "next_is_active");

  if (!id) {
    throw new Error("제품 모델 ID가 없습니다.");
  }

  await setProductModelActive({
    id,
    is_active: nextIsActive === "true",
  });

  revalidatePath("/products");
}

export async function toggleProductVariantActiveAction(formData: FormData) {
  await syncCurrentOperator();

  const id = getStringValue(formData, "id");
  const nextIsActive = getStringValue(formData, "next_is_active");

  if (!id) {
    throw new Error("제품 옵션 ID가 없습니다.");
  }

  await setProductVariantActive({
    id,
    is_active: nextIsActive === "true",
  });

  revalidatePath("/products");
}

export async function deleteProductModelAction(formData: FormData) {
  await syncCurrentOperator();

  const id = getStringValue(formData, "id");

  if (!id) {
    throw new Error("제품 모델 ID가 없습니다.");
  }

  await deleteProductModel(id);

  revalidatePath("/products");
}

export async function deleteProductVariantAction(formData: FormData) {
  await syncCurrentOperator();

  const id = getStringValue(formData, "id");

  if (!id) {
    throw new Error("제품 옵션 ID가 없습니다.");
  }

  await deleteProductVariant(id);

  revalidatePath("/products");
}

export async function createProductWithVariantsAction(formData: FormData) {
  const currentOperator = await syncCurrentOperator();

  if (!currentOperator) {
    throw new Error("로그인이 필요합니다.");
  }

  const category = getCategory(formData);
  const modelName = getStringValue(formData, "model_name");

  if (!modelName) {
    throw new Error("모델명은 필수입니다.");
  }

  const model = await createProductModel({
    category,
    model_name: modelName,
    unit: "ea",
    created_by_operator_id: currentOperator.id,
  });

  const optionNames = formData.getAll("option_name");

  const sharedNicotineContent =
    category === "device" ? "" : getStringValue(formData, "nicotine_content");

  const sharedPrices = getPriceValues(formData);

  for (let index = 0; index < optionNames.length; index += 1) {
  const rawOptionName = optionNames[index];

  const optionName =
    typeof rawOptionName === "string" ? rawOptionName.trim() : "";

  if (!optionName) {
    continue;
  }

  await createProductVariant({
    product_model_id: model.id,

    flavor: category === "device" ? "" : optionName,
    color: category === "device" ? optionName : "",

    nicotine_content: sharedNicotineContent,

    prices: sharedPrices,
  });
}

  revalidatePath("/products");
}