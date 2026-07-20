import Link from "next/link";
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

type OrderTab = "order" | "sample";

type SearchParams = Record<string, string | string[] | undefined>;

type OrdersPageProps = {
  searchParams?: Promise<SearchParams> | SearchParams;
};

async function getRowsFromFirstAvailableTable(
  supabase: any,
  tableNames: string[],
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

function getSelectedTab(
  value: string | string[] | undefined,
): OrderTab {
  const rawValue = Array.isArray(value) ? value[0] : value;

  return rawValue === "sample" ? "sample" : "order";
}

function getOrderType(order: any): OrderTab {
  const orderType = String(order.order_type || "")
    .trim()
    .toLowerCase();

  if (orderType === "sample") {
    return "sample";
  }

  if (orderType === "order") {
    return "order";
  }

  const orderNumber = String(order.order_number || "")
    .trim()
    .toUpperCase();

  const status = String(order.status || "").trim();

  if (
    orderNumber.startsWith("SMP-") ||
    status === "샘플출고" ||
    status.includes("샘플")
  ) {
    return "sample";
  }

  return "order";
}

export default async function OrdersPage({
  searchParams,
}: OrdersPageProps) {
  const resolvedSearchParams = await Promise.resolve(searchParams ?? {});
  const activeTab = getSelectedTab(resolvedSearchParams.tab);

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

  const regularOrders = orders.filter(
    (order: any) => getOrderType(order) === "order",
  );

  const sampleOrders = orders.filter(
    (order: any) => getOrderType(order) === "sample",
  );

  const displayedOrders =
    activeTab === "sample" ? sampleOrders : regularOrders;

  const products = productModels.map((model: any) => {
    const modelId = getProductModelId(model);
    const productLinkIds = getProductLinkIds(model);
    const productName = getProductName(model);

    const variants = productVariants.filter((variant: any) => {
      const variantRelatedIds = getVariantRelatedIds(variant);

      return variantRelatedIds.some((id) => productLinkIds.includes(id));
    });

    const variantIds = variants.map((variant: any) =>
      toStringId(variant.id),
    );

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
            일반 주문과 샘플 출고를 구분하여 관리합니다.
          </p>
        </div>

        <OrderCreateModal partners={partners} products={products} />
      </div>

      <div className="flex w-fit rounded-xl bg-gray-100 p-1">
        <Link
          href="/orders?tab=order"
          aria-current={activeTab === "order" ? "page" : undefined}
          className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition ${
            activeTab === "order"
              ? "bg-white text-gray-900 shadow-sm ring-1 ring-gray-200"
              : "text-gray-500 hover:text-gray-900"
          }`}
        >
          <span>주문</span>
          <span
            className={`rounded-full px-2 py-0.5 text-xs ${
              activeTab === "order"
                ? "bg-gray-900 text-white"
                : "bg-white text-gray-500"
            }`}
          >
            {regularOrders.length.toLocaleString()}건
          </span>
        </Link>

        <Link
          href="/orders?tab=sample"
          aria-current={activeTab === "sample" ? "page" : undefined}
          className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition ${
            activeTab === "sample"
              ? "bg-white text-gray-900 shadow-sm ring-1 ring-gray-200"
              : "text-gray-500 hover:text-gray-900"
          }`}
        >
          <span>샘플</span>
          <span
            className={`rounded-full px-2 py-0.5 text-xs ${
              activeTab === "sample"
                ? "bg-gray-900 text-white"
                : "bg-white text-gray-500"
            }`}
          >
            {sampleOrders.length.toLocaleString()}건
          </span>
        </Link>
      </div>

      <div className="rounded-2xl border bg-white">
        <div className="flex items-center justify-between border-b px-5 py-4">
          <div>
            <h2 className="font-semibold">
              {activeTab === "sample"
                ? "샘플 출고 목록"
                : "일반 주문 목록"}
            </h2>
            <p className="mt-1 text-xs text-gray-500">
              총 {displayedOrders.length.toLocaleString()}건
            </p>
          </div>

          <span
            className={`rounded-full px-3 py-1 text-xs font-semibold ${
              activeTab === "sample"
                ? "bg-amber-50 text-amber-700"
                : "bg-blue-50 text-blue-700"
            }`}
          >
            {activeTab === "sample" ? "샘플" : "주문"}
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[1000px] border-collapse text-sm">
            <thead>
              <tr className="border-b bg-gray-50">
                <th className="px-4 py-3 text-left">
                  {activeTab === "sample" ? "출고일" : "주문일"}
                </th>
                <th className="px-4 py-3 text-left">
                  {activeTab === "sample" ? "샘플번호" : "주문번호"}
                </th>
                <th className="px-4 py-3 text-left">
                  {activeTab === "sample" ? "수령처" : "거래처"}
                </th>
                <th className="px-4 py-3 text-left">구분</th>
                <th className="px-4 py-3 text-right">총 수량</th>
                <th className="px-4 py-3 text-right">
                  {activeTab === "sample" ? "금액" : "주문금액"}
                </th>
                <th className="px-4 py-3 text-left">상태</th>
                <th className="px-4 py-3 text-left">메모</th>
                <th className="px-4 py-3 text-center">관리</th>
              </tr>
            </thead>

            <tbody>
              {displayedOrders.length === 0 ? (
                <tr>
                  <td
                    colSpan={9}
                    className="px-4 py-12 text-center text-gray-500"
                  >
                    {activeTab === "sample"
                      ? "등록된 샘플 출고 내역이 없습니다."
                      : "등록된 일반 주문이 없습니다."}
                  </td>
                </tr>
              ) : (
                displayedOrders.map((order: any) => (
                  <tr
                    key={order.id}
                    className="border-b last:border-b-0"
                  >
                    <td className="whitespace-nowrap px-4 py-3">
                      {order.order_date || "-"}
                    </td>

                    <td className="whitespace-nowrap px-4 py-3 font-medium">
                      {order.order_number || "-"}
                    </td>

                    <td className="px-4 py-3">
                      {order.partner_name ||
                        order.recipient_name ||
                        "-"}
                    </td>

                    <td className="px-4 py-3">
                      {order.partner_type || "-"}
                    </td>

                    <td className="whitespace-nowrap px-4 py-3 text-right">
                      {Number(
                        order.total_quantity || 0,
                      ).toLocaleString()}
                      개
                    </td>

                    <td className="whitespace-nowrap px-4 py-3 text-right font-semibold">
                      {formatKrw(order.total_amount)}
                    </td>

                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${
                          getOrderType(order) === "sample"
                            ? "bg-amber-50 text-amber-700"
                            : "bg-blue-50 text-blue-700"
                        }`}
                      >
                        {order.status ||
                          (getOrderType(order) === "sample"
                            ? "샘플출고"
                            : "주문완료")}
                      </span>
                    </td>

                    <td className="max-w-[240px] truncate px-4 py-3 text-gray-500">
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