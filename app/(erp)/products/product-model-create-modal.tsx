"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { createProductWithVariantsAction } from "./actions";

type ProductCategory = "disposable" | "pod" | "device" | "liquid";

type OptionRow = {
  id: number;
};

export function ProductModelCreateModal() {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [category, setCategory] = useState<ProductCategory>("disposable");
  const [optionRows, setOptionRows] = useState<OptionRow[]>([{ id: 1 }]);

  const isDevice = category === "device";

  function closeModal() {
    setIsOpen(false);
  }

  function resetForm() {
    setCategory("disposable");
    setOptionRows([{ id: 1 }]);
  }

  function addOptionRow() {
    setOptionRows((prev) => [...prev, { id: Date.now() }]);
  }

  function removeOptionRow(id: number) {
    setOptionRows((prev) => {
      if (prev.length === 1) {
        return prev;
      }

      return prev.filter((row) => row.id !== id);
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="rounded-lg bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-slate-700"
      >
        제품 등록
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="max-h-[90vh] w-full max-w-6xl overflow-y-auto rounded-2xl bg-white shadow-xl">
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200 bg-white px-6 py-4">
              <div>
                <h2 className="text-xl font-bold text-slate-900">제품 등록</h2>
                <p className="mt-1 text-sm text-slate-500">
                  제품 구분과 모델명을 입력하고, 맛/색상을 여러 개 한 번에 등록합니다.
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
                await createProductWithVariantsAction(formData);
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

                <div className="mt-4 grid gap-4 md:grid-cols-2">
                  <div>
                    <label className="text-sm font-medium text-slate-700">
                      제품 구분
                    </label>
                    <select
                      name="category"
                      value={category}
                      onChange={(event) =>
                        setCategory(event.target.value as ProductCategory)
                      }
                      className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-900"
                    >
                      <option value="disposable">일회용기기</option>
                      <option value="pod">팟</option>
                      <option value="device">디바이스</option>
                      <option value="liquid">액상</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-sm font-medium text-slate-700">
                      모델명 <span className="text-red-500">*</span>
                    </label>
                    <input
                      name="model_name"
                      required
                      placeholder="예: VVILD 5000"
                      className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-900"
                    />
                  </div>
                </div>

                {!isDevice && (
                  <div className="mt-4">
                    <label className="text-sm font-medium text-slate-700">
                      니코틴함량
                    </label>
                    <input
                      name="nicotine_content"
                      placeholder="예: 0%, 2%, 5%, 9.8mg"
                      className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-900"
                    />
                  </div>
                )}

                {isDevice && (
                  <input type="hidden" name="nicotine_content" value="" />
                )}
              </div>

              <div className="rounded-xl border border-slate-200 bg-slate-50 p-5">
                <h3 className="text-base font-bold text-slate-900">
                  공통 가격
                </h3>
                <p className="mt-1 text-sm text-slate-500">
                  도착원가는 수입 건에서 자동 계산되며, 아래 가격은 직접 입력합니다.
                </p>

                <div className="mt-4 grid gap-4 md:grid-cols-5">
                  <PriceInput name="price_wholesale" label="공급가" />
<PriceInput name="price_retail" label="도매가" />
<PriceInput name="price_direct_store" label="직영점가" />
<PriceInput name="price_etc" label="판매가" />
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 bg-white p-5">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <h3 className="text-base font-bold text-slate-900">
                      {isDevice ? "색상 등록" : "맛 등록"}
                    </h3>
                    <p className="mt-1 text-sm text-slate-500">
                      {isDevice
                        ? "디바이스는 색상명만 여러 개 등록합니다."
                        : "맛 이름만 여러 개 등록합니다."}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={addOptionRow}
                    className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                  >
                    + {isDevice ? "색상 추가" : "맛 추가"}
                  </button>
                </div>

                <div className="mt-5 space-y-3">
                  {optionRows.map((row, index) => (
                    <div
                      key={row.id}
                      className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4 md:flex-row md:items-end"
                    >
                      <div className="flex-1">
                        <label className="text-sm font-medium text-slate-700">
                          {isDevice ? "색상" : "맛"} {index + 1}{" "}
                          <span className="text-red-500">*</span>
                        </label>
                        <input
                          name="option_name"
                          required
                          placeholder={isDevice ? "예: Black" : "예: Mint"}
                          className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-900"
                        />
                      </div>

                      <button
                        type="button"
                        onClick={() => removeOptionRow(row.id)}
                        className="rounded-lg border border-red-200 px-4 py-2 text-sm font-semibold text-red-600 hover:bg-red-50"
                      >
                        삭제
                      </button>
                    </div>
                  ))}
                </div>
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
                  제품 등록
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

function PriceInput({ name, label }: { name: string; label: string }) {
  return (
    <div>
      <label className="text-sm font-medium text-slate-700">{label}</label>
      <input
        name={name}
        type="number"
        placeholder="0"
        className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-900"
      />
    </div>
  );
}