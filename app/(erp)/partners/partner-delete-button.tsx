"use client";

import { useState, useTransition } from "react";
import { deletePartnerAction } from "./actions";

export function PartnerDeleteButton({
  partnerId,
  partnerName,
}: {
  partnerId: string;
  partnerName: string;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleDelete() {
    const formData = new FormData();
    formData.append("id", partnerId);

    startTransition(async () => {
      await deletePartnerAction(formData);
      setIsOpen(false);
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
              <h2 className="text-lg font-bold text-slate-900">
                거래처 삭제
              </h2>
              <p className="mt-2 text-sm text-slate-500">
                아래 거래처를 정말 삭제하시겠습니까?
              </p>
            </div>

            <div className="px-6 py-5">
              <div className="rounded-lg bg-red-50 p-4">
                <p className="text-sm font-semibold text-red-700">
                  {partnerName}
                </p>
                <p className="mt-2 text-sm text-red-600">
                  삭제하면 목록에서 사라지며, 다시 복구할 수 없습니다.
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