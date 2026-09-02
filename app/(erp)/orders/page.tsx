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
type OrderView = "orders" | "partners" | "products";
type SearchParams = Record<string, string | string[] | undefined>;
type OrdersPageProps = { searchParams?: Promise<SearchParams> | SearchParams };
type TaxInvoiceInfo = { id: string; invoiceNumber: string; issueDate: string };
type QueryState = {
  tab: OrderTab;
  view: OrderView;
  from: string;
  to: string;
  partner: string;
  product: string;
  status: string;
  q: string;
};

type PartnerSummaryRow = {
  key: string;
  name: string;
  partnerType: string;
  orderCount: number;
  totalQuantity: number;
  totalAmount: number;
  latestOrderDate: string;
};

type ProductSummaryRow = {
  key: string;
  modelName: string;
  optionName: string;
  orderCount: number;
  totalQuantity: number;
  totalAmount: number;
  latestOrderDate: string;
};

async function getRowsFromFirstAvailableTable(supabase: any, tableNames: string[]) {
  let emptySuccessData: any[] | null = null;
  for (const tableName of tableNames) {
    let result = await supabase.from(tableName).select("*").order("created_at", { ascending: false });
    if (result.error) {
      result = await supabase.from(tableName).select("*").order("updated_at", { ascending: false });
    }
    if (result.error) result = await supabase.from(tableName).select("*");
    if (!result.error) {
      const data = result.data || [];
      if (data.length > 0) return data;
      if (emptySuccessData === null) emptySuccessData = data;
    }
  }
  return emptySuccessData || [];
}

function toStringId(value: any) {
  if (value === null || value === undefined || value === "") return "";
  return String(value);
}
function unique(values: string[]) { return Array.from(new Set(values.filter(Boolean))); }
function getSearchValue(value: string | string[] | undefined, fallback = "") {
  return Array.isArray(value) ? value[0] || fallback : value || fallback;
}
function getProductModelId(row: any) { return toStringId(row.id); }
function getProductLinkIds(model: any) {
  return unique([toStringId(model.id), toStringId(model.product_model_id), toStringId(model.product_id), toStringId(model.model_id), toStringId(model.parent_id), toStringId(model.item_id)]);
}
function getVariantRelatedIds(row: any) {
  return unique([toStringId(row.product_model_id), toStringId(row.product_id), toStringId(row.model_id), toStringId(row.parent_id), toStringId(row.item_id)]);
}
function getPriceRelatedIds(row: any) {
  return unique([toStringId(row.product_model_id), toStringId(row.product_id), toStringId(row.model_id), toStringId(row.parent_id), toStringId(row.item_id), toStringId(row.product_variant_id), toStringId(row.variant_id), toStringId(row.option_id), toStringId(row.product_option_id)]);
}
function getProductName(row: any) { return row.model_name || row.product_name || row.name || row.title || row.model || ""; }
function getProductCategory(row: any) { return row.category || row.product_category || row.product_type || row.type || row.kind || ""; }
function getPriceType(row: any) { return row.price_type || row.partner_type || row.type || row.price_key || row.key || row.name || ""; }
function getPriceValue(row: any) { return row.price ?? row.amount ?? row.value ?? row.unit_price ?? row.unitPrice ?? row.price_value ?? row.priceValue ?? 0; }
function getInlinePrices(row: any) {
  return [
    { id: `${row.id}-headquarters`, product_model_id: row.id, price_type: "headquarters", price: row.headquarters ?? row.headquarters_price ?? row.headquartersPrice ?? row.price_headquarters ?? row.landed_cost ?? row.landed_cost_price ?? row.landedCost ?? row.arrival_cost ?? row.arrival_cost_price ?? 0 },
    { id: `${row.id}-wholesale`, product_model_id: row.id, price_type: "wholesale", price: row.wholesale ?? row.wholesale_price ?? row.wholesalePrice ?? row.price_wholesale ?? row.supply_price ?? row.supplyPrice ?? row.supply ?? 0 },
    { id: `${row.id}-retail`, product_model_id: row.id, price_type: "retail", price: row.retail ?? row.retail_price ?? row.retailPrice ?? row.price_retail ?? row.dealer_price ?? row.dealerPrice ?? row.wholesale_sale_price ?? 0 },
    { id: `${row.id}-direct_store`, product_model_id: row.id, price_type: "direct_store", price: row.direct_store ?? row.direct_store_price ?? row.directStorePrice ?? row.price_direct_store ?? row.store_price ?? row.storePrice ?? 0 },
    { id: `${row.id}-etc`, product_model_id: row.id, price_type: "etc", price: row.etc ?? row.etc_price ?? row.etcPrice ?? row.price_etc ?? row.sale_price ?? row.selling_price ?? row.consumer_price ?? row.price ?? 0 },
  ];
}
function isSameName(a: any, b: any) {
  const left = String(a || "").trim();
  const right = String(b || "").trim();
  return Boolean(left && right && left === right);
}
function getSelectedTab(value: string | string[] | undefined): OrderTab { return getSearchValue(value) === "sample" ? "sample" : "order"; }
function getSelectedView(value: string | string[] | undefined): OrderView {
  const raw = getSearchValue(value);
  if (raw === "partners") return "partners";
  if (raw === "products") return "products";
  return "orders";
}
function getOrderType(order: any): OrderTab {
  const orderType = String(order.order_type || "").trim().toLowerCase();
  if (orderType === "sample") return "sample";
  if (orderType === "order") return "order";
  const orderNumber = String(order.order_number || "").trim().toUpperCase();
  const status = String(order.status || "").trim();
  return orderNumber.startsWith("SMP-") || status === "샘플출고" || status.includes("샘플") ? "sample" : "order";
}
function formatDate(value: any) { const text = String(value || ""); return text ? text.slice(0, 10) : ""; }
function getOrderPartnerName(order: any) { return String(order.partner_name || order.recipient_name || "").trim(); }
function getOrderItemAmount(item: any) {
  const direct = Number(item.amount ?? item.total_amount ?? item.line_amount ?? item.item_amount ?? item.subtotal);
  if (!Number.isNaN(direct) && direct >= 0) return direct;
  return Number(item.unit_price || 0) * Number(item.quantity || 0);
}
function getOrderQuantity(order: any) {
  const direct = Number(order.total_quantity);
  if (!Number.isNaN(direct) && direct > 0) return direct;
  return (order.order_items || []).reduce((sum: number, item: any) => sum + Number(item.quantity || 0), 0);
}
function getOrderAmount(order: any) {
  const direct = Number(order.total_amount);
  if (!Number.isNaN(direct) && direct >= 0) return direct;
  return (order.order_items || []).reduce((sum: number, item: any) => sum + getOrderItemAmount(item), 0);
}
function getOrderItemModelName(item: any) { return String(item.model_name || item.product_model_name || item.product_name || item.name || "").trim(); }
function getOrderItemOptionName(item: any) { return String(item.option_name || item.variant_name || item.flavor || item.color || "").trim(); }
function getAvailablePartnerNames(orders: any[]) { return unique(orders.map(getOrderPartnerName).filter(Boolean)).sort((a, b) => a.localeCompare(b, "ko")); }
function getAvailableProductNames(orders: any[]) {
  return unique(orders.flatMap((order) => (order.order_items || []).map((item: any) => getOrderItemModelName(item)).filter(Boolean))).sort((a, b) => a.localeCompare(b, "ko"));
}
function getAvailableStatuses(orders: any[]) { return unique(orders.map((order) => String(order.status || "").trim()).filter(Boolean)).sort((a, b) => a.localeCompare(b, "ko")); }
function orderMatchesSearch(order: any, searchText: string) {
  if (!searchText) return true;
  const keyword = searchText.toLowerCase();
  const values = [order.order_number, order.partner_name, order.recipient_name, order.partner_type, order.status, order.memo, ...(order.order_items || []).flatMap((item: any) => [getOrderItemModelName(item), getOrderItemOptionName(item)])];
  return values.some((value) => String(value || "").toLowerCase().includes(keyword));
}
function buildHref(current: QueryState, overrides: Partial<QueryState>) {
  const next = { ...current, ...overrides };
  const params = new URLSearchParams();
  params.set("tab", next.tab);
  params.set("view", next.view);
  if (next.from) params.set("from", next.from);
  if (next.to) params.set("to", next.to);
  if (next.partner) params.set("partner", next.partner);
  if (next.product) params.set("product", next.product);
  if (next.status) params.set("status", next.status);
  if (next.q) params.set("q", next.q);
  return `/orders?${params.toString()}`;
}

function CompactTaxInvoiceStatus({ order }: { order: any }) {
  const info = order.taxInvoiceInfo as TaxInvoiceInfo | null;
  if (getOrderType(order) === "sample") return <span className="text-xs text-gray-400">-</span>;
  if (!info) return <span className="inline-flex rounded-full bg-rose-50 px-2.5 py-1 text-xs font-semibold text-rose-700">미발행</span>;
  return <span title={`${info.invoiceNumber || "번호 없음"}${info.issueDate ? ` / ${info.issueDate}` : ""}`} className="inline-flex rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">발행</span>;
}

export default async function OrdersPage({ searchParams }: OrdersPageProps) {
  const resolvedSearchParams = await Promise.resolve(searchParams ?? {});
  const activeTab = getSelectedTab(resolvedSearchParams.tab);
  const activeView = getSelectedView(resolvedSearchParams.view);
  const fromDate = getSearchValue(resolvedSearchParams.from);
  const toDate = getSearchValue(resolvedSearchParams.to);
  const selectedPartner = getSearchValue(resolvedSearchParams.partner);
  const selectedProduct = getSearchValue(resolvedSearchParams.product);
  const selectedStatus = getSearchValue(resolvedSearchParams.status);
  const searchText = getSearchValue(resolvedSearchParams.q).trim();
  const currentQuery: QueryState = { tab: activeTab, view: activeView, from: fromDate, to: toDate, partner: selectedPartner, product: selectedProduct, status: selectedStatus, q: searchText };

  const supabase = createClient();
  const [ordersResult, partners, productModels, productVariants, productPrices, taxInvoiceOrdersResult, taxInvoicesResult] = await Promise.all([
    supabase.from("orders").select("*, order_items(*)").order("created_at", { ascending: false }),
    getRowsFromFirstAvailableTable(supabase, PARTNER_TABLES),
    getRowsFromFirstAvailableTable(supabase, PRODUCT_MODEL_TABLES),
    getRowsFromFirstAvailableTable(supabase, PRODUCT_VARIANT_TABLES),
    getRowsFromFirstAvailableTable(supabase, PRODUCT_PRICE_TABLES),
    supabase.from("tax_invoice_orders").select("tax_invoice_id, order_id"),
    supabase.from("tax_invoices").select("id, invoice_number, issue_date"),
  ]);

  if (ordersResult.error) throw new Error(ordersResult.error.message);
  if (taxInvoiceOrdersResult.error) throw new Error(taxInvoiceOrdersResult.error.message);
  if (taxInvoicesResult.error) throw new Error(taxInvoicesResult.error.message);

  const taxInvoiceMap = new Map<string, TaxInvoiceInfo>();
  (taxInvoicesResult.data || []).forEach((invoice: any) => {
    const id = toStringId(invoice.id);
    if (id) taxInvoiceMap.set(id, { id, invoiceNumber: String(invoice.invoice_number || ""), issueDate: formatDate(invoice.issue_date) });
  });
  const taxInvoiceByOrderIdMap = new Map<string, TaxInvoiceInfo>();
  (taxInvoiceOrdersResult.data || []).forEach((link: any) => {
    const orderId = toStringId(link.order_id);
    const info = taxInvoiceMap.get(toStringId(link.tax_invoice_id));
    if (!orderId || !info) return;
    const existing = taxInvoiceByOrderIdMap.get(orderId);
    if (!existing || String(info.issueDate).localeCompare(String(existing.issueDate)) > 0) taxInvoiceByOrderIdMap.set(orderId, info);
  });

  const orders = (ordersResult.data || []).map((order: any) => ({ ...order, taxInvoiceInfo: taxInvoiceByOrderIdMap.get(toStringId(order.id)) || null }));
  const regularOrders = orders.filter((order: any) => getOrderType(order) === "order");
  const sampleOrders = orders.filter((order: any) => getOrderType(order) === "sample");
  const tabOrders = activeTab === "sample" ? sampleOrders : regularOrders;

  const availablePartnerNames = getAvailablePartnerNames(tabOrders);
  const availableProductNames = getAvailableProductNames(tabOrders);
  const availableStatuses = getAvailableStatuses(tabOrders);

  const filteredOrders = tabOrders.filter((order: any) => {
    const orderDate = formatDate(order.order_date);
    if (fromDate && (!orderDate || orderDate < fromDate)) return false;
    if (toDate && (!orderDate || orderDate > toDate)) return false;
    if (selectedPartner && getOrderPartnerName(order) !== selectedPartner) return false;
    if (selectedProduct && !(order.order_items || []).some((item: any) => getOrderItemModelName(item) === selectedProduct)) return false;
    if (selectedStatus && String(order.status || "").trim() !== selectedStatus) return false;
    return orderMatchesSearch(order, searchText);
  });

  const totalQuantity = filteredOrders.reduce((sum: number, order: any) => sum + getOrderQuantity(order), 0);
  const totalAmount = filteredOrders.reduce((sum: number, order: any) => sum + getOrderAmount(order), 0);
  const partnerCount = new Set(filteredOrders.map((order: any) => getOrderPartnerName(order)).filter(Boolean)).size;

  const partnerSummaryMap = new Map<string, PartnerSummaryRow>();
  filteredOrders.forEach((order: any) => {
    const name = getOrderPartnerName(order) || "미지정";
    const partnerType = String(order.partner_type || "").trim();
    const key = `${name}__${partnerType}`;
    const date = formatDate(order.order_date);
    const existing = partnerSummaryMap.get(key);
    if (!existing) {
      partnerSummaryMap.set(key, { key, name, partnerType, orderCount: 1, totalQuantity: getOrderQuantity(order), totalAmount: getOrderAmount(order), latestOrderDate: date });
      return;
    }
    existing.orderCount += 1;
    existing.totalQuantity += getOrderQuantity(order);
    existing.totalAmount += getOrderAmount(order);
    if (date > existing.latestOrderDate) existing.latestOrderDate = date;
  });
  const partnerSummaryRows = Array.from(partnerSummaryMap.values()).sort((a, b) => b.totalAmount - a.totalAmount || a.name.localeCompare(b.name, "ko"));

  const productSummaryMap = new Map<string, ProductSummaryRow>();
  filteredOrders.forEach((order: any) => {
    const date = formatDate(order.order_date);
    const seen = new Set<string>();
    (order.order_items || []).forEach((item: any) => {
      const modelName = getOrderItemModelName(item) || "제품명 미지정";
      const optionName = getOrderItemOptionName(item);
      const key = `${modelName}__${optionName}`;
      const quantity = Number(item.quantity || 0);
      const amount = getOrderItemAmount(item);
      const existing = productSummaryMap.get(key);
      if (!existing) {
        productSummaryMap.set(key, { key, modelName, optionName, orderCount: 1, totalQuantity: quantity, totalAmount: amount, latestOrderDate: date });
        seen.add(key);
        return;
      }
      if (!seen.has(key)) { existing.orderCount += 1; seen.add(key); }
      existing.totalQuantity += quantity;
      existing.totalAmount += amount;
      if (date > existing.latestOrderDate) existing.latestOrderDate = date;
    });
  });
  const productSummaryRows = Array.from(productSummaryMap.values()).sort((a, b) => b.totalQuantity - a.totalQuantity || a.modelName.localeCompare(b.modelName, "ko") || a.optionName.localeCompare(b.optionName, "ko"));

  const products = productModels.map((model: any) => {
    const modelId = getProductModelId(model);
    const productLinkIds = getProductLinkIds(model);
    const productName = getProductName(model);
    const variants = productVariants.filter((variant: any) => getVariantRelatedIds(variant).some((id) => productLinkIds.includes(id)));
    const variantIds = variants.map((variant: any) => toStringId(variant.id));
    const allLinkIds = unique([...productLinkIds, ...variantIds]);
    const pricesFromTable = productPrices.filter((price: any) => {
      if (getPriceRelatedIds(price).some((id) => allLinkIds.includes(id))) return true;
      return isSameName(price.model_name || price.product_name || price.product_model_name || price.product || "", productName);
    }).map((price: any, index: number) => ({ ...price, id: price.id || `${modelId}-price-${index}`, product_model_id: price.product_model_id || price.product_id || price.model_id || modelId, price_type: getPriceType(price), price: getPriceValue(price) }));
    return { ...model, id: modelId, model_name: productName, category: getProductCategory(model), variants, prices: [...pricesFromTable, ...getInlinePrices(model)] };
  });

  const hasActiveFilters = Boolean(fromDate || toDate || selectedPartner || selectedProduct || selectedStatus || searchText);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">주문 관리</h1>
          <p className="mt-1 text-sm text-gray-500">주문별·거래처별·품목별로 조회하고 필요한 주문을 빠르게 찾습니다.</p>
        </div>
        <OrderCreateModal partners={partners} products={products} />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex w-fit rounded-xl bg-gray-100 p-1">
          {([['order', '주문', regularOrders.length], ['sample', '샘플', sampleOrders.length]] as const).map(([tab, label, count]) => (
            <Link key={tab} href={buildHref(currentQuery, { tab, partner: "", product: "", status: "", q: "" })} className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition ${activeTab === tab ? "bg-white text-gray-900 shadow-sm ring-1 ring-gray-200" : "text-gray-500 hover:text-gray-900"}`}>
              <span>{label}</span>
              <span className={`rounded-full px-2 py-0.5 text-xs ${activeTab === tab ? "bg-gray-900 text-white" : "bg-white text-gray-500"}`}>{count.toLocaleString()}건</span>
            </Link>
          ))}
        </div>

        <div className="flex w-fit rounded-xl border bg-white p-1">
          {([['orders', '주문별'], ['partners', '거래처별'], ['products', '품목별']] as const).map(([view, label]) => (
            <Link key={view} href={buildHref(currentQuery, { view })} className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${activeView === view ? "bg-gray-900 text-white" : "text-gray-500 hover:bg-gray-50 hover:text-gray-900"}`}>{label}</Link>
          ))}
        </div>
      </div>

      <form method="get" className="rounded-2xl border bg-white p-4 shadow-sm">
        <input type="hidden" name="tab" value={activeTab} />
        <input type="hidden" name="view" value={activeView} />
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-6">
          <div><label className="mb-1 block text-xs font-semibold text-gray-500">시작일</label><input type="date" name="from" defaultValue={fromDate} className="h-10 w-full rounded-lg border px-3 text-sm" /></div>
          <div><label className="mb-1 block text-xs font-semibold text-gray-500">종료일</label><input type="date" name="to" defaultValue={toDate} className="h-10 w-full rounded-lg border px-3 text-sm" /></div>
          <div><label className="mb-1 block text-xs font-semibold text-gray-500">{activeTab === "sample" ? "수령처" : "거래처"}</label><select name="partner" defaultValue={selectedPartner} className="h-10 w-full rounded-lg border bg-white px-3 text-sm"><option value="">전체</option>{availablePartnerNames.map((name) => <option key={name} value={name}>{name}</option>)}</select></div>
          <div><label className="mb-1 block text-xs font-semibold text-gray-500">제품</label><select name="product" defaultValue={selectedProduct} className="h-10 w-full rounded-lg border bg-white px-3 text-sm"><option value="">전체</option>{availableProductNames.map((name) => <option key={name} value={name}>{name}</option>)}</select></div>
          <div><label className="mb-1 block text-xs font-semibold text-gray-500">상태</label><select name="status" defaultValue={selectedStatus} className="h-10 w-full rounded-lg border bg-white px-3 text-sm"><option value="">전체</option>{availableStatuses.map((status) => <option key={status} value={status}>{status}</option>)}</select></div>
          <div><label className="mb-1 block text-xs font-semibold text-gray-500">검색</label><input type="search" name="q" defaultValue={searchText} placeholder="주문번호 / 거래처 / 제품" className="h-10 w-full rounded-lg border px-3 text-sm" /></div>
        </div>
        <div className="mt-3 flex items-center justify-between gap-3">
          <p className="text-xs text-gray-500">{hasActiveFilters ? `필터 적용 결과 ${filteredOrders.length.toLocaleString()}건` : "필터를 선택하면 필요한 주문만 확인할 수 있습니다."}</p>
          <div className="flex gap-2">{hasActiveFilters ? <Link href={`/orders?tab=${activeTab}&view=${activeView}`} className="rounded-lg border px-4 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-50">초기화</Link> : null}<button type="submit" className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-semibold text-white hover:bg-gray-700">조회</button></div>
        </div>
      </form>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-2xl border bg-white p-4"><p className="text-xs font-medium text-gray-500">{activeTab === "sample" ? "샘플 출고" : "주문"}</p><p className="mt-2 text-2xl font-bold">{filteredOrders.length.toLocaleString()}건</p></div>
        <div className="rounded-2xl border bg-white p-4"><p className="text-xs font-medium text-gray-500">총 수량</p><p className="mt-2 text-2xl font-bold">{totalQuantity.toLocaleString()}개</p></div>
        <div className="rounded-2xl border bg-white p-4"><p className="text-xs font-medium text-gray-500">{activeTab === "sample" ? "총 금액" : "총 매출"}</p><p className="mt-2 text-2xl font-bold">{formatKrw(totalAmount)}</p></div>
        <div className="rounded-2xl border bg-white p-4"><p className="text-xs font-medium text-gray-500">{activeTab === "sample" ? "수령처" : "거래처"}</p><p className="mt-2 text-2xl font-bold">{partnerCount.toLocaleString()}곳</p></div>
      </div>

      <div className="overflow-hidden rounded-2xl border bg-white">
        <div className="flex items-center justify-between border-b px-5 py-4">
          <div><h2 className="font-semibold">{activeView === "orders" ? (activeTab === "sample" ? "샘플 출고 목록" : "일반 주문 목록") : activeView === "partners" ? (activeTab === "sample" ? "수령처별 현황" : "거래처별 현황") : "품목별 현황"}</h2><p className="mt-1 text-xs text-gray-500">{activeView === "orders" ? `${filteredOrders.length.toLocaleString()}건` : activeView === "partners" ? `${partnerSummaryRows.length.toLocaleString()}곳` : `${productSummaryRows.length.toLocaleString()}개 품목`}</p></div>
          <span className={`rounded-full px-3 py-1 text-xs font-semibold ${activeTab === "sample" ? "bg-amber-50 text-amber-700" : "bg-blue-50 text-blue-700"}`}>{activeTab === "sample" ? "샘플" : "주문"}</span>
        </div>

        {activeView === "orders" ? (
          <div className="overflow-x-auto"><table className="w-full min-w-[960px] border-collapse text-sm"><thead><tr className="border-b bg-gray-50 text-gray-600"><th className="px-4 py-3 text-left">{activeTab === "sample" ? "출고일" : "주문일"}</th><th className="px-4 py-3 text-left">{activeTab === "sample" ? "샘플번호" : "주문번호"}</th><th className="px-4 py-3 text-left">{activeTab === "sample" ? "수령처" : "거래처"}</th><th className="px-4 py-3 text-right">총 수량</th><th className="px-4 py-3 text-right">{activeTab === "sample" ? "금액" : "주문금액"}</th><th className="px-4 py-3 text-left">상태</th><th className="px-4 py-3 text-left">계산서</th><th className="px-4 py-3 text-center">관리</th></tr></thead><tbody>
            {filteredOrders.length === 0 ? <tr><td colSpan={8} className="px-4 py-12 text-center text-gray-500">조건에 맞는 내역이 없습니다.</td></tr> : filteredOrders.map((order: any) => <tr key={order.id} className="border-b last:border-b-0"><td className="whitespace-nowrap px-4 py-3">{formatDate(order.order_date) || "-"}</td><td className="whitespace-nowrap px-4 py-3 font-medium">{order.order_number || "-"}</td><td className="px-4 py-3">{getOrderPartnerName(order) || "-"}</td><td className="whitespace-nowrap px-4 py-3 text-right">{getOrderQuantity(order).toLocaleString()}개</td><td className="whitespace-nowrap px-4 py-3 text-right font-semibold">{formatKrw(getOrderAmount(order))}</td><td className="px-4 py-3"><span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${getOrderType(order) === "sample" ? "bg-amber-50 text-amber-700" : "bg-blue-50 text-blue-700"}`}>{order.status || (getOrderType(order) === "sample" ? "샘플출고" : "주문완료")}</span></td><td className="px-4 py-3"><CompactTaxInvoiceStatus order={order} /></td><td className="px-4 py-3 text-center"><OrderDetailModal order={order} /></td></tr>)}
          </tbody></table></div>
        ) : activeView === "partners" ? (
          <div className="overflow-x-auto"><table className="w-full min-w-[820px] border-collapse text-sm"><thead><tr className="border-b bg-gray-50 text-gray-600"><th className="px-4 py-3 text-left">{activeTab === "sample" ? "수령처" : "거래처"}</th><th className="px-4 py-3 text-left">구분</th><th className="px-4 py-3 text-right">주문건수</th><th className="px-4 py-3 text-right">총 수량</th><th className="px-4 py-3 text-right">총 매출</th><th className="px-4 py-3 text-left">최근 주문</th><th className="px-4 py-3 text-center">보기</th></tr></thead><tbody>
            {partnerSummaryRows.length === 0 ? <tr><td colSpan={7} className="px-4 py-12 text-center text-gray-500">조건에 맞는 거래처 내역이 없습니다.</td></tr> : partnerSummaryRows.map((row) => <tr key={row.key} className="border-b last:border-b-0"><td className="px-4 py-3 font-semibold">{row.name}</td><td className="px-4 py-3 text-gray-500">{row.partnerType || "-"}</td><td className="px-4 py-3 text-right">{row.orderCount.toLocaleString()}건</td><td className="px-4 py-3 text-right">{row.totalQuantity.toLocaleString()}개</td><td className="px-4 py-3 text-right font-semibold">{formatKrw(row.totalAmount)}</td><td className="whitespace-nowrap px-4 py-3">{row.latestOrderDate || "-"}</td><td className="px-4 py-3 text-center"><Link href={buildHref(currentQuery, { view: "orders", partner: row.name })} className="inline-flex rounded-lg border px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50">주문 보기</Link></td></tr>)}
          </tbody></table></div>
        ) : (
          <div className="overflow-x-auto"><table className="w-full min-w-[860px] border-collapse text-sm"><thead><tr className="border-b bg-gray-50 text-gray-600"><th className="px-4 py-3 text-left">제품</th><th className="px-4 py-3 text-left">맛/색상</th><th className="px-4 py-3 text-right">주문건수</th><th className="px-4 py-3 text-right">총 수량</th><th className="px-4 py-3 text-right">총 매출</th><th className="px-4 py-3 text-left">최근 주문</th><th className="px-4 py-3 text-center">보기</th></tr></thead><tbody>
            {productSummaryRows.length === 0 ? <tr><td colSpan={7} className="px-4 py-12 text-center text-gray-500">조건에 맞는 품목 내역이 없습니다.</td></tr> : productSummaryRows.map((row) => <tr key={row.key} className="border-b last:border-b-0"><td className="px-4 py-3 font-semibold">{row.modelName}</td><td className="px-4 py-3 text-gray-600">{row.optionName || "-"}</td><td className="px-4 py-3 text-right">{row.orderCount.toLocaleString()}건</td><td className="px-4 py-3 text-right">{row.totalQuantity.toLocaleString()}개</td><td className="px-4 py-3 text-right font-semibold">{formatKrw(row.totalAmount)}</td><td className="whitespace-nowrap px-4 py-3">{row.latestOrderDate || "-"}</td><td className="px-4 py-3 text-center"><Link href={buildHref(currentQuery, { view: "orders", product: row.modelName })} className="inline-flex rounded-lg border px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50">주문 보기</Link></td></tr>)}
          </tbody></table></div>
        )}
      </div>
    </div>
  );
}