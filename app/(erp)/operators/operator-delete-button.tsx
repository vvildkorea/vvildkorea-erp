"use client";

import { useFormStatus } from "react-dom";
import { deleteOperator } from "./actions";

type OperatorDeleteButtonProps = {
  operatorId: string;
  operatorName: string;
  disabled: boolean;
  disabledReason?: string;
};

export default function OperatorDeleteButton({
  operatorId,
  operatorName,
  disabled,
  disabledReason,
}: OperatorDeleteButtonProps) {
  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    if (disabled) {
      event.preventDefault();
      return;
    }

    const confirmed = window.confirm(
      `${operatorName} 운영자를 삭제하시겠습니까?\n\n` +
        "ERP 운영자 목록에서 삭제되며 이 작업은 되돌릴 수 없습니다.\n" +
        "Clerk 로그인 계정 자체는 삭제되지 않습니다.",
    );

    if (!confirmed) {
      event.preventDefault();
    }
  }

  return (
    <form
      action={deleteOperator}
      onSubmit={handleSubmit}
      className="w-full lg:w-auto"
    >
      <input type="hidden" name="operatorId" value={operatorId} />

      <DeleteSubmitButton
        disabled={disabled}
        disabledReason={disabledReason}
      />
    </form>
  );
}

function DeleteSubmitButton({
  disabled,
  disabledReason,
}: {
  disabled: boolean;
  disabledReason?: string;
}) {
  const { pending } = useFormStatus();

  const isDisabled = disabled || pending;

  return (
    <button
      type="submit"
      disabled={isDisabled}
      title={disabled ? disabledReason : "운영자 삭제"}
      className="h-11 w-full rounded-xl border border-red-200 bg-white px-5 text-sm font-bold text-red-600 shadow-sm transition hover:bg-red-50 disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-100 disabled:text-slate-400 lg:w-auto"
    >
      {pending ? "삭제 중..." : "삭제"}
    </button>
  );
}