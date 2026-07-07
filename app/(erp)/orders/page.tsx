import { createClient } from "@/lib/supabase/server";
import { formatKrw } from "@/lib/orders";
import OrderCreateModal from "./order-create-modal";
import OrderDetailModal from "./order-detail-modal";

export const dynamic = "force-dynamic";

const PARTNER_TABLES = ["partners", "business_partners", "clients", "customers"];
const PRODUCT_MODEL_TABLES = ["product_models", "products"];
const PRODUCT_VARIANT_TABLES = [
  "product_variants",
  "product_options",
  "product_model_variants",
  "product_model_options",
  "variants",
];

const PRODUCT_PRICE_TABLES = [
  "product_variant_prices",
  "product_prices",
  "product_model_prices",
  "prices",
];

async function getRowsFromFirstAvailableTable(
  supabase: any,
  tableNames: string[]
) {
  let emptySuccessData: any[] | null = null;

  for (const tableName of tableNames) {
    let result = await supabase
      .from(tableName)
      .select("*")
      .order("created_at", { ascending: false });

    if (result.error) {
      result = await supabase
        .from(tableName)
        .select("*")
        .order("updated_at", { ascending: false });
    }

    if (result.error) {
      result = await supabase.from(tableName).select("*");
    }

    if (!result.error) {
      const data = result.data || [];

      if (data.length > 0) {
        return data;
      }

      if (emptySuccessData === null) {
        emptySuccessData = data;
      }
    }
  }

  return emptySuccessData || [];
}

function toStringId(value: any) {
  if (value === null || value === undefined || value === "") return "";
  return String(value);
}

function unique(values: string[]) {
  return Array.from(new Set(values.filter(Boolean)));
}

function getProductModelId(row: any) {
  return toStringId(row.id);
}

function getProductLinkIds(model: any) {
  return unique([
    toStringId(model.id),
    toStringId(model.product_model_id),
    toStringId(model.product_id),
    toStringId(model.model_id),
    toStringId(model.parent_id),
    toStringId(model.item_id),
  ]);
}

function getVariantRelatedIds(row: any) {
  return unique([
    toStringId(row.product_model_id),
    toStringId(row.product_id),
    toStringId(row.model_id),
    toStringId(row.parent_id),
    toStringId(row.item_id),
  ]);
}

function getPriceRelatedIds(row: any) {
  return unique([
    toStringId(row.product_model_id),
    toStringId(row.product_id),
    toStringId(row.model_id),
    toStringId(row.parent_id),
    toStringId(row.item_id),
    toStringId(row.product_variant_id),
    toStringId(row.variant_id),
    toStringId(row.option_id),
    toStringId(row.product_option_id),
  ]);
}

function getProductName(row: any) {
  return (
    row.model_name ||
    row.product_name ||
    row.name ||
    row.title ||
    row.model ||
    ""
  );
}

function getProductCategory(row: any) {
  return (
    row.category ||
    row.product_category ||
    row.product_type ||
    row.type ||
    row.kind ||
    ""
  );
}

function getPriceType(row: any) {
  return (
    row.price_type ||
    row.partner_type ||
    row.type ||
    row.price_key ||
    row.key ||
    row.name ||
    ""
  );
}

function getPriceValue(row: any) {
  return (
    row.price ??
    row.amount ??
    row.value ??
    row.unit_price ??
    row.unitPrice ??
    row.price_value ??
    row.priceValue ??
    0
  );
}

function getInlinePrices(row: any) {
  return [
    {
      id: `${row.id}-headquarters`,
      product_model_id: row.id,
      price_type: "headquarters",
      price:
        row.headquarters ??
        row.headquarters_price ??
        row.headquartersPrice ??
        row.price_headquarters ??
        row.landed_cost ??
        row.landed_cost_price ??
        row.landedCost ??
        row.arrival_cost ??
        row.arrival_cost_price ??
        0,
    },
    {
      id: `${row.id}-wholesale`,
      product_model_id: row.id,
      price_type: "wholesale",
      price:
        row.wholesale ??
        row.wholesale_price ??
        row.wholesalePrice ??
        row.price_wholesale ??
        row.supply_price ??
        row.supplyPrice ??
        row.supply ??
        0,
    },
    {
      id: `${row.id}-retail`,
      product_model_id: row.id,
      price_type: "retail",
      price:
        row.retail ??
        row.retail_price ??
        row.retailPrice ??
        row.price_retail ??
        row.dealer_price ??
        row.dealerPrice ??
        row.wholesale_sale_price ??
        0,
    },
    {
      id: `${row.id}-direct_store`,
      product_model_id: row.id,
      price_type: "direct_store",
      price:
        row.direct_store ??
        row.direct_store_price ??
        row.directStorePrice ??
        row.price_direct_store ??
        row.store_price ??
        row.storePrice ??
        0,
    },
    {
      id: `${row.id}-etc`,
      product_model_id: row.id,
      price_type: "etc",
      price:
        row.etc ??
        row.etc_price ??
        row.etcPrice ??
        row.price_etc ??
        row.sale_price ??
        row.selling_price ??
        row.consumer_price ??
        row.price ??
        0,
    },
  ];
}

function isSameName(a: any, b: any) {
  const left = String(a || "").trim();
  const right = String(b || "").trim();

  if (!left || !right) return false;

  return left === right;
}

export default async function OrdersPage() {
  const supabase = createClient();

  const [
    ordersResult,
    partners,
    productModels,
    productVariants,
    productPrices,
  ] = await Promise.all([
    supabase
      .from("orders")
      .select("*, order_items(*)")
      .order("created_at", { ascending: false }),

    getRowsFromFirstAvailableTable(supabase, PARTNER_TABLES),
    getRowsFromFirstAvailableTable(supabase, PRODUCT_MODEL_TABLES),
    getRowsFromFirstAvailableTable(supabase, PRODUCT_VARIANT_TABLES),
    getRowsFromFirstAvailableTable(supabase, PRODUCT_PRICE_TABLES),
  ]);

  if (ordersResult.error) {
    throw new Error(ordersResult.error.message);
  }

  const orders = ordersResult.data || [];

  const products = productModels.map((model: any) => {
    const modelId = getProductModelId(model);
    const productLinkIds = getProductLinkIds(model);
    const productName = getProductName(model);

    const variants = productVariants.filter((variant: any) => {
      const variantRelatedIds = getVariantRelatedIds(variant);

      return variantRelatedIds.some((id) => productLinkIds.includes(id));
    });

    const variantIds = variants.map((variant: any) => toStringId(variant.id));

    const allLinkIds = unique([...productLinkIds, ...variantIds]);

    const pricesFromTable = productPrices
      .filter((price: any) => {
        const priceRelatedIds = getPriceRelatedIds(price);

        if (priceRelatedIds.some((id) => allLinkIds.includes(id))) {
          return true;
        }

        const priceProductName =
          price.model_name ||
          price.product_name ||
          price.product_model_name ||
          price.product ||
          "";

        if (isSameName(priceProductName, productName)) {
          return true;
        }

        return false;
      })
      .map((price: any, index: number) => ({
        ...price,
        id: price.id || `${modelId}-price-${index}`,
        product_model_id:
          price.product_model_id ||
          price.product_id ||
          price.model_id ||
          modelId,
        price_type: getPriceType(price),
        price: getPriceValue(price),
      }));

    const inlinePrices = getInlinePrices(model);

    const prices = [...pricesFromTable, ...inlinePrices];

    return {
      ...model,
      id: modelId,
      model_name: productName,
      category: getProductCategory(model),
      variants,
      prices,
    };
  });

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">주문 관리</h1>
          <p className="mt-1 text-sm text-gray-500">
            거래처별 주문을 생성하고 주문 품목을 관리합니다.
          </p>
        </div>

        <OrderCreateModal partners={partners} products={products} />
      </div>

      <div className="rounded-2xl border bg-white">
        <div className="border-b px-5 py-4">
          <h2 className="font-semibold">주문 목록</h2>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] border-collapse text-sm">
            <thead>
              <tr className="border-b bg-gray-50">
                <th className="px-4 py-3 text-left">주문일</th>
                <th className="px-4 py-3 text-left">주문번호</th>
                <th className="px-4 py-3 text-left">거래처</th>
                <th className="px-4 py-3 text-left">구분</th>
                <th className="px-4 py-3 text-right">총 수량</th>
                <th className="px-4 py-3 text-right">주문금액</th>
                <th className="px-4 py-3 text-left">상태</th>
                <th className="px-4 py-3 text-left">관리</th>
              </tr>
            </thead>

            <tbody>
              {orders.length === 0 ? (
                <tr>
                  <td
                    colSpan={9}
                    className="px-4 py-10 text-center text-gray-500"
                  >
                    등록된 주문이 없습니다.
                  </td>
                </tr>
              ) : (
                orders.map((order: any) => (
                  <tr key={order.id} className="border-b last:border-b-0">
                    <td className="px-4 py-3">{order.order_date}</td>
                    <td className="px-4 py-3 font-medium">
                      {order.order_number}
                    </td>
                    <td className="px-4 py-3">{order.partner_name}</td>
                    <td className="px-4 py-3">{order.partner_type}</td>
                    <td className="px-4 py-3 text-right">
                      {Number(order.total_quantity || 0).toLocaleString()}개
                    </td>
                    <td className="px-4 py-3 text-right font-semibold">
                      {formatKrw(order.total_amount)}
                    </td>
                    <td className="px-4 py-3">{order.status}</td>
                    <td className="px-4 py-3 text-gray-500">
                      {order.memo || "-"}
                    </td>
                    <td className="px-4 py-3 text-center">
  <OrderDetailModal order={order} />
</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}