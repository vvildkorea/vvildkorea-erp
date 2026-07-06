"use client";

import { useState } from "react";
import { createPartnerAction } from "./actions";

export function PartnerCreateModal() {
  const [isOpen, setIsOpen] = useState(false);

  function closeModal() {
    setIsOpen(false);
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="rounded-lg bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-slate-700"
      >
        거래처 등록
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="max-h-[90vh] w-full max-w-6xl overflow-y-auto rounded-2xl bg-white shadow-xl">
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200 bg-white px-6 py-4">
              <div>
                <h2 className="text-xl font-bold text-slate-900">
                  거래처 등록
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  판매처, 매입처, 포워딩 업체, 물류/창고 업체를 등록합니다.
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
                await createPartnerAction(formData);
                closeModal();
              }}
              className="space-y-5 p-6"
            >
              <div className="grid gap-4 md:grid-cols-3">
                <div>
                  <label className="text-sm font-medium text-slate-700">
                    거래처 구분
                  </label>
                  <select
                  name="partner_type"
                  defaultValue="retail"
                  className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-900"
                  >
                  <option value="headquarters">판매처</option>
                  <option value="wholesale">도매점</option>
                  <option value="retail">소매점</option>
                  <option value="direct_store">직영점</option>
                  <option value="etc">기타</option>
                  </select>
                </div>

                <div>
                  <label className="text-sm font-medium text-slate-700">
                    거래처명 <span className="text-red-500">*</span>
                  </label>
                  <input
                    name="name"
                    required
                    placeholder="예: 테스트 거래처"
                    className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-900"
                  />
                </div>

                <div>
                  <label className="text-sm font-medium text-slate-700">
                    사업자번호
                  </label>
                  <input
                    name="business_number"
                    placeholder="000-00-00000"
                    className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-900"
                  />
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                <div>
                  <label className="text-sm font-medium text-slate-700">
                    담당자
                  </label>
                  <input
                    name="manager_name"
                    placeholder="담당자명"
                    className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-900"
                  />
                </div>

                <div>
                  <label className="text-sm font-medium text-slate-700">
                    연락처
                  </label>
                  <input
                    name="phone"
                    placeholder="010-0000-0000"
                    className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-900"
                  />
                </div>

                <div>
                  <label className="text-sm font-medium text-slate-700">
                    이메일
                  </label>
                  <input
                    name="email"
                    type="email"
                    placeholder="email@example.com"
                    className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-900"
                  />
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="text-sm font-medium text-slate-700">
                    주소
                  </label>
                  <input
                    name="address"
                    placeholder="주소"
                    className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-900"
                  />
                </div>

                <div>
                  <label className="text-sm font-medium text-slate-700">
                    정산 조건
                  </label>
                  <input
                    name="settlement_terms"
                    placeholder="예: 월말 마감 / 익월 10일 입금"
                    className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-900"
                  />
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-slate-700">
                  메모
                </label>
                <textarea
                  name="memo"
                  rows={4}
                  placeholder="거래처 관련 메모"
                  className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-900"
                />
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
                  거래처 등록
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}