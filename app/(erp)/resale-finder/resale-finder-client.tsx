"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  analyzeCandidate,
  type ResaleCandidate,
  type ResaleDecision,
  type ResalePlatform,
  type ResaleSettings,
} from "@/lib/resale";
import {
  deleteResaleCandidate,
  saveResaleCandidate,
  saveResaleCandidatesBulk,
  saveResaleSettings,
} from "./actions";

type Props = {
  initialCandidates: ResaleCandidate[];
  initialSettings: ResaleSettings;
};

type CandidateForm = {
  id?: string;
  brand: string;
  productName: string;
  modelNumber: string;
  size: string;
  purchaseSource: string;
  purchaseUrl: string;
  purchasePrice: string;
  discountRate: string;
  kreamSalePrice: string;
  kream30dSales: string;
  kreamUrl: string;
  poizonSalePrice: string;
  poizon30dSales: string;
  poizonUrl: string;
  memo: string;
};


type BulkForm = {
  brand: string;
  productName: string;
  modelNumber: string;
  purchaseSource: string;
  purchaseUrl: string;
  purchasePrice: string;
  discountRate: string;
  kreamUrl: string;
  poizonUrl: string;
  kreamRows: string;
  poizonRows: string;
  memo: string;
};

type BulkParsedRow = {
  size: string;
  kreamSalePrice: number;
  kream30dSales: number;
  poizonSalePrice: number;
  poizon30dSales: number;
};

type FilterDecision = "ALL" | ResaleDecision;
type FilterPlatform = "ALL" | ResalePlatform;
type SortKey = "profit" | "margin" | "sales" | "headroom" | "updated";

const EMPTY_FORM: CandidateForm = {
  brand: "",
  productName: "",
  modelNumber: "",
  size: "",
  purchaseSource: "",
  purchaseUrl: "",
  purchasePrice: "",
  discountRate: "",
  kreamSalePrice: "",
  kream30dSales: "",
  kreamUrl: "",
  poizonSalePrice: "",
  poizon30dSales: "",
  poizonUrl: "",
  memo: "",
};


const EMPTY_BULK_FORM: BulkForm = {
  brand: "",
  productName: "",
  modelNumber: "",
  purchaseSource: "",
  purchaseUrl: "",
  purchasePrice: "",
  discountRate: "",
  kreamUrl: "",
  poizonUrl: "",
  kreamRows: "",
  poizonRows: "",
  memo: "",
};

const won = new Intl.NumberFormat("ko-KR", { maximumFractionDigits: 0 });
const oneDecimal = new Intl.NumberFormat("ko-KR", {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});

function money(value: number) {
  const rounded = Math.round(value);
  const sign = rounded < 0 ? "-" : "";
  return `${sign}₩${won.format(Math.abs(rounded))}`;
}

function num(value: string) {
  const parsed = Number(String(value || "").replace(/[^0-9.-]/g, ""));
  return Number.isFinite(parsed) ? parsed : 0;
}

function moneyInput(value: string) {
  const digits = value.replace(/\D/g, "");
  return digits ? won.format(Number(digits)) : "";
}

function safeUrl(url: string | null) {
  if (!url) return null;
  try {
    const parsed = new URL(url);
    return parsed.protocol === "http:" || parsed.protocol === "https:" ? parsed.toString() : null;
  } catch {
    return null;
  }
}


function parseBulkPlatformRows(raw: string) {
  const rows = new Map<string, { size: string; price: number; sales30d: number }>();
  const errors: string[] = [];

  raw
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .forEach((line, index) => {
      let parts = line.split(/\s*[|\t;]\s*/).filter(Boolean);

      if (parts.length < 3) {
        const commaParts = line.split(/\s*,\s*/).filter(Boolean);
        if (commaParts.length === 3) {
          parts = commaParts;
        } else {
          const spaceParts = line.split(/\s+/).filter(Boolean);
          if (spaceParts.length >= 3) {
            const sales = spaceParts.pop() || "";
            const price = spaceParts.pop() || "";
            parts = [spaceParts.join(" "), price, sales];
          }
        }
      }

      if (parts.length < 3) {
        errors.push(`${index + 1}행 형식 오류`);
        return;
      }

      const size = String(parts[0] || "").trim();
      const price = num(parts[1]);
      const sales30d = Math.trunc(num(parts[2]));

      if (!size || price <= 0) {
        errors.push(`${index + 1}행의 사이즈 또는 판매가를 확인해주세요.`);
        return;
      }

      rows.set(size.toLowerCase(), { size, price, sales30d });
    });

  return { rows, errors };
}

function mergeBulkRows(kreamRaw: string, poizonRaw: string) {
  const kream = parseBulkPlatformRows(kreamRaw);
  const poizon = parseBulkPlatformRows(poizonRaw);
  const keys = new Set([...kream.rows.keys(), ...poizon.rows.keys()]);

  const rows: BulkParsedRow[] = [...keys]
    .map((key) => {
      const kreamRow = kream.rows.get(key);
      const poizonRow = poizon.rows.get(key);
      return {
        size: kreamRow?.size || poizonRow?.size || key,
        kreamSalePrice: kreamRow?.price || 0,
        kream30dSales: kreamRow?.sales30d || 0,
        poizonSalePrice: poizonRow?.price || 0,
        poizon30dSales: poizonRow?.sales30d || 0,
      };
    })
    .sort((a, b) => a.size.localeCompare(b.size, "ko", { numeric: true, sensitivity: "base" }));

  return { rows, errors: [...kream.errors, ...poizon.errors] };
}

function candidateToForm(candidate: ResaleCandidate): CandidateForm {
  return {
    id: candidate.id,
    brand: candidate.brand,
    productName: candidate.product_name,
    modelNumber: candidate.model_number || "",
    size: candidate.size,
    purchaseSource: candidate.purchase_source || "",
    purchaseUrl: candidate.purchase_url || "",
    purchasePrice: candidate.purchase_price ? won.format(candidate.purchase_price) : "",
    discountRate: candidate.discount_rate ? String(candidate.discount_rate) : "",
    kreamSalePrice: candidate.kream_sale_price ? won.format(candidate.kream_sale_price) : "",
    kream30dSales: candidate.kream_30d_sales ? String(candidate.kream_30d_sales) : "",
    kreamUrl: candidate.kream_url || "",
    poizonSalePrice: candidate.poizon_sale_price ? won.format(candidate.poizon_sale_price) : "",
    poizon30dSales: candidate.poizon_30d_sales ? String(candidate.poizon_30d_sales) : "",
    poizonUrl: candidate.poizon_url || "",
    memo: candidate.memo || "",
  };
}

function decisionLabel(decision: ResaleDecision) {
  if (decision === "BUY") return "매입 가능";
  if (decision === "SLOW") return "저회전";
  if (decision === "PASS") return "제외";
  return "데이터 부족";
}

function decisionClass(decision: ResaleDecision) {
  if (decision === "BUY") return "bg-emerald-50 text-emerald-700 ring-emerald-200";
  if (decision === "SLOW") return "bg-amber-50 text-amber-700 ring-amber-200";
  if (decision === "PASS") return "bg-rose-50 text-rose-700 ring-rose-200";
  return "bg-slate-100 text-slate-600 ring-slate-200";
}

export default function ResaleFinderClient({ initialCandidates, initialSettings }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [formOpen, setFormOpen] = useState(false);
  const [bulkOpen, setBulkOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [form, setForm] = useState<CandidateForm>(EMPTY_FORM);
  const [bulkForm, setBulkForm] = useState<BulkForm>(EMPTY_BULK_FORM);
  const [query, setQuery] = useState("");
  const [decisionFilter, setDecisionFilter] = useState<FilterDecision>("ALL");
  const [platformFilter, setPlatformFilter] = useState<FilterPlatform>("ALL");
  const [sortKey, setSortKey] = useState<SortKey>("profit");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [settingsForm, setSettingsForm] = useState({
    minProfit: won.format(initialSettings.min_profit),
    minMarginRate: String(initialSettings.min_margin_rate),
    min30dSales: String(initialSettings.min_30d_sales),
    kreamFeeRate: String(initialSettings.kream_fee_rate),
    kreamFixedFee: won.format(initialSettings.kream_fixed_fee),
    kreamShippingFee: won.format(initialSettings.kream_shipping_fee),
    poizonFeeRate: String(initialSettings.poizon_fee_rate),
    poizonFixedFee: won.format(initialSettings.poizon_fixed_fee),
    poizonShippingFee: won.format(initialSettings.poizon_shipping_fee),
  });

  const bulkPreview = useMemo(
    () => mergeBulkRows(bulkForm.kreamRows, bulkForm.poizonRows),
    [bulkForm.kreamRows, bulkForm.poizonRows],
  );

  const rows = useMemo(() => {
    return initialCandidates.map((candidate) => ({
      candidate,
      analysis: analyzeCandidate(candidate, initialSettings),
    }));
  }, [initialCandidates, initialSettings]);

  const filteredRows = useMemo(() => {
    const keyword = query.trim().toLowerCase();

    const result = rows.filter(({ candidate, analysis }) => {
      const searchable = [
        candidate.brand,
        candidate.product_name,
        candidate.model_number || "",
        candidate.size,
        candidate.purchase_source || "",
      ]
        .join(" ")
        .toLowerCase();

      if (keyword && !searchable.includes(keyword)) return false;
      if (decisionFilter !== "ALL" && analysis.decision !== decisionFilter) return false;
      if (platformFilter !== "ALL" && analysis.bestPlatform !== platformFilter) return false;
      return true;
    });

    return result.sort((a, b) => {
      if (sortKey === "margin") return b.analysis.bestMarginRate - a.analysis.bestMarginRate;
      if (sortKey === "sales") return b.analysis.bestSales30d - a.analysis.bestSales30d;
      if (sortKey === "headroom") return b.analysis.purchaseHeadroom - a.analysis.purchaseHeadroom;
      if (sortKey === "updated") {
        return String(b.candidate.updated_at).localeCompare(String(a.candidate.updated_at));
      }
      return b.analysis.bestProfit - a.analysis.bestProfit;
    });
  }, [rows, query, decisionFilter, platformFilter, sortKey]);

  const summary = useMemo(() => {
    const buyRows = rows.filter((row) => row.analysis.decision === "BUY");
    const slowRows = rows.filter((row) => row.analysis.decision === "SLOW");
    const bestProfit = rows.reduce((max, row) => Math.max(max, row.analysis.bestProfit), 0);
    const buyCapital = buyRows.reduce((sum, row) => sum + row.analysis.actualPurchasePrice, 0);

    return {
      total: rows.length,
      buy: buyRows.length,
      slow: slowRows.length,
      bestProfit,
      buyCapital,
    };
  }, [rows]);

  function resetNotices() {
    setMessage(null);
    setError(null);
  }

  function openCreate() {
    resetNotices();
    setBulkOpen(false);
    setForm(EMPTY_FORM);
    setFormOpen(true);
  }

  function openBulk() {
    resetNotices();
    setFormOpen(false);
    setBulkForm(EMPTY_BULK_FORM);
    setBulkOpen(true);
  }

  function openEdit(candidate: ResaleCandidate) {
    resetNotices();
    setBulkOpen(false);
    setForm(candidateToForm(candidate));
    setFormOpen(true);
  }

  function updateForm<K extends keyof CandidateForm>(key: K, value: CandidateForm[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function updateBulkForm<K extends keyof BulkForm>(key: K, value: BulkForm[K]) {
    setBulkForm((current) => ({ ...current, [key]: value }));
  }

  function submitCandidate() {
    resetNotices();
    startTransition(async () => {
      try {
        await saveResaleCandidate({
          id: form.id,
          brand: form.brand,
          productName: form.productName,
          modelNumber: form.modelNumber,
          size: form.size,
          purchaseSource: form.purchaseSource,
          purchaseUrl: form.purchaseUrl,
          purchasePrice: num(form.purchasePrice),
          discountRate: num(form.discountRate),
          kreamSalePrice: num(form.kreamSalePrice),
          kream30dSales: num(form.kream30dSales),
          kreamUrl: form.kreamUrl,
          poizonSalePrice: num(form.poizonSalePrice),
          poizon30dSales: num(form.poizon30dSales),
          poizonUrl: form.poizonUrl,
          memo: form.memo,
        });
        setFormOpen(false);
        setForm(EMPTY_FORM);
        setMessage(form.id ? "상품 정보를 수정했습니다." : "매입 후보를 등록했습니다.");
        router.refresh();
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : "상품 저장에 실패했습니다.");
      }
    });
  }

  function submitBulkCandidates() {
    resetNotices();
    const preview = mergeBulkRows(bulkForm.kreamRows, bulkForm.poizonRows);

    if (preview.errors.length > 0) {
      setError(`사이즈 데이터 형식을 확인해주세요: ${preview.errors.slice(0, 3).join(", ")}`);
      return;
    }

    if (preview.rows.length === 0) {
      setError("KREAM 또는 POIZON 사이즈 데이터를 1개 이상 입력해주세요.");
      return;
    }

    startTransition(async () => {
      try {
        const result = await saveResaleCandidatesBulk({
          brand: bulkForm.brand,
          productName: bulkForm.productName,
          modelNumber: bulkForm.modelNumber,
          purchaseSource: bulkForm.purchaseSource,
          purchaseUrl: bulkForm.purchaseUrl,
          purchasePrice: num(bulkForm.purchasePrice),
          discountRate: num(bulkForm.discountRate),
          kreamUrl: bulkForm.kreamUrl,
          poizonUrl: bulkForm.poizonUrl,
          memo: bulkForm.memo,
          items: preview.rows,
        });

        setBulkOpen(false);
        setBulkForm(EMPTY_BULK_FORM);
        setMessage(`${result.count}개 사이즈를 일괄 등록했습니다.`);
        router.refresh();
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : "사이즈 일괄 등록에 실패했습니다.");
      }
    });
  }

  function removeCandidate(id: string) {
    if (!window.confirm("이 매입 후보를 삭제할까요?")) return;
    resetNotices();
    startTransition(async () => {
      try {
        await deleteResaleCandidate(id);
        setMessage("상품을 삭제했습니다.");
        router.refresh();
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : "상품 삭제에 실패했습니다.");
      }
    });
  }

  function submitSettings() {
    resetNotices();
    startTransition(async () => {
      try {
        await saveResaleSettings({
          minProfit: num(settingsForm.minProfit),
          minMarginRate: num(settingsForm.minMarginRate),
          min30dSales: num(settingsForm.min30dSales),
          kreamFeeRate: num(settingsForm.kreamFeeRate),
          kreamFixedFee: num(settingsForm.kreamFixedFee),
          kreamShippingFee: num(settingsForm.kreamShippingFee),
          poizonFeeRate: num(settingsForm.poizonFeeRate),
          poizonFixedFee: num(settingsForm.poizonFixedFee),
          poizonShippingFee: num(settingsForm.poizonShippingFee),
        });
        setSettingsOpen(false);
        setMessage("매입 판정 기준을 저장했습니다.");
        router.refresh();
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : "설정 저장에 실패했습니다.");
      }
    });
  }

  return (
    <div className="min-h-screen bg-slate-50 p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-[1540px] space-y-6">
        <header className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-slate-900 px-3 py-1 text-xs font-black text-white">RESALE FINDER</span>
              <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700">현금마진 기준</span>
              <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700">KREAM + POIZON 비교</span>
            </div>
            <h1 className="mt-3 text-3xl font-black tracking-tight text-slate-900">리셀 상품 발굴</h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">
              먼저 팔리는 가격을 입력하고, 목표 순익·마진율·판매량을 만족하는 상품만 자동으로 걸러냅니다.
              판정에는 VAT 환급을 포함하지 않아 매입 판단을 보수적으로 계산합니다.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setSettingsOpen((value) => !value)}
              className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 shadow-sm hover:bg-slate-50"
            >
              ⚙ 판정 기준
            </button>
            <button
              type="button"
              onClick={openBulk}
              className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-2.5 text-sm font-black text-blue-700 shadow-sm hover:bg-blue-100"
            >
              ⚡ 사이즈 일괄 등록
            </button>
            <button
              type="button"
              onClick={openCreate}
              className="rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-black text-white shadow-sm hover:bg-slate-800"
            >
              + 1개 직접 등록
            </button>
          </div>
        </header>

        {message ? <Notice kind="success" text={message} /> : null}
        {error ? <Notice kind="error" text={error} /> : null}

        {settingsOpen ? (
          <SettingsPanel
            form={settingsForm}
            setForm={setSettingsForm}
            onSave={submitSettings}
            disabled={isPending}
          />
        ) : null}

        {bulkOpen ? (
          <BulkCandidatePanel
            form={bulkForm}
            setForm={updateBulkForm}
            preview={bulkPreview.rows}
            errors={bulkPreview.errors}
            onCancel={() => {
              setBulkOpen(false);
              setBulkForm(EMPTY_BULK_FORM);
            }}
            onSave={submitBulkCandidates}
            disabled={isPending}
          />
        ) : null}

        {formOpen ? (
          <CandidateFormPanel
            form={form}
            setForm={updateForm}
            onCancel={() => {
              setFormOpen(false);
              setForm(EMPTY_FORM);
            }}
            onSave={submitCandidate}
            disabled={isPending}
          />
        ) : null}

        <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          <SummaryCard label="등록 후보" value={`${summary.total}개`} note="추적 중인 사이즈 기준" />
          <SummaryCard label="매입 가능" value={`${summary.buy}개`} note="모든 기준 충족" strong />
          <SummaryCard label="저회전 후보" value={`${summary.slow}개`} note="수익 기준은 통과" />
          <SummaryCard label="최고 예상순익" value={money(summary.bestProfit)} note="현재 등록 후보 중" />
          <SummaryCard label="매입 가능 자금" value={money(summary.buyCapital)} note="각 1개 매입 가정" />
        </section>

        <section className="rounded-[24px] border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
          <div className="grid gap-3 lg:grid-cols-[1.5fr_0.8fr_0.8fr_0.8fr]">
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="상품명 · 모델번호 · 브랜드 · 사이즈 · 매입처 검색"
              className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-800 outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
            />
            <select
              value={decisionFilter}
              onChange={(event) => setDecisionFilter(event.target.value as FilterDecision)}
              className="rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm font-bold text-slate-700"
            >
              <option value="ALL">전체 판정</option>
              <option value="BUY">매입 가능</option>
              <option value="SLOW">저회전</option>
              <option value="PASS">제외</option>
              <option value="NO_DATA">데이터 부족</option>
            </select>
            <select
              value={platformFilter}
              onChange={(event) => setPlatformFilter(event.target.value as FilterPlatform)}
              className="rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm font-bold text-slate-700"
            >
              <option value="ALL">전체 판매처</option>
              <option value="KREAM">KREAM 우선</option>
              <option value="POIZON">POIZON 우선</option>
              <option value="NONE">판매가 없음</option>
            </select>
            <select
              value={sortKey}
              onChange={(event) => setSortKey(event.target.value as SortKey)}
              className="rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm font-bold text-slate-700"
            >
              <option value="profit">예상순익 높은순</option>
              <option value="margin">마진율 높은순</option>
              <option value="sales">30일 판매량 높은순</option>
              <option value="headroom">추가 매입 여력 높은순</option>
              <option value="updated">최근 수정순</option>
            </select>
          </div>

          <div className="mt-4 flex flex-wrap gap-2 text-xs font-semibold text-slate-500">
            <span className="rounded-full bg-slate-100 px-3 py-1.5">최소 순익 {money(initialSettings.min_profit)}</span>
            <span className="rounded-full bg-slate-100 px-3 py-1.5">최소 마진 {oneDecimal.format(initialSettings.min_margin_rate)}%</span>
            <span className="rounded-full bg-slate-100 px-3 py-1.5">최소 판매량 {initialSettings.min_30d_sales}개/30일</span>
            <span className="rounded-full bg-slate-100 px-3 py-1.5">검색 결과 {filteredRows.length}개</span>
          </div>
        </section>

        <section className="overflow-hidden rounded-[24px] border border-slate-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="min-w-[1320px] w-full text-sm">
              <thead className="bg-slate-50 text-xs font-black uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3 text-left">상품</th>
                  <th className="px-4 py-3 text-left">사이즈</th>
                  <th className="px-4 py-3 text-right">실매입가</th>
                  <th className="px-4 py-3 text-right">KREAM</th>
                  <th className="px-4 py-3 text-right">POIZON</th>
                  <th className="px-4 py-3 text-center">판매 우선</th>
                  <th className="px-4 py-3 text-right">예상순익</th>
                  <th className="px-4 py-3 text-right">마진율</th>
                  <th className="px-4 py-3 text-right">30일 판매</th>
                  <th className="px-4 py-3 text-right">최대 매입가</th>
                  <th className="px-4 py-3 text-center">판정</th>
                  <th className="px-4 py-3 text-center">관리</th>
                </tr>
              </thead>
              <tbody>
                {filteredRows.length === 0 ? (
                  <tr>
                    <td colSpan={12} className="px-6 py-16 text-center text-slate-500">
                      조건에 맞는 상품이 없습니다. <button onClick={openCreate} className="font-black text-blue-600">첫 매입 후보를 등록</button>해보세요.
                    </td>
                  </tr>
                ) : (
                  filteredRows.map(({ candidate, analysis }) => (
                    <tr key={candidate.id} className="border-t border-slate-100 align-top hover:bg-slate-50/70">
                      <td className="px-4 py-4">
                        <div className="font-black text-slate-900">{candidate.brand} · {candidate.product_name}</div>
                        <div className="mt-1 text-xs font-semibold text-slate-500">{candidate.model_number || "모델번호 없음"}</div>
                        <div className="mt-1 flex flex-wrap gap-2 text-xs text-slate-400">
                          <span>{candidate.purchase_source || "매입처 미입력"}</span>
                          {safeUrl(candidate.purchase_url) ? <a className="font-bold text-blue-600" href={safeUrl(candidate.purchase_url)!} target="_blank" rel="noreferrer">구매처 ↗</a> : null}
                        </div>
                      </td>
                      <td className="px-4 py-4 font-black text-slate-800">{candidate.size}</td>
                      <td className="px-4 py-4 text-right">
                        <div className="font-black text-slate-900">{money(analysis.actualPurchasePrice)}</div>
                        {candidate.discount_rate > 0 ? <div className="mt-1 text-xs font-bold text-blue-600">-{oneDecimal.format(candidate.discount_rate)}%</div> : null}
                      </td>
                      <PlatformCell candidate={candidate} platform="KREAM" />
                      <PlatformCell candidate={candidate} platform="POIZON" />
                      <td className="px-4 py-4 text-center">
                        <PlatformBadge platform={analysis.bestPlatform} />
                      </td>
                      <td className="px-4 py-4 text-right">
                        <div className={`font-black ${analysis.bestProfit >= 0 ? "text-emerald-700" : "text-rose-600"}`}>{money(analysis.bestProfit)}</div>
                        <div className={`mt-1 text-xs font-bold ${analysis.purchaseHeadroom >= 0 ? "text-emerald-600" : "text-rose-500"}`}>
                          {analysis.purchaseHeadroom >= 0
                            ? `최대 매입가보다 ${money(analysis.purchaseHeadroom)} 저렴`
                            : `최대 매입가보다 ${money(Math.abs(analysis.purchaseHeadroom))} 비쌈`}
                        </div>
                      </td>
                      <td className="px-4 py-4 text-right font-black text-slate-800">{oneDecimal.format(analysis.bestMarginRate)}%</td>
                      <td className="px-4 py-4 text-right font-black text-slate-800">{won.format(analysis.bestSales30d)}개</td>
                      <td className="px-4 py-4 text-right">
                        <div className="font-black text-blue-700">{money(analysis.bestMaxPurchasePrice)}</div>
                        <div className="mt-1 text-[11px] font-semibold text-slate-400">실결제가 기준</div>
                      </td>
                      <td className="px-4 py-4 text-center">
                        <span className={`inline-flex rounded-full px-3 py-1.5 text-xs font-black ring-1 ring-inset ${decisionClass(analysis.decision)}`}>
                          {decisionLabel(analysis.decision)}
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex justify-center gap-2">
                          <button onClick={() => openEdit(candidate)} className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-black text-slate-700 hover:bg-white">수정</button>
                          <button onClick={() => removeCandidate(candidate.id)} disabled={isPending} className="rounded-lg border border-rose-200 px-3 py-2 text-xs font-black text-rose-600 hover:bg-rose-50 disabled:opacity-50">삭제</button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>

        <section className="grid gap-4 lg:grid-cols-3">
          <GuideCard title="1. 먼저 판매가 확인" text="KREAM과 POIZON의 실제 판매 가능 가격을 사이즈별로 입력합니다. 표시가만 높고 거래가 없는 상품은 피합니다." />
          <GuideCard title="2. 실구매가 입력" text="쿠폰·카드할인까지 반영해 실제 결제하는 금액을 입력합니다. 시스템이 목표 수익을 기준으로 최대 매입 가능가를 역산합니다." />
          <GuideCard title="3. 매입 가능만 구매" text="수익·마진·30일 판매량 세 기준을 모두 통과한 상품만 매입합니다. 저회전 상품은 수익이 커도 별도로 표시합니다." />
        </section>
      </div>
    </div>
  );
}

function PlatformCell({ candidate, platform }: { candidate: ResaleCandidate; platform: "KREAM" | "POIZON" }) {
  const isKream = platform === "KREAM";
  const price = isKream ? candidate.kream_sale_price : candidate.poizon_sale_price;
  const sales = isKream ? candidate.kream_30d_sales : candidate.poizon_30d_sales;
  const url = safeUrl(isKream ? candidate.kream_url : candidate.poizon_url);

  return (
    <td className="px-4 py-4 text-right">
      <div className="font-black text-slate-900">{price > 0 ? money(price) : "-"}</div>
      <div className="mt-1 text-xs font-semibold text-slate-500">30일 {won.format(sales)}개</div>
      {url ? <a href={url} target="_blank" rel="noreferrer" className="mt-1 inline-block text-[11px] font-black text-blue-600">열기 ↗</a> : null}
    </td>
  );
}

function PlatformBadge({ platform }: { platform: ResalePlatform }) {
  if (platform === "KREAM") return <span className="rounded-full bg-black px-2.5 py-1 text-xs font-black text-white">KREAM</span>;
  if (platform === "POIZON") return <span className="rounded-full bg-cyan-50 px-2.5 py-1 text-xs font-black text-cyan-700 ring-1 ring-inset ring-cyan-200">POIZON</span>;
  return <span className="text-xs font-bold text-slate-400">-</span>;
}

function SummaryCard({ label, value, note, strong = false }: { label: string; value: string; note: string; strong?: boolean }) {
  return (
    <div className={`rounded-2xl border p-4 shadow-sm ${strong ? "border-emerald-200 bg-emerald-50" : "border-slate-200 bg-white"}`}>
      <p className={`text-xs font-black ${strong ? "text-emerald-700" : "text-slate-500"}`}>{label}</p>
      <p className={`mt-2 text-2xl font-black ${strong ? "text-emerald-800" : "text-slate-900"}`}>{value}</p>
      <p className={`mt-1 text-xs font-semibold ${strong ? "text-emerald-600" : "text-slate-400"}`}>{note}</p>
    </div>
  );
}

function Notice({ kind, text }: { kind: "success" | "error"; text: string }) {
  return (
    <div className={`rounded-xl border px-4 py-3 text-sm font-bold ${kind === "success" ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-rose-200 bg-rose-50 text-rose-700"}`}>
      {text}
    </div>
  );
}

function BulkCandidatePanel({
  form,
  setForm,
  preview,
  errors,
  onCancel,
  onSave,
  disabled,
}: {
  form: BulkForm;
  setForm: <K extends keyof BulkForm>(key: K, value: BulkForm[K]) => void;
  preview: BulkParsedRow[];
  errors: string[];
  onCancel: () => void;
  onSave: () => void;
  disabled: boolean;
}) {
  const kreamSearchUrl = form.modelNumber.trim()
    ? `https://kream.co.kr/search?keyword=${encodeURIComponent(form.modelNumber.trim())}`
    : "https://kream.co.kr/search?tab=all";

  return (
    <section className="rounded-[24px] border border-blue-200 bg-white p-5 shadow-sm sm:p-6">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-blue-600 px-3 py-1 text-xs font-black text-white">FAST INPUT</span>
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600">한 상품의 여러 사이즈 동시 등록</span>
          </div>
          <h2 className="mt-3 text-xl font-black text-slate-900">사이즈 일괄 등록</h2>
          <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-500">
            상품 정보와 매입가는 한 번만 입력하고, KREAM·POIZON의 사이즈별 판매가와 30일 판매량을 붙여넣으면
            같은 사이즈끼리 자동으로 합쳐서 한 번에 등록합니다.
          </p>
        </div>
        <button onClick={onCancel} className="self-start rounded-lg border border-slate-200 px-3 py-2 text-sm font-bold text-slate-600">닫기</button>
      </div>

      <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <TextField label="브랜드 *" value={form.brand} onChange={(value) => setForm("brand", value)} placeholder="Nike" />
        <TextField label="상품명 *" value={form.productName} onChange={(value) => setForm("productName", value)} placeholder="Air Max 95 Big Bubble" />
        <TextField label="모델번호" value={form.modelNumber} onChange={(value) => setForm("modelNumber", value)} placeholder="IB1667-003" />
        <div>
          <span className="text-xs font-black text-slate-600">플랫폼 빠른 열기</span>
          <div className="mt-1.5 grid grid-cols-2 gap-2">
            <a href={kreamSearchUrl} target="_blank" rel="noreferrer" className="rounded-xl bg-black px-3 py-3 text-center text-xs font-black text-white hover:bg-slate-800">KREAM 검색 ↗</a>
            <a href="https://www.poizon.com/seller/kr" target="_blank" rel="noreferrer" className="rounded-xl border border-cyan-200 bg-cyan-50 px-3 py-3 text-center text-xs font-black text-cyan-700 hover:bg-cyan-100">POIZON ↗</a>
          </div>
        </div>

        <TextField label="매입처" value={form.purchaseSource} onChange={(value) => setForm("purchaseSource", value)} placeholder="Nike 공식몰" />
        <MoneyField label="구매가 *" value={form.purchasePrice} onChange={(value) => setForm("purchasePrice", moneyInput(value))} placeholder="129,000" />
        <NumberField label="추가 할인율 %" value={form.discountRate} onChange={(value) => setForm("discountRate", value)} placeholder="20" />
        <TextField label="구매 URL" value={form.purchaseUrl} onChange={(value) => setForm("purchaseUrl", value)} placeholder="https://..." />
      </div>

      <div className="mt-5 grid gap-4 xl:grid-cols-2">
        <BulkPlatformInput
          platform="KREAM"
          value={form.kreamRows}
          url={form.kreamUrl}
          onValueChange={(value) => setForm("kreamRows", value)}
          onUrlChange={(value) => setForm("kreamUrl", value)}
          sample={"250 | 139000 | 12\n255 | 142000 | 18\n260 | 146000 | 23\n265 | 149000 | 31\n270 | 151000 | 28"}
        />
        <BulkPlatformInput
          platform="POIZON"
          value={form.poizonRows}
          url={form.poizonUrl}
          onValueChange={(value) => setForm("poizonRows", value)}
          onUrlChange={(value) => setForm("poizonUrl", value)}
          sample={"250 | 145000 | 7\n255 | 147000 | 11\n260 | 149000 | 15\n265 | 152000 | 19\n270 | 155000 | 25"}
        />
      </div>

      <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm font-black text-slate-900">등록 미리보기</p>
            <p className="mt-1 text-xs font-semibold text-slate-500">형식: 사이즈 | 판매가 | 30일 판매량 · 쉼표, 탭, 세미콜론도 지원</p>
          </div>
          <span className={`rounded-full px-3 py-1 text-xs font-black ${errors.length > 0 ? "bg-rose-100 text-rose-700" : "bg-emerald-100 text-emerald-700"}`}>
            {errors.length > 0 ? `형식 오류 ${errors.length}건` : `${preview.length}개 사이즈 준비`}
          </span>
        </div>

        {errors.length > 0 ? (
          <div className="mt-3 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-bold text-rose-700">
            {errors.slice(0, 5).join(" · ")}
          </div>
        ) : null}

        {preview.length > 0 ? (
          <div className="mt-3 overflow-x-auto rounded-xl border border-slate-200 bg-white">
            <table className="min-w-[620px] w-full text-xs">
              <thead className="bg-slate-50 text-slate-500">
                <tr>
                  <th className="px-3 py-2 text-left">사이즈</th>
                  <th className="px-3 py-2 text-right">KREAM</th>
                  <th className="px-3 py-2 text-right">30일</th>
                  <th className="px-3 py-2 text-right">POIZON</th>
                  <th className="px-3 py-2 text-right">30일</th>
                </tr>
              </thead>
              <tbody>
                {preview.map((row) => (
                  <tr key={row.size} className="border-t border-slate-100">
                    <td className="px-3 py-2 font-black text-slate-800">{row.size}</td>
                    <td className="px-3 py-2 text-right font-bold text-slate-700">{row.kreamSalePrice > 0 ? money(row.kreamSalePrice) : "-"}</td>
                    <td className="px-3 py-2 text-right text-slate-500">{won.format(row.kream30dSales)}개</td>
                    <td className="px-3 py-2 text-right font-bold text-slate-700">{row.poizonSalePrice > 0 ? money(row.poizonSalePrice) : "-"}</td>
                    <td className="px-3 py-2 text-right text-slate-500">{won.format(row.poizon30dSales)}개</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="mt-3 rounded-xl border border-dashed border-slate-300 bg-white px-4 py-6 text-center text-xs font-semibold text-slate-400">
            위 입력칸에 사이즈별 데이터를 붙여넣으면 여기에서 먼저 확인할 수 있습니다.
          </div>
        )}
      </div>

      <div className="mt-4">
        <label className="text-xs font-black text-slate-600">메모</label>
        <textarea value={form.memo} onChange={(event) => setForm("memo", event.target.value)} rows={2} placeholder="쿠폰 조건, 발매일, 매입 제한 등" className="mt-1.5 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-800 outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-100" />
      </div>

      <div className="mt-5 flex flex-col gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-xs font-semibold leading-5 text-amber-800 sm:flex-row sm:items-center sm:justify-between">
        <p>
          현재 단계는 사이즈 데이터를 빠르게 일괄 등록하는 버전입니다. POIZON은 공식 Open Platform 권한을 연결하면 이 입력값을 자동 수집하도록 다음 단계에서 교체할 수 있습니다.
        </p>
        <div className="flex shrink-0 gap-2">
          <button onClick={onCancel} className="rounded-xl border border-amber-300 bg-white px-4 py-2.5 text-sm font-black text-slate-700">취소</button>
          <button onClick={onSave} disabled={disabled || preview.length === 0 || errors.length > 0} className="rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-black text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-40">
            {disabled ? "등록 중..." : `${preview.length}개 사이즈 등록`}
          </button>
        </div>
      </div>
    </section>
  );
}

function BulkPlatformInput({
  platform,
  value,
  url,
  onValueChange,
  onUrlChange,
  sample,
}: {
  platform: "KREAM" | "POIZON";
  value: string;
  url: string;
  onValueChange: (value: string) => void;
  onUrlChange: (value: string) => void;
  sample: string;
}) {
  const isKream = platform === "KREAM";

  return (
    <div className={`rounded-2xl border p-4 ${isKream ? "border-slate-300 bg-slate-50" : "border-cyan-200 bg-cyan-50/50"}`}>
      <div className="flex items-center justify-between gap-3">
        <p className={`font-black ${isKream ? "text-slate-900" : "text-cyan-800"}`}>{platform} 사이즈 데이터</p>
        <span className="text-[11px] font-bold text-slate-400">사이즈 | 판매가 | 30일 판매량</span>
      </div>
      <textarea
        value={value}
        onChange={(event) => onValueChange(event.target.value)}
        rows={7}
        spellCheck={false}
        placeholder={sample}
        className="mt-3 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-3 font-mono text-sm font-semibold leading-6 text-slate-800 outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
      />
      <div className="mt-3">
        <TextField label={`${platform} 상품 URL`} value={url} onChange={onUrlChange} placeholder="https://..." />
      </div>
    </div>
  );
}

function CandidateFormPanel({
  form,
  setForm,
  onCancel,
  onSave,
  disabled,
}: {
  form: CandidateForm;
  setForm: <K extends keyof CandidateForm>(key: K, value: CandidateForm[K]) => void;
  onCancel: () => void;
  onSave: () => void;
  disabled: boolean;
}) {
  return (
    <section className="rounded-[24px] border border-blue-200 bg-white p-5 shadow-sm sm:p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-slate-900">{form.id ? "매입 후보 수정" : "매입 후보 등록"}</h2>
          <p className="mt-1 text-sm text-slate-500">판매가는 사이즈별 현재 판매 가능 가격을 입력하세요.</p>
        </div>
        <button onClick={onCancel} className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-bold text-slate-600">닫기</button>
      </div>

      <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <TextField label="브랜드 *" value={form.brand} onChange={(value) => setForm("brand", value)} placeholder="Nike" />
        <TextField label="상품명 *" value={form.productName} onChange={(value) => setForm("productName", value)} placeholder="Air Max 95" />
        <TextField label="모델번호" value={form.modelNumber} onChange={(value) => setForm("modelNumber", value)} placeholder="HM0622-003" />
        <TextField label="사이즈 *" value={form.size} onChange={(value) => setForm("size", value)} placeholder="270 / US 9" />

        <TextField label="매입처" value={form.purchaseSource} onChange={(value) => setForm("purchaseSource", value)} placeholder="Nike 공식몰" />
        <MoneyField label="구매가 *" value={form.purchasePrice} onChange={(value) => setForm("purchasePrice", moneyInput(value))} placeholder="129,000" />
        <NumberField label="추가 할인율 %" value={form.discountRate} onChange={(value) => setForm("discountRate", value)} placeholder="20" />
        <TextField label="구매 URL" value={form.purchaseUrl} onChange={(value) => setForm("purchaseUrl", value)} placeholder="https://..." />
      </div>

      <div className="mt-5 grid gap-4 rounded-2xl bg-slate-50 p-4 md:grid-cols-2 xl:grid-cols-3">
        <MoneyField label="KREAM 판매가" value={form.kreamSalePrice} onChange={(value) => setForm("kreamSalePrice", moneyInput(value))} placeholder="159,000" />
        <NumberField label="KREAM 30일 판매량" value={form.kream30dSales} onChange={(value) => setForm("kream30dSales", value)} placeholder="45" />
        <TextField label="KREAM URL" value={form.kreamUrl} onChange={(value) => setForm("kreamUrl", value)} placeholder="https://..." />
        <MoneyField label="POIZON 판매가" value={form.poizonSalePrice} onChange={(value) => setForm("poizonSalePrice", moneyInput(value))} placeholder="168,000" />
        <NumberField label="POIZON 30일 판매량" value={form.poizon30dSales} onChange={(value) => setForm("poizon30dSales", value)} placeholder="70" />
        <TextField label="POIZON URL" value={form.poizonUrl} onChange={(value) => setForm("poizonUrl", value)} placeholder="https://..." />
      </div>

      <div className="mt-4">
        <label className="text-xs font-black text-slate-600">메모</label>
        <textarea value={form.memo} onChange={(event) => setForm("memo", event.target.value)} rows={3} placeholder="컬러, 쿠폰 조건, 발매일 등" className="mt-1.5 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-800 outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-100" />
      </div>

      <div className="mt-5 flex justify-end gap-2">
        <button onClick={onCancel} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-black text-slate-700">취소</button>
        <button onClick={onSave} disabled={disabled} className="rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-black text-white hover:bg-blue-700 disabled:opacity-50">{disabled ? "저장 중..." : "저장"}</button>
      </div>
    </section>
  );
}

function SettingsPanel({
  form,
  setForm,
  onSave,
  disabled,
}: {
  form: Record<string, string>;
  setForm: React.Dispatch<React.SetStateAction<any>>;
  onSave: () => void;
  disabled: boolean;
}) {
  const set = (key: string, value: string) => setForm((current: any) => ({ ...current, [key]: value }));

  return (
    <section className="rounded-[24px] border border-slate-300 bg-slate-900 p-5 text-white shadow-sm sm:p-6">
      <div>
        <h2 className="text-xl font-black">매입 판정 기준</h2>
        <p className="mt-1 text-sm font-semibold text-slate-300">수수료가 바뀌면 여기만 수정하면 모든 후보가 즉시 다시 계산됩니다.</p>
      </div>

      <div className="mt-5 grid gap-4 md:grid-cols-3">
        <DarkMoneyField label="최소 순이익" value={form.minProfit} onChange={(value) => set("minProfit", moneyInput(value))} />
        <DarkNumberField label="최소 마진율 %" value={form.minMarginRate} onChange={(value) => set("minMarginRate", value)} />
        <DarkNumberField label="최소 30일 판매량" value={form.min30dSales} onChange={(value) => set("min30dSales", value)} />
      </div>

      <div className="mt-5 grid gap-4 xl:grid-cols-2">
        <div className="rounded-2xl border border-slate-700 bg-slate-800/70 p-4">
          <p className="font-black">KREAM 비용</p>
          <div className="mt-3 grid gap-3 sm:grid-cols-3">
            <DarkNumberField label="수수료율 %" value={form.kreamFeeRate} onChange={(value) => set("kreamFeeRate", value)} />
            <DarkMoneyField label="고정 수수료" value={form.kreamFixedFee} onChange={(value) => set("kreamFixedFee", moneyInput(value))} />
            <DarkMoneyField label="검수센터 배송비" value={form.kreamShippingFee} onChange={(value) => set("kreamShippingFee", moneyInput(value))} />
          </div>
        </div>
        <div className="rounded-2xl border border-slate-700 bg-slate-800/70 p-4">
          <p className="font-black">POIZON 비용</p>
          <div className="mt-3 grid gap-3 sm:grid-cols-3">
            <DarkNumberField label="수수료율 %" value={form.poizonFeeRate} onChange={(value) => set("poizonFeeRate", value)} />
            <DarkMoneyField label="고정 수수료" value={form.poizonFixedFee} onChange={(value) => set("poizonFixedFee", moneyInput(value))} />
            <DarkMoneyField label="국내 택배비" value={form.poizonShippingFee} onChange={(value) => set("poizonShippingFee", moneyInput(value))} />
          </div>
        </div>
      </div>

      <div className="mt-5 flex justify-end">
        <button onClick={onSave} disabled={disabled} className="rounded-xl bg-white px-5 py-2.5 text-sm font-black text-slate-900 hover:bg-slate-100 disabled:opacity-50">{disabled ? "저장 중..." : "기준 저장"}</button>
      </div>
    </section>
  );
}

function TextField({ label, value, onChange, placeholder = "" }: { label: string; value: string; onChange: (value: string) => void; placeholder?: string }) {
  return (
    <label className="block">
      <span className="text-xs font-black text-slate-600">{label}</span>
      <input value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} className="mt-1.5 w-full rounded-xl border border-slate-200 px-3.5 py-3 text-sm font-semibold text-slate-800 outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-100" />
    </label>
  );
}

function MoneyField({ label, value, onChange, placeholder = "" }: { label: string; value: string; onChange: (value: string) => void; placeholder?: string }) {
  return (
    <label className="block">
      <span className="text-xs font-black text-slate-600">{label}</span>
      <div className="relative mt-1.5">
        <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-black text-slate-400">₩</span>
        <input value={value} inputMode="numeric" onChange={(event) => onChange(event.target.value)} placeholder={placeholder} className="w-full rounded-xl border border-slate-200 py-3 pl-8 pr-3.5 text-right text-sm font-black text-slate-800 outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-100" />
      </div>
    </label>
  );
}

function NumberField({ label, value, onChange, placeholder = "" }: { label: string; value: string; onChange: (value: string) => void; placeholder?: string }) {
  return (
    <label className="block">
      <span className="text-xs font-black text-slate-600">{label}</span>
      <input value={value} inputMode="decimal" onChange={(event) => onChange(event.target.value.replace(/[^0-9.]/g, ""))} placeholder={placeholder} className="mt-1.5 w-full rounded-xl border border-slate-200 px-3.5 py-3 text-right text-sm font-black text-slate-800 outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-100" />
    </label>
  );
}

function DarkMoneyField({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <label className="block">
      <span className="text-xs font-black text-slate-300">{label}</span>
      <div className="relative mt-1.5">
        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-xs font-black text-slate-400">₩</span>
        <input value={value} onChange={(event) => onChange(event.target.value)} inputMode="numeric" className="w-full rounded-xl border border-slate-600 bg-slate-800 py-2.5 pl-7 pr-3 text-right text-sm font-black text-white outline-none focus:border-blue-400" />
      </div>
    </label>
  );
}

function DarkNumberField({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <label className="block">
      <span className="text-xs font-black text-slate-300">{label}</span>
      <input value={value} onChange={(event) => onChange(event.target.value.replace(/[^0-9.]/g, ""))} inputMode="decimal" className="mt-1.5 w-full rounded-xl border border-slate-600 bg-slate-800 px-3 py-2.5 text-right text-sm font-black text-white outline-none focus:border-blue-400" />
    </label>
  );
}

function GuideCard({ title, text }: { title: string; text: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <p className="font-black text-slate-900">{title}</p>
      <p className="mt-2 text-sm font-medium leading-6 text-slate-500">{text}</p>
    </div>
  );
}
