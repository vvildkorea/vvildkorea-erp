import { createClient } from "@/lib/supabase/server";
import AccountingClient from "./accounting-client";

export const dynamic = "force-dynamic";

type AnyRow = Record<string, any>;

export default async function AccountingNetworkPage() {
  const supabase = await createClient();

  const currentYear = new Date().getFullYear();

  const [
    invoicesResult,
    partnersResult,
    invoiceOrdersResult,
    ordersResult,
    orderItemsResult,
    headquartersPricesResult,
  ] = await Promise.all([
    supabase
      .from("tax_invoice_summary")
      .select("*")
      .order("issue_date", { ascending: false })
      .order("created_at", { ascending: false }),

    supabase.from("partners").select("*"),

    supabase.from("tax_invoice_orders").select("*"),

    supabase.from("orders").select("*"),

    supabase.from("order_items").select("*"),

    supabase
      .from("product_variant_prices")
      .select("*")
      .eq("partner_type", "headquarters"),
  ]);

  if (invoicesResult.error) {
    console.error("tax_invoice_summary error", invoicesResult.error.message);
  }

  if (partnersResult.error) {
    console.error("partners error", partnersResult.error.message);
  }

  if (invoiceOrdersResult.error) {
    console.error("tax_invoice_orders error", invoiceOrdersResult.error.message);
  }

  if (ordersResult.error) {
    console.error("orders error", ordersResult.error.message);
  }

  if (orderItemsResult.error) {
    console.error("order_items error", orderItemsResult.error.message);
  }

  if (headquartersPricesResult.error) {
    console.error(
      "product_variant_prices error",
      headquartersPricesResult.error.message
    );
  }

  const invoices = (invoicesResult.data ?? []) as AnyRow[];
  const partners = (partnersResult.data ?? []) as AnyRow[];
  const invoiceOrderLinks = (invoiceOrdersResult.data ?? []) as AnyRow[];
  const orders = (ordersResult.data ?? []) as AnyRow[];
  const orderItems = (orderItemsResult.data ?? []) as AnyRow[];
  const headquartersPrices = (headquartersPricesResult.data ?? []) as AnyRow[];

  const thisYearInvoiceCount = invoices.filter((invoice) =>
    String(invoice.issue_date ?? "").startsWith(String(currentYear))
  ).length;

  const defaultInvoiceNumber = `${currentYear}-${thisYearInvoiceCount + 1}`;

  return (
    <AccountingClient
      currentYear={currentYear}
      defaultInvoiceNumber={defaultInvoiceNumber}
      invoices={invoices}
      partners={partners}
      invoiceOrderLinks={invoiceOrderLinks}
      orders={orders}
      orderItems={orderItems}
      headquartersPrices={headquartersPrices}
    />
  );
}