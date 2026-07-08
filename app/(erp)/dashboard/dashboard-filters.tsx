"use client";

import { useRouter, useSearchParams } from "next/navigation";

export function YearAutoSelect({
  selectedYear,
  availableYears,
}: {
  selectedYear: number;
  availableYears: number[];
}) {
  const router = useRouter();
  const searchParams = useSearchParams();

  function handleChange(value: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("year", value);

    router.replace(`/dashboard?${params.toString()}`);
  }

  return (
    <select
      value={String(selectedYear)}
      onChange={(event) => handleChange(event.target.value)}
      className="h-10 rounded-full border border-slate-100 bg-white px-4 text-sm font-bold text-slate-700 shadow-[0_4px_14px_rgba(15,23,42,0.08)] outline-none"
    >
      {availableYears.map((year) => (
        <option key={year} value={year}>
          {year}년
        </option>
      ))}
    </select>
  );
}

export function MonthAutoSelect({
  selectedSalesYear,
  selectedSalesMonth,
  availableYears,
}: {
  selectedSalesYear: number;
  selectedSalesMonth: number;
  availableYears: number[];
}) {
  const router = useRouter();
  const searchParams = useSearchParams();

  function handleYearChange(value: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("salesYear", value);

    router.replace(`/dashboard?${params.toString()}`);
  }

  function handleMonthChange(value: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("salesMonth", value);

    router.replace(`/dashboard?${params.toString()}`);
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <select
        value={String(selectedSalesYear)}
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
        value={String(selectedSalesMonth)}
        onChange={(event) => handleMonthChange(event.target.value)}
        className="h-10 rounded-full border border-slate-100 bg-white px-4 text-sm font-bold text-slate-700 shadow-[0_4px_14px_rgba(15,23,42,0.08)] outline-none"
      >
        {Array.from({ length: 12 }, (_, index) => index + 1).map((month) => (
          <option key={month} value={month}>
            {month}월
          </option>
        ))}
      </select>
    </div>
  );
}