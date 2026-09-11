"use client";

import { useMemo, useState } from "react";

type MoneyField = "purchasePrice" | "salePrice" | "shippingFee" | "platformFee";

type FormState = Record<MoneyField, string> & {
  discountRate: string;
};

const INITIAL_FORM: FormState = {
  purchasePrice: "",
  discountRate: "",
  salePrice: "",
  shippingFee: "",
  platformFee: "",
};

const moneyFormatter = new Intl.NumberFormat("ko-KR", {
  maximumFractionDigits: 0,
});

const percentFormatter = new Intl.NumberFormat("ko-KR", {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});

function toNumber(value: string) {
  const parsed = Number(value.replace(/[^0-9.-]/g, ""));
  return Number.isFinite(parsed) ? parsed : 0;
}

function formatInputMoney(value: string) {
  const digits = value.replace(/\D/g, "");
  if (!digits) return "";
  return moneyFormatter.format(Number(digits));
}

function formatKrw(value: number) {
  const rounded = Math.round(value);
  const sign = rounded < 0 ? "-" : "";
  return `${sign}₩${moneyFormatter.format(Math.abs(rounded))}`;
}

export default function ResaleMarginCalculator() {
  const [form, setForm] = useState<FormState>(INITIAL_FORM);

  const calculations = useMemo(() => {
    const purchasePrice = toNumber(form.purchasePrice);
    const discountRate = Math.min(Math.max(toNumber(form.discountRate), 0), 100);
    const salePrice = toNumber(form.salePrice);
    const shippingFee = toNumber(form.shippingFee);
    const platformFee = toNumber(form.platformFee);

    const actualPurchasePrice = purchasePrice * (1 - discountRate / 100);
    const cashMargin = salePrice - actualPurchasePrice - shippingFee - platformFee;

    // 한국에서 매입한 상품과 국내 과세 택배비가 VAT 포함 금액이고,
    // 적격증빙으로 매입세액 공제가 가능한 경우를 가정한다.
    const purchaseInputVat = actualPurchasePrice / 11;
    const shippingInputVat = shippingFee / 11;
    const refundableInputVat = purchaseInputVat + shippingInputVat;

    // 실제 재화 수출로 영세율(한국 매출 VAT 0%)이 적용되는 경우를 가정한다.
    const vatAdjustedMargin = cashMargin + refundableInputVat;
    const vatAdjustedMarginRate = salePrice > 0 ? (vatAdjustedMargin / salePrice) * 100 : 0;

    return {
      actualPurchasePrice,
      cashMargin,
      purchaseInputVat,
      shippingInputVat,
      refundableInputVat,
      vatAdjustedMargin,
      vatAdjustedMarginRate,
    };
  }, [form]);

  const hasInput = Object.values(form).some((value) => value.trim() !== "");

  function updateMoneyField(field: MoneyField, value: string) {
    setForm((current) => ({
      ...current,
      [field]: formatInputMoney(value),
    }));
  }

  function updateDiscountRate(value: string) {
    const sanitized = value.replace(/[^0-9.]/g, "");
    const [integer = "", ...rest] = sanitized.split(".");
    const decimal = rest.join("").slice(0, 2);
    const normalized = rest.length > 0 ? `${integer}.${decimal}` : integer;

    setForm((current) => ({
      ...current,
      discountRate: normalized,
    }));
  }

  return (
    <div className="min-h-screen rounded-[32px] bg-[#fff7f4] p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-6xl space-y-6">
        <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-slate-900 px-3 py-1 text-xs font-black text-white">
                POIZON
              </span>
              <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700">
                수출 영세율 0% 가정
              </span>
            </div>
            <h1 className="mt-3 text-3xl font-black tracking-tight text-slate-900">
              리셀 마진 계산기
            </h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">
              한국에서 상품을 매입해 중국 플랫폼 포이즌으로 실제 수출 판매하는 구조를 기준으로,
              현금 마진과 공제 가능한 매입 VAT를 함께 계산합니다.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setForm(INITIAL_FORM)}
            disabled={!hasInput}
            className="self-start rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40 sm:self-auto"
          >
            입력값 초기화
          </button>
        </header>

        <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
          <section className="rounded-[28px] bg-white p-5 shadow-[0_18px_50px_rgba(15,23,42,0.06)] sm:p-7">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-black text-slate-900">판매 조건 입력</h2>
                <p className="mt-1 text-sm text-slate-500">파란색 입력칸만 작성하면 결과가 자동 계산됩니다.</p>
              </div>
              <div className="rounded-full bg-blue-50 px-3 py-1 text-xs font-black text-blue-700">
                자동 계산
              </div>
            </div>

            <div className="mt-7 overflow-hidden rounded-2xl border border-slate-200">
              <CalculatorRow label="구매가">
                <MoneyInput
                  value={form.purchasePrice}
                  onChange={(value) => updateMoneyField("purchasePrice", value)}
                  placeholder="90,000"
                />
              </CalculatorRow>

              <CalculatorRow label="추가할인율">
                <div className="relative">
                  <input
                    type="text"
                    inputMode="decimal"
                    value={form.discountRate}
                    onChange={(event) => updateDiscountRate(event.target.value)}
                    placeholder="30"
                    className="w-full rounded-xl border border-blue-200 bg-blue-50/60 py-3 pl-4 pr-10 text-right text-base font-bold text-blue-700 outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
                  />
                  <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-400">
                    %
                  </span>
                </div>
              </CalculatorRow>

              <CalculatedRow label="실구매가" value={formatKrw(calculations.actualPurchasePrice)} />

              <CalculatorRow label="판매가">
                <MoneyInput
                  value={form.salePrice}
                  onChange={(value) => updateMoneyField("salePrice", value)}
                  placeholder="100,000"
                />
              </CalculatorRow>

              <CalculatorRow label="국내 택배비">
                <MoneyInput
                  value={form.shippingFee}
                  onChange={(value) => updateMoneyField("shippingFee", value)}
                  placeholder="3,000"
                />
              </CalculatorRow>

              <CalculatorRow label="포이즌 수수료">
                <MoneyInput
                  value={form.platformFee}
                  onChange={(value) => updateMoneyField("platformFee", value)}
                  placeholder="15,000"
                />
              </CalculatorRow>
            </div>

            <div className="mt-5 rounded-2xl bg-slate-50 p-4 text-xs leading-5 text-slate-500">
              <p className="font-bold text-slate-700">계산 전제</p>
              <p className="mt-1">
                구매가와 국내 택배비는 VAT 포함 금액이며 적격증빙으로 매입세액 공제가 가능하다고 가정합니다.
                포이즌 등 해외 플랫폼 수수료는 한국 매입 VAT 계산에서 제외합니다.
              </p>
            </div>
          </section>

          <section className="rounded-[28px] bg-slate-900 p-5 text-white shadow-[0_18px_50px_rgba(15,23,42,0.14)] sm:p-7">
            <div>
              <p className="text-sm font-bold text-slate-400">VAT 반영 예상 결과</p>
              <div className="mt-3 flex flex-wrap items-end justify-between gap-4">
                <div>
                  <p
                    className={`text-4xl font-black tracking-tight ${
                      calculations.vatAdjustedMargin < 0 ? "text-rose-400" : "text-white"
                    }`}
                  >
                    {formatKrw(calculations.vatAdjustedMargin)}
                  </p>
                  <p className="mt-2 text-sm text-slate-400">VAT 반영 예상마진</p>
                </div>

                <div
                  className={`rounded-2xl px-4 py-3 text-right ${
                    calculations.vatAdjustedMarginRate < 0
                      ? "bg-rose-500/15 text-rose-300"
                      : "bg-white/10 text-white"
                  }`}
                >
                  <p className="text-xs font-bold opacity-70">마진율</p>
                  <p className="mt-1 text-2xl font-black">
                    {percentFormatter.format(calculations.vatAdjustedMarginRate)}%
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-8 grid gap-3 sm:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">
              <ResultCard
                label="판매마진 (현금 기준)"
                value={formatKrw(calculations.cashMargin)}
                negative={calculations.cashMargin < 0}
              />
              <ResultCard
                label="환급가능 매입 VAT"
                value={formatKrw(calculations.refundableInputVat)}
              />
            </div>

            <div className="mt-6 overflow-hidden rounded-2xl border border-white/10 bg-white/5">
              <ResultDetailRow label="상품 매입 VAT" value={formatKrw(calculations.purchaseInputVat)} />
              <ResultDetailRow label="국내 택배 VAT" value={formatKrw(calculations.shippingInputVat)} />
              <ResultDetailRow label="한국 매출 VAT" value="₩0" note="수출 영세율 가정" />
              <ResultDetailRow label="포이즌 수수료 VAT" value="계산 제외" note="해외 플랫폼" last />
            </div>

            <div className="mt-6 rounded-2xl border border-amber-400/20 bg-amber-400/10 p-4 text-xs leading-5 text-amber-100/80">
              실제 부가세 공제·환급액은 사업자 과세유형, 적격증빙, 실제 수출 및 영세율 증빙 여부에 따라 달라질 수 있습니다.
              이 계산기는 판매 의사결정을 위한 예상치입니다.
            </div>
          </section>
        </div>

        <section className="rounded-[28px] bg-white p-5 shadow-[0_18px_50px_rgba(15,23,42,0.06)] sm:p-7">
          <h2 className="text-lg font-black text-slate-900">계산식</h2>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <FormulaCard label="실구매가" formula="구매가 × (1 - 추가할인율)" />
            <FormulaCard label="판매마진" formula="판매가 - 실구매가 - 택배비 - 수수료" />
            <FormulaCard label="환급가능 매입 VAT" formula="실구매가 ÷ 11 + 국내 택배비 ÷ 11" />
            <FormulaCard label="VAT 반영 예상마진" formula="판매마진 + 환급가능 매입 VAT" />
          </div>
        </section>
      </div>
    </div>
  );
}

function CalculatorRow({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="grid grid-cols-[minmax(120px,0.85fr)_minmax(0,1.15fr)] items-center border-b border-slate-200 last:border-b-0">
      <div className="flex min-h-[76px] items-center bg-[#e9f3eb] px-4 py-3 text-sm font-black text-slate-700 sm:px-5">
        {label}
      </div>
      <div className="bg-white px-4 py-3 sm:px-5">{children}</div>
    </div>
  );
}

function CalculatedRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-[minmax(120px,0.85fr)_minmax(0,1.15fr)] items-center border-b border-slate-200">
      <div className="flex min-h-[76px] items-center bg-[#e9f3eb] px-4 py-3 text-sm font-black text-slate-700 sm:px-5">
        {label}
      </div>
      <div className="px-4 py-3 text-right text-lg font-black text-slate-900 sm:px-5">{value}</div>
    </div>
  );
}

function MoneyInput({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
}) {
  return (
    <div className="relative">
      <input
        type="text"
        inputMode="numeric"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="w-full rounded-xl border border-blue-200 bg-blue-50/60 py-3 pl-8 pr-4 text-right text-base font-bold text-blue-700 outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
      />
      <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-400">
        ₩
      </span>
    </div>
  );
}

function ResultCard({
  label,
  value,
  negative = false,
}: {
  label: string;
  value: string;
  negative?: boolean;
}) {
  return (
    <div className="rounded-2xl bg-white/10 p-4">
      <p className="text-xs font-bold text-slate-400">{label}</p>
      <p className={`mt-2 text-xl font-black ${negative ? "text-rose-400" : "text-white"}`}>{value}</p>
    </div>
  );
}

function ResultDetailRow({
  label,
  value,
  note,
  last = false,
}: {
  label: string;
  value: string;
  note?: string;
  last?: boolean;
}) {
  return (
    <div className={`flex items-center justify-between gap-4 px-4 py-3 ${last ? "" : "border-b border-white/10"}`}>
      <div>
        <p className="text-sm font-bold text-slate-300">{label}</p>
        {note ? <p className="mt-0.5 text-xs text-slate-500">{note}</p> : null}
      </div>
      <p className="shrink-0 text-sm font-black text-white">{value}</p>
    </div>
  );
}

function FormulaCard({ label, formula }: { label: string; formula: string }) {
  return (
    <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
      <p className="text-xs font-black text-slate-500">{label}</p>
      <p className="mt-2 text-sm font-bold text-slate-800">{formula}</p>
    </div>
  );
}
