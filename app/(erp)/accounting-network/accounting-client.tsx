"use client";

import { useMemo, useState, type FormEvent, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import {
  createTaxInvoiceAction,
  createTaxInvoicePaymentAction,
  deleteTaxInvoiceAction,
} from "./actions";

type AnyRow = Record<string, any>;

type Props = {
  currentYear: number;
  defaultInvoiceNumber: string;
  invoices: AnyRow[];
  partners: AnyRow[];
  invoiceOrderLinks: AnyRow[];
  orders: AnyRow[];
  orderItems: AnyRow[];
  headquartersPrices: AnyRow[];
};

function formatKrw(value: unknown) {
  const numberValue = Number(value ?? 0);

  if (!Number.isFinite(numberValue)) {
    return "₩0";
  }

  return `₩${Math.round(numberValue).toLocaleString("ko-KR")}`;
}

function toNumber(value: unknown) {
  if (value === null || value === undefined) return 0;

  if (typeof value === "number") {
    return Number.isFinite(value) ? value : 0;
  }

  const text = String(value)
    .replaceAll(",", "")
    .replaceAll("₩", "")
    .trim();

  const numberValue = Number(text);
  return Number.isFinite(numberValue) ? numberValue : 0;
}

function getPartnerName(partner?: AnyRow) {
  if (!partner) return "-";

  return (
    partner.name ??
    partner.partner_name ??
    partner.company_name ??
    partner.business_name ??
    partner.store_name ??
    partner.display_name ??
    "-"
  );
}

function getOrderNumber(order?: AnyRow) {
  if (!order) return "-";

  return (
    order.order_number ??
    order.order_no ??
    order.number ??
    order.code ??
    String(order.id ?? "").slice(0, 8)
  );
}

function getOrderDate(order?: AnyRow) {
  if (!order) return "-";

  const value =
    order.order_date ?? order.created_at ?? order.date ?? order.updated_at ?? "";

  if (!value) return "-";

  return String(value).slice(0, 10);
}

function getOrderPartnerId(order?: AnyRow) {
  return String(order?.partner_id ?? "");
}

function getOrderItemOrderId(item?: AnyRow) {
  return String(item?.order_id ?? "");
}

function getOrderItemVariantId(item?: AnyRow) {
  return String(item?.product_variant_id ?? item?.variant_id ?? "");
}

function getOrderItemQuantity(item?: AnyRow) {
  return toNumber(item?.quantity ?? item?.qty ?? item?.count);
}

function getOrderItemSaleAmount(item?: AnyRow) {
  const directAmount = toNumber(
    item?.total_amount ??
      item?.total_price ??
      item?.amount ??
      item?.subtotal ??
      item?.line_total
  );

  if (directAmount > 0) {
    return directAmount;
  }

  const quantity = getOrderItemQuantity(item);
  const unitPrice = toNumber(
    item?.unit_price ??
      item?.price ??
      item?.sale_price ??
      item?.selling_price ??
      item?.product_price
  );

  return quantity * unitPrice;
}

function isSampleOrder(order?: AnyRow) {
  const orderType = String(order?.order_type ?? order?.type ?? "").toLowerCase();
  const status = String(order?.status ?? "").toLowerCase();
  const orderNumber = String(getOrderNumber(order)).toUpperCase();

  return (
    orderType.includes("sample") ||
    status.includes("샘플") ||
    status.includes("sample") ||
    orderNumber.startsWith("SMP")
  );
}

function getOrderAmount(order: AnyRow, itemsByOrderId: Map<string, AnyRow[]>) {
  const directAmount = toNumber(
    order.total_amount ??
      order.total_price ??
      order.order_amount ??
      order.amount ??
      order.final_amount
  );

  if (directAmount > 0) {
    return directAmount;
  }

  const orderId = String(order.id ?? "");
  const items = itemsByOrderId.get(orderId) ?? [];

  return items.reduce((sum, item) => sum + getOrderItemSaleAmount(item), 0);
}

function getPaymentStatus(invoice: AnyRow) {
  const status = String(invoice.payment_status ?? "");

  if (status === "paid") return "paid";
  if (status === "partial") return "partial";
  if (status === "unpaid") return "unpaid";

  const totalAmount = toNumber(invoice.total_amount);
  const paidAmount = toNumber(invoice.paid_amount);

  if (paidAmount <= 0) return "unpaid";
  if (paidAmount >= totalAmount) return "paid";
  return "partial";
}

function getStatusLabel(status: string) {
  if (status === "paid") return "완납";
  if (status === "partial") return "부분입금";
  return "미입금";
}

function getStatusClassName(status: string) {
  if (status === "paid") {
    return "bg-emerald-50 text-emerald-700";
  }

  if (status === "partial") {
    return "bg-amber-50 text-amber-700";
  }

  return "bg-rose-50 text-rose-700";
}

function getInvoiceIssueYear(invoice: AnyRow) {
  return String(invoice.issue_date ?? "").slice(0, 4);
}

export default function AccountingClient({
  currentYear,
  defaultInvoiceNumber,
  invoices,
  partners,
  invoiceOrderLinks,
  orders,
  orderItems,
  headquartersPrices,
}: Props) {
  const [activeTab, setActiveTab] = useState<"tax-invoice" | "profit">(
    "tax-invoice"
  );
  const [partnerFilter, setPartnerFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [paymentInvoice, setPaymentInvoice] = useState<AnyRow | null>(null);

  const partnerById = useMemo(() => {
    const map = new Map<string, AnyRow>();

    partners.forEach((partner) => {
      map.set(String(partner.id), partner);
    });

    return map;
  }, [partners]);

  const sortedPartners = useMemo(() => {
    return [...partners].sort((a, b) =>
      String(getPartnerName(a)).localeCompare(String(getPartnerName(b)), "ko")
    );
  }, [partners]);

  const orderById = useMemo(() => {
    const map = new Map<string, AnyRow>();

    orders.forEach((order) => {
      map.set(String(order.id), order);
    });

    return map;
  }, [orders]);

  const itemsByOrderId = useMemo(() => {
    const map = new Map<string, AnyRow[]>();

    orderItems.forEach((item) => {
      const orderId = getOrderItemOrderId(item);
      if (!orderId) return;

      const prev = map.get(orderId) ?? [];
      prev.push(item);
      map.set(orderId, prev);
    });

    return map;
  }, [orderItems]);

  const orderAmountById = useMemo(() => {
    const map = new Map<string, number>();

    orders.forEach((order) => {
      map.set(String(order.id), getOrderAmount(order, itemsByOrderId));
    });

    return map;
  }, [orders, itemsByOrderId]);

  const invoiceOrderLinksByInvoiceId = useMemo(() => {
    const map = new Map<string, AnyRow[]>();

    invoiceOrderLinks.forEach((link) => {
      const invoiceId = String(link.tax_invoice_id ?? "");
      if (!invoiceId) return;

      const prev = map.get(invoiceId) ?? [];
      prev.push(link);
      map.set(invoiceId, prev);
    });

    return map;
  }, [invoiceOrderLinks]);

  const headquartersPriceByVariantId = useMemo(() => {
    const map = new Map<string, number>();

    headquartersPrices.forEach((priceRow) => {
      const variantId = String(priceRow.product_variant_id ?? "");
      if (!variantId) return;

      map.set(variantId, toNumber(priceRow.price));
    });

    return map;
  }, [headquartersPrices]);

  const filteredInvoices = useMemo(() => {
    return invoices.filter((invoice) => {
      const partnerMatched =
        partnerFilter === "all" ||
        String(invoice.partner_id ?? "") === partnerFilter;

      const invoiceStatus = getPaymentStatus(invoice);

      const statusMatched =
        statusFilter === "all" || invoiceStatus === statusFilter;

      return partnerMatched && statusMatched;
    });
  }, [invoices, partnerFilter, statusFilter]);

  const yearInvoices = useMemo(() => {
    return filteredInvoices.filter(
      (invoice) => getInvoiceIssueYear(invoice) === String(currentYear)
    );
  }, [filteredInvoices, currentYear]);

  const filteredOrders = useMemo(() => {
    return orders.filter((order) => {
      const partnerMatched =
        partnerFilter === "all" || getOrderPartnerId(order) === partnerFilter;

      const orderYear = getOrderDate(order).slice(0, 4);

      return partnerMatched && orderYear === String(currentYear);
    });
  }, [orders, partnerFilter, currentYear]);

  const regularOrders = useMemo(() => {
    return filteredOrders.filter((order) => !isSampleOrder(order));
  }, [filteredOrders]);

  const totalSalesAmount = useMemo(() => {
    return regularOrders.reduce((sum, order) => {
      return sum + (orderAmountById.get(String(order.id)) ?? 0);
    }, 0);
  }, [regularOrders, orderAmountById]);

  const invoiceTotalAmount = useMemo(() => {
    return yearInvoices.reduce(
      (sum, invoice) => sum + toNumber(invoice.total_amount),
      0
    );
  }, [yearInvoices]);

  const paidTotalAmount = useMemo(() => {
    return yearInvoices.reduce(
      (sum, invoice) => sum + toNumber(invoice.paid_amount),
      0
    );
  }, [yearInvoices]);

  const unpaidTotalAmount = useMemo(() => {
    return yearInvoices.reduce(
      (sum, invoice) => sum + toNumber(invoice.unpaid_amount),
      0
    );
  }, [yearInvoices]);

  const profitRows = useMemo(() => {
    return filteredOrders.map((order) => {
      const orderId = String(order.id);
      const items = itemsByOrderId.get(orderId) ?? [];

      const salesAmount = isSampleOrder(order)
        ? 0
        : orderAmountById.get(orderId) ?? 0;

      const costAmount = items.reduce((sum, item) => {
        const variantId = getOrderItemVariantId(item);
        const quantity = getOrderItemQuantity(item);
        const costPrice = headquartersPriceByVariantId.get(variantId) ?? 0;

        return sum + quantity * costPrice;
      }, 0);

      const profitAmount = salesAmount - costAmount;
      const profitRate =
        salesAmount > 0
          ? Math.round((profitAmount / salesAmount) * 1000) / 10
          : 0;

      return {
        order,
        salesAmount,
        costAmount,
        profitAmount,
        profitRate,
        isSample: isSampleOrder(order),
      };
    });
  }, [
    filteredOrders,
    itemsByOrderId,
    orderAmountById,
    headquartersPriceByVariantId,
  ]);

  const totalCostAmount = useMemo(() => {
    return profitRows
      .filter((row) => !row.isSample)
      .reduce((sum, row) => sum + row.costAmount, 0);
  }, [profitRows]);

  const sampleCostAmount = useMemo(() => {
    return profitRows
      .filter((row) => row.isSample)
      .reduce((sum, row) => sum + row.costAmount, 0);
  }, [profitRows]);

  const totalProfitAmount = totalSalesAmount - totalCostAmount;

  const totalProfitRate =
    totalSalesAmount > 0
      ? Math.round((totalProfitAmount / totalSalesAmount) * 1000) / 10
      : 0;

  return (
    <div className="space-y-8 text-slate-900">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            회계 / 유통망 관리
          </h1>
        </div>

        <select
          value={partnerFilter}
          onChange={(event) => setPartnerFilter(event.target.value)}
          className="h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm shadow-sm outline-none md:w-64"
        >
          <option value="all">모든 거래처</option>
          {sortedPartners.map((partner) => (
            <option key={String(partner.id)} value={String(partner.id)}>
              {getPartnerName(partner)}
            </option>
          ))}
        </select>
      </div>

      <div className="inline-flex rounded-2xl bg-white/60 p-1 shadow-sm">
        <button
          type="button"
          onClick={() => setActiveTab("tax-invoice")}
          className={`rounded-xl px-5 py-2 text-sm font-semibold transition ${
            activeTab === "tax-invoice"
              ? "bg-white text-slate-900 shadow"
              : "text-slate-500"
          }`}
        >
          세금계산서
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("profit")}
          className={`rounded-xl px-5 py-2 text-sm font-semibold transition ${
            activeTab === "profit"
              ? "bg-white text-slate-900 shadow"
              : "text-slate-500"
          }`}
        >
          손익 계산
        </button>
      </div>

      {activeTab === "tax-invoice" ? (
        <>
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-3">
              <span className="text-sm font-semibold text-slate-500">
                입금 상태:
              </span>

              <select
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value)}
                className="h-12 w-48 rounded-2xl border border-slate-200 bg-white px-4 text-sm shadow-sm outline-none"
              >
                <option value="all">전체</option>
                <option value="paid">완납</option>
                <option value="partial">부분입금</option>
                <option value="unpaid">미입금</option>
              </select>
            </div>

            <CreateTaxInvoiceModal
              currentYear={currentYear}
              defaultInvoiceNumber={defaultInvoiceNumber}
              partners={sortedPartners}
              orders={regularOrders}
              orderAmountById={orderAmountById}
            />
          </div>

          <div className="grid gap-4 md:grid-cols-5">
            <SummaryCard label="건수" value={`${yearInvoices.length}건`} />
            <SummaryCard
              label={`${currentYear}년 누적 매출`}
              value={formatKrw(totalSalesAmount)}
              valueClassName="text-blue-600"
            />
            <SummaryCard
              label="세금계산서 발행 금액"
              value={formatKrw(invoiceTotalAmount)}
            />
            <SummaryCard
              label="입금 합계"
              value={formatKrw(paidTotalAmount)}
              valueClassName="text-emerald-700"
            />
            <SummaryCard
              label="미수금"
              value={formatKrw(unpaidTotalAmount)}
              valueClassName="text-orange-700"
            />
          </div>

          <div className="overflow-hidden rounded-3xl bg-white p-6 shadow-sm">
            <div className="overflow-x-auto">
              <table className="min-w-[1100px] w-full border-separate border-spacing-0 text-sm">
                <thead>
                  <tr className="bg-stone-50 text-left text-slate-500">
                    <TableHead className="rounded-l-2xl">계산서 번호</TableHead>
                    <TableHead>거래처</TableHead>
                    <TableHead>발행일</TableHead>
                    <TableHead>연결 주문</TableHead>
                    <TableHead className="text-right">합계금액</TableHead>
                    <TableHead className="text-right">입금액</TableHead>
                    <TableHead className="text-right">미수금</TableHead>
                    <TableHead>상태</TableHead>
                    <TableHead className="rounded-r-2xl text-right">
                      액션
                    </TableHead>
                  </tr>
                </thead>

                <tbody>
                  {filteredInvoices.length === 0 ? (
                    <tr>
                      <td
                        colSpan={9}
                        className="py-12 text-center text-slate-400"
                      >
                        등록된 세금계산서가 없습니다.
                      </td>
                    </tr>
                  ) : (
                    filteredInvoices.map((invoice) => {
                      const partner = partnerById.get(
                        String(invoice.partner_id ?? "")
                      );

                      const links =
                        invoiceOrderLinksByInvoiceId.get(String(invoice.id)) ??
                        [];

                      const linkedOrders = links
                        .map((link) =>
                          orderById.get(String(link.order_id ?? ""))
                        )
                        .filter(Boolean);

                      const status = getPaymentStatus(invoice);

                      return (
                        <tr
                          key={String(invoice.id)}
                          className="border-b border-slate-100"
                        >
                          <TableCell className="font-semibold">
                            {invoice.invoice_number}
                          </TableCell>
                          <TableCell>{getPartnerName(partner)}</TableCell>
                          <TableCell className="text-slate-500">
                            {String(invoice.issue_date ?? "").slice(0, 10)}
                          </TableCell>
                          <TableCell>
                            {linkedOrders.length > 0 ? (
                              <div className="flex flex-wrap gap-1">
                                {linkedOrders.map((order) => (
                                  <span
                                    key={String(order?.id)}
                                    className="font-semibold text-red-600"
                                  >
                                    #{getOrderNumber(order)}
                                  </span>
                                ))}
                              </div>
                            ) : (
                              <span className="text-slate-400">-</span>
                            )}
                          </TableCell>
                          <TableCell className="text-right font-bold">
                            {formatKrw(invoice.total_amount)}
                          </TableCell>
                          <TableCell className="text-right font-bold text-emerald-700">
                            {formatKrw(invoice.paid_amount)}
                          </TableCell>
                          <TableCell className="text-right font-bold text-orange-700">
                            {formatKrw(invoice.unpaid_amount)}
                          </TableCell>
                          <TableCell>
                            <span
                              className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ${getStatusClassName(
                                status
                              )}`}
                            >
                              {getStatusLabel(status)}
                            </span>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center justify-end gap-2">
                              <button
                                type="button"
                                onClick={() => setPaymentInvoice(invoice)}
                                className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold shadow-sm hover:bg-slate-50"
                              >
                                입금
                              </button>

                              <button
                                type="button"
                                disabled
                                title="수정 기능은 다음 단계에서 연결합니다."
                                className="rounded-xl px-3 py-2 text-xs font-bold text-slate-400"
                              >
                                수정
                              </button>

                              <form
                                action={deleteTaxInvoiceAction}
                                onSubmit={(event) => {
                                  if (
                                    !window.confirm(
                                      "이 세금계산서를 삭제할까요? 연결된 입금 내역도 함께 삭제됩니다."
                                    )
                                  ) {
                                    event.preventDefault();
                                  }
                                }}
                              >
                                <input
                                  type="hidden"
                                  name="id"
                                  value={String(invoice.id)}
                                />
                                <button
                                  type="submit"
                                  className="rounded-xl px-3 py-2 text-xs font-bold text-red-600 hover:bg-red-50"
                                >
                                  삭제
                                </button>
                              </form>
                            </div>
                          </TableCell>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <PaymentModal
            invoice={paymentInvoice}
            onClose={() => setPaymentInvoice(null)}
          />
        </>
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-5">
            <SummaryCard
              label={`${currentYear}년 매출`}
              value={formatKrw(totalSalesAmount)}
              valueClassName="text-blue-600"
            />
            <SummaryCard
              label="상품원가"
              value={formatKrw(totalCostAmount)}
            />
            <SummaryCard
              label="샘플 출고 원가"
              value={formatKrw(sampleCostAmount)}
              valueClassName="text-orange-700"
            />
            <SummaryCard
              label="매출이익"
              value={formatKrw(totalProfitAmount)}
              valueClassName={
                totalProfitAmount >= 0 ? "text-emerald-700" : "text-red-600"
              }
            />
            <SummaryCard label="이익률" value={`${totalProfitRate}%`} />
          </div>

          <div className="overflow-hidden rounded-3xl bg-white p-6 shadow-sm">
            <div className="mb-4">
              <h2 className="text-lg font-bold">주문별 손익</h2>
              <p className="mt-1 text-sm text-slate-500">
                도착원가 기준으로 상품원가를 계산합니다.
              </p>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-[1000px] w-full border-separate border-spacing-0 text-sm">
                <thead>
                  <tr className="bg-stone-50 text-left text-slate-500">
                    <TableHead className="rounded-l-2xl">주문번호</TableHead>
                    <TableHead>거래처</TableHead>
                    <TableHead>주문일</TableHead>
                    <TableHead>구분</TableHead>
                    <TableHead className="text-right">매출</TableHead>
                    <TableHead className="text-right">상품원가</TableHead>
                    <TableHead className="text-right">매출이익</TableHead>
                    <TableHead className="rounded-r-2xl text-right">
                      이익률
                    </TableHead>
                  </tr>
                </thead>

                <tbody>
                  {profitRows.length === 0 ? (
                    <tr>
                      <td
                        colSpan={8}
                        className="py-12 text-center text-slate-400"
                      >
                        손익 계산할 주문이 없습니다.
                      </td>
                    </tr>
                  ) : (
                    profitRows.map((row) => {
                      const partner = partnerById.get(
                        getOrderPartnerId(row.order)
                      );

                      return (
                        <tr key={String(row.order.id)}>
                          <TableCell className="font-semibold">
                            {getOrderNumber(row.order)}
                          </TableCell>
                          <TableCell>{getPartnerName(partner)}</TableCell>
                          <TableCell className="text-slate-500">
                            {getOrderDate(row.order)}
                          </TableCell>
                          <TableCell>
                            {row.isSample ? (
                              <span className="rounded-full bg-orange-50 px-3 py-1 text-xs font-bold text-orange-700">
                                샘플
                              </span>
                            ) : (
                              <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700">
                                일반
                              </span>
                            )}
                          </TableCell>
                          <TableCell className="text-right font-bold">
                            {formatKrw(row.salesAmount)}
                          </TableCell>
                          <TableCell className="text-right font-bold">
                            {formatKrw(row.costAmount)}
                          </TableCell>
                          <TableCell
                            className={`text-right font-bold ${
                              row.profitAmount >= 0
                                ? "text-emerald-700"
                                : "text-red-600"
                            }`}
                          >
                            {formatKrw(row.profitAmount)}
                          </TableCell>
                          <TableCell className="text-right font-bold">
                            {row.isSample ? "-" : `${row.profitRate}%`}
                          </TableCell>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function SummaryCard({
  label,
  value,
  valueClassName = "text-slate-900",
}: {
  label: string;
  value: string;
  valueClassName?: string;
}) {
  return (
    <div className="rounded-3xl bg-white p-6 shadow-sm">
      <div className="text-sm font-semibold text-slate-500">{label}</div>
      <div className={`mt-2 text-2xl font-black ${valueClassName}`}>
        {value}
      </div>
    </div>
  );
}

function TableHead({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <th className={`px-4 py-4 text-sm font-bold ${className}`}>{children}</th>
  );
}

function TableCell({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <td className={`border-b border-slate-100 px-4 py-4 ${className}`}>
      {children}
    </td>
  );
}

function CreateTaxInvoiceModal({
  currentYear,
  defaultInvoiceNumber,
  partners,
  orders,
  orderAmountById,
}: {
  currentYear: number;
  defaultInvoiceNumber: string;
  partners: AnyRow[];
  orders: AnyRow[];
  orderAmountById: Map<string, number>;
}) {
  const router = useRouter();

  const [open, setOpen] = useState(false);
  const [partnerId, setPartnerId] = useState("");
  const [selectedOrderIds, setSelectedOrderIds] = useState<string[]>([]);
  const [amount, setAmount] = useState("");
  const [invoiceNumber, setInvoiceNumber] = useState(defaultInvoiceNumber);
  const [isPaidOnCreate, setIsPaidOnCreate] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const filteredOrders = useMemo(() => {
    return orders.filter((order) => {
      if (!partnerId) return false;
      return getOrderPartnerId(order) === partnerId;
    });
  }, [orders, partnerId]);

  const selectedAmount = useMemo(() => {
    return selectedOrderIds.reduce((sum, id) => {
      return sum + (orderAmountById.get(id) ?? 0);
    }, 0);
  }, [selectedOrderIds, orderAmountById]);

  function resetModal() {
    setPartnerId("");
    setSelectedOrderIds([]);
    setAmount("");
    setInvoiceNumber(defaultInvoiceNumber);
    setIsPaidOnCreate(false);
  }

  function toggleOrder(orderId: string) {
    setSelectedOrderIds((prev) => {
      const exists = prev.includes(orderId);

      const next = exists
        ? prev.filter((id) => id !== orderId)
        : [...prev, orderId];

      const nextAmount = next.reduce((sum, id) => {
        return sum + (orderAmountById.get(id) ?? 0);
      }, 0);

      setAmount(String(nextAmount));

      if (next.length === 0) {
        setIsPaidOnCreate(false);
      }

      return next;
    });
  }

  async function handleCreateInvoiceSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const formData = new FormData(event.currentTarget);

    setIsSubmitting(true);

    try {
      await createTaxInvoiceAction(formData);

      setOpen(false);
      resetModal();
      router.refresh();
    } catch (error) {
      alert(
        error instanceof Error
          ? error.message
          : "세금계산서 등록 중 오류가 발생했습니다."
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setInvoiceNumber(defaultInvoiceNumber);
          setOpen(true);
        }}
        className="h-12 rounded-2xl bg-red-600 px-6 text-sm font-bold text-white shadow-sm hover:bg-red-700"
      >
        + 세금계산서 등록
      </button>

      {open ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-3xl bg-white p-6 shadow-xl">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-black">세금계산서 등록</h2>

              <button
                type="button"
                onClick={() => {
                  setOpen(false);
                  resetModal();
                }}
                className="rounded-xl px-3 py-2 text-sm font-bold text-slate-500 hover:bg-slate-100"
              >
                닫기
              </button>
            </div>

            <form
              onSubmit={handleCreateInvoiceSubmit}
              className="mt-6 space-y-5"
            >
              <input
                type="hidden"
                name="order_ids"
                value={JSON.stringify(selectedOrderIds)}
              />

              <input type="hidden" name="total_amount" value={amount} />

              <input
                type="hidden"
                name="payment_date"
                value={new Date().toISOString().slice(0, 10)}
              />

              <input type="hidden" name="payment_method" value="계좌이체" />

              <div className="grid gap-4 md:grid-cols-2">
                <label className="space-y-2">
                  <span className="text-sm font-bold text-slate-600">
                    계산서 번호
                  </span>
                  <input
                    name="invoice_number"
                    value={invoiceNumber}
                    onChange={(event) => setInvoiceNumber(event.target.value)}
                    className="h-12 w-full rounded-2xl border border-slate-200 px-4 outline-none"
                    placeholder={`${currentYear}-1`}
                    required
                  />
                </label>

                <label className="space-y-2">
                  <span className="text-sm font-bold text-slate-600">
                    발행일
                  </span>
                  <input
                    type="date"
                    name="issue_date"
                    defaultValue={new Date().toISOString().slice(0, 10)}
                    className="h-12 w-full rounded-2xl border border-slate-200 px-4 outline-none"
                    required
                  />
                </label>
              </div>

              <label className="block space-y-2">
                <span className="text-sm font-bold text-slate-600">
                  거래처
                </span>
                <select
                  name="partner_id"
                  value={partnerId}
                  onChange={(event) => {
                    setPartnerId(event.target.value);
                    setSelectedOrderIds([]);
                    setAmount("");
                    setIsPaidOnCreate(false);
                  }}
                  className="h-12 w-full rounded-2xl border border-slate-200 px-4 outline-none"
                  required
                >
                  <option value="">거래처 선택</option>
                  {partners.map((partner) => (
                    <option key={String(partner.id)} value={String(partner.id)}>
                      {getPartnerName(partner)}
                    </option>
                  ))}
                </select>
              </label>

              <div className="space-y-2">
                <div className="text-sm font-bold text-slate-600">
                  연결 주문
                </div>

                <div className="max-h-60 overflow-y-auto rounded-2xl border border-slate-200">
                  {!partnerId ? (
                    <div className="p-4 text-sm text-slate-400">
                      거래처를 먼저 선택해주세요.
                    </div>
                  ) : filteredOrders.length === 0 ? (
                    <div className="p-4 text-sm text-slate-400">
                      연결할 주문이 없습니다.
                    </div>
                  ) : (
                    filteredOrders.map((order) => {
                      const orderId = String(order.id);
                      const checked = selectedOrderIds.includes(orderId);

                      return (
                        <label
                          key={orderId}
                          className="flex cursor-pointer items-center justify-between gap-3 border-b border-slate-100 px-4 py-3 last:border-b-0 hover:bg-slate-50"
                        >
                          <div className="flex items-center gap-3">
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => toggleOrder(orderId)}
                            />

                            <div>
                              <div className="font-bold">
                                #{getOrderNumber(order)}
                              </div>
                              <div className="text-xs text-slate-400">
                                {getOrderDate(order)}
                              </div>
                            </div>
                          </div>

                          <div className="text-xs font-bold text-slate-400">
                            {checked ? "선택됨" : "선택"}
                          </div>
                        </label>
                      );
                    })
                  )}
                </div>
              </div>

              {selectedOrderIds.length > 0 ? (
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <label className="flex cursor-pointer items-center justify-between gap-4">
                    <div>
                      <div className="text-sm font-black text-slate-800">
                        입금 완료로 등록
                      </div>
                      <div className="mt-1 text-xs text-slate-500">
                        체크하면 세금계산서 등록과 동시에 입금액도 함께
                        등록됩니다.
                      </div>
                    </div>

                    <input
                      type="checkbox"
                      name="is_paid_on_create"
                      checked={isPaidOnCreate}
                      onChange={(event) =>
                        setIsPaidOnCreate(event.target.checked)
                      }
                      className="h-5 w-5"
                    />
                  </label>

                  <div className="mt-3 text-right text-sm font-bold text-slate-500">
                    연결 주문 합계 {formatKrw(selectedAmount)}
                  </div>
                </div>
              ) : null}

              <label className="block space-y-2">
                <span className="text-sm font-bold text-slate-600">메모</span>
                <textarea
                  name="memo"
                  className="min-h-24 w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none"
                  placeholder="필요 시 메모를 입력하세요."
                />
              </label>

              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setOpen(false);
                    resetModal();
                  }}
                  className="h-12 rounded-2xl border border-slate-200 px-6 text-sm font-bold"
                >
                  취소
                </button>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="h-12 rounded-2xl bg-red-600 px-6 text-sm font-bold text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:bg-slate-300"
                >
                  {isSubmitting ? "등록 중..." : "등록"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </>
  );
}

function PaymentModal({
  invoice,
  onClose,
}: {
  invoice: AnyRow | null;
  onClose: () => void;
}) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!invoice) return null;

  const unpaidAmount = toNumber(invoice.unpaid_amount);

  async function handlePaymentSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const formData = new FormData(event.currentTarget);

    setIsSubmitting(true);

    try {
      await createTaxInvoicePaymentAction(formData);
      onClose();
      router.refresh();
    } catch (error) {
      alert(
        error instanceof Error
          ? error.message
          : "입금 등록 중 오류가 발생했습니다."
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-xl">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-black">입금 등록</h2>

          <button
            type="button"
            onClick={onClose}
            className="rounded-xl px-3 py-2 text-sm font-bold text-slate-500 hover:bg-slate-100"
          >
            닫기
          </button>
        </div>

        <div className="mt-4 rounded-2xl bg-slate-50 p-4 text-sm">
          <div className="flex justify-between">
            <span className="text-slate-500">계산서 번호</span>
            <span className="font-bold">{invoice.invoice_number}</span>
          </div>
          <div className="mt-2 flex justify-between">
            <span className="text-slate-500">미수금</span>
            <span className="font-bold text-orange-700">
              {formatKrw(unpaidAmount)}
            </span>
          </div>
        </div>

        <form onSubmit={handlePaymentSubmit} className="mt-6 space-y-5">
          <input
            type="hidden"
            name="tax_invoice_id"
            value={String(invoice.id)}
          />

          <label className="block space-y-2">
            <span className="text-sm font-bold text-slate-600">입금일</span>
            <input
              type="date"
              name="payment_date"
              defaultValue={new Date().toISOString().slice(0, 10)}
              className="h-12 w-full rounded-2xl border border-slate-200 px-4 outline-none"
              required
            />
          </label>

          <label className="block space-y-2">
            <span className="text-sm font-bold text-slate-600">입금액</span>
            <input
              name="amount"
              defaultValue={unpaidAmount > 0 ? String(unpaidAmount) : ""}
              className="h-12 w-full rounded-2xl border border-slate-200 px-4 text-right font-bold outline-none"
              placeholder="0"
              required
            />
          </label>

          <label className="block space-y-2">
            <span className="text-sm font-bold text-slate-600">입금 방식</span>
            <select
              name="payment_method"
              className="h-12 w-full rounded-2xl border border-slate-200 px-4 outline-none"
              defaultValue="계좌이체"
            >
              <option value="계좌이체">계좌이체</option>
              <option value="카드">카드</option>
              <option value="현금">현금</option>
              <option value="기타">기타</option>
            </select>
          </label>

          <label className="block space-y-2">
            <span className="text-sm font-bold text-slate-600">메모</span>
            <textarea
              name="memo"
              className="min-h-20 w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none"
              placeholder="필요 시 메모를 입력하세요."
            />
          </label>

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="h-12 rounded-2xl border border-slate-200 px-6 text-sm font-bold"
            >
              취소
            </button>

            <button
              type="submit"
              disabled={isSubmitting}
              className="h-12 rounded-2xl bg-red-600 px-6 text-sm font-bold text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:bg-slate-300"
            >
              {isSubmitting ? "등록 중..." : "입금 등록"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}