"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createImportOrderAction } from "./actions";
import type { ProductCategory } from "@/lib/products";

type ProductModelOption = {
  id: string;
  category: ProductCategory;
  model_name: string;
};

type ItemRow = {
  id: number;
  quantity: string;
  productCost: string;
};

type CostValues = {
  productCostTotal: string;
  dutyAmount: string;
  vatAmount: string;
  freightAmount: string;
  customsBrokerFee: string;
  tobaccoTaxAmount: string;
};

const categoryLabels: Record<ProductCategory, string> = {
  disposable: "일회용기기",
  pod: "팟",
  device: "디바이스",
  liquid: "액상",
};

function parseNumber(value: string) {
  if (!value.trim()) {
    return 0;
  }

  const numberValue = Number(value.replaceAll(",", ""));

  return Number.isNaN(numberValue) ? 0 : numberValue;
}

function formatNumber(value: number) {
  return Math.round(value).toLocaleString("ko-KR");
}

export function ImportOrderCreateModal({
  productModels,
}: {
  productModels: ProductModelOption[];
}) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);

  const [costValues, setCostValues] = useState<CostValues>({
    productCostTotal: "",
    dutyAmount: "",
    vatAmount: "",
    freightAmount: "",
    customsBrokerFee: "",
    tobaccoTaxAmount: "",
  });

  const [itemRows, setItemRows] = useState<ItemRow[]>([
    { id: 1, quantity: "", productCost: "" },
  ]);

  const today = useMemo(() => {
    return new Date().toISOString().slice(0, 10);
  }, []);

  const productCostTotal = parseNumber(costValues.productCostTotal);
  const dutyAmount = parseNumber(costValues.dutyAmount);
  const vatAmount = parseNumber(costValues.vatAmount);
  const freightAmount = parseNumber(costValues.freightAmount);
  const customsBrokerFee = parseNumber(costValues.customsBrokerFee);
  const tobaccoTaxAmount = parseNumber(costValues.tobaccoTaxAmount);

  const extraCostTotal =
    dutyAmount +
    vatAmount +
    freightAmount +
    customsBrokerFee +
    tobaccoTaxAmount;

  const itemProductCostSum = itemRows.reduce(
    (sum, row) => sum + parseNumber(row.productCost),
    0
  );

  const appliedProductCostTotal =
    productCostTotal > 0 ? productCostTotal : itemProductCostSum;

  const totalCost = appliedProductCostTotal + extraCostTotal;

  const totalQuantity = itemRows.reduce(
    (sum, row) => sum + parseNumber(row.quantity),
    0
  );

  function getEstimatedUnitCost(row: ItemRow) {
    const quantity = parseNumber(row.quantity);

    if (quantity <= 0 || totalCost <= 0) {
      return 0;
    }

    const rowProductCost = parseNumber(row.productCost);

    let allocationRatio = 0;

    if (itemProductCostSum > 0) {
      allocationRatio = rowProductCost / itemProductCostSum;
    } else if (totalQuantity > 0) {
      allocationRatio = quantity / totalQuantity;
    }

    const allocatedTotalCost = totalCost * allocationRatio;

    return allocatedTotalCost / quantity;
  }

  function closeModal() {
    setIsOpen(false);
  }

  function resetForm() {
    setCostValues({
      productCostTotal: "",
      dutyAmount: "",
      vatAmount: "",
      freightAmount: "",
      customsBrokerFee: "",
      tobaccoTaxAmount: "",
    });
    setItemRows([{ id: 1, quantity: "", productCost: "" }]);
  }

  function addItemRow() {
    setItemRows((prev) => [
      ...prev,
      { id: Date.now(), quantity: "", productCost: "" },
    ]);
  }

  function removeItemRow(id: number) {
    setItemRows((prev) => {
      if (prev.length === 1) {
        return prev;
      }

      return prev.filter((row) => row.id !== id);
    });
  }

  function updateItemRow(
    id: number,
    key: "quantity" | "productCost",
    value: string
  ) {
    setItemRows((prev) =>
      prev.map((row) => (row.id === id ? { ...row, [key]: value } : row))
    );
  }

  function updateCostValue(key: keyof CostValues, value: string) {
    setCostValues((prev) => ({
      ...prev,
      [key]: value,
    }));
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="rounded-lg bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-slate-700"
      >
        수입 건 생성
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="max-h-[90vh] w-full max-w-6xl overflow-y-auto rounded-2xl bg-white shadow-xl">
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200 bg-white px-6 py-4">
              <div>
                <h2 className="text-xl font-bold text-slate-900">
                  수입 건 생성
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  수입 비용과 품목을 입력하면 모델별 도착원가가 자동 계산됩니다.
                </p>
              </div>

              <button
                type="button"
                onClick={closeModal}
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50"
              >
                닫기
              </button>
            </div>

            <form
              action={async (formData) => {
                await createImportOrderAction(formData);
                resetForm();
                closeModal();
                router.refresh();
              }}
              className="space-y-6 p-6"
            >
              <div className="rounded-xl border border-slate-200 bg-white p-5">
                <h3 className="text-base font-bold text-slate-900">
                  기본 정보
                </h3>

                <div className="mt-4 grid gap-4 md:grid-cols-3">
                  <div>
                    <label className="text-sm font-medium text-slate-700">
                      P/O 번호 <span className="text-red-500">*</span>
                    </label>
                    <input
                      name="po_number"
                      required
                      placeholder="예: PO-2026-001"
                      className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-900"
                    />
                  </div>

                  <div>
                    <label className="text-sm font-medium text-slate-700">
                      공급업체
                    </label>
                    <input
                      name="supplier_name"
                      placeholder="공급업체명"
                      className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-900"
                    />
                  </div>

                  <div>
                    <label className="text-sm font-medium text-slate-700">
                      수입일자
                    </label>
                    <input
                      name="import_date"
                      type="date"
                      defaultValue={today}
                      className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-900"
                    />
                  </div>
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 bg-white p-5">
                <h3 className="text-base font-bold text-slate-900">
                  비용 분할
                </h3>
                <p className="mt-1 text-sm text-slate-500">
                  모든 비용이 자동 합산되고, 품목 수량 기준으로 예상 도착원가가 계산됩니다.
                </p>

                <div className="mt-4 grid gap-4 md:grid-cols-3">
                  <MoneyInput
                    name="product_cost_total"
                    label="물건 원가 총액"
                    value={costValues.productCostTotal}
                    onChange={(value) =>
                      updateCostValue("productCostTotal", value)
                    }
                  />
                  <MoneyInput
                    name="duty_amount"
                    label="관세"
                    value={costValues.dutyAmount}
                    onChange={(value) => updateCostValue("dutyAmount", value)}
                  />
                  <MoneyInput
                    name="vat_amount"
                    label="부가세"
                    value={costValues.vatAmount}
                    onChange={(value) => updateCostValue("vatAmount", value)}
                  />
                  <MoneyInput
                    name="freight_amount"
                    label="운송비"
                    value={costValues.freightAmount}
                    onChange={(value) =>
                      updateCostValue("freightAmount", value)
                    }
                  />
                  <MoneyInput
                    name="customs_broker_fee"
                    label="관세사 비용"
                    value={costValues.customsBrokerFee}
                    onChange={(value) =>
                      updateCostValue("customsBrokerFee", value)
                    }
                  />
                  <MoneyInput
                    name="tobacco_tax_amount"
                    label="담배별 세금"
                    value={costValues.tobaccoTaxAmount}
                    onChange={(value) =>
                      updateCostValue("tobaccoTaxAmount", value)
                    }
                  />
                </div>

                <div className="mt-5 rounded-xl border border-slate-200 bg-slate-50 px-5 py-4">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-bold text-slate-700">
                      총 비용 자동 합산
                    </p>
                    <p className="text-2xl font-bold text-slate-900">
                      ₩{formatNumber(totalCost)}
                    </p>
                  </div>

                  <div className="mt-2 text-sm text-slate-500">
                    물건 원가 {formatNumber(appliedProductCostTotal)} + 부대비용{" "}
                    {formatNumber(extraCostTotal)}
                  </div>
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 bg-white p-5">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <h3 className="text-base font-bold text-slate-900">
                      수입 품목
                    </h3>
                    <p className="mt-1 text-sm text-slate-500">
                      수량을 입력하면 예상 개당 도착원가가 자동 계산됩니다.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={addItemRow}
                    className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                  >
                    + 품목 추가
                  </button>
                </div>

                <div className="mt-5 space-y-3">
                  {itemRows.map((row, index) => {
                    const estimatedUnitCost = getEstimatedUnitCost(row);

                    return (
                      <div
                        key={row.id}
                        className="rounded-xl border border-slate-200 bg-slate-50 p-4"
                      >
                        <div className="mb-4 flex items-center justify-between">
                          <p className="text-sm font-bold text-slate-800">
                            품목 {index + 1}
                          </p>

                          <button
                            type="button"
                            onClick={() => removeItemRow(row.id)}
                            className="text-sm font-semibold text-red-600 hover:underline"
                          >
                            삭제
                          </button>
                        </div>

                        <div className="grid gap-4 md:grid-cols-[1fr_140px_180px_180px]">
                          <div>
                            <label className="text-sm font-medium text-slate-700">
                              제품 모델
                            </label>
                            <select
                              name="product_model_id"
                              required
                              className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-900"
                            >
                              <option value="">제품 모델 선택</option>
                              {productModels.map((model) => (
                                <option key={model.id} value={model.id}>
                                  [{categoryLabels[model.category]}]{" "}
                                  {model.model_name}
                                </option>
                              ))}
                            </select>
                          </div>

                          <div>
                            <label className="text-sm font-medium text-slate-700">
                              수량
                            </label>
                            <input
                              name="quantity"
                              type="number"
                              min="0"
                              value={row.quantity}
                              onChange={(event) =>
                                updateItemRow(
                                  row.id,
                                  "quantity",
                                  event.target.value
                                )
                              }
                              placeholder="0"
                              className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-900"
                            />
                          </div>

                          <div>
                            <label className="text-sm font-medium text-slate-700">
                              송금 금액
                            </label>
                            <input
                              name="product_cost"
                              type="number"
                              min="0"
                              value={row.productCost}
                              onChange={(event) =>
                                updateItemRow(
                                  row.id,
                                  "productCost",
                                  event.target.value
                                )
                              }
                              placeholder="0"
                              className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-900"
                            />
                          </div>

                          <div>
                            <label className="text-sm font-medium text-slate-700">
                              예상 도착원가
                            </label>
                            <div className="mt-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-900">
                              ₩{formatNumber(estimatedUnitCost)}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 bg-white p-5">
                <label className="text-sm font-medium text-slate-700">
                  비고
                </label>
                <input
                  name="memo"
                  placeholder="메모 입력"
                  className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-900"
                />
              </div>

              <div className="flex justify-end gap-2 border-t border-slate-200 pt-5">
                <button
                  type="button"
                  onClick={closeModal}
                  className="rounded-lg border border-slate-300 px-5 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                >
                  취소
                </button>

                <button
                  type="submit"
                  className="rounded-lg bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-slate-700"
                >
                  수입 건 생성
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

function MoneyInput({
  name,
  label,
  value,
  onChange,
}: {
  name: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div>
      <label className="text-sm font-medium text-slate-700">{label}</label>
      <input
        name={name}
        type="number"
        min="0"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder="0"
        className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-900"
      />
    </div>
  );
}