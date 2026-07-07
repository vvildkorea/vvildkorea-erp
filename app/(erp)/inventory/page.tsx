import { createClient } from "@/lib/supabase/server";
import InventoryClient from "./inventory-client";

export const dynamic = "force-dynamic";

type DbRow = Record<string, any>;

function getValue(row: DbRow | undefined, keys: string[], fallback = "-") {
  if (!row) return fallback;

  for (const key of keys) {
    const value = row[key];

    if (value !== undefined && value !== null && String(value).trim() !== "") {
      return String(value);
    }
  }

  return fallback;
}

function getCategoryLabel(category: string) {
  const labels: Record<string, string> = {
    disposable: "일회용기기",
    pod: "팟",
    device: "디바이스",
    liquid: "액상",
    일회용기기: "일회용기기",
    팟: "팟",
    디바이스: "디바이스",
    액상: "액상",
  };

  return labels[category] || category || "-";
}

function formatNumber(value: number | null | undefined) {
  return new Intl.NumberFormat("ko-KR").format(Number(value || 0));
}

export default async function InventoryPage() {
  const supabase = createClient();

  const [variantsResult, modelsResult, inventoryResult, movementsResult] =
    await Promise.all([
      supabase.from("product_variants").select("*"),
      supabase.from("product_models").select("*"),
      supabase.from("current_inventory").select("*"),
      supabase
        .from("inventory_movements")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(500),
    ]);

  const variants = (variantsResult.data || []) as DbRow[];
  const models = (modelsResult.data || []) as DbRow[];
  const inventories = (inventoryResult.data || []) as DbRow[];
  const movements = (movementsResult.data || []) as DbRow[];

  const modelMap = new Map<string, DbRow>();
  const inventoryMap = new Map<string, number>();
  const variantInfoMap = new Map<
    string,
    {
      categoryLabel: string;
      modelName: string;
      optionName: string;
    }
  >();

  const movementSummaryMap = new Map<
    string,
    {
      baseQuantity: number;
      outboundQuantity: number;
    }
  >();

  models.forEach((model) => {
    if (model.id) {
      modelMap.set(String(model.id), model);
    }
  });

  inventories.forEach((inventory) => {
    if (inventory.product_variant_id) {
      inventoryMap.set(
        String(inventory.product_variant_id),
        Number(inventory.current_quantity || 0)
      );
    }
  });

  movements.forEach((movement) => {
    if (!movement.product_variant_id) return;

    const variantId = String(movement.product_variant_id);
    const quantity = Number(movement.quantity || 0);
    const movementType = String(movement.movement_type || "");

    const summary = movementSummaryMap.get(variantId) || {
      baseQuantity: 0,
      outboundQuantity: 0,
    };

    if (
      movementType === "in" ||
      movementType === "return" ||
      movementType === "adjustment"
    ) {
      summary.baseQuantity += quantity;
    }

    if (movementType === "out" || movementType === "sample_out") {
      summary.outboundQuantity += quantity;
    }

    movementSummaryMap.set(variantId, summary);
  });

  const rows = variants.map((variant) => {
    const modelId = String(
      variant.product_model_id ||
        variant.model_id ||
        variant.product_id ||
        ""
    );

    const model = modelMap.get(modelId);

    const category = getValue(
      model,
      ["category", "product_category", "type"],
      getValue(variant, ["category", "product_category", "type"], "-")
    );

    const modelName = getValue(
      model,
      ["model_name", "name", "product_name", "title"],
      getValue(variant, ["model_name", "product_name"], "-")
    );

    const optionName = getValue(variant, [
      "option_name",
      "variant_name",
      "flavor",
      "color",
      "name",
    ]);

    const productVariantId = String(variant.id);
    const summary = movementSummaryMap.get(productVariantId) || {
      baseQuantity: 0,
      outboundQuantity: 0,
    };

    const actualQuantity = inventoryMap.get(productVariantId) || 0;

    const stockRate =
      summary.baseQuantity > 0
        ? (actualQuantity / summary.baseQuantity) * 100
        : 0;

    const categoryLabel = getCategoryLabel(category);

    variantInfoMap.set(productVariantId, {
      categoryLabel,
      modelName,
      optionName,
    });

    return {
      productVariantId,
      categoryLabel,
      modelName,
      optionName,
      baseQuantity: summary.baseQuantity,
      actualQuantity,
      outboundQuantity: summary.outboundQuantity,
      stockRate,
    };
  });

  rows.sort((a, b) => {
    const categoryCompare = a.categoryLabel.localeCompare(b.categoryLabel, "ko");
    if (categoryCompare !== 0) return categoryCompare;

    const modelCompare = a.modelName.localeCompare(b.modelName, "ko");
    if (modelCompare !== 0) return modelCompare;

    return a.optionName.localeCompare(b.optionName, "ko");
  });

  const movementRows = movements.map((movement) => {
    const productVariantId = String(movement.product_variant_id || "");
    const variantInfo = variantInfoMap.get(productVariantId);

    return {
      id: String(movement.id),
      createdAt: movement.created_at || null,
      productLabel: variantInfo
        ? `${variantInfo.categoryLabel} / ${variantInfo.modelName}`
        : "-",
      optionName: variantInfo?.optionName || "-",
      movementType: movement.movement_type || null,
      quantity: Number(movement.quantity || 0),
      memo: movement.memo || null,
    };
  });

  const totalSkuCount = rows.length;
  const totalBaseQuantity = rows.reduce(
    (sum, row) => sum + row.baseQuantity,
    0
  );
  const totalActualQuantity = rows.reduce(
    (sum, row) => sum + row.actualQuantity,
    0
  );
  const totalOutboundQuantity = rows.reduce(
    (sum, row) => sum + row.outboundQuantity,
    0
  );
  const totalStockRate =
    totalBaseQuantity > 0
      ? (totalActualQuantity / totalBaseQuantity) * 100
      : 0;

  const hasError =
    variantsResult.error ||
    modelsResult.error ||
    inventoryResult.error ||
    movementsResult.error;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">재고 관리</h1>
        <p className="mt-1 text-sm text-gray-500">
          제품별 현재재고, 실재고, 출고수량, 재고율을 확인합니다.
        </p>
      </div>

      {hasError ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          <p className="font-semibold">
            재고 데이터를 불러오는 중 오류가 있습니다.
          </p>
          <div className="mt-2 space-y-1">
            {variantsResult.error ? (
              <p>product_variants: {variantsResult.error.message}</p>
            ) : null}
            {modelsResult.error ? (
              <p>product_models: {modelsResult.error.message}</p>
            ) : null}
            {inventoryResult.error ? (
              <p>current_inventory: {inventoryResult.error.message}</p>
            ) : null}
            {movementsResult.error ? (
              <p>inventory_movements: {movementsResult.error.message}</p>
            ) : null}
          </div>
        </div>
      ) : null}

      <div className="grid gap-4 md:grid-cols-4">
        <div className="rounded-xl border bg-white p-4 shadow-sm">
          <p className="text-sm text-gray-500">전체 품목</p>
          <p className="mt-2 text-2xl font-bold text-gray-900">
            {formatNumber(totalSkuCount)}
          </p>
        </div>

        <div className="rounded-xl border bg-white p-4 shadow-sm">
          <p className="text-sm text-gray-500">총 현재재고</p>
          <p className="mt-2 text-2xl font-bold text-gray-900">
            {formatNumber(totalBaseQuantity)}
          </p>
        </div>

        <div className="rounded-xl border bg-white p-4 shadow-sm">
          <p className="text-sm text-gray-500">총 실재고</p>
          <p className="mt-2 text-2xl font-bold text-emerald-700">
            {formatNumber(totalActualQuantity)}
          </p>
        </div>

        <div className="rounded-xl border bg-white p-4 shadow-sm">
          <p className="text-sm text-gray-500">총 출고 / 재고율</p>
          <p className="mt-2 text-2xl font-bold text-gray-900">
            {formatNumber(totalOutboundQuantity)}
          </p>
          <p className="mt-1 text-sm text-gray-500">
            재고율 {totalBaseQuantity > 0 ? totalStockRate.toFixed(1) : "0.0"}%
          </p>
        </div>
      </div>

      <div className="rounded-xl border bg-blue-50 p-4 text-sm text-blue-800">
        <p className="font-semibold">재고 기준</p>
        <p className="mt-1">
          현재재고는 입고, 반품, 재고조정을 합산한 수량입니다. 실재고는
          주문출고와 샘플출고를 차감한 실제 남은 수량입니다.
        </p>
      </div>

      <InventoryClient rows={rows} movements={movementRows} />
    </div>
  );
}