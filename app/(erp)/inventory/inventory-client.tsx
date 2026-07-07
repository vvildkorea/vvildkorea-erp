"use client";

import { useMemo, useState } from "react";
import {
  createBulkInventoryInMovements,
  createInventoryMovement,
  updateInventoryMovement,
} from "./actions";

type InventoryRow = {
  productVariantId: string;
  categoryLabel: string;
  modelName: string;
  optionName: string;
  baseQuantity: number;
  actualQuantity: number;
  outboundQuantity: number;
  stockRate: number;
};

type MovementRow = {
  id: string;
  createdAt: string | null;
  productLabel: string;
  optionName: string;
  movementType: string | null;
  quantity: number;
  memo: string | null;
  orderId: string | null;
  importOrderId: string | null;
  editable: boolean;
};

type InventoryClientProps = {
  rows: InventoryRow[];
  movements: MovementRow[];
};

function formatNumber(value: number | null | undefined) {
  return new Intl.NumberFormat("ko-KR").format(Number(value || 0));
}

function formatPercent(value: number | null | undefined) {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return "-";
  }

  return `${Number(value).toFixed(1)}%`;
}

function formatDate(value: string | null | undefined) {
  if (!value) return "-";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  return date.toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
}

function getMovementLabel(type: string | null | undefined, quantity?: number) {
  if (type === "adjustment" && Number(quantity || 0) < 0) {
    return "재고차감";
  }

  if (type === "adjustment" && Number(quantity || 0) > 0) {
    return "재고증가";
  }

  const labels: Record<string, string> = {
    in: "입고",
    out: "주문출고",
    sample_out: "샘플출고",
    adjustment: "재고조정",
    return: "반품입고",
  };

  return labels[type || ""] || "-";
}

function getMovementActionValue(type: string | null | undefined, quantity: number) {
  if (type === "in") return "in";
  if (type === "return") return "return";
  if (type === "adjustment" && quantity < 0) return "adjustment_out";
  if (type === "adjustment") return "adjustment_in";

  return "in";
}

function getActualQuantityClass(quantity: number) {
  if (quantity < 0) return "text-red-600";
  if (quantity === 0) return "text-yellow-600";
  return "text-gray-900";
}

function getStockRateClass(rate: number, baseQuantity: number) {
  if (baseQuantity <= 0) return "text-gray-400";
  if (rate <= 0) return "text-red-600";
  if (rate <= 20) return "text-yellow-600";
  return "text-emerald-700";
}

function getSourceLabel(movement: MovementRow) {
  if (movement.orderId) return "주문 자동";
  if (movement.importOrderId) return "수입 자동";
  return "수동 입력";
}

export default function InventoryClient({
  rows,
  movements,
}: InventoryClientProps) {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const allRowIds = useMemo(
    () => rows.map((row) => row.productVariantId),
    [rows]
  );

  const isAllSelected = rows.length > 0 && selectedIds.length === rows.length;

  function toggleAll() {
    if (isAllSelected) {
      setSelectedIds([]);
      return;
    }

    setSelectedIds(allRowIds);
  }

  function toggleOne(productVariantId: string) {
    setSelectedIds((prev) => {
      if (prev.includes(productVariantId)) {
        return prev.filter((id) => id !== productVariantId);
      }

      return [...prev, productVariantId];
    });
  }

  return (
    <div className="space-y-6">
      <form
        action={createBulkInventoryInMovements}
        className="rounded-xl border bg-white p-4 shadow-sm"
      >
        {selectedIds.map((id) => (
          <input
            key={id}
            type="hidden"
            name="productVariantIds"
            value={id}
          />
        ))}

        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <h2 className="text-base font-semibold text-gray-900">
              선택항목 일괄 입고등록
            </h2>
            <p className="mt-1 text-sm text-gray-500">
              체크한 항목에 동일한 입고 수량을 한 번에 반영합니다.
            </p>
            <p className="mt-1 text-xs text-gray-400">
              현재 선택된 항목: {formatNumber(selectedIds.length)}개
            </p>
          </div>

          <div className="flex flex-wrap items-end gap-2">
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-600">
                일괄 입고 수량
              </label>
              <input
                type="number"
                name="bulkQuantity"
                min={1}
                placeholder="수량"
                className="h-9 w-28 rounded-md border border-gray-300 px-2 text-sm"
                required
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-gray-600">
                메모
              </label>
              <input
                type="text"
                name="bulkMemo"
                placeholder="예: 7월 입고"
                className="h-9 w-48 rounded-md border border-gray-300 px-2 text-sm"
              />
            </div>

            <button
              type="submit"
              className="h-9 rounded-md bg-blue-600 px-4 text-sm font-semibold text-white hover:bg-blue-700"
            >
              선택항목 일괄 입고
            </button>
          </div>
        </div>
      </form>

      <div className="overflow-hidden rounded-xl border bg-white shadow-sm">
        <div className="border-b px-5 py-4">
          <h2 className="text-base font-semibold text-gray-900">재고 테이블</h2>
          <p className="mt-1 text-sm text-gray-500">
            현재재고, 실재고, 출고수량, 재고율을 기준으로 확인합니다.
          </p>
        </div>

        {rows.length === 0 ? (
          <div className="px-5 py-12 text-center text-sm text-gray-500">
            등록된 제품 옵션이 없습니다.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="whitespace-nowrap px-4 py-3 text-center font-semibold text-gray-600">
                    <label className="inline-flex cursor-pointer items-center gap-2">
                      <input
                        type="checkbox"
                        checked={isAllSelected}
                        onChange={toggleAll}
                        className="h-4 w-4 rounded border-gray-300"
                      />
                      전체선택
                    </label>
                  </th>
                  <th className="whitespace-nowrap px-4 py-3 text-left font-semibold text-gray-600">
                    카테고리
                  </th>
                  <th className="whitespace-nowrap px-4 py-3 text-left font-semibold text-gray-600">
                    모델명
                  </th>
                  <th className="whitespace-nowrap px-4 py-3 text-left font-semibold text-gray-600">
                    맛/색상
                  </th>
                  <th className="whitespace-nowrap px-4 py-3 text-right font-semibold text-gray-600">
                    현재재고
                  </th>
                  <th className="whitespace-nowrap px-4 py-3 text-right font-semibold text-gray-600">
                    실재고
                  </th>
                  <th className="whitespace-nowrap px-4 py-3 text-right font-semibold text-gray-600">
                    출고수량
                  </th>
                  <th className="whitespace-nowrap px-4 py-3 text-right font-semibold text-gray-600">
                    재고율
                  </th>
                  <th className="whitespace-nowrap px-4 py-3 text-left font-semibold text-gray-600">
                    개별재고반영
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-gray-100 bg-white">
                {rows.map((row) => (
                  <tr key={row.productVariantId} className="hover:bg-gray-50">
                    <td className="whitespace-nowrap px-4 py-3 text-center">
                      <input
                        type="checkbox"
                        checked={selectedIds.includes(row.productVariantId)}
                        onChange={() => toggleOne(row.productVariantId)}
                        className="h-4 w-4 rounded border-gray-300"
                      />
                    </td>

                    <td className="whitespace-nowrap px-4 py-3 text-gray-700">
                      {row.categoryLabel}
                    </td>

                    <td className="whitespace-nowrap px-4 py-3 font-medium text-gray-900">
                      {row.modelName}
                    </td>

                    <td className="whitespace-nowrap px-4 py-3 text-gray-700">
                      {row.optionName}
                    </td>

                    <td className="whitespace-nowrap px-4 py-3 text-right font-semibold text-gray-900">
                      {formatNumber(row.baseQuantity)}
                    </td>

                    <td
                      className={`whitespace-nowrap px-4 py-3 text-right font-semibold ${getActualQuantityClass(
                        row.actualQuantity
                      )}`}
                    >
                      {formatNumber(row.actualQuantity)}
                    </td>

                    <td className="whitespace-nowrap px-4 py-3 text-right font-semibold text-gray-900">
                      {formatNumber(row.outboundQuantity)}
                    </td>

                    <td
                      className={`whitespace-nowrap px-4 py-3 text-right font-semibold ${getStockRateClass(
                        row.stockRate,
                        row.baseQuantity
                      )}`}
                    >
                      {row.baseQuantity <= 0
                        ? "-"
                        : formatPercent(row.stockRate)}
                    </td>

                    <td className="min-w-[460px] px-4 py-3">
                      <form
                        action={createInventoryMovement}
                        className="flex items-center gap-2"
                      >
                        <input
                          type="hidden"
                          name="productVariantId"
                          value={row.productVariantId}
                        />

                        <select
                          name="movementType"
                          defaultValue="in"
                          className="h-9 rounded-md border border-gray-300 bg-white px-2 text-sm"
                        >
                          <option value="in">입고</option>
                          <option value="return">반품입고</option>
                          <option value="adjustment_in">재고증가</option>
                          <option value="adjustment_out">재고차감</option>
                        </select>

                        <input
                          type="number"
                          name="quantity"
                          min={1}
                          placeholder="수량"
                          className="h-9 w-24 rounded-md border border-gray-300 px-2 text-sm"
                          required
                        />

                        <input
                          type="text"
                          name="memo"
                          placeholder="메모"
                          className="h-9 w-36 rounded-md border border-gray-300 px-2 text-sm"
                        />

                        <button
                          type="submit"
                          className="h-9 rounded-md bg-gray-900 px-3 text-sm font-semibold text-white hover:bg-gray-700"
                        >
                          반영
                        </button>
                      </form>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="overflow-hidden rounded-xl border bg-white shadow-sm">
        <div className="border-b px-5 py-4">
          <h2 className="text-base font-semibold text-gray-900">
            최근 재고 이력
          </h2>
          <p className="mt-1 text-sm text-gray-500">
            수동 입력한 입고, 반품입고, 재고증가, 재고차감 이력은 수량을
            수정할 수 있습니다.
          </p>
        </div>

        {movements.length === 0 ? (
          <div className="px-5 py-10 text-center text-sm text-gray-500">
            재고 이력이 없습니다.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="whitespace-nowrap px-4 py-3 text-left font-semibold text-gray-600">
                    일자
                  </th>
                  <th className="whitespace-nowrap px-4 py-3 text-left font-semibold text-gray-600">
                    제품
                  </th>
                  <th className="whitespace-nowrap px-4 py-3 text-left font-semibold text-gray-600">
                    맛/색상
                  </th>
                  <th className="whitespace-nowrap px-4 py-3 text-left font-semibold text-gray-600">
                    출처
                  </th>
                  <th className="whitespace-nowrap px-4 py-3 text-left font-semibold text-gray-600">
                    구분
                  </th>
                  <th className="whitespace-nowrap px-4 py-3 text-right font-semibold text-gray-600">
                    수량
                  </th>
                  <th className="whitespace-nowrap px-4 py-3 text-left font-semibold text-gray-600">
                    메모
                  </th>
                  <th className="whitespace-nowrap px-4 py-3 text-left font-semibold text-gray-600">
                    수정
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-gray-100 bg-white">
                {movements.slice(0, 80).map((movement) => (
                  <tr key={movement.id} className="hover:bg-gray-50">
                    <td className="whitespace-nowrap px-4 py-3 text-gray-700">
                      {formatDate(movement.createdAt)}
                    </td>

                    <td className="whitespace-nowrap px-4 py-3 text-gray-700">
                      {movement.productLabel}
                    </td>

                    <td className="whitespace-nowrap px-4 py-3 text-gray-700">
                      {movement.optionName}
                    </td>

                    <td className="whitespace-nowrap px-4 py-3 text-gray-700">
                      {getSourceLabel(movement)}
                    </td>

                    <td className="whitespace-nowrap px-4 py-3 text-gray-700">
                      {getMovementLabel(
                        movement.movementType,
                        movement.quantity
                      )}
                    </td>

                    <td className="whitespace-nowrap px-4 py-3 text-right font-semibold text-gray-900">
                      {formatNumber(movement.quantity)}
                    </td>

                    <td className="whitespace-nowrap px-4 py-3 text-gray-700">
                      {movement.memo || "-"}
                    </td>

                    <td className="min-w-[430px] px-4 py-3">
                      {movement.editable ? (
                        <form
                          action={updateInventoryMovement}
                          className="flex items-center gap-2"
                        >
                          <input
                            type="hidden"
                            name="movementId"
                            value={movement.id}
                          />

                          <select
                            name="movementType"
                            defaultValue={getMovementActionValue(
                              movement.movementType,
                              movement.quantity
                            )}
                            className="h-9 rounded-md border border-gray-300 bg-white px-2 text-sm"
                          >
                            <option value="in">입고</option>
                            <option value="return">반품입고</option>
                            <option value="adjustment_in">재고증가</option>
                            <option value="adjustment_out">재고차감</option>
                          </select>

                          <input
                            type="number"
                            name="quantity"
                            min={1}
                            defaultValue={Math.abs(movement.quantity)}
                            className="h-9 w-24 rounded-md border border-gray-300 px-2 text-sm"
                            required
                          />

                          <input
                            type="text"
                            name="memo"
                            defaultValue={movement.memo || ""}
                            className="h-9 w-36 rounded-md border border-gray-300 px-2 text-sm"
                            placeholder="메모"
                          />

                          <button
                            type="submit"
                            className="h-9 rounded-md bg-slate-700 px-3 text-sm font-semibold text-white hover:bg-slate-900"
                          >
                            수정
                          </button>
                        </form>
                      ) : (
                        <span className="text-xs text-gray-400">
                          자동 생성 이력
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}