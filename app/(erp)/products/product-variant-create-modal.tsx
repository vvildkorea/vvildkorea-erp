"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { createProductVariantAction } from "./actions";
import type { ProductCategory } from "@/lib/products";

export function ProductVariantCreateModal({
  productModelId,
  category,
  modelName,
}: {
  productModelId: string;
  category: ProductCategory;
  modelName: string;
}) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);

  const isDevice = category === "device";

  function closeModal() {
    setIsOpen(false);
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="rounded-lg bg-slate-900 px-3 py-2 text-sm font-semibold text-white hover:bg-slate-700"
      >
        옵션 추가
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="max-h-[90vh] w-full max-w-5xl overflow-y-auto rounded-2xl bg-white shadow-xl">
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200 bg-white px-6 py-4">
              <div>
                <h2 className="text-xl font-bold text-slate-900">
                  옵션 추가
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  {modelName} 옵션을 추가합니다.
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
                await createProductVariantAction(formData);
                closeModal();
                router.refresh();
              }}
              className="space-y-6 p-6"
            >
              <input
                type="hidden"
                name="product_model_id"
                value={productModelId}
              />

              <div className="grid gap-4 md:grid-cols-3">
                <div>
                  <label className="text-sm font-medium text-slate-700">
                    SKU
                  </label>
                  <input
                    name="sku"
                    placeholder="예: VVILD-5000-MINT-20"
                    className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-900"
                  />
                </div>

                {isDevice ? (
                  <div>
                    <label className="text-sm font-medium text-slate-700">
                      색상 <span className="text-red-500">*</span>
                    </label>
                    <input
                      name="color"
                      required
                      placeholder="예: Black"
                      className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-900"
                    />
                  </div>
                ) : (
                  <>
                    <div>
                      <label className="text-sm font-medium text-slate-700">
                        맛 <span className="text-red-500">*</span>
                      </label>
                      <input
                        name="flavor"
                        required
                        placeholder="예: Mint"
                        className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-900"
                      />
                    </div>

                    <div>
                      <label className="text-sm font-medium text-slate-700">
                        니코틴함량
                      </label>
                      <input
                        name="nicotine_content"
                        placeholder="예: 0%, 2%, 5%, 9.8mg"
                        className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-900"
                      />
                    </div>
                  </>
                )}
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                <div>
                  <label className="text-sm font-medium text-slate-700">
                    바코드
                  </label>
                  <input
                    name="barcode"
                    placeholder="바코드"
                    className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-900"
                  />
                </div>

                <div>
                  <label className="text-sm font-medium text-slate-700">
                    박스입수
                  </label>
                  <input
                    name="box_quantity"
                    type="number"
                    placeholder="예: 10"
                    className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-900"
                  />
                </div>

                <div>
                  <label className="text-sm font-medium text-slate-700">
                    옵션 메모
                  </label>
                  <input
                    name="variant_memo"
                    placeholder="옵션 관련 메모"
                    className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-900"
                  />
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 bg-slate-50 p-5">
                <h3 className="text-base font-bold text-slate-900">
                  거래처 구분별 가격
                </h3>

                <div className="mt-4 grid gap-4 md:grid-cols-5">
                  <PriceInput name="price_headquarters" label="판매처 가격" />
                  <PriceInput name="price_wholesale" label="도매점 가격" />
                  <PriceInput name="price_retail" label="소매점 가격" />
                  <PriceInput name="price_direct_store" label="직영점 가격" />
                  <PriceInput name="price_etc" label="기타 가격" />
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
                  옵션 추가
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