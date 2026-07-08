import AccountingClient from "./accounting-client";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

async function getTableData(tableName: string) {
  const supabase = await createClient();

  const { data, error } = await supabase.from(tableName).select("*");

  if (error) {
    console.error(`[accounting-network] ${tableName} load error:`, error);
    return [];
  }

  return data ?? [];
}

export default async function AccountingNetworkPage() {
  const [
    partners,
    orders,
    orderItems,
    productVariantPrices,
    taxInvoices,
    taxInvoiceOrders,
    taxInvoicePayments,
    taxInvoiceSummary,
  ] = await Promise.all([
    getTableData("partners"),
    getTableData("orders"),
    getTableData("order_items"),
    getTableData("product_variant_prices"),
    getTableData("tax_invoices"),
    getTableData("tax_invoice_orders"),
    getTableData("tax_invoice_payments"),
    getTableData("tax_invoice_summary"),
  ]);

  return (
    <AccountingClient
      partners={partners}
      orders={orders}
      orderItems={orderItems}
      productVariantPrices={productVariantPrices}
      taxInvoices={taxInvoices}
      taxInvoiceOrders={taxInvoiceOrders}
      taxInvoicePayments={taxInvoicePayments}
      taxInvoiceSummary={taxInvoiceSummary}
    />
  );
}