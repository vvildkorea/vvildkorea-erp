"use client";

import { useTransition } from "react";
import { deleteImportOrderAction } from "./actions";

type ImportOrderDeleteButtonProps = {
  importOrderId: string;
  poNumber: string;
};

export function ImportOrderDeleteButton({
  importOrderId,
  poNumber,
}: ImportOrderDeleteButtonProps) {
  const [isPending, startTransition] = useTransition();

  function handleDelete() {
    const confirmed = window.confirm(
      `${poNumber} 수입 건을 삭제하시겠습니까?\n\n삭제하면 해당 수입 건으로 생성된 재고 입고 이력도 함께 삭제됩니다.\n제품관리의 도착원가는 유지됩니다.`
    );

    if (!confirmed) {
      return;
    }

    const formData = new FormData();
    formData.append("import_order_id", importOrderId);

    startTransition(() => {
      void deleteImportOrderAction(formData);
    });
  }

  return (
    <button
      type="button"
      onClick={handleDelete}
      disabled={isPending}
      className="rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-sm font-semibold text-red-700 hover:bg-red-100 disabled:opacity-50"
    >
      {isPending ? "삭제 중..." : "삭제"}
    </button>
  );
}