"use client";

import { useMemo, useState, useTransition } from "react";
import {
  createTaxInvoice,
  createTaxInvoicePayment,
  deleteTaxInvoice,
  deleteTaxInvoicePayment,
  updateTaxInvoice,
  updateTaxInvoicePayment,
  type ActionResult,
  type PaymentUpdateInput,
  type TaxInvoiceUpdateInput,
} from "./actions";

type Row = Record<string, any>;

type AccountingClientProps = {
  partners: Row[];
  orders: Row[];
  orderItems: Row[];
  productVariantPrices: Row[];
  taxInvoices: Row[];
  taxInvoiceOrders: Row[];
  taxInvoicePayments: Row[];
  taxInvoiceSummary: Row[];
};

type TabKey = "tax-invoices" | "profit";

type InvoiceForm = {
  id?: string;
  invoice_number: string;
  issue_date: string;
  partner_id: string;
  order_ids: string[];
  memo: string;
  paid_full: boolean;
};

type PaymentForm = {
  id?: string;
  tax_invoice_id: string;
  payment_date: string;
  amount: string;
  memo: string;
};

type InvoiceView = Row & {
  id: string;
  invoice_number: string;
  issue_date: string;
  partner_id: string;
  memo: string;
  partner?: Row;
  linkedOrderIds: string[];
  linkedOrders: Row[];
  payments: Row[];
  totalAmount: number;
  paidAmount: number;
  remainingAmount: number;
  status: string;
};

type ProfitYearRow = {
  year: string;
  orderCount: number;
  salesAmount: number;
  costAmount: number;
  profitAmount: number;
  profitRate: number;
};

const emptyInvoiceForm: InvoiceForm = {
  invoice_number: "",
  issue_date: getToday(),
  partner_id: "",
  order_ids: [],
  memo: "",
  paid_full: false,
};

const emptyPaymentForm: PaymentForm = {
  tax_invoice_id: "",
  payment_date: getToday(),
  amount: "",
  memo: "",
};

function getToday() {
  const now = new Date();
  const koreaTime = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  return koreaTime.toISOString().slice(0, 10);
}

function toNumber(value: unknown) {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;

  if (typeof value === "string") {
    const parsed = Number(value.replace(/,/g, ""));
    return Number.isFinite(parsed) ? parsed : 0;
  }

  return 0;
}

function formatKrw(value: unknown) {
  return `${Math.round(toNumber(value)).toLocaleString("ko-KR")}원`;
}

function formatPercent(value: number) {
  if (!Number.isFinite(value)) return "-";
  return `${value.toFixed(1)}%`;
}

function formatDate(value: unknown) {
  if (!value) return "-";

  const text = String(value);
  return text.length >= 10 ? text.slice(0, 10) : text;
}

function getId(row: Row) {
  return String(row.id ?? "");
}

function getPartnerName(partner?: Row) {
  if (!partner) return "거래처 없음";

  return (
    partner.name ??
    partner.partner_name ??
    partner.company_name ??
    partner.business_name ??
    "거래처명 없음"
  );
}

function getOrderNumber(order?: Row) {
  if (!order) return "주문번호 없음";

  return (
    order.order_number ??
    order.order_no ??
    order.code ??
    order.order_code ??
    order.id ??
    "주문번호 없음"
  );
}

function getOrderDate(order?: Row) {
  if (!order) return "-";

  return formatDate(
    order.order_date ?? order.created_at ?? order.date ?? order.ordered_at,
  );
}

function getOrderYear(order?: Row) {
  const dateText = getOrderDate(order);
  if (!dateText || dateText === "-") return "연도 없음";
  return dateText.slice(0, 4);
}

function getRecordAmount(row: Row) {
  const candidates = [
    "total_amount",
    "order_total",
    "final_amount",
    "sales_amount",
    "amount",
    "total_price",
    "supply_amount",
  ];

  for (const key of candidates) {
    const value = toNumber(row[key]);
    if (value > 0) return value;
  }

  return 0;
}

function getItemQuantity(item: Row) {
  return toNumber(item.quantity ?? item.qty ?? item.order_quantity);
}

function getItemSalesPrice(item: Row) {
  const candidates = [
    "unit_price",
    "sales_price",
    "price",
    "order_price",
    "selling_price",
  ];

  for (const key of candidates) {
    const value = toNumber(item[key]);
    if (value > 0) return value;
  }

  return 0;
}

function getItemCostPrice(item: Row, productVariantPrices: Row[]) {
  const directCandidates = [
    "product_cost",
    "cost_price",
    "landed_cost",
    "arrival_cost",
    "purchase_price",
  ];

  for (const key of directCandidates) {
    const value = toNumber(item[key]);
    if (value > 0) return value;
  }

  const variantId = String(
    item.product_variant_id ?? item.variant_id ?? item.product_id ?? "",
  );

  if (!variantId) return 0;

  const costRow = productVariantPrices.find((price) => {
    const priceVariantId = String(
      price.product_variant_id ?? price.variant_id ?? "",
    );

    return (
      priceVariantId === variantId &&
      String(price.partner_type ?? "") === "headquarters"
    );
  });

  if (!costRow) return 0;

  return toNumber(costRow.price ?? costRow.amount ?? costRow.cost);
}

function getStatusLabel(totalAmount: number, paidAmount: number) {
  if (paidAmount <= 0) return "미입금";
  if (paidAmount < totalAmount) return "부분입금";
  return "완납";
}

function getStatusClass(status: string) {
  if (status === "완납" || status === "paid") {
    return "bg-rose-50 text-rose-700 ring-1 ring-rose-200";
  }

  if (status === "부분입금" || status === "partial") {
    return "bg-amber-50 text-amber-700 ring-1 ring-amber-200";
  }

  return "bg-slate-50 text-slate-700 ring-1 ring-slate-200";
}

function getStatusText(status: string) {
  if (status === "paid") return "paid";
  if (status === "partial") return "partial";
  if (status === "unpaid") return "unpaid";
  return status;
}

function sortByDateDesc(rows: Row[], keys: string[]) {
  return [...rows].sort((a, b) => {
    const aValue = keys.map((key) => a[key]).find(Boolean);
    const bValue = keys.map((key) => b[key]).find(Boolean);

    return String(bValue ?? "").localeCompare(String(aValue ?? ""));
  });
}

export default function AccountingClient({
  partners,
  orders,
  orderItems,
  productVariantPrices,
  taxInvoices,
  taxInvoiceOrders,
  taxInvoicePayments,
  taxInvoiceSummary,
}: AccountingClientProps) {
  const [activeTab, setActiveTab] = useState<TabKey>("tax-invoices");
  const [selectedInvoiceId, setSelectedInvoiceId] = useState("");
  const [isCreateInvoiceOpen, setIsCreateInvoiceOpen] = useState(false);
  const [invoiceForm, setInvoiceForm] =
    useState<InvoiceForm>(emptyInvoiceForm);
  const [editInvoiceForm, setEditInvoiceForm] =
    useState<InvoiceForm | null>(null);
  const [paymentForm, setPaymentForm] =
    useState<PaymentForm>(emptyPaymentForm);
  const [editPaymentForm, setEditPaymentForm] =
    useState<PaymentForm | null>(null);
  const [message, setMessage] = useState<ActionResult | null>(null);
  const [isPending, startTransition] = useTransition();

  const partnerMap = useMemo(() => {
    return new Map(partners.map((partner) => [getId(partner), partner]));
  }, [partners]);

  const orderMap = useMemo(() => {
    return new Map(orders.map((order) => [getId(order), order]));
  }, [orders]);

  const invoices = useMemo<InvoiceView[]>(() => {
    return sortByDateDesc(taxInvoices, ["issue_date", "created_at"]).map(
      (invoice): InvoiceView => {
        const invoiceId = getId(invoice);

        const linkedOrderIds = taxInvoiceOrders
          .filter((link) => String(link.tax_invoice_id) === invoiceId)
          .map((link) => String(link.order_id));

        const linkedOrders = linkedOrderIds
          .map((orderId) => orderMap.get(orderId))
          .filter(Boolean) as Row[];

        const payments = sortByDateDesc(
          taxInvoicePayments.filter(
            (payment) => String(payment.tax_invoice_id) === invoiceId,
          ),
          ["payment_date", "created_at"],
        );

        const summary = taxInvoiceSummary.find((row) => {
          return (
            String(row.tax_invoice_id ?? row.invoice_id ?? row.id ?? "") ===
            invoiceId
          );
        });

        const calculatedTotal = linkedOrders.reduce((sum, order) => {
          return sum + getRecordAmount(order);
        }, 0);

        const totalAmount =
          toNumber(summary?.total_amount) ||
          toNumber(invoice.total_amount) ||
          calculatedTotal;

        const paidAmount =
          toNumber(summary?.paid_amount) ||
          payments.reduce((sum, payment) => {
            return sum + toNumber(payment.amount);
          }, 0);

        const remainingAmount =
          summary?.remaining_amount !== undefined
            ? toNumber(summary.remaining_amount)
            : Math.max(totalAmount - paidAmount, 0);

        const status = String(
          summary?.payment_status ??
            summary?.status ??
            getStatusLabel(totalAmount, paidAmount),
        );

        return {
          ...invoice,
          id: invoiceId,
          invoice_number: String(invoice.invoice_number ?? ""),
          issue_date: formatDate(invoice.issue_date),
          partner_id: String(invoice.partner_id ?? ""),
          memo: String(invoice.memo ?? ""),
          partner: partnerMap.get(String(invoice.partner_id)),
          linkedOrderIds,
          linkedOrders,
          payments,
          totalAmount,
          paidAmount,
          remainingAmount,
          status,
        };
      },
    );
  }, [
    taxInvoices,
    taxInvoiceOrders,
    taxInvoicePayments,
    taxInvoiceSummary,
    orderMap,
    partnerMap,
  ]);

  const selectedInvoice = useMemo<InvoiceView | null>(() => {
    return invoices.find((invoice) => invoice.id === selectedInvoiceId) ?? null;
  }, [invoices, selectedInvoiceId]);

  const accountingSummary = useMemo(() => {
    const orderCount = orders.length;

    const totalSalesAmount = orders.reduce((sum, order) => {
      return sum + getRecordAmount(order);
    }, 0);

    const invoiceIssuedAmount = invoices.reduce((sum, invoice) => {
      return sum + invoice.totalAmount;
    }, 0);

    const paidAmount = invoices.reduce((sum, invoice) => {
      return sum + invoice.paidAmount;
    }, 0);

    const unpaidAmount = invoices.reduce((sum, invoice) => {
      return sum + invoice.remainingAmount;
    }, 0);

    return {
      orderCount,
      totalSalesAmount,
      invoiceIssuedAmount,
      paidAmount,
      unpaidAmount,
    };
  }, [orders, invoices]);

  const orderProfitRows = useMemo(() => {
    return orders.map((order) => {
      const orderId = getId(order);

      const items = orderItems.filter((item) => {
        return String(item.order_id ?? item.orderId ?? "") === orderId;
      });

      const itemSalesAmount = items.reduce((sum, item) => {
        const quantity = getItemQuantity(item);
        const salesPrice = getItemSalesPrice(item);

        const directTotal = toNumber(
          item.total_amount ?? item.total_price ?? item.amount,
        );

        return sum + (directTotal > 0 ? directTotal : quantity * salesPrice);
      }, 0);

      const itemCostAmount = items.reduce((sum, item) => {
        const quantity = getItemQuantity(item);
        const costPrice = getItemCostPrice(item, productVariantPrices);

        const directTotal = toNumber(
          item.cost_total ?? item.product_cost_total ?? item.purchase_total,
        );

        return sum + (directTotal > 0 ? directTotal : quantity * costPrice);
      }, 0);

      const salesAmount = getRecordAmount(order) || itemSalesAmount;

      const costAmount =
        toNumber(
          order.product_cost_total ??
            order.cost_total ??
            order.purchase_total ??
            order.total_cost,
        ) || itemCostAmount;

      const profitAmount = salesAmount - costAmount;
      const profitRate =
        salesAmount > 0 ? (profitAmount / salesAmount) * 100 : 0;

      return {
        id: orderId,
        order,
        year: getOrderYear(order),
        salesAmount,
        costAmount,
        profitAmount,
        profitRate,
      };
    });
  }, [orders, orderItems, productVariantPrices]);

  const yearlyProfitRows = useMemo<ProfitYearRow[]>(() => {
    const map = new Map<string, ProfitYearRow>();

    for (const row of orderProfitRows) {
      const prev =
        map.get(row.year) ??
        {
          year: row.year,
          orderCount: 0,
          salesAmount: 0,
          costAmount: 0,
          profitAmount: 0,
          profitRate: 0,
        };

      prev.orderCount += 1;
      prev.salesAmount += row.salesAmount;
      prev.costAmount += row.costAmount;
      prev.profitAmount += row.profitAmount;
      prev.profitRate =
        prev.salesAmount > 0 ? (prev.profitAmount / prev.salesAmount) * 100 : 0;

      map.set(row.year, prev);
    }

    return Array.from(map.values()).sort((a, b) =>
      String(b.year).localeCompare(String(a.year)),
    );
  }, [orderProfitRows]);

  const invoiceCreatePreviewTotal = useMemo(() => {
    return invoiceForm.order_ids.reduce((sum, orderId) => {
      const order = orderMap.get(orderId);
      return sum + (order ? getRecordAmount(order) : 0);
    }, 0);
  }, [invoiceForm.order_ids, orderMap]);

  const invoiceEditPreviewTotal = useMemo(() => {
    if (!editInvoiceForm) return 0;

    return editInvoiceForm.order_ids.reduce((sum, orderId) => {
      const order = orderMap.get(orderId);
      return sum + (order ? getRecordAmount(order) : 0);
    }, 0);
  }, [editInvoiceForm, orderMap]);

  function runAction(action: () => Promise<ActionResult>, onSuccess?: () => void) {
    setMessage(null);

    startTransition(() => {
      void (async () => {
        const result = await action();
        setMessage(result);

        if (result.ok) {
          onSuccess?.();
        }
      })();
    });
  }

  function toggleOrderInCreateForm(orderId: string) {
    setInvoiceForm((prev) => {
      const exists = prev.order_ids.includes(orderId);

      return {
        ...prev,
        order_ids: exists
          ? prev.order_ids.filter((id) => id !== orderId)
          : [...prev.order_ids, orderId],
      };
    });
  }

  function toggleOrderInEditForm(orderId: string) {
    setEditInvoiceForm((prev) => {
      if (!prev) return prev;

      const exists = prev.order_ids.includes(orderId);

      return {
        ...prev,
        order_ids: exists
          ? prev.order_ids.filter((id) => id !== orderId)
          : [...prev.order_ids, orderId],
      };
    });
  }

  function handleCreateInvoice() {
    runAction(
      () =>
        createTaxInvoice({
          invoice_number: invoiceForm.invoice_number,
          issue_date: invoiceForm.issue_date,
          partner_id: invoiceForm.partner_id,
          order_ids: invoiceForm.order_ids,
          memo: invoiceForm.memo,
          paid_full: invoiceForm.paid_full,
        }),
      () => {
        setInvoiceForm(emptyInvoiceForm);
        setIsCreateInvoiceOpen(false);
      },
    );
  }

  function handleOpenEditInvoice(invoice: InvoiceView) {
    setEditInvoiceForm({
      id: invoice.id,
      invoice_number: invoice.invoice_number,
      issue_date: invoice.issue_date,
      partner_id: invoice.partner_id,
      order_ids: invoice.linkedOrderIds,
      memo: invoice.memo,
      paid_full: false,
    });
  }

  function handleUpdateInvoice() {
    if (!editInvoiceForm?.id) return;

    const payload: TaxInvoiceUpdateInput = {
      id: editInvoiceForm.id,
      invoice_number: editInvoiceForm.invoice_number,
      issue_date: editInvoiceForm.issue_date,
      partner_id: editInvoiceForm.partner_id,
      order_ids: editInvoiceForm.order_ids,
      memo: editInvoiceForm.memo,
      paid_full: false,
    };

    runAction(() => updateTaxInvoice(payload), () => {
      setEditInvoiceForm(null);
    });
  }

  function handleDeleteInvoice(invoiceId: string) {
    const ok = window.confirm(
      "세금계산서를 삭제할까요?\n연결 주문과 입금 내역도 함께 삭제됩니다.",
    );

    if (!ok) return;

    runAction(() => deleteTaxInvoice(invoiceId), () => {
      if (selectedInvoiceId === invoiceId) {
        setSelectedInvoiceId("");
      }
    });
  }

  function handleCreatePayment() {
    if (!selectedInvoice) return;

    runAction(
      () =>
        createTaxInvoicePayment({
          tax_invoice_id: selectedInvoice.id,
          payment_date: paymentForm.payment_date,
          amount: toNumber(paymentForm.amount),
          memo: paymentForm.memo,
        }),
      () => {
        setPaymentForm({
          ...emptyPaymentForm,
          tax_invoice_id: selectedInvoice.id,
        });
      },
    );
  }

  function handleOpenEditPayment(payment: Row) {
    setEditPaymentForm({
      id: String(payment.id ?? ""),
      tax_invoice_id: String(payment.tax_invoice_id ?? ""),
      payment_date: formatDate(payment.payment_date),
      amount: String(toNumber(payment.amount)),
      memo: String(payment.memo ?? ""),
    });
  }

  function handleUpdatePayment() {
    if (!editPaymentForm?.id) return;

    const payload: PaymentUpdateInput = {
      id: editPaymentForm.id,
      tax_invoice_id: editPaymentForm.tax_invoice_id,
      payment_date: editPaymentForm.payment_date,
      amount: toNumber(editPaymentForm.amount),
      memo: editPaymentForm.memo,
    };

    runAction(() => updateTaxInvoicePayment(payload), () => {
      setEditPaymentForm(null);
    });
  }

  function handleDeletePayment(payment: Row) {
    const ok = window.confirm(
      "입금 내역을 삭제할까요?\n삭제 후 미수금 상태가 자동 재계산됩니다.",
    );

    if (!ok) return;

    runAction(() =>
      deleteTaxInvoicePayment({
        id: String(payment.id ?? ""),
        tax_invoice_id: String(payment.tax_invoice_id ?? ""),
      }),
    );
  }

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">회계/유통망</h1>
          <p className="mt-1 text-sm text-gray-500">
            세금계산서, 입금 내역, 주문별 손익을 관리합니다.
          </p>
        </div>

        <div className="flex rounded-xl bg-gray-100 p-1">
          <button
            type="button"
            onClick={() => setActiveTab("tax-invoices")}
            className={`rounded-lg px-4 py-2 text-sm font-medium ${
              activeTab === "tax-invoices"
                ? "bg-white text-gray-900 shadow-sm ring-1 ring-blue-500"
                : "text-gray-500"
            }`}
          >
            세금계산서
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("profit")}
            className={`rounded-lg px-4 py-2 text-sm font-medium ${
              activeTab === "profit"
                ? "bg-white text-gray-900 shadow-sm ring-1 ring-blue-500"
                : "text-gray-500"
            }`}
          >
            손익 계산
          </button>
        </div>
      </div>

      {message && (
        <div
          className={`rounded-xl px-4 py-3 text-sm ${
            message.ok
              ? "bg-emerald-50 text-emerald-700"
              : "bg-rose-50 text-rose-700"
          }`}
        >
          {message.message}
        </div>
      )}

      {activeTab === "tax-invoices" && (
        <div className="space-y-6">
          <div className="grid gap-3 md:grid-cols-5">
            <SummaryCard
              title="주문건수"
              value={`${accountingSummary.orderCount.toLocaleString("ko-KR")}건`}
            />
            <SummaryCard
              title="누적매출금액"
              value={formatKrw(accountingSummary.totalSalesAmount)}
            />
            <SummaryCard
              title="세금계산서 발행금액"
              value={formatKrw(accountingSummary.invoiceIssuedAmount)}
            />
            <SummaryCard
              title="입금합계금액"
              value={formatKrw(accountingSummary.paidAmount)}
            />
            <SummaryCard
              title="미수금"
              value={formatKrw(accountingSummary.unpaidAmount)}
            />
          </div>

          <section className="rounded-2xl border border-gray-200 bg-white shadow-sm">
            <div className="flex flex-col gap-3 border-b border-gray-200 p-4 md:flex-row md:items-center md:justify-between">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">
                  세금계산서 목록
                </h2>
                <p className="mt-1 text-sm text-gray-500">
                  총 {invoices.length}건
                </p>
              </div>

              <button
                type="button"
                onClick={() => {
                  setInvoiceForm(emptyInvoiceForm);
                  setIsCreateInvoiceOpen(true);
                }}
                className="rounded-xl bg-gray-900 px-4 py-2 text-sm font-semibold text-white"
              >
                세금계산서 등록
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px] text-sm">
                <thead className="bg-gray-50 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                  <tr>
                    <th className="px-4 py-3">발행일</th>
                    <th className="px-4 py-3">계산서 번호</th>
                    <th className="px-4 py-3">거래처</th>
                    <th className="px-4 py-3 text-right">합계금액</th>
                    <th className="px-4 py-3 text-right">입금액</th>
                    <th className="px-4 py-3 text-right">미수금</th>
                    <th className="px-4 py-3">상태</th>
                    <th className="px-4 py-3 text-right">관리</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {invoices.length === 0 ? (
                    <tr>
                      <td
                        colSpan={8}
                        className="px-4 py-12 text-center text-gray-500"
                      >
                        등록된 세금계산서가 없습니다.
                      </td>
                    </tr>
                  ) : (
                    invoices.map((invoice) => (
                      <tr key={invoice.id} className="bg-white">
                        <td className="px-4 py-3">
                          {formatDate(invoice.issue_date)}
                        </td>
                        <td className="px-4 py-3 font-medium text-gray-900">
                          {invoice.invoice_number}
                        </td>
                        <td className="px-4 py-3">
                          {getPartnerName(invoice.partner)}
                        </td>
                        <td className="px-4 py-3 text-right font-medium">
                          {formatKrw(invoice.totalAmount)}
                        </td>
                        <td className="px-4 py-3 text-right">
                          {formatKrw(invoice.paidAmount)}
                        </td>
                        <td className="px-4 py-3 text-right">
                          {formatKrw(invoice.remainingAmount)}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${getStatusClass(
                              invoice.status,
                            )}`}
                          >
                            {getStatusText(invoice.status)}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedInvoiceId(invoice.id);
                                setPaymentForm({
                                  ...emptyPaymentForm,
                                  tax_invoice_id: invoice.id,
                                });
                              }}
                              className="rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700"
                            >
                              상세
                            </button>
                            <button
                              type="button"
                              onClick={() => handleOpenEditInvoice(invoice)}
                              className="rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700"
                            >
                              수정
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteInvoice(invoice.id)}
                              className="rounded-lg border border-rose-200 px-3 py-1.5 text-xs font-medium text-rose-600"
                            >
                              삭제
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      )}

      {activeTab === "profit" && (
        <section className="rounded-2xl border border-gray-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-gray-200 p-4">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">
                연도별 손익 계산
              </h2>
              <p className="mt-1 text-sm text-gray-500">
                주문 데이터를 연도별로 합산하여 매출, 상품원가, 이익률을 계산합니다.
              </p>
            </div>
            <span className="text-sm text-gray-500">
              총 {yearlyProfitRows.length}개 연도
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-sm">
              <thead className="bg-gray-50 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                <tr>
                  <th className="px-4 py-3">연도</th>
                  <th className="px-4 py-3 text-right">주문건수</th>
                  <th className="px-4 py-3 text-right">매출</th>
                  <th className="px-4 py-3 text-right">상품원가</th>
                  <th className="px-4 py-3 text-right">매출이익</th>
                  <th className="px-4 py-3 text-right">이익률</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {yearlyProfitRows.length === 0 ? (
                  <tr>
                    <td
                      colSpan={6}
                      className="px-4 py-10 text-center text-gray-500"
                    >
                      손익 계산할 주문이 없습니다.
                    </td>
                  </tr>
                ) : (
                  yearlyProfitRows.map((row) => (
                    <tr key={row.year}>
                      <td className="px-4 py-3 font-semibold text-gray-900">
                        {row.year}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {row.orderCount.toLocaleString("ko-KR")}건
                      </td>
                      <td className="px-4 py-3 text-right">
                        {formatKrw(row.salesAmount)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {formatKrw(row.costAmount)}
                      </td>
                      <td
                        className={`px-4 py-3 text-right font-semibold ${
                          row.profitAmount >= 0
                            ? "text-gray-900"
                            : "text-rose-600"
                        }`}
                      >
                        {formatKrw(row.profitAmount)}
                      </td>
                      <td
                        className={`px-4 py-3 text-right font-semibold ${
                          row.profitRate >= 0
                            ? "text-gray-900"
                            : "text-rose-600"
                        }`}
                      >
                        {formatPercent(row.profitRate)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {isCreateInvoiceOpen && (
        <InvoiceModal
          title="세금계산서 등록"
          description="거래처를 선택하면 해당 거래처의 주문만 표시됩니다."
          partners={partners}
          orders={orders}
          partnerMap={partnerMap}
          form={invoiceForm}
          previewTotal={invoiceCreatePreviewTotal}
          isPending={isPending}
          onClose={() => setIsCreateInvoiceOpen(false)}
          onChange={setInvoiceForm}
          onToggleOrder={toggleOrderInCreateForm}
          onSubmit={handleCreateInvoice}
          submitLabel="세금계산서 등록"
        />
      )}

      {editInvoiceForm && (
        <InvoiceModal
          title="세금계산서 수정"
          description="거래처를 선택하면 해당 거래처의 주문만 표시됩니다."
          partners={partners}
          orders={orders}
          partnerMap={partnerMap}
          form={editInvoiceForm}
          previewTotal={invoiceEditPreviewTotal}
          isPending={isPending}
          onClose={() => setEditInvoiceForm(null)}
          onChange={setEditInvoiceForm}
          onToggleOrder={toggleOrderInEditForm}
          onSubmit={handleUpdateInvoice}
          submitLabel="수정 저장"
          hidePaidFull
        />
      )}

      {selectedInvoice && (
        <InvoiceDetailModal
          invoice={selectedInvoice}
          paymentForm={paymentForm}
          isPending={isPending}
          onClose={() => {
            setSelectedInvoiceId("");
            setPaymentForm(emptyPaymentForm);
          }}
          onPaymentFormChange={setPaymentForm}
          onCreatePayment={handleCreatePayment}
          onOpenEditPayment={handleOpenEditPayment}
          onDeletePayment={handleDeletePayment}
        />
      )}

      {editPaymentForm && (
        <PaymentEditModal
          form={editPaymentForm}
          isPending={isPending}
          onClose={() => setEditPaymentForm(null)}
          onChange={setEditPaymentForm}
          onSubmit={handleUpdatePayment}
        />
      )}
    </div>
  );
}

function SummaryCard({ title, value }: { title: string; value: string }) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
      <p className="text-sm font-medium text-gray-500">{title}</p>
      <p className="mt-2 text-xl font-bold text-gray-900">{value}</p>
    </div>
  );
}

function InvoiceModal({
  title,
  description,
  partners,
  orders,
  partnerMap,
  form,
  previewTotal,
  isPending,
  onClose,
  onChange,
  onToggleOrder,
  onSubmit,
  submitLabel,
  hidePaidFull = false,
}: {
  title: string;
  description: string;
  partners: Row[];
  orders: Row[];
  partnerMap: Map<string, Row>;
  form: InvoiceForm;
  previewTotal: number;
  isPending: boolean;
  onClose: () => void;
  onChange: React.Dispatch<React.SetStateAction<any>>;
  onToggleOrder: (orderId: string) => void;
  onSubmit: () => void;
  submitLabel: string;
  hidePaidFull?: boolean;
}) {
  const filteredOrders = useMemo(() => {
    if (!form.partner_id) return [];

    return sortByDateDesc(
      orders.filter((order) => {
        return String(order.partner_id ?? "") === String(form.partner_id);
      }),
      ["order_date", "created_at"],
    );
  }, [orders, form.partner_id]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-white p-5 shadow-xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
            <p className="mt-1 text-sm text-gray-500">{description}</p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm"
          >
            닫기
          </button>
        </div>

        <div className="mt-5 grid gap-4 md:grid-cols-2">
          <div>
            <label className="text-sm font-medium text-gray-700">
              계산서 번호
            </label>
            <input
              value={form.invoice_number}
              onChange={(event) =>
                onChange((prev: InvoiceForm) => ({
                  ...prev,
                  invoice_number: event.target.value,
                }))
              }
              className="mt-1 w-full rounded-xl border border-gray-300 px-3 py-2 text-sm outline-none focus:border-gray-900"
              placeholder="예: 2026-001"
            />
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700">발행일</label>
            <input
              type="date"
              value={form.issue_date}
              onChange={(event) =>
                onChange((prev: InvoiceForm) => ({
                  ...prev,
                  issue_date: event.target.value,
                }))
              }
              className="mt-1 w-full rounded-xl border border-gray-300 px-3 py-2 text-sm outline-none focus:border-gray-900"
            />
          </div>

          <div className="md:col-span-2">
            <label className="text-sm font-medium text-gray-700">거래처</label>
            <select
              value={form.partner_id}
              onChange={(event) =>
                onChange((prev: InvoiceForm) => ({
                  ...prev,
                  partner_id: event.target.value,
                  order_ids: [],
                }))
              }
              className="mt-1 w-full rounded-xl border border-gray-300 px-3 py-2 text-sm outline-none focus:border-gray-900"
            >
              <option value="">거래처 선택</option>
              {partners.map((partner) => (
                <option key={getId(partner)} value={getId(partner)}>
                  {getPartnerName(partner)}
                </option>
              ))}
            </select>
            <p className="mt-1 text-xs text-gray-500">
              거래처를 변경하면 기존 선택 주문은 초기화됩니다.
            </p>
          </div>

          <div className="md:col-span-2">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-gray-700">
                연결 주문
              </label>
              <span className="text-xs text-gray-500">
                {form.order_ids.length}개 선택
              </span>
            </div>

            <div className="mt-2 max-h-72 space-y-2 overflow-y-auto rounded-xl border border-gray-200 p-2">
              {!form.partner_id ? (
                <div className="rounded-lg bg-gray-50 px-4 py-8 text-center text-sm text-gray-500">
                  거래처를 먼저 선택해주세요.
                </div>
              ) : filteredOrders.length === 0 ? (
                <div className="rounded-lg bg-gray-50 px-4 py-8 text-center text-sm text-gray-500">
                  선택한 거래처의 주문이 없습니다.
                </div>
              ) : (
                filteredOrders.map((order) => {
                  const orderId = getId(order);
                  const checked = form.order_ids.includes(orderId);

                  return (
                    <label
                      key={orderId}
                      className={`flex cursor-pointer items-start gap-3 rounded-lg border p-3 text-sm ${
                        checked
                          ? "border-gray-900 bg-gray-50"
                          : "border-gray-200 bg-white"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => onToggleOrder(orderId)}
                        className="mt-1"
                      />
                      <span className="min-w-0 flex-1">
                        <span className="block font-medium text-gray-900">
                          {getOrderNumber(order)}
                        </span>
                        <span className="block text-xs text-gray-500">
                          {getOrderDate(order)} ·{" "}
                          {getPartnerName(
                            partnerMap.get(String(order.partner_id)),
                          )}
                        </span>
                        <span className="mt-1 block font-semibold text-gray-900">
                          {formatKrw(getRecordAmount(order))}
                        </span>
                      </span>
                    </label>
                  );
                })
              )}
            </div>
          </div>

          <div className="rounded-xl bg-gray-50 p-3 md:col-span-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-500">선택 주문 합계</span>
              <span className="font-bold text-gray-900">
                {formatKrw(previewTotal)}
              </span>
            </div>
          </div>

          {!hidePaidFull && (
            <label className="flex items-center gap-2 rounded-xl border border-gray-200 p-3 text-sm md:col-span-2">
              <input
                type="checkbox"
                checked={form.paid_full}
                onChange={(event) =>
                  onChange((prev: InvoiceForm) => ({
                    ...prev,
                    paid_full: event.target.checked,
                  }))
                }
              />
              <span className="font-medium text-gray-700">
                등록과 동시에 입금완료 처리
              </span>
            </label>
          )}

          <div className="md:col-span-2">
            <label className="text-sm font-medium text-gray-700">메모</label>
            <textarea
              value={form.memo}
              onChange={(event) =>
                onChange((prev: InvoiceForm) => ({
                  ...prev,
                  memo: event.target.value,
                }))
              }
              className="mt-1 min-h-24 w-full rounded-xl border border-gray-300 px-3 py-2 text-sm outline-none focus:border-gray-900"
              placeholder="메모를 입력하세요."
            />
          </div>
        </div>

        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700"
          >
            취소
          </button>
          <button
            type="button"
            onClick={onSubmit}
            disabled={isPending}
            className="rounded-xl bg-gray-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
          >
            {isPending ? "처리 중..." : submitLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

function InvoiceDetailModal({
  invoice,
  paymentForm,
  isPending,
  onClose,
  onPaymentFormChange,
  onCreatePayment,
  onOpenEditPayment,
  onDeletePayment,
}: {
  invoice: InvoiceView;
  paymentForm: PaymentForm;
  isPending: boolean;
  onClose: () => void;
  onPaymentFormChange: React.Dispatch<React.SetStateAction<PaymentForm>>;
  onCreatePayment: () => void;
  onOpenEditPayment: (payment: Row) => void;
  onDeletePayment: (payment: Row) => void;
}) {
  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 p-4">
      <div className="max-h-[90vh] w-full max-w-6xl overflow-y-auto rounded-2xl bg-white p-5 shadow-xl">
        <div className="flex flex-col gap-3 border-b border-gray-200 pb-4 md:flex-row md:items-start md:justify-between">
          <div>
            <h2 className="text-xl font-bold text-gray-900">
              {invoice.invoice_number} 상세
            </h2>
            <p className="mt-1 text-sm text-gray-500">
              {getPartnerName(invoice.partner)} · {formatDate(invoice.issue_date)}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span
              className={`w-fit rounded-full px-3 py-1 text-xs font-semibold ${getStatusClass(
                invoice.status,
              )}`}
            >
              {getStatusText(invoice.status)}
            </span>

            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700"
            >
              닫기
            </button>
          </div>
        </div>

        <div className="mt-5 grid gap-3 md:grid-cols-3">
          <SummaryCard title="합계금액" value={formatKrw(invoice.totalAmount)} />
          <SummaryCard title="입금액" value={formatKrw(invoice.paidAmount)} />
          <SummaryCard title="미수금" value={formatKrw(invoice.remainingAmount)} />
        </div>

        <div className="mt-6">
          <h3 className="font-semibold text-gray-900">연결 주문</h3>

          <div className="mt-2 overflow-x-auto rounded-xl border border-gray-200">
            <table className="w-full min-w-[700px] text-sm">
              <thead className="bg-gray-50 text-left text-xs text-gray-500">
                <tr>
                  <th className="px-3 py-2">주문일</th>
                  <th className="px-3 py-2">주문번호</th>
                  <th className="px-3 py-2">거래처</th>
                  <th className="px-3 py-2 text-right">금액</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {invoice.linkedOrders.length === 0 ? (
                  <tr>
                    <td
                      colSpan={4}
                      className="px-3 py-8 text-center text-gray-500"
                    >
                      연결된 주문이 없습니다.
                    </td>
                  </tr>
                ) : (
                  invoice.linkedOrders.map((order) => (
                    <tr key={getId(order)}>
                      <td className="px-3 py-2">{getOrderDate(order)}</td>
                      <td className="px-3 py-2 font-medium text-gray-900">
                        {getOrderNumber(order)}
                      </td>
                      <td className="px-3 py-2">
                        {getPartnerName(invoice.partner)}
                      </td>
                      <td className="px-3 py-2 text-right">
                        {formatKrw(getRecordAmount(order))}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="mt-6">
          <h3 className="font-semibold text-gray-900">입금 등록</h3>

          <div className="mt-3 grid gap-3 md:grid-cols-[180px_1fr_1fr_auto]">
            <input
              type="date"
              value={paymentForm.payment_date}
              onChange={(event) =>
                onPaymentFormChange((prev) => ({
                  ...prev,
                  payment_date: event.target.value,
                }))
              }
              className="rounded-xl border border-gray-300 px-3 py-2 text-sm outline-none focus:border-gray-900"
            />
            <input
              value={paymentForm.amount}
              onChange={(event) =>
                onPaymentFormChange((prev) => ({
                  ...prev,
                  amount: event.target.value,
                }))
              }
              className="rounded-xl border border-gray-300 px-3 py-2 text-sm outline-none focus:border-gray-900"
              placeholder="입금액"
            />
            <input
              value={paymentForm.memo}
              onChange={(event) =>
                onPaymentFormChange((prev) => ({
                  ...prev,
                  memo: event.target.value,
                }))
              }
              className="rounded-xl border border-gray-300 px-3 py-2 text-sm outline-none focus:border-gray-900"
              placeholder="메모"
            />
            <button
              type="button"
              onClick={onCreatePayment}
              disabled={isPending}
              className="rounded-xl bg-gray-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
            >
              입금 등록
            </button>
          </div>
        </div>

        <div className="mt-6">
          <h3 className="font-semibold text-gray-900">입금 내역</h3>

          <div className="mt-2 overflow-x-auto rounded-xl border border-gray-200">
            <table className="w-full min-w-[700px] text-sm">
              <thead className="bg-gray-50 text-left text-xs text-gray-500">
                <tr>
                  <th className="px-3 py-2">입금일</th>
                  <th className="px-3 py-2 text-right">입금액</th>
                  <th className="px-3 py-2">메모</th>
                  <th className="px-3 py-2 text-right">관리</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {invoice.payments.length === 0 ? (
                  <tr>
                    <td
                      colSpan={4}
                      className="px-3 py-8 text-center text-gray-500"
                    >
                      입금 내역이 없습니다.
                    </td>
                  </tr>
                ) : (
                  invoice.payments.map((payment) => (
                    <tr key={String(payment.id)}>
                      <td className="px-3 py-2">
                        {formatDate(payment.payment_date)}
                      </td>
                      <td className="px-3 py-2 text-right font-medium">
                        {formatKrw(payment.amount)}
                      </td>
                      <td className="px-3 py-2">{payment.memo || "-"}</td>
                      <td className="px-3 py-2">
                        <div className="flex justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => onOpenEditPayment(payment)}
                            className="rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700"
                          >
                            수정
                          </button>
                          <button
                            type="button"
                            onClick={() => onDeletePayment(payment)}
                            className="rounded-lg border border-rose-200 px-3 py-1.5 text-xs font-medium text-rose-600"
                          >
                            삭제
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="mt-5 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700"
          >
            닫기
          </button>
        </div>
      </div>
    </div>
  );
}

function PaymentEditModal({
  form,
  isPending,
  onClose,
  onChange,
  onSubmit,
}: {
  form: PaymentForm;
  isPending: boolean;
  onClose: () => void;
  onChange: React.Dispatch<React.SetStateAction<PaymentForm | null>>;
  onSubmit: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-lg rounded-2xl bg-white p-5 shadow-xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">
              입금 내역 수정
            </h2>
            <p className="mt-1 text-sm text-gray-500">
              수정 후 미수금 상태가 자동 재계산됩니다.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm"
          >
            닫기
          </button>
        </div>

        <div className="mt-5 space-y-4">
          <div>
            <label className="text-sm font-medium text-gray-700">입금일</label>
            <input
              type="date"
              value={form.payment_date}
              onChange={(event) =>
                onChange((prev) =>
                  prev ? { ...prev, payment_date: event.target.value } : prev,
                )
              }
              className="mt-1 w-full rounded-xl border border-gray-300 px-3 py-2 text-sm outline-none focus:border-gray-900"
            />
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700">입금액</label>
            <input
              value={form.amount}
              onChange={(event) =>
                onChange((prev) =>
                  prev ? { ...prev, amount: event.target.value } : prev,
                )
              }
              className="mt-1 w-full rounded-xl border border-gray-300 px-3 py-2 text-sm outline-none focus:border-gray-900"
            />
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700">메모</label>
            <textarea
              value={form.memo}
              onChange={(event) =>
                onChange((prev) =>
                  prev ? { ...prev, memo: event.target.value } : prev,
                )
              }
              className="mt-1 min-h-24 w-full rounded-xl border border-gray-300 px-3 py-2 text-sm outline-none focus:border-gray-900"
            />
          </div>
        </div>

        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700"
          >
            취소
          </button>
          <button
            type="button"
            onClick={onSubmit}
            disabled={isPending}
            className="rounded-xl bg-gray-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
          >
            수정 저장
          </button>
        </div>
      </div>
    </div>
  );
}