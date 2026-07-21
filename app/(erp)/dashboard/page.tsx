import { getDashboardData } from "./actions";
import { MonthlySalesPanel, YearlySalesPanel } from "./dashboard-panels";

export const dynamic = "force-dynamic";

const LOW_STOCK_THRESHOLD = 5;

type SearchParams = Record<string, string | string[] | undefined>;

type DashboardPageProps = {
  searchParams?: Promise<SearchParams> | SearchParams;
};

export default async function DashboardPage({
  searchParams,
}: DashboardPageProps) {
  const resolvedSearchParams = await Promise.resolve(searchParams ?? {});

  const data = await getDashboardData({
    year: resolvedSearchParams.year,
    salesYear: resolvedSearchParams.salesYear,
    salesMonth: resolvedSearchParams.salesMonth,
  });

  const issuedRate =
    data.totalOrderSalesAmount > 0
      ? Math.min(
          (data.taxInvoiceAmount / data.totalOrderSalesAmount) * 100,
          100,
        )
      : 0;

  const unissuedRate =
    data.totalOrderSalesAmount > 0
      ? Math.min(
          (data.unissuedTaxInvoiceAmount / data.totalOrderSalesAmount) * 100,
          100,
        )
      : 0;

  const unpaidRate =
    data.taxInvoiceAmount > 0
      ? Math.min((data.unpaidAmount / data.taxInvoiceAmount) * 100, 100)
      : 0;

  return (
    <div className="min-h-screen rounded-[32px] bg-[#fff7f4] p-4 sm:p-6 lg:p-8">
      <div className="space-y-6">
        <div>
          <p className="text-sm font-medium text-slate-500">
            {data.todayLabel}
          </p>
          <h1 className="mt-1 text-3xl font-black tracking-tight text-slate-900">
            대시보드
          </h1>
        </div>

        {data.errors.length > 0 ? (
          <div className="rounded-3xl border border-red-200 bg-red-50 p-5 text-sm text-red-700 shadow-sm">
            <p className="font-bold">일부 통계를 불러오지 못했습니다.</p>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              {data.errors.map((error, index) => (
                <li key={`${error}-${index}`}>{error}</li>
              ))}
            </ul>
          </div>
        ) : null}

        <div className="grid gap-5 lg:grid-cols-3">
          <BigStatCard
            icon="trend"
            title="이번연도 총매출"
            value={formatKrw(data.currentYearSales)}
            description={`${data.currentYear}년 누적 주문 매출`}
          />

          <BigStatCard
            icon="cube"
            title="이번 달 주문 수"
            value={`${formatNumber(data.monthlyOrders)}건`}
            description={`${data.currentYear}년 ${data.currentMonth}월 주문`}
          />

          <BigStatCard
            icon="bag"
            title="이번 달 매출"
            value={formatKrw(data.monthlySales)}
            description={`${data.currentYear}년 ${data.currentMonth}월 주문 매출`}
          />
        </div>

        <div className="grid gap-5 xl:grid-cols-[1.45fr_1fr]">
          <YearlySalesPanel
            initialData={data.yearlySalesData}
            availableYears={data.availableYears}
          />

          <section className="rounded-[28px] bg-white p-5 shadow-[0_18px_50px_rgba(15,23,42,0.06)] sm:p-7">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-black text-slate-900">
                  주문 매출 / 세금계산서 현황
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  총 주문 매출과 계산서 발행·미발행 금액, 미수금을 확인합니다.
                </p>
              </div>
              <span className="rounded-full bg-slate-900 px-4 py-2 text-xs font-bold text-white">
                누적
              </span>
            </div>

            <div className="mt-7 space-y-5">
              <InvoiceStatusRow
                label="총 주문 매출액"
                value={formatKrw(data.totalOrderSalesAmount)}
                percent={100}
                tone="primary"
              />
              <InvoiceStatusRow
                label="세금계산서 발행금액"
                value={formatKrw(data.taxInvoiceAmount)}
                percent={issuedRate}
                tone="issued"
              />
              <InvoiceStatusRow
                label="세금계산서 미발행금액"
                value={formatKrw(data.unissuedTaxInvoiceAmount)}
                percent={unissuedRate}
                tone="warning"
              />
              <InvoiceStatusRow
                label="미수금"
                value={formatKrw(data.unpaidAmount)}
                percent={unpaidRate}
                tone="danger"
              />
            </div>

            <p className="mt-4 text-xs leading-5 text-slate-400">
              발행·미발행 비율은 총 주문 매출액 기준이며, 미수금 비율은
              세금계산서 발행금액 기준입니다.
            </p>

            <div className="mt-7 rounded-3xl bg-[#fff7f4] p-5">
              <p className="text-sm font-bold text-slate-500">
                선택 연도 상품원가
              </p>
              <p className="mt-2 text-2xl font-black text-slate-900">
                {formatKrw(data.yearlySalesData.yearlyProductCost)}
              </p>
              <p className="mt-2 text-xs leading-5 text-slate-500">
                상품원가는 주문 품목의 원가 컬럼을 우선 사용하고, 없으면
                product_variant_prices의 headquarters 가격을 사용합니다.
              </p>
            </div>
          </section>
        </div>

        <div className="grid gap-5 xl:grid-cols-[1.4fr_1fr]">
          <MonthlySalesPanel
            initialData={data.monthlySalesData}
            availableYears={data.availableYears}
          />

          <section className="rounded-[28px] bg-white p-5 shadow-[0_18px_50px_rgba(15,23,42,0.06)] sm:p-7">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-black text-slate-900">
                  재고 부족 상품
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  현재 재고 {LOW_STOCK_THRESHOLD}개 이하 기준입니다.
                </p>
              </div>
              <span className="rounded-full bg-slate-900 px-4 py-2 text-xs font-bold text-white">
                {formatNumber(data.lowStockItems.length)}개
              </span>
            </div>

            <div className="mt-6 space-y-3">
              {data.lowStockItems.length > 0 ? (
                data.lowStockItems.slice(0, 8).map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between gap-4 rounded-3xl border border-slate-100 bg-white p-4"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-black text-slate-900">
                        {item.name}
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        재고 보충 필요
                      </p>
                    </div>
                    <div className="shrink-0 rounded-full bg-red-50 px-3 py-1 text-sm font-black text-red-600">
                      {formatNumber(item.quantity)}개
                    </div>
                  </div>
                ))
              ) : (
                <div className="rounded-3xl border border-slate-100 px-4 py-12 text-center text-sm text-slate-500">
                  재고 부족 상품이 없습니다.
                </div>
              )}
            </div>

            {data.lowStockItems.length > 8 ? (
              <p className="mt-3 text-xs text-slate-500">
                총 {formatNumber(data.lowStockItems.length)}개 중 8개만
                표시됩니다.
              </p>
            ) : null}
          </section>
        </div>
      </div>
    </div>
  );
}

function BigStatCard({
  icon,
  title,
  value,
  description,
}: {
  icon: "trend" | "cube" | "bag";
  title: string;
  value: string;
  description: string;
}) {
  return (
    <section className="rounded-[28px] bg-white p-6 shadow-[0_18px_50px_rgba(15,23,42,0.06)]">
      <div className="flex items-start justify-between">
        <IconBadge icon={icon} />
        <div className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-100 text-xl font-black text-slate-900">
          ↗
        </div>
      </div>

      <div className="mt-12">
        <p className="text-3xl font-black tracking-tight text-slate-900">
          {value}
        </p>
        <p className="mt-2 text-base font-semibold text-slate-500">{title}</p>
        <p className="mt-1 text-sm text-slate-400">{description}</p>
      </div>
    </section>
  );
}

function IconBadge({ icon }: { icon: "trend" | "cube" | "bag" }) {
  return (
    <div className="flex h-11 w-11 items-center justify-center rounded-full bg-red-50 text-red-600">
      {icon === "trend" ? (
        <svg
          viewBox="0 0 24 24"
          className="h-5 w-5"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.4"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M4 16l5-5 4 4 7-8" />
          <path d="M15 7h5v5" />
        </svg>
      ) : null}

      {icon === "cube" ? (
        <svg
          viewBox="0 0 24 24"
          className="h-5 w-5"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M12 2l7 4v8l-7 4-7-4V6l7-4z" />
          <path d="M12 10l7-4" />
          <path d="M12 10L5 6" />
          <path d="M12 10v8" />
        </svg>
      ) : null}

      {icon === "bag" ? (
        <svg
          viewBox="0 0 24 24"
          className="h-5 w-5"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M6 8h12l1 13H5L6 8z" />
          <path d="M9 8V6a3 3 0 016 0v2" />
        </svg>
      ) : null}
    </div>
  );
}

function InvoiceStatusRow({
  label,
  value,
  percent,
  tone = "primary",
}: {
  label: string;
  value: string;
  percent: number;
  tone?: "primary" | "issued" | "warning" | "danger";
}) {
  const valueClassName =
    tone === "danger"
      ? "text-red-600"
      : tone === "warning"
        ? "text-amber-600"
        : "text-slate-900";

  const barClassName =
    tone === "danger"
      ? "bg-red-500"
      : tone === "warning"
        ? "bg-amber-400"
        : tone === "issued"
          ? "bg-red-600"
          : "bg-slate-900";

  return (
    <div>
      <div className="flex items-center justify-between gap-4">
        <p className="text-sm font-bold text-slate-500">{label}</p>
        <p className={`text-sm font-black ${valueClassName}`}>{value}</p>
      </div>

      <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-[#eee7e2]">
        <div
          className={`h-full rounded-full ${barClassName}`}
          style={{ width: `${Math.max(Math.min(percent, 100), 0)}%` }}
        />
      </div>
    </div>
  );
}

function formatKrw(value: number) {
  return `₩${Math.round(value).toLocaleString("ko-KR")}`;
}

function formatNumber(value: number) {
  return Math.round(value).toLocaleString("ko-KR");
}