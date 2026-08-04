"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { updateProductVariantAction } from "./actions";
import type {
  PricePartnerType,
  ProductCategory,
  ProductVariant,
} from "@/lib/products";

type ProductVariantEditModalProps = {
  variant: ProductVariant;
  category: ProductCategory;
  modelName: string;
};

function getVariantPrice(
  variant: ProductVariant,
  partnerType: PricePartnerType,
) {
  return (
    variant.product_variant_prices?.find(
      (price) => price.partner_type === partnerType,
    )?.price ?? null
  );
}

function formatNumber(value: number | null | undefined) {
  if (value === null || value === undefined) {
    return "-";
  }

  return Number(value).toLocaleString("ko-KR");
}

export function ProductVariantEditModal({
  variant,
  category,
  modelName,
}: ProductVariantEditModalProps) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const isDevice = category === "device";
  const optionName = isDevice ? variant.color || "" : variant.flavor || "";
  const headquartersPrice = getVariantPrice(variant, "headquarters");

  async function handleSubmit(formData: FormData) {
    setIsSaving(true);

    try {
      await updateProductVariantAction(formData);
      alert("제품 옵션과 가격이 수정되었습니다.");
      setIsOpen(false);
      router.refresh();
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "제품 옵션 수정 중 오류가 발생했습니다.";

      alert(message);
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="rounded-lg border border-blue-200 px-3 py-2 text-sm font-medium text-blue-700 hover:bg-blue-50"
      >
        수정
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-white shadow-xl">
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200 bg-white px-6 py-4">
              <div>
                <h2 className="text-xl font-bold text-slate-900">
                  제품 옵션 수정
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  {modelName}의 {isDevice ? "색상" : "맛"}과 가격을 수정합니다.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setIsOpen(false)}
                disabled={isSaving}
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-600 disabled:opacity-50"
              >
                닫기
              </button>
            </div>

            <form action={handleSubmit} className="space-y-6 p-6">
              <input type="hidden" name="id" value={variant.id} />
              <input type="hidden" name="category" value={category} />

              <div className="rounded-xl border border-slate-200 p-5">
                <h3 className="font-bold text-slate-900">옵션 정보</h3>

                <div className="mt-4 grid gap-4 md:grid-cols-2">
                  <Field label={isDevice ? "색상명" : "맛 이름"} required>
                    <input
                      name="option_name"
                      defaultValue={optionName}
                      required
                      className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-900"
                    />
                  </Field>

                  {!isDevice ? (
                    <Field label="니코틴 함량">
                      <input
                        name="nicotine_content"
                        defaultValue={variant.nicotine_content || ""}
                        placeholder="예: 0%, 2%, 5%, 9.8mg"
                        className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-900"
                      />
                    </Field>
                  ) : (
                    <input
                      type="hidden"
                      name="nicotine_content"
                      value=""
                    />
                  )}

                  <Field label="SKU">
                    <input
                      name="sku"
                      defaultValue={variant.sku || ""}
                      className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-900"
                    />
                  </Field>

                  <Field label="바코드">
                    <input
                      name="barcode"
                      defaultValue={variant.barcode || ""}
                      className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-900"
                    />
                  </Field>

                  <Field label="박스 입수">
                    <input
                      name="box_quantity"
                      type="number"
                      min="0"
                      step="1"
                      defaultValue={variant.box_quantity ?? ""}
                      className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-900"
                    />
                  </Field>
                </div>

                <div className="mt-4">
                  <Field label="옵션 메모">
                    <textarea
                      name="variant_memo"
                      defaultValue={variant.memo || ""}
                      rows={3}
                      className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-900"
                    />
                  </Field>
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 bg-slate-50 p-5">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h3 className="font-bold text-slate-900">가격 수정</h3>
                    <p className="mt-1 text-sm text-slate-500">
                      이 맛·색상에 적용되는 가격만 수정합니다.
                    </p>
                  </div>

                  <div className="rounded-lg bg-white px-4 py-2 text-sm shadow-sm">
                    <span className="text-slate-500">도착원가 </span>
                    <span className="font-bold text-slate-900">
                      {formatNumber(headquartersPrice)}원
                    </span>
                  </div>
                </div>

                <p className="mt-3 text-xs leading-5 text-slate-500">
                  도착원가는 수입/포워딩에서 자동 반영되므로 여기서는 수정할
                  수 없습니다.
                </p>

                <div className="mt-4 grid gap-4 md:grid-cols-4">
                  <PriceInput
                    name="price_wholesale"
                    label="공급가"
                    value={getVariantPrice(variant, "wholesale")}
                  />
                  <PriceInput
                    name="price_retail"
                    label="도매가"
                    value={getVariantPrice(variant, "retail")}
                  />
                  <PriceInput
                    name="price_direct_store"
                    label="직영점가"
                    value={getVariantPrice(variant, "direct_store")}
                  />
                  <PriceInput
                    name="price_etc"
                    label="판매가"
                    value={getVariantPrice(variant, "etc")}
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 border-t border-slate-200 pt-5">
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  disabled={isSaving}
                  className="rounded-lg border border-slate-300 px-5 py-2.5 text-sm font-semibold text-slate-700 disabled:opacity-50"
                >
                  취소
                </button>

                <button
                  type="submit"
                  disabled={isSaving}
                  className="rounded-lg bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
                >
                  {isSaving ? "저장 중..." : "수정 저장"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="text-sm font-medium text-slate-700">
        {label}
        {required ? <span className="text-red-500"> *</span> : null}
      </span>
      {children}
    </label>
  );
}

function PriceInput({
  name,
  label,
  value,
}: {
  name: string;
  label: string;
  value: number | null;
}) {
  return (
    <label className="block">
      <span className="text-sm font-medium text-slate-700">{label}</span>
      <input
        name={name}
        type="number"
        min="0"
        step="1"
        defaultValue={value ?? ""}
        placeholder="0"
        className="mt-2 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-slate-900"
      />
    </label>
  );
}