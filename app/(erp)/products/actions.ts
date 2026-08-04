"use server";

import { revalidatePath } from "next/cache";
import {
  createProductModel,
  createProductVariant,
  deleteProductModel,
  deleteProductVariant,
  setProductModelActive,
  setProductVariantActive,
  updateProductModel,
  updateProductModelVariantPrices,
  updateProductVariant,
  type ProductCategory,
  type ProductVariantPriceInput,
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

function getOptionalNumberValue(formData: FormData, key: string) {
  const value = getStringValue(formData, key);

  if (!value) {
    return undefined;
  }

  const numberValue = Number(value.replaceAll(",", ""));

  if (Number.isNaN(numberValue)) {
    throw new Error(`${key} 값이 올바르지 않습니다.`);
  }

  return numberValue;
}

function getCategory(formData: FormData) {
  const value = getStringValue(formData, "category");

  return allowedCategories.includes(value as ProductCategory)
    ? (value as ProductCategory)
    : "disposable";
}

function getPriceValues(formData: FormData): ProductVariantPriceInput {
  return {
    headquarters: null,
    wholesale: getNumberValue(formData, "price_wholesale"),
    retail: getNumberValue(formData, "price_retail"),
    direct_store: getNumberValue(formData, "price_direct_store"),
    etc: getNumberValue(formData, "price_etc"),
  };
}

function getEditablePriceValues(
  formData: FormData,
): ProductVariantPriceInput {
  return {
    wholesale: getNumberValue(formData, "price_wholesale"),
    retail: getNumberValue(formData, "price_retail"),
    direct_store: getNumberValue(formData, "price_direct_store"),
    etc: getNumberValue(formData, "price_etc"),
  };
}

function getOptionalModelPriceValues(
  formData: FormData,
): ProductVariantPriceInput {
  const prices: ProductVariantPriceInput = {};

  const wholesale = getOptionalNumberValue(formData, "price_wholesale");
  const retail = getOptionalNumberValue(formData, "price_retail");
  const directStore = getOptionalNumberValue(
    formData,
    "price_direct_store",
  );
  const etc = getOptionalNumberValue(formData, "price_etc");

  if (wholesale !== undefined) prices.wholesale = wholesale;
  if (retail !== undefined) prices.retail = retail;
  if (directStore !== undefined) prices.direct_store = directStore;
  if (etc !== undefined) prices.etc = etc;

  return prices;
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

export async function updateProductModelAction(formData: FormData) {
  const currentOperator = await syncCurrentOperator();

  if (!currentOperator) {
    throw new Error("로그인이 필요합니다.");
  }

  const id = getStringValue(formData, "id");
  const modelName = getStringValue(formData, "model_name");

  if (!id) {
    throw new Error("제품 모델 ID가 없습니다.");
  }

  if (!modelName) {
    throw new Error("모델명은 필수입니다.");
  }

  await updateProductModel({
    id,
    category: getCategory(formData),
    model_name: modelName,
    brand: getStringValue(formData, "brand"),
    english_name: getStringValue(formData, "english_name"),
    origin_country: getStringValue(formData, "origin_country"),
    specification: getStringValue(formData, "specification"),
    unit: getStringValue(formData, "unit") || "ea",
    hs_code: getStringValue(formData, "hs_code"),
    memo: getStringValue(formData, "memo"),
  });

  const modelPrices = getOptionalModelPriceValues(formData);

  if (Object.keys(modelPrices).length > 0) {
    await updateProductModelVariantPrices({
      product_model_id: id,
      prices: modelPrices,
    });
  }

  revalidatePath("/products");
  revalidatePath("/orders");
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

export async function updateProductVariantAction(formData: FormData) {
  const currentOperator = await syncCurrentOperator();

  if (!currentOperator) {
    throw new Error("로그인이 필요합니다.");
  }

  const id = getStringValue(formData, "id");
  const category = getCategory(formData);
  const optionName = getStringValue(formData, "option_name");

  if (!id) {
    throw new Error("제품 옵션 ID가 없습니다.");
  }

  if (!optionName) {
    throw new Error(category === "device" ? "색상명은 필수입니다." : "맛 이름은 필수입니다.");
  }

  await updateProductVariant({
    id,
    sku: getStringValue(formData, "sku"),
    flavor: category === "device" ? "" : optionName,
    color: category === "device" ? optionName : "",
    nicotine_content:
      category === "device"
        ? ""
        : getStringValue(formData, "nicotine_content"),
    barcode: getStringValue(formData, "barcode"),
    box_quantity: getNumberValue(formData, "box_quantity"),
    memo: getStringValue(formData, "variant_memo"),
    prices: getEditablePriceValues(formData),
  });

  revalidatePath("/products");
  revalidatePath("/orders");
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