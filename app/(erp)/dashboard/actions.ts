"use server";

import { createClient } from "@/lib/supabase/server";

const LOW_STOCK_THRESHOLD = 5;

type AnyRecord = Record<string, unknown>;

export type LowStockItem = {
  id: string;
  name: string;
  quantity: number;
};

export type MonthlySalesItem = {
  id: string;
  modelName: string;
  optionName: string;
  nicotine: string;
  quantity: number;
  salesAmount: number;
};

export type YearlySalesData = {
  year: number;
  yearlySales: number;
  yearlyProductCost: number;
  yearlyProfit: number;
  yearlyProfitRate: number;
  monthlySalesSeries: number[];
};

export type MonthlySalesData = {
  year: number;
  month: number;
  selectedMonthSalesItems: MonthlySalesItem[];
};

export type DashboardData = {
  currentYear: number;
  currentMonth: number;
  todayLabel: string;
  selectedYear: number;
  selectedSalesYear: number;
  selectedSalesMonth: number;
  availableYears: number[];
  totalOrders: number;
  monthlyOrders: number;
  monthlySales: number;
  taxInvoiceAmount: number;
  paidAmount: number;
  unpaidAmount: number;
  lowStockItems: LowStockItem[];
  yearlySalesData: YearlySalesData;
  monthlySalesData: MonthlySalesData;
  errors: string[];
};

export async function getDashboardData({
  year,
  salesYear,
  salesMonth,
}: {
  year?: string | string[];
  salesYear?: string | string[];
  salesMonth?: string | string[];
}): Promise<DashboardData> {
  const supabase = await createClient();

  const now = getKstNow();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;

  const selectedYear = getSelectedYear(year, currentYear);
  const selectedSalesYear = getSelectedYear(salesYear, currentYear);
  const selectedSalesMonth = getSelectedMonth(salesMonth, currentMonth);

  const currentMonthStart = `${currentYear}-${pad2(currentMonth)}-01`;
  const nextCurrentMonthStart =
    currentMonth === 12
      ? `${currentYear + 1}-01-01`
      : `${currentYear}-${pad2(currentMonth + 1)}-01`;

  const [
    totalOrdersResult,
    ordersResult,
    orderItemsResult,
    productModelsResult,
    productVariantsResult,
    variantPricesResult,
    taxInvoiceSummaryResult,
    taxInvoicesResult,
    taxPaymentsResult,
    inventoryResult,
  ] = await Promise.all([
    supabase.from("orders").select("id", { count: "exact", head: true }),
    supabase.from("orders").select("*"),
    supabase.from("order_items").select("*"),
    supabase.from("product_models").select("*"),
    supabase.from("product_variants").select("*"),
    supabase
      .from("product_variant_prices")
      .select("product_variant_id, partner_type, price"),
    supabase.from("tax_invoice_summary").select("*"),
    supabase.from("tax_invoices").select("*"),
    supabase.from("tax_invoice_payments").select("*"),
    supabase.from("current_inventory").select("*"),
  ]);

  const errors = [
    totalOrdersResult.error?.message,
    ordersResult.error?.message,
    orderItemsResult.error?.message,
    productModelsResult.error?.message,
    productVariantsResult.error?.message,
    variantPricesResult.error?.message,
    taxInvoiceSummaryResult.error?.message,
    taxInvoicesResult.error?.message,
    taxPaymentsResult.error?.message,
    inventoryResult.error?.message,
  ].filter(Boolean) as string[];

  const orders = (ordersResult.data ?? []) as AnyRecord[];
  const orderItems = (orderItemsResult.data ?? []) as AnyRecord[];
  const productModels = (productModelsResult.data ?? []) as AnyRecord[];
  const productVariants = (productVariantsResult.data ?? []) as AnyRecord[];
  const variantPrices = (variantPricesResult.data ?? []) as AnyRecord[];
  const taxInvoiceSummary = (taxInvoiceSummaryResult.data ?? []) as AnyRecord[];
  const taxInvoices = (taxInvoicesResult.data ?? []) as AnyRecord[];
  const taxPayments = (taxPaymentsResult.data ?? []) as AnyRecord[];
  const inventory = (inventoryResult.data ?? []) as AnyRecord[];

  const currentMonthOrderIds = new Set(
    orders
      .filter((order) => {
        const orderDate = getOrderDate(order);
        return (
          orderDate >= currentMonthStart && orderDate < nextCurrentMonthStart
        );
      })
      .map((order) => String(order.id)),
  );

  const currentMonthItems = orderItems.filter((item) =>
    currentMonthOrderIds.has(String(item.order_id)),
  );

  const monthlySales = currentMonthItems.reduce(
    (sum, item) => sum + getItemSalesAmount(item),
    0,
  );

  const taxInvoiceAmountFromSummary = sumRowsByKeys(taxInvoiceSummary, [
    "invoice_total_amount",
    "total_invoice_amount",
    "tax_invoice_amount",
    "invoice_amount",
    "issued_amount",
    "total_amount",
    "sales_amount",
  ]);

  const taxInvoiceAmountFromInvoices = sumRowsByKeys(taxInvoices, [
    "invoice_total_amount",
    "total_invoice_amount",
    "tax_invoice_amount",
    "invoice_amount",
    "issued_amount",
    "total_amount",
    "sales_amount",
    "amount",
  ]);

  const paidAmountFromSummary = sumRowsByKeys(taxInvoiceSummary, [
    "paid_total_amount",
    "total_paid_amount",
    "paid_amount",
    "payment_amount",
    "received_amount",
    "deposit_amount",
  ]);

  const paidAmountFromPayments = sumRowsByKeys(taxPayments, [
    "paid_amount",
    "payment_amount",
    "received_amount",
    "deposit_amount",
    "amount",
  ]);

  const unpaidAmountFromSummary = sumRowsByKeys(taxInvoiceSummary, [
    "unpaid_amount",
    "remaining_amount",
    "receivable_amount",
    "outstanding_amount",
    "balance_amount",
  ]);

  const taxInvoiceAmount =
    taxInvoiceAmountFromSummary > 0
      ? taxInvoiceAmountFromSummary
      : taxInvoiceAmountFromInvoices;

  const paidAmount =
    paidAmountFromSummary > 0 ? paidAmountFromSummary : paidAmountFromPayments;

  const unpaidAmount =
    unpaidAmountFromSummary > 0
      ? unpaidAmountFromSummary
      : Math.max(taxInvoiceAmount - paidAmount, 0);

  const lowStockItems = inventory
    .map((item, index) => {
      const quantity = getNumberByKeys(item, [
        "current_quantity",
        "stock_quantity",
        "quantity",
        "on_hand_quantity",
        "available_quantity",
        "qty",
      ]);

      return {
        id:
          getStringByKeys(item, [
            "product_variant_id",
            "variant_id",
            "product_id",
            "id",
          ]) || `inventory-${index}`,
        name: getInventoryItemName(item),
        quantity,
      };
    })
    .filter((item) => item.quantity <= LOW_STOCK_THRESHOLD)
    .sort((a, b) => a.quantity - b.quantity || a.name.localeCompare(b.name));

  const availableYears = buildAvailableYears(orders, [
    currentYear,
    selectedYear,
    selectedSalesYear,
  ]);

  const yearlySalesData = buildYearlySalesData({
    year: selectedYear,
    orders,
    orderItems,
    variantPrices,
  });

  const monthlySalesData = buildMonthlySalesData({
    year: selectedSalesYear,
    month: selectedSalesMonth,
    orders,
    orderItems,
    productModels,
    productVariants,
  });

  return {
    currentYear,
    currentMonth,
    todayLabel: formatKoreanDate(now),
    selectedYear,
    selectedSalesYear,
    selectedSalesMonth,
    availableYears,
    totalOrders: totalOrdersResult.count ?? orders.length,
    monthlyOrders: currentMonthOrderIds.size,
    monthlySales,
    taxInvoiceAmount,
    paidAmount,
    unpaidAmount,
    lowStockItems,
    yearlySalesData,
    monthlySalesData,
    errors,
  };
}

export async function getYearlySalesData(
  year: number,
): Promise<YearlySalesData> {
  const supabase = await createClient();

  const [ordersResult, orderItemsResult, variantPricesResult] =
    await Promise.all([
      supabase.from("orders").select("*"),
      supabase.from("order_items").select("*"),
      supabase
        .from("product_variant_prices")
        .select("product_variant_id, partner_type, price"),
    ]);

  const orders = (ordersResult.data ?? []) as AnyRecord[];
  const orderItems = (orderItemsResult.data ?? []) as AnyRecord[];
  const variantPrices = (variantPricesResult.data ?? []) as AnyRecord[];

  return buildYearlySalesData({
    year,
    orders,
    orderItems,
    variantPrices,
  });
}

export async function getMonthlySalesData({
  year,
  month,
}: {
  year: number;
  month: number;
}): Promise<MonthlySalesData> {
  const supabase = await createClient();

  const [ordersResult, orderItemsResult, productModelsResult, productVariantsResult] =
    await Promise.all([
      supabase.from("orders").select("*"),
      supabase.from("order_items").select("*"),
      supabase.from("product_models").select("*"),
      supabase.from("product_variants").select("*"),
    ]);

  const orders = (ordersResult.data ?? []) as AnyRecord[];
  const orderItems = (orderItemsResult.data ?? []) as AnyRecord[];
  const productModels = (productModelsResult.data ?? []) as AnyRecord[];
  const productVariants = (productVariantsResult.data ?? []) as AnyRecord[];

  return buildMonthlySalesData({
    year,
    month,
    orders,
    orderItems,
    productModels,
    productVariants,
  });
}

function buildYearlySalesData({
  year,
  orders,
  orderItems,
  variantPrices,
}: {
  year: number;
  orders: AnyRecord[];
  orderItems: AnyRecord[];
  variantPrices: AnyRecord[];
}): YearlySalesData {
  const yearStart = `${year}-01-01`;
  const nextYearStart = `${year + 1}-01-01`;

  const yearlyOrders = orders.filter((order) => {
    const orderDate = getOrderDate(order);
    return orderDate >= yearStart && orderDate < nextYearStart;
  });

  const yearlyOrderIds = new Set(yearlyOrders.map((order) => String(order.id)));

  const orderDateMap = new Map<string, string>();
  orders.forEach((order) => {
    if (order.id) {
      orderDateMap.set(String(order.id), getOrderDate(order));
    }
  });

  const variantCostMap = buildVariantCostMap(variantPrices);

  const yearlyItems = orderItems.filter((item) =>
    yearlyOrderIds.has(String(item.order_id)),
  );

  const yearlySales = yearlyItems.reduce(
    (sum, item) => sum + getItemSalesAmount(item),
    0,
  );

  const yearlyProductCost = yearlyItems.reduce(
    (sum, item) => sum + getItemProductCost(item, variantCostMap),
    0,
  );

  const yearlyProfit = yearlySales - yearlyProductCost;
  const yearlyProfitRate =
    yearlySales > 0 ? (yearlyProfit / yearlySales) * 100 : 0;

  const monthlySalesSeries = Array.from({ length: 12 }, () => 0);

  yearlyItems.forEach((item) => {
    const orderId = String(item.order_id ?? "");
    const orderDate = orderDateMap.get(orderId) ?? "";
    const itemMonth = Number(orderDate.slice(5, 7));

    if (itemMonth >= 1 && itemMonth <= 12) {
      monthlySalesSeries[itemMonth - 1] += getItemSalesAmount(item);
    }
  });

  return {
    year,
    yearlySales,
    yearlyProductCost,
    yearlyProfit,
    yearlyProfitRate,
    monthlySalesSeries,
  };
}

function buildMonthlySalesData({
  year,
  month,
  orders,
  orderItems,
  productModels,
  productVariants,
}: {
  year: number;
  month: number;
  orders: AnyRecord[];
  orderItems: AnyRecord[];
  productModels: AnyRecord[];
  productVariants: AnyRecord[];
}): MonthlySalesData {
  const monthStart = `${year}-${pad2(month)}-01`;
  const nextMonthStart =
    month === 12 ? `${year + 1}-01-01` : `${year}-${pad2(month + 1)}-01`;

  const monthOrderIds = new Set(
    orders
      .filter((order) => {
        const orderDate = getOrderDate(order);
        return orderDate >= monthStart && orderDate < nextMonthStart;
      })
      .map((order) => String(order.id)),
  );

  const productMetaMap = buildProductMetaMap(productModels, productVariants);

  const monthItems = orderItems.filter((item) =>
    monthOrderIds.has(String(item.order_id)),
  );

  return {
    year,
    month,
    selectedMonthSalesItems: buildMonthlySalesItems(
      monthItems,
      productMetaMap,
    ),
  };
}

function buildProductMetaMap(
  productModels: AnyRecord[],
  productVariants: AnyRecord[],
) {
  const modelNameMap = new Map<string, string>();

  productModels.forEach((model) => {
    const id = getStringByKeys(model, ["id", "product_model_id", "model_id"]);

    if (!id) {
      return;
    }

    const name = getStringByKeys(model, [
      "name",
      "model_name",
      "product_name",
      "title",
    ]);

    modelNameMap.set(id, name || "모델명 없음");
  });

  const metaMap = new Map<
    string,
    {
      modelName: string;
      optionName: string;
      nicotine: string;
    }
  >();

  productVariants.forEach((variant) => {
    const variantId = getStringByKeys(variant, [
      "id",
      "product_variant_id",
      "variant_id",
    ]);

    if (!variantId) {
      return;
    }

    const modelId = getStringByKeys(variant, [
      "product_model_id",
      "model_id",
      "product_id",
    ]);

    const modelNameFromVariant = getStringByKeys(variant, [
      "model_name",
      "product_model_name",
      "product_name",
    ]);

    const optionName = getStringByKeys(variant, [
      "variant_name",
      "flavor_name",
      "color_name",
      "option_name",
      "flavor",
      "color",
      "name",
    ]);

    const nicotine = getStringByKeys(variant, [
      "nicotine",
      "nicotine_content",
      "nicotine_strength",
    ]);

    metaMap.set(variantId, {
      modelName:
        modelNameFromVariant ||
        modelNameMap.get(modelId) ||
        getStringByKeys(variant, ["name"]) ||
        "모델명 없음",
      optionName: optionName || "-",
      nicotine: nicotine || "-",
    });
  });

  return metaMap;
}

function buildVariantCostMap(variantPrices: AnyRecord[]) {
  const map = new Map<string, number>();

  variantPrices.forEach((priceRow) => {
    const partnerType = getStringByKeys(priceRow, ["partner_type"]);

    if (partnerType !== "headquarters") {
      return;
    }

    const variantId = getStringByKeys(priceRow, [
      "product_variant_id",
      "variant_id",
    ]);

    if (!variantId) {
      return;
    }

    const price = getNumberByKeys(priceRow, ["price", "amount"]);

    map.set(variantId, price);
  });

  return map;
}

function buildMonthlySalesItems(
  monthlyItems: AnyRecord[],
  productMetaMap: Map<
    string,
    {
      modelName: string;
      optionName: string;
      nicotine: string;
    }
  >,
) {
  const grouped = new Map<string, MonthlySalesItem>();

  monthlyItems.forEach((item, index) => {
    const variantId = getStringByKeys(item, [
      "product_variant_id",
      "variant_id",
      "product_id",
    ]);

    const metaFromMap = variantId ? productMetaMap.get(variantId) : undefined;

    const meta = {
      modelName:
        metaFromMap?.modelName ||
        getStringByKeys(item, [
          "model_name",
          "product_model_name",
          "product_name",
          "name",
        ]) ||
        "모델명 없음",
      optionName:
        metaFromMap?.optionName ||
        getStringByKeys(item, [
          "variant_name",
          "flavor_name",
          "color_name",
          "option_name",
          "flavor",
          "color",
        ]) ||
        "-",
      nicotine:
        metaFromMap?.nicotine ||
        getStringByKeys(item, [
          "nicotine",
          "nicotine_content",
          "nicotine_strength",
        ]) ||
        "-",
    };

    const groupKey =
      variantId ||
      `${meta.modelName}-${meta.optionName}-${meta.nicotine}-${index}`;

    const prev = grouped.get(groupKey);
    const quantity = getItemQuantity(item);
    const salesAmount = getItemSalesAmount(item);

    if (prev) {
      prev.quantity += quantity;
      prev.salesAmount += salesAmount;
      return;
    }

    grouped.set(groupKey, {
      id: groupKey,
      modelName: meta.modelName,
      optionName: meta.optionName,
      nicotine: meta.nicotine,
      quantity,
      salesAmount,
    });
  });

  return Array.from(grouped.values()).sort(
    (a, b) => b.salesAmount - a.salesAmount,
  );
}

function buildAvailableYears(orders: AnyRecord[], baseYears: number[]) {
  const years = new Set<number>(baseYears);

  orders.forEach((order) => {
    const orderDate = getOrderDate(order);
    const year = Number(orderDate.slice(0, 4));

    if (Number.isInteger(year) && year >= 2000 && year <= 2100) {
      years.add(year);
    }
  });

  return Array.from(years).sort((a, b) => b - a);
}

function getSelectedYear(
  value: string | string[] | undefined,
  fallbackYear: number,
) {
  const rawValue = Array.isArray(value) ? value[0] : value;
  const year = Number(rawValue);

  if (Number.isInteger(year) && year >= 2000 && year <= 2100) {
    return year;
  }

  return fallbackYear;
}

function getSelectedMonth(
  value: string | string[] | undefined,
  fallbackMonth: number,
) {
  const rawValue = Array.isArray(value) ? value[0] : value;
  const month = Number(rawValue);

  if (Number.isInteger(month) && month >= 1 && month <= 12) {
    return month;
  }

  return fallbackMonth;
}

function getOrderDate(order: AnyRecord) {
  const rawDate = getStringByKeys(order, [
    "order_date",
    "ordered_at",
    "created_at",
    "date",
  ]);

  return rawDate.slice(0, 10);
}

function getItemSalesAmount(item: AnyRecord) {
  const totalAmount = getNumberByKeys(item, [
    "total_amount",
    "line_total",
    "subtotal",
    "sales_amount",
    "amount",
  ]);

  if (totalAmount > 0) {
    return totalAmount;
  }

  const quantity = getItemQuantity(item);
  const unitPrice = getNumberByKeys(item, [
    "unit_price",
    "sale_price",
    "selling_price",
    "price",
  ]);

  return quantity * unitPrice;
}

function getItemProductCost(
  item: AnyRecord,
  variantCostMap: Map<string, number>,
) {
  const totalCost = getNumberByKeys(item, [
    "total_cost",
    "product_cost_total",
    "cost_total",
    "landed_cost_total",
  ]);

  if (totalCost > 0) {
    return totalCost;
  }

  const quantity = getItemQuantity(item);

  const unitCostFromItem = getNumberByKeys(item, [
    "unit_cost",
    "cost_price",
    "product_cost",
    "landed_cost",
    "purchase_price",
  ]);

  if (unitCostFromItem > 0) {
    return quantity * unitCostFromItem;
  }

  const variantId = getStringByKeys(item, [
    "product_variant_id",
    "variant_id",
    "product_id",
  ]);

  if (!variantId) {
    return 0;
  }

  return quantity * (variantCostMap.get(variantId) ?? 0);
}

function getItemQuantity(item: AnyRecord) {
  return getNumberByKeys(item, ["quantity", "qty", "order_quantity"]);
}

function getInventoryItemName(item: AnyRecord) {
  const productName = getStringByKeys(item, [
    "product_name",
    "model_name",
    "product_model_name",
    "model",
    "name",
  ]);

  const optionName = getStringByKeys(item, [
    "variant_name",
    "flavor_name",
    "color_name",
    "option_name",
    "flavor",
    "color",
  ]);

  const nicotine = getStringByKeys(item, [
    "nicotine",
    "nicotine_content",
    "nicotine_strength",
  ]);

  const parts = [productName, optionName, nicotine].filter(
    (part) => part && part !== "-",
  );

  return parts.length > 0 ? parts.join(" / ") : "이름 없는 상품";
}

function getNumberByKeys(row: AnyRecord, keys: string[]) {
  for (const key of keys) {
    const value = row[key];

    if (typeof value === "number" && Number.isFinite(value)) {
      return value;
    }

    if (typeof value === "string") {
      const normalizedValue = value.replace(/,/g, "").trim();
      const numberValue = Number(normalizedValue);

      if (Number.isFinite(numberValue)) {
        return numberValue;
      }
    }
  }

  return 0;
}

function getStringByKeys(row: AnyRecord, keys: string[]) {
  for (const key of keys) {
    const value = row[key];

    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }

    if (typeof value === "number" && Number.isFinite(value)) {
      return String(value);
    }
  }

  return "";
}

function sumRowsByKeys(rows: AnyRecord[], keys: string[]) {
  return rows.reduce((sum, row) => sum + getNumberByKeys(row, keys), 0);
}

function formatKoreanDate(date: Date) {
  return `${date.getFullYear()}년 ${date.getMonth() + 1}월 ${date.getDate()}일`;
}

function pad2(value: number) {
  return String(value).padStart(2, "0");
}

function getKstNow() {
  return new Date(
    new Date().toLocaleString("en-US", {
      timeZone: "Asia/Seoul",
    }),
  );
}