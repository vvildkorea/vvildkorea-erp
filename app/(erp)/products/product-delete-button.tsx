"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import {
  deleteProductModelAction,
  deleteProductVariantAction,
} from "./actions";

export function ProductModelDeleteButton({
  productModelId,
  modelName,
}: {
  productModelId: string;
  modelName: string;
}) {
  return (
    <DeleteButton
      title="제품 모델 삭제"
      description="제품 모델을 삭제하면 하위 옵션과 가격 정보도 함께 삭제됩니다."
      itemName={modelName}
      action={deleteProductModelAction}
      id={productModelId}
    />
  );
}

export function ProductVariantDeleteButton({
  productVariantId,
  variantName,
}: {
  productVariantId: string;
  variantName: string;
}) {
  return (
    <DeleteButton
      title="제품 옵션 삭제"
      description="제품 옵션을 삭제하면 해당 옵션의 가격 정보도 함께 삭제됩니다."
      itemName={variantName}
      action={deleteProductVariantAction}
      id={productVariantId}
    />
  );
}

function DeleteButton({
  title,
  description,
  itemName,
  action,
  id,
}: {
  title: string;
  description: string;
  itemName: string;
  action: (formData: FormData) => Promise<void>;
  id: string;
}) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleDelete() {
    const formData = new FormData();
    formData.append("id", id);

    startTransition(() => {
      void action(formData).then(() => {
        setIsOpen(false);
        router.refresh();
      });
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="rounded-lg border border-red-200 px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50"
      >
        삭제
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white shadow-xl">
            <div className="border-b border-slate-200 px-6 py-4">
              <h2 className="text-lg font-bold text-slate-900">{title}</h2>
              <p className="mt-2 text-sm text-slate-500">{description}</p>
            </div>

            <div className="px-6 py-5">
              <div className="rounded-lg bg-red-50 p-4">
                <p className="text-sm font-semibold text-red-700">
                  {itemName}
                </p>
                <p className="mt-2 text-sm text-red-600">
                  삭제 후에는 복구할 수 없습니다.
                </p>
              </div>
            </div>

            <div className="flex justify-end gap-2 border-t border-slate-200 px-6 py-4">
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                disabled={isPending}
                className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
              >
                취소
              </button>

              <button
                type="button"
                onClick={handleDelete}
                disabled={isPending}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50"
              >
                {isPending ? "삭제 중..." : "삭제하기"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}