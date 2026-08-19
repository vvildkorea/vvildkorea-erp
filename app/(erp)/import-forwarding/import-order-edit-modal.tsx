"use client";

import { FormEvent, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateImportOrderAction } from "./actions";

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

type ImportOrderItemForEdit = {
  id: string;
  product_model_id: string;
  product_variant_id: string | null;
  quantity: number;
};

type ImportOrderForEdit = {
  id: string;
  po_number: string;
  supplier_name: string | null;
  import_date: string | null;
  product_cost_total: number;
  duty_amount: number;
  vat_amount: number;
  freight_amount: number;
  customs_broker_fee: number;
  tobacco_tax_amount: number;
  memo: string | null;
  import_order_items?: ImportOrderItemForEdit[];
};

type ImportOrderEditModalProps = {
  order: ImportOrderForEdit;
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

function createRowKey() {
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function buildRows(order: ImportOrderForEdit): ItemRow[] {
  const items = order.import_order_items || [];

  if (items.length === 0) {
    return [
      {
        key: createRowKey(),
        productModelId: "",
        productVariantId: "",
        quantity: "",
      },
    ];
  }

  return items.map((item) => ({
    key: item.id || createRowKey(),
    productModelId: String(item.product_model_id || ""),
    productVariantId: String(item.product_variant_id || ""),
    quantity: String(item.quantity || ""),
  }));
}

export function ImportOrderEditModal({
  order,
  productModels,
  productVariants,
}: ImportOrderEditModalProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [rows, setRows] = useState<ItemRow[]>(() => buildRows(order));
  const [errorMessage, setErrorMessage] = useState("");
  const [isPending, startTransition] = useTransition();

  const [poNumber, setPoNumber] = useState(order.po_number || "");
  const [supplierName, setSupplierName] = useState(order.supplier_name || "");
  const [importDate, setImportDate] = useState(order.import_date || "");
  const [productCostTotal, setProductCostTotal] = useState(
    String(order.product_cost_total || ""),
  );
  const [dutyAmount, setDutyAmount] = useState(String(order.duty_amount || ""));
  const [vatAmount, setVatAmount] = useState(String(order.vat_amount || ""));
  const [freightAmount, setFreightAmount] = useState(
    String(order.freight_amount || ""),
  );
  const [customsBrokerFee, setCustomsBrokerFee] = useState(
    String(order.customs_broker_fee || ""),
  );
  const [tobaccoTaxAmount, setTobaccoTaxAmount] = useState(
    String(order.tobacco_tax_amount || ""),
  );
  const [memo, setMemo] = useState(order.memo || "");

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
          row.quantityNumber > 0,
      );

    const totalQuantity = validRows.reduce(
      (sum, row) => sum + row.quantityNumber,
      0,
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

  function resetFromOrder() {
    setRows(buildRows(order));
    setPoNumber(order.po_number || "");
    setSupplierName(order.supplier_name || "");
    setImportDate(order.import_date || "");
    setProductCostTotal(String(order.product_cost_total || ""));
    setDutyAmount(String(order.duty_amount || ""));
    setVatAmount(String(order.vat_amount || ""));
    setFreightAmount(String(order.freight_amount || ""));
    setCustomsBrokerFee(String(order.customs_broker_fee || ""));
    setTobaccoTaxAmount(String(order.tobacco_tax_amount || ""));
    setMemo(order.memo || "");
    setErrorMessage("");
  }

  function openModal() {
    resetFromOrder();
    setOpen(true);
  }

  function closeModal() {
    if (isPending) return;
    setOpen(false);
    setErrorMessage("");
  }

  function addRow() {
    setRows((prev) => [
      ...prev,
      {
        key: createRowKey(),
        productModelId: "",
        productVariantId: "",
        quantity: "",
      },
    ]);
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
    value: string,
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
      }),
    );
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const formData = new FormData(event.currentTarget);

    setErrorMessage("");

    startTransition(() => {
      void (async () => {
        try {
          await updateImportOrderAction(formData);
          setOpen(false);
          router.refresh();
        } catch (error) {
          const message =
            error instanceof Error
              ? error.message
              : "수입 건 수정 중 오류가 발생했습니다.";

          setErrorMessage(message);
        }
      })();
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={openModal}
        className="rounded-lg border border-blue-200 px-3 py-2 text-sm font-semibold text-blue-700 hover:bg-blue-50"
      >
        수정
      </button>

      {open ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="max-h-[92vh] w-full max-w-7xl overflow-y-auto rounded-2xl bg-white shadow-xl">
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200 bg-white px-6 py-4">
              <div>
                <h2 className="text-lg font-bold text-slate-900">
                  수입 건 수정
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  금액이나 수량을 수정하면 도착원가와 해당 수입 건의 재고 입고 이력이 다시 계산됩니다.
                </p>
              </div>

              <button
                type="button"
                onClick={closeModal}
                className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                disabled={isPending}
              >
                닫기
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6 p-6">
              <input type="hidden" name="import_order_id" value={order.id} />

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
                    value={poNumber}
                    onChange={(event) => setPoNumber(event.target.value)}
                    className="h-10 w-full rounded-lg border border-slate-300 px-3 text-sm"
                    required
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm font-semibold text-slate-700">
                    공급업체
                  </label>
                  <input
                    name="supplier_name"
                    value={supplierName}
                    onChange={(event) => setSupplierName(event.target.value)}
                    className="h-10 w-full rounded-lg border border-slate-300 px-3 text-sm"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm font-semibold text-slate-700">
                    수입일자
                  </label>
                  <input
                    type="date"
                    name="import_date"
                    value={importDate}
                    onChange={(event) => setImportDate(event.target.value)}
                    className="h-10 w-full rounded-lg border border-slate-300 px-3 text-sm"
                  />
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 p-4">
                <h3 className="font-bold text-slate-900">비용 수정</h3>

                <div className="mt-4 grid gap-4 md:grid-cols-3">
                  <AmountInput
                    name="product_cost_total"
                    label="물건 원가 총액"
                    value={productCostTotal}
                    onChange={setProductCostTotal}
                  />
                  <AmountInput
                    name="duty_amount"
                    label="관세"
                    value={dutyAmount}
                    onChange={setDutyAmount}
                  />
                  <AmountInput
                    name="vat_amount"
                    label="부가세"
                    value={vatAmount}
                    onChange={setVatAmount}
                  />
                  <AmountInput
                    name="freight_amount"
                    label="운송비"
                    value={freightAmount}
                    onChange={setFreightAmount}
                  />
                  <AmountInput
                    name="customs_broker_fee"
                    label="관세사 비용"
                    value={customsBrokerFee}
                    onChange={setCustomsBrokerFee}
                  />
                  <AmountInput
                    name="tobacco_tax_amount"
                    label="담배별 세금"
                    value={tobaccoTaxAmount}
                    onChange={setTobaccoTaxAmount}
                  />
                </div>

                <div className="mt-4 grid gap-3 md:grid-cols-4">
                  <SummaryBox
                    label="총 수량"
                    value={formatNumber(calculated.totalQuantity)}
                  />
                  <SummaryBox
                    label="물건 원가 총액"
                    value={formatNumber(calculated.finalProductCostTotal)}
                  />
                  <SummaryBox
                    label="부대비용 합계"
                    value={formatNumber(calculated.extraCostTotal)}
                  />
                  <SummaryBox
                    label="총 도착금액"
                    value={formatNumber(calculated.totalCost)}
                  />
                </div>
              </div>

              <div className="rounded-xl border border-slate-200">
                <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
                  <div>
                    <h3 className="font-bold text-slate-900">수입 품목</h3>
                    <p className="mt-1 text-sm text-slate-500">
                      품목과 수량도 잘못 등록한 경우 함께 수정할 수 있습니다.
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
                        <th className="px-4 py-3 font-medium">배부 물건원가</th>
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
                          (item) => item.key === row.key,
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
                                    event.target.value,
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
                                    event.target.value,
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
                                    event.target.value,
                                  )
                                }
                                className="h-10 w-full rounded-lg border border-slate-300 px-3 text-sm"
                                required
                              />

                              <input type="hidden" name="product_cost" value="0" />
                            </td>

                            <td className="px-4 py-3 text-slate-600">
                              {formatNumber(result?.allocatedProductCost || 0)}
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
                  value={memo}
                  onChange={(event) => setMemo(event.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                />
              </div>

              <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
                수정 저장 시 이 수입 건에서 만들어진 기존 재고 입고 이력을 제거한 뒤 수정된 수량으로 다시 생성합니다. 따라서 같은 수입 건의 재고가 중복으로 더해지지 않습니다.
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
                  {isPending ? "수정 중..." : "수정 저장"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </>
  );
}

function AmountInput({
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
      <label className="mb-1 block text-sm font-semibold text-slate-700">
        {label}
      </label>
      <input
        type="number"
        name={name}
        min={0}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-10 w-full rounded-lg border border-slate-300 px-3 text-sm"
        placeholder="0"
      />
    </div>
  );
}

function SummaryBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-slate-50 p-3">
      <p className="text-xs text-slate-500">{label}</p>
      <p className="mt-1 font-bold text-slate-900">{value}</p>
    </div>
  );
}