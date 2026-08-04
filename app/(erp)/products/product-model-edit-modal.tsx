"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { updateProductModelAction } from "./actions";
import type {
  PricePartnerType,
  ProductModel,
  ProductVariant,
} from "@/lib/products";

type ProductModelEditModalProps = {
  model: ProductModel;
};

const categoryLabels = {
  disposable: "일회용기기",
  pod: "팟",
  device: "디바이스",
  liquid: "액상",
} as const;

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

function getCommonPrice(
  variants: ProductVariant[],
  partnerType: PricePartnerType,
) {
  if (variants.length === 0) {
    return "";
  }

  const prices = variants.map((variant) =>
    getVariantPrice(variant, partnerType),
  );

  const firstPrice = prices[0];

  if (firstPrice === null || firstPrice === undefined) {
    return "";
  }

  const isSamePrice = prices.every((price) => price === firstPrice);

  return isSamePrice ? String(firstPrice) : "";
}

export function ProductModelEditModal({
  model,
}: ProductModelEditModalProps) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const variants = model.product_variants || [];

  const commonPrices = useMemo(
    () => ({
      wholesale: getCommonPrice(variants, "wholesale"),
      retail: getCommonPrice(variants, "retail"),
      direct_store: getCommonPrice(variants, "direct_store"),
      etc: getCommonPrice(variants, "etc"),
    }),
    [variants],
  );

  async function handleSubmit(formData: FormData) {
    setIsSaving(true);

    try {
      await updateProductModelAction(formData);
      alert("제품 모델 정보가 수정되었습니다.");
      setIsOpen(false);
      router.refresh();
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "제품 모델 수정 중 오류가 발생했습니다.";

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
        모델 수정
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-2xl bg-white shadow-xl">
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200 bg-white px-6 py-4">
              <div>
                <h2 className="text-xl font-bold text-slate-900">
                  제품 모델 수정
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  모델 기본 정보와 전체 옵션의 공통 가격을 수정합니다.
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
              <input type="hidden" name="id" value={model.id} />
              <input type="hidden" name="category" value={model.category} />

              <div className="rounded-xl border border-slate-200 p-5">
                <h3 className="font-bold text-slate-900">기본 정보</h3>

                <div className="mt-4 grid gap-4 md:grid-cols-2">
                  <Field label="제품 구분">
                    <input
                      value={categoryLabels[model.category]}
                      readOnly
                      className="mt-2 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-500"
                    />
                  </Field>

                  <Field label="모델명" required>
                    <input
                      name="model_name"
                      defaultValue={model.model_name}
                      required
                      className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-900"
                    />
                  </Field>

                  <Field label="브랜드">
                    <input
                      name="brand"
                      defaultValue={model.brand || ""}
                      className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-900"
                    />
                  </Field>

                  <Field label="영문명">
                    <input
                      name="english_name"
                      defaultValue={model.english_name || ""}
                      className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-900"
                    />
                  </Field>

                  <Field label="원산지">
                    <input
                      name="origin_country"
                      defaultValue={model.origin_country || ""}
                      className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-900"
                    />
                  </Field>

                  <Field label="규격">
                    <input
                      name="specification"
                      defaultValue={model.specification || ""}
                      className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-900"
                    />
                  </Field>

                  <Field label="단위">
                    <input
                      name="unit"
                      defaultValue={model.unit || "ea"}
                      className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-900"
                    />
                  </Field>

                  <Field label="HS CODE">
                    <input
                      name="hs_code"
                      defaultValue={model.hs_code || ""}
                      className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-900"
                    />
                  </Field>
                </div>

                <div className="mt-4">
                  <Field label="메모">
                    <textarea
                      name="memo"
                      defaultValue={model.memo || ""}
                      rows={4}
                      className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-900"
                    />
                  </Field>
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 bg-slate-50 p-5">
                <h3 className="font-bold text-slate-900">
                  전체 옵션 공통 가격 수정
                </h3>
                <p className="mt-1 text-sm leading-6 text-slate-500">
                  입력한 가격은 이 모델의 모든 맛·색상에 적용됩니다. 가격이
                  옵션마다 다르면 빈칸으로 표시되며, 빈칸으로 저장하면 기존
                  가격을 유지합니다. 도착원가는 수입 건에서 자동 계산됩니다.
                </p>

                <div className="mt-4 grid gap-4 md:grid-cols-4">
                  <PriceInput
                    name="price_wholesale"
                    label="공급가"
                    defaultValue={commonPrices.wholesale}
                  />
                  <PriceInput
                    name="price_retail"
                    label="도매가"
                    defaultValue={commonPrices.retail}
                  />
                  <PriceInput
                    name="price_direct_store"
                    label="직영점가"
                    defaultValue={commonPrices.direct_store}
                  />
                  <PriceInput
                    name="price_etc"
                    label="판매가"
                    defaultValue={commonPrices.etc}
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
  defaultValue,
}: {
  name: string;
  label: string;
  defaultValue: string;
}) {
  return (
    <label className="block">
      <span className="text-sm font-medium text-slate-700">{label}</span>
      <input
        name={name}
        type="number"
        min="0"
        step="1"
        defaultValue={defaultValue}
        placeholder="변경하지 않음"
        className="mt-2 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-slate-900"
      />
    </label>
  );
}