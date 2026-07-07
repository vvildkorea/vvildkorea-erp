"use client";

import { FormEvent, useMemo, useState, useTransition } from "react";
import { createImportOrderAction } from "./actions";

type ProductModelOption = {
  id: string;
  category: string;
  model_name: string;
};

type ProductVariantOption = {
  id: string;
  product_model_id: string;
  option_name: string;
};

type ImportOrderCreateModalProps = {
  productModels: ProductModelOption[];
  productVariants: ProductVariantOption[];
};

type ItemRow = {
  key: string;
  productModelId: string;
  productVariantId: string;
  quantity: string;
};

const categoryLabels: Record<string, string> = {
  disposable: "일회용기기",
  pod: "팟",
  device: "디바이스",
  liquid: "액상",
};

function createEmptyRow(): ItemRow {
  return {
    key: crypto.randomUUID(),
    productModelId: "",
    productVariantId: "",
    quantity: "",
  };
}

function formatCategory(category: string) {
  return categoryLabels[category] || category || "-";
}

function toNumber(value: string) {
  if (!value) return 0;

  const numberValue = Number(value.replaceAll(",", ""));

  if (Number.isNaN(numberValue)) {
    return 0;
  }

  return numberValue;
}

function formatNumber(value: number) {
  return Math.round(value).toLocaleString("ko-KR");
}

export function ImportOrderCreateModal({
  productModels,
  productVariants,
}: ImportOrderCreateModalProps) {
  const [open, setOpen] = useState(false);
  const [rows, setRows] = useState<ItemRow[]>([createEmptyRow()]);
  const [errorMessage, setErrorMessage] = useState("");
  const [isPending, startTransition] = useTransition();

  const [productCostTotal, setProductCostTotal] = useState("");
  const [dutyAmount, setDutyAmount] = useState("");
  const [vatAmount, setVatAmount] = useState("");
  const [freightAmount, setFreightAmount] = useState("");
  const [customsBrokerFee, setCustomsBrokerFee] = useState("");
  const [tobaccoTaxAmount, setTobaccoTaxAmount] = useState("");

  const variantMap = useMemo(() => {
    const map = new Map<string, ProductVariantOption[]>();

    productVariants.forEach((variant) => {
      const list = map.get(variant.product_model_id) || [];
      list.push(variant);
      map.set(variant.product_model_id, list);
    });

    return map;
  }, [productVariants]);

  const calculated = useMemo(() => {
    const validRows = rows
      .map((row) => ({
        ...row,
        quantityNumber: toNumber(row.quantity),
      }))
      .filter(
        (row) =>
          row.productModelId &&
          row.productVariantId &&
          row.quantityNumber > 0
      );

    const totalQuantity = validRows.reduce(
      (sum, row) => sum + row.quantityNumber,
      0
    );

    const finalProductCostTotal = toNumber(productCostTotal);

    const extraCostTotal =
      toNumber(dutyAmount) +
      toNumber(vatAmount) +
      toNumber(freightAmount) +
      toNumber(customsBrokerFee) +
      toNumber(tobaccoTaxAmount);

    const totalCost = finalProductCostTotal + extraCostTotal;

    const rowResults = rows.map((row) => {
      const quantity = toNumber(row.quantity);

      const allocationRatio =
        totalQuantity > 0 && quantity > 0 ? quantity / totalQuantity : 0;

      const allocatedProductCost = finalProductCostTotal * allocationRatio;
      const allocatedExtraCost = extraCostTotal * allocationRatio;
      const landedCostTotal = allocatedProductCost + allocatedExtraCost;
      const landedCostUnit = quantity > 0 ? landedCostTotal / quantity : 0;

      return {
        key: row.key,
        allocatedProductCost,
        allocatedExtraCost,
        landedCostTotal,
        landedCostUnit,
      };
    });

    return {
      totalQuantity,
      finalProductCostTotal,
      extraCostTotal,
      totalCost,
      rowResults,
    };
  }, [
    rows,
    productCostTotal,
    dutyAmount,
    vatAmount,
    freightAmount,
    customsBrokerFee,
    tobaccoTaxAmount,
  ]);

  function addRow() {
    setRows((prev) => [...prev, createEmptyRow()]);
  }

  function removeRow(key: string) {
    setRows((prev) => {
      if (prev.length <= 1) {
        return prev;
      }

      return prev.filter((row) => row.key !== key);
    });
  }

  function updateRow(
    key: string,
    field: "productModelId" | "productVariantId" | "quantity",
    value: string
  ) {
    setRows((prev) =>
      prev.map((row) => {
        if (row.key !== key) {
          return row;
        }

        if (field === "productModelId") {
          return {
            ...row,
            productModelId: value,
            productVariantId: "",
          };
        }

        return {
          ...row,
          [field]: value,
        };
      })
    );
  }

  function resetModal() {
    setRows([createEmptyRow()]);
    setProductCostTotal("");
    setDutyAmount("");
    setVatAmount("");
    setFreightAmount("");
    setCustomsBrokerFee("");
    setTobaccoTaxAmount("");
    setErrorMessage("");
  }

  function closeModal() {
    if (isPending) return;

    setOpen(false);
    resetModal();
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const form = event.currentTarget;
    const formData = new FormData(form);

    setErrorMessage("");

    startTransition(() => {
      void (async () => {
        try {
          await createImportOrderAction(formData);
          form.reset();
          resetModal();
          setOpen(false);
        } catch (error) {
          const message =
            error instanceof Error
              ? error.message
              : "수입 건 저장 중 오류가 발생했습니다.";

          setErrorMessage(message);
        }
      })();
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700"
      >
        수입 건 등록
      </button>

      {open ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="max-h-[92vh] w-full max-w-7xl overflow-y-auto rounded-2xl bg-white shadow-xl">
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200 bg-white px-6 py-4">
              <div>
                <h2 className="text-lg font-bold text-slate-900">
                  수입 건 등록
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  비용 총액을 품목 수량 기준으로 자동 배부해 도착원가와 재고
                  입고를 반영합니다.
                </p>
              </div>

              <button
                type="button"
                onClick={closeModal}
                className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                닫기
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6 p-6">
              {errorMessage ? (
                <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                  {errorMessage}
                </div>
              ) : null}

              <div className="grid gap-4 md:grid-cols-3">
                <div>
                  <label className="mb-1 block text-sm font-semibold text-slate-700">
                    P/O 번호
                  </label>
                  <input
                    name="po_number"
                    className="h-10 w-full rounded-lg border border-slate-300 px-3 text-sm"
                    placeholder="예: PO-202607-001"
                    required
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm font-semibold text-slate-700">
                    공급업체
                  </label>
                  <input
                    name="supplier_name"
                    className="h-10 w-full rounded-lg border border-slate-300 px-3 text-sm"
                    placeholder="공급업체명"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm font-semibold text-slate-700">
                    수입일자
                  </label>
                  <input
                    type="date"
                    name="import_date"
                    className="h-10 w-full rounded-lg border border-slate-300 px-3 text-sm"
                  />
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 p-4">
                <h3 className="font-bold text-slate-900">비용 입력</h3>

                <div className="mt-4 grid gap-4 md:grid-cols-3">
                  <div>
                    <label className="mb-1 block text-sm font-semibold text-slate-700">
                      물건 원가 총액
                    </label>
                    <input
                      type="number"
                      name="product_cost_total"
                      min={0}
                      value={productCostTotal}
                      onChange={(event) =>
                        setProductCostTotal(event.target.value)
                      }
                      className="h-10 w-full rounded-lg border border-slate-300 px-3 text-sm"
                      placeholder="예: 총 송금액"
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-sm font-semibold text-slate-700">
                      관세
                    </label>
                    <input
                      type="number"
                      name="duty_amount"
                      min={0}
                      value={dutyAmount}
                      onChange={(event) => setDutyAmount(event.target.value)}
                      className="h-10 w-full rounded-lg border border-slate-300 px-3 text-sm"
                      placeholder="0"
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-sm font-semibold text-slate-700">
                      부가세
                    </label>
                    <input
                      type="number"
                      name="vat_amount"
                      min={0}
                      value={vatAmount}
                      onChange={(event) => setVatAmount(event.target.value)}
                      className="h-10 w-full rounded-lg border border-slate-300 px-3 text-sm"
                      placeholder="0"
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-sm font-semibold text-slate-700">
                      운송비
                    </label>
                    <input
                      type="number"
                      name="freight_amount"
                      min={0}
                      value={freightAmount}
                      onChange={(event) => setFreightAmount(event.target.value)}
                      className="h-10 w-full rounded-lg border border-slate-300 px-3 text-sm"
                      placeholder="0"
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-sm font-semibold text-slate-700">
                      관세사 비용
                    </label>
                    <input
                      type="number"
                      name="customs_broker_fee"
                      min={0}
                      value={customsBrokerFee}
                      onChange={(event) =>
                        setCustomsBrokerFee(event.target.value)
                      }
                      className="h-10 w-full rounded-lg border border-slate-300 px-3 text-sm"
                      placeholder="0"
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-sm font-semibold text-slate-700">
                      담배별 세금
                    </label>
                    <input
                      type="number"
                      name="tobacco_tax_amount"
                      min={0}
                      value={tobaccoTaxAmount}
                      onChange={(event) =>
                        setTobaccoTaxAmount(event.target.value)
                      }
                      className="h-10 w-full rounded-lg border border-slate-300 px-3 text-sm"
                      placeholder="0"
                    />
                  </div>
                </div>

                <div className="mt-4 grid gap-3 md:grid-cols-4">
                  <div className="rounded-lg bg-slate-50 p-3">
                    <p className="text-xs text-slate-500">총 수량</p>
                    <p className="mt-1 font-bold text-slate-900">
                      {formatNumber(calculated.totalQuantity)}
                    </p>
                  </div>

                  <div className="rounded-lg bg-slate-50 p-3">
                    <p className="text-xs text-slate-500">물건 원가 총액</p>
                    <p className="mt-1 font-bold text-slate-900">
                      {formatNumber(calculated.finalProductCostTotal)}
                    </p>
                  </div>

                  <div className="rounded-lg bg-slate-50 p-3">
                    <p className="text-xs text-slate-500">부대비용 합계</p>
                    <p className="mt-1 font-bold text-slate-900">
                      {formatNumber(calculated.extraCostTotal)}
                    </p>
                  </div>

                  <div className="rounded-lg bg-slate-50 p-3">
                    <p className="text-xs text-slate-500">총 도착금액</p>
                    <p className="mt-1 font-bold text-slate-900">
                      {formatNumber(calculated.totalCost)}
                    </p>
                  </div>
                </div>
              </div>

              <div className="rounded-xl border border-slate-200">
                <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
                  <div>
                    <h3 className="font-bold text-slate-900">수입 품목</h3>
                    <p className="mt-1 text-sm text-slate-500">
                      품목 수량 기준으로 물건 원가와 부대비용이 자동 배부됩니다.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={addRow}
                    className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                  >
                    품목 추가
                  </button>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full min-w-[1180px] text-left text-sm">
                    <thead className="bg-slate-50 text-slate-500">
                      <tr>
                        <th className="px-4 py-3 font-medium">모델</th>
                        <th className="px-4 py-3 font-medium">맛/색상</th>
                        <th className="px-4 py-3 font-medium">수량</th>
                        <th className="px-4 py-3 font-medium">
                          배부 물건원가
                        </th>
                        <th className="px-4 py-3 font-medium">배부 비용</th>
                        <th className="px-4 py-3 font-medium">총 도착금액</th>
                        <th className="px-4 py-3 font-medium">개당 도착원가</th>
                        <th className="px-4 py-3 font-medium">관리</th>
                      </tr>
                    </thead>

                    <tbody className="divide-y divide-slate-100">
                      {rows.map((row) => {
                        const filteredVariants =
                          variantMap.get(row.productModelId) || [];
                        const result = calculated.rowResults.find(
                          (item) => item.key === row.key
                        );

                        return (
                          <tr key={row.key}>
                            <td className="px-4 py-3">
                              <select
                                name="product_model_id"
                                value={row.productModelId}
                                onChange={(event) =>
                                  updateRow(
                                    row.key,
                                    "productModelId",
                                    event.target.value
                                  )
                                }
                                className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm"
                                required
                              >
                                <option value="">모델 선택</option>
                                {productModels.map((model) => (
                                  <option key={model.id} value={model.id}>
                                    [{formatCategory(model.category)}]{" "}
                                    {model.model_name}
                                  </option>
                                ))}
                              </select>
                            </td>

                            <td className="px-4 py-3">
                              <select
                                name="product_variant_id"
                                value={row.productVariantId}
                                onChange={(event) =>
                                  updateRow(
                                    row.key,
                                    "productVariantId",
                                    event.target.value
                                  )
                                }
                                className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm"
                                required
                                disabled={!row.productModelId}
                              >
                                <option value="">
                                  {row.productModelId
                                    ? "맛/색상 선택"
                                    : "모델 먼저 선택"}
                                </option>

                                {filteredVariants.map((variant) => (
                                  <option key={variant.id} value={variant.id}>
                                    {variant.option_name}
                                  </option>
                                ))}
                              </select>
                            </td>

                            <td className="px-4 py-3">
                              <input
                                type="number"
                                name="quantity"
                                min={1}
                                value={row.quantity}
                                onChange={(event) =>
                                  updateRow(
                                    row.key,
                                    "quantity",
                                    event.target.value
                                  )
                                }
                                className="h-10 w-full rounded-lg border border-slate-300 px-3 text-sm"
                                placeholder="수량"
                                required
                              />

                              <input
                                type="hidden"
                                name="product_cost"
                                value="0"
                              />
                            </td>

                            <td className="px-4 py-3 text-slate-600">
                              {formatNumber(
                                result?.allocatedProductCost || 0
                              )}
                            </td>

                            <td className="px-4 py-3 text-slate-600">
                              {formatNumber(result?.allocatedExtraCost || 0)}
                            </td>

                            <td className="px-4 py-3 text-slate-600">
                              {formatNumber(result?.landedCostTotal || 0)}
                            </td>

                            <td className="px-4 py-3 font-bold text-slate-900">
                              {formatNumber(result?.landedCostUnit || 0)}
                            </td>

                            <td className="px-4 py-3">
                              <button
                                type="button"
                                onClick={() => removeRow(row.key)}
                                className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-50"
                              >
                                삭제
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              <div>
                <label className="mb-1 block text-sm font-semibold text-slate-700">
                  메모
                </label>
                <textarea
                  name="memo"
                  rows={3}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  placeholder="메모"
                />
              </div>

              <div className="flex justify-end gap-2 border-t border-slate-200 pt-4">
                <button
                  type="button"
                  onClick={closeModal}
                  className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                  disabled={isPending}
                >
                  취소
                </button>

                <button
                  type="submit"
                  className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700 disabled:opacity-50"
                  disabled={isPending}
                >
                  {isPending ? "저장 중..." : "저장"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </>
  );
}