"use client";

import { useState, useTransition } from "react";
import {
  getMonthlySalesData,
  getYearlySalesData,
  type MonthlySalesData,
  type YearlySalesData,
} from "./actions";

export function YearlySalesPanel({
  initialData,
  availableYears,
}: {
  initialData: YearlySalesData;
  availableYears: number[];
}) {
  const [selectedYear, setSelectedYear] = useState(initialData.year);
  const [data, setData] = useState(initialData);
  const [isPending, startTransition] = useTransition();

  function handleYearChange(value: string) {
    const nextYear = Number(value);

    if (!Number.isInteger(nextYear)) {
      return;
    }

    setSelectedYear(nextYear);
    updateDashboardQuery("year", String(nextYear));

    startTransition(async () => {
      const nextData = await getYearlySalesData(nextYear);
      setData(nextData);
    });
  }

  return (
    <section className="rounded-[28px] bg-white p-5 shadow-[0_18px_50px_rgba(15,23,42,0.06)] sm:p-7">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <IconBadge icon="trend" />

          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-black text-slate-900">
                연도별 월별 매출
              </h2>

              {isPending ? (
                <span className="rounded-full bg-red-50 px-2.5 py-1 text-xs font-bold text-red-600">
                  불러오는 중
                </span>
              ) : null}
            </div>

            <p className="mt-1 text-sm text-slate-500">
              {data.year}년 주문 기준 매출 흐름입니다.
            </p>
          </div>
        </div>

        <select
          value={String(selectedYear)}
          onChange={(event) => handleYearChange(event.target.value)}
          className="h-10 rounded-full border border-slate-100 bg-white px-4 text-sm font-bold text-slate-700 shadow-[0_4px_14px_rgba(15,23,42,0.08)] outline-none"
        >
          {availableYears.map((year) => (
            <option key={year} value={year}>
              {year}년
            </option>
          ))}
        </select>
      </div>

      <div className={isPending ? "opacity-60" : undefined}>
        <MonthlyBarChart values={data.monthlySalesSeries} />
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        <SmallSummaryBox
          label={`${data.year}년 매출`}
          value={formatKrw(data.yearlySales)}
        />

        <SmallSummaryBox
          label={`${data.year}년 매출이익`}
          value={formatKrw(data.yearlyProfit)}
          valueClassName={
            data.yearlyProfit < 0 ? "text-red-600" : "text-slate-900"
          }
        />

        <SmallSummaryBox
          label={`${data.year}년 이익률`}
          value={formatPercent(data.yearlyProfitRate)}
          valueClassName={
            data.yearlyProfitRate < 0 ? "text-red-600" : "text-slate-900"
          }
        />
      </div>
    </section>
  );
}

export function MonthlySalesPanel({
  initialData,
  availableYears,
}: {
  initialData: MonthlySalesData;
  availableYears: number[];
}) {
  const [selectedYear, setSelectedYear] = useState(initialData.year);
  const [selectedMonth, setSelectedMonth] = useState(initialData.month);
  const [data, setData] = useState(initialData);
  const [isPending, startTransition] = useTransition();

  const selectedMonthTotalSales = data.selectedMonthSalesItems.reduce(
    (sum, item) => sum + item.salesAmount,
    0,
  );

  function loadMonthlyData(nextYear: number, nextMonth: number) {
    startTransition(async () => {
      const nextData = await getMonthlySalesData({
        year: nextYear,
        month: nextMonth,
      });

      setData(nextData);
    });
  }

  function handleYearChange(value: string) {
    const nextYear = Number(value);

    if (!Number.isInteger(nextYear)) {
      return;
    }

    setSelectedYear(nextYear);
    updateDashboardQuery("salesYear", String(nextYear));
    loadMonthlyData(nextYear, selectedMonth);
  }

  function handleMonthChange(value: string) {
    const nextMonth = Number(value);

    if (!Number.isInteger(nextMonth)) {
      return;
    }

    setSelectedMonth(nextMonth);
    updateDashboardQuery("salesMonth", String(nextMonth));
    loadMonthlyData(selectedYear, nextMonth);
  }

  return (
    <section className="rounded-[28px] bg-white p-5 shadow-[0_18px_50px_rgba(15,23,42,0.06)] sm:p-7">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-black text-slate-900">
              월별 판매 내역
            </h2>

            {isPending ? (
              <span className="rounded-full bg-red-50 px-2.5 py-1 text-xs font-bold text-red-600">
                불러오는 중
              </span>
            ) : null}
          </div>

          <p className="mt-1 text-sm text-slate-500">
            {data.year}년 {data.month}월 기준 상품별 판매수량과 매출액입니다.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <select
            value={String(selectedYear)}
            onChange={(event) => handleYearChange(event.target.value)}
            className="h-10 rounded-full border border-slate-100 bg-white px-4 text-sm font-bold text-slate-700 shadow-[0_4px_14px_rgba(15,23,42,0.08)] outline-none"
          >
            {availableYears.map((year) => (
              <option key={year} value={year}>
                {year}년
              </option>
            ))}
          </select>

          <select
            value={String(selectedMonth)}
            onChange={(event) => handleMonthChange(event.target.value)}
            className="h-10 rounded-full border border-slate-100 bg-white px-4 text-sm font-bold text-slate-700 shadow-[0_4px_14px_rgba(15,23,42,0.08)] outline-none"
          >
            {Array.from({ length: 12 }, (_, index) => index + 1).map(
              (month) => (
                <option key={month} value={month}>
                  {month}월
                </option>
              ),
            )}
          </select>
        </div>
      </div>

      <div
        className={`mt-6 rounded-3xl bg-[#fff7f4] p-5 transition-opacity ${
          isPending ? "opacity-60" : "opacity-100"
        }`}
      >
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-bold text-slate-500">
              {data.year}년 {data.month}월 총 매출액
            </p>

            <p className="mt-2 text-2xl font-black tracking-tight text-slate-900">
              {formatKrw(selectedMonthTotalSales)}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="rounded-full bg-white px-4 py-2 text-xs font-black text-slate-600 shadow-sm">
              판매 상품{" "}
              {formatNumber(data.selectedMonthSalesItems.length)}개
            </span>
          </div>
        </div>
      </div>

      <div
        className={`mt-5 overflow-x-auto rounded-3xl border border-slate-100 ${
          isPending ? "opacity-60" : ""
        }`}
      >
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead className="bg-[#fbf5f2] text-slate-500">
            <tr>
              <th className="px-4 py-4 font-bold">모델</th>
              <th className="px-4 py-4 font-bold">맛/색상</th>
              <th className="px-4 py-4 font-bold">니코틴</th>
              <th className="px-4 py-4 text-right font-bold">판매수량</th>
              <th className="px-4 py-4 text-right font-bold">매출액</th>
            </tr>
          </thead>

          <tbody>
            {data.selectedMonthSalesItems.length > 0 ? (
              data.selectedMonthSalesItems.slice(0, 10).map((item) => (
                <tr
                  key={item.id}
                  className="border-t border-slate-100 text-slate-700"
                >
                  <td className="px-4 py-4 font-bold text-slate-900">
                    {item.modelName}
                  </td>

                  <td className="px-4 py-4">{item.optionName}</td>

                  <td className="px-4 py-4">{item.nicotine}</td>

                  <td className="px-4 py-4 text-right font-bold">
                    {formatNumber(item.quantity)}
                  </td>

                  <td className="px-4 py-4 text-right font-black text-slate-900">
                    {formatKrw(item.salesAmount)}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td
                  colSpan={5}
                  className="px-4 py-14 text-center text-sm text-slate-500"
                >
                  해당 월의 데이터가 없습니다.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {data.selectedMonthSalesItems.length > 10 ? (
        <p className="mt-3 text-xs text-slate-500">
          총 {formatNumber(data.selectedMonthSalesItems.length)}개 상품 중 매출
          상위 10개만 표시됩니다.
        </p>
      ) : null}
    </section>
  );
}

function MonthlyBarChart({ values }: { values: number[] }) {
  const maxValue = Math.max(...values, 1);
  const chartMax = getNiceChartMax(maxValue);

  const chartLabels = [
    chartMax,
    chartMax * 0.75,
    chartMax * 0.5,
    chartMax * 0.25,
    0,
  ];

  return (
    <div className="mt-8">
      <div className="grid grid-cols-[74px_1fr] gap-4">
        <div className="flex h-72 flex-col justify-between text-right text-xs font-semibold text-slate-500">
          {chartLabels.map((label) => (
            <span key={label}>{formatCompactKrw(label)}</span>
          ))}
        </div>

        <div className="relative h-72">
          <div className="absolute inset-0 flex flex-col justify-between">
            {chartLabels.map((label) => (
              <div
                key={label}
                className="border-t border-dashed border-[#eadfdb]"
              />
            ))}
          </div>

          <div className="relative z-10 flex h-full items-end justify-between gap-2 px-1">
            {values.map((value, index) => {
              const height =
                chartMax > 0
                  ? Math.max((value / chartMax) * 100, value > 0 ? 4 : 0)
                  : 0;

              return (
                <div
                  key={`${index}-${value}`}
                  className="flex h-full flex-1 flex-col items-center justify-end gap-2"
                >
                  <div className="flex h-full w-full items-end justify-center">
                    <div
                      className="w-full max-w-10 rounded-t-xl bg-red-600"
                      style={{ height: `${height}%` }}
                      title={`${index + 1}월 ${formatKrw(value)}`}
                    />
                  </div>

                  <span className="text-xs font-bold text-slate-500">
                    {index + 1}월
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

function SmallSummaryBox({
  label,
  value,
  valueClassName,
}: {
  label: string;
  value: string;
  valueClassName?: string;
}) {
  return (
    <div className="rounded-3xl bg-[#fff7f4] p-4">
      <p className="text-xs font-bold text-slate-500">{label}</p>

      <p
        className={`mt-2 text-lg font-black ${
          valueClassName ?? "text-slate-900"
        }`}
      >
        {value}
      </p>
    </div>
  );
}

function IconBadge({ icon }: { icon: "trend" }) {
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
    </div>
  );
}

function updateDashboardQuery(key: string, value: string) {
  const url = new URL(window.location.href);

  url.searchParams.set(key, value);

  window.history.replaceState(
    null,
    "",
    `${url.pathname}?${url.searchParams}`,
  );
}

function formatKrw(value: number) {
  return `₩${Math.round(value).toLocaleString("ko-KR")}`;
}

function formatCompactKrw(value: number) {
  if (value >= 100000000) {
    return `${trimDecimal(value / 100000000)}억원`;
  }

  if (value >= 10000) {
    return `${trimDecimal(value / 10000)}만원`;
  }

  return `${Math.round(value).toLocaleString("ko-KR")}원`;
}

function formatNumber(value: number) {
  return Math.round(value).toLocaleString("ko-KR");
}

function formatPercent(value: number) {
  return `${value.toFixed(1)}%`;
}

function trimDecimal(value: number) {
  const rounded = Math.round(value * 10) / 10;

  return Number.isInteger(rounded)
    ? String(rounded)
    : rounded.toFixed(1);
}

function getNiceChartMax(value: number) {
  if (value <= 0) {
    return 10000;
  }

  const roughMax = value * 1.15;
  const exponent = Math.floor(Math.log10(roughMax));
  const base = 10 ** exponent;
  const normalized = roughMax / base;

  if (normalized <= 2) {
    return 2 * base;
  }

  if (normalized <= 5) {
    return 5 * base;
  }

  return 10 * base;
}