import { PartnerCreateModal } from "./partner-create-modal";
import { PartnerDeleteButton } from "./partner-delete-button";
import {
  createPartnerAction,
  togglePartnerActiveAction,
  updatePartnerAction,
} from "./actions";
import { getPartners, type PartnerType } from "@/lib/partners";

const partnerTypeLabels: Record<PartnerType, string> = {
  headquarters: "판매처",
  wholesale: "도매점",
  retail: "소매점",
  direct_store: "직영점",
  etc: "기타",
};

type PartnersPageProps = {
  searchParams: Promise<{
    q?: string;
    partner_type?: string;
    active?: string;
  }>;
};

function normalizePartnerType(value?: string): PartnerType | "all" {
  if (
    value === "headquarters" ||
    value === "wholesale" ||
    value === "retail" ||
    value === "direct_store" ||
    value === "etc"
  ) {
    return value;
  }

  return "all";
}

function normalizeActive(value?: string): "all" | "active" | "inactive" {
  if (value === "active" || value === "inactive") {
    return value;
  }

  return "all";
}

export default async function PartnersPage({ searchParams }: PartnersPageProps) {
  const params = await searchParams;

  const q = params.q?.trim() || "";
  const partnerType = normalizePartnerType(params.partner_type);
  const active = normalizeActive(params.active);

  const partners = await getPartners({
    q,
    partner_type: partnerType,
    active,
  });

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
  <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
    <div>
      <h1 className="text-2xl font-bold">거래처 관리</h1>
      <p className="mt-2 text-sm text-slate-500">
        판매처, 도매점, 소매점, 직영점, 기타 거래처를 관리합니다.
      </p>
    </div>

    <PartnerCreateModal />
  </div>
</div>

      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-bold">거래처 검색</h2>

        <form className="mt-5 grid gap-4 md:grid-cols-4" action="/partners">
          <div>
            <label className="text-sm font-medium text-slate-700">
              거래처명
            </label>
            <input
              name="q"
              defaultValue={q}
              placeholder="거래처명 검색"
              className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-900"
            />
          </div>

          <div>
            <label className="text-sm font-medium text-slate-700">
              거래처 구분
            </label>
            <select
  name="partner_type"
  defaultValue={partnerType}
  className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-900"
>
  <option value="all">전체</option>
  <option value="headquarters">판매처</option>
  <option value="wholesale">도매점</option>
  <option value="retail">소매점</option>
  <option value="direct_store">직영점</option>
  <option value="etc">기타</option>
</select>
          </div>

          <div>
            <label className="text-sm font-medium text-slate-700">상태</label>
            <select
              name="active"
              defaultValue={active}
              className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-900"
            >
              <option value="all">전체</option>
              <option value="active">사용중</option>
              <option value="inactive">중지</option>
            </select>
          </div>

          <div className="flex items-end gap-2">
            <button
              type="submit"
              className="w-full rounded-lg bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-slate-700"
            >
              검색
            </button>

            <a
              href="/partners"
              className="w-full rounded-lg border border-slate-300 px-5 py-2.5 text-center text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              초기화
            </a>
          </div>
        </form>
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <h2 className="font-bold">거래처 목록</h2>
          <p className="text-sm text-slate-500">총 {partners.length}개</p>
        </div>

        <div className="divide-y divide-slate-100">
          {partners.map((partner) => (
            <div key={partner.id} className="p-6">
              <div className="grid gap-4 md:grid-cols-[120px_1fr_140px_140px] md:items-center">
                <div>
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">
                    {partnerTypeLabels[partner.partner_type]}
                  </span>
                </div>

                <div>
                  <p className="font-bold text-slate-900">{partner.name}</p>
                  <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-sm text-slate-500">
                    <span>담당자: {partner.manager_name || "-"}</span>
                    <span>연락처: {partner.phone || "-"}</span>
                    <span>정산: {partner.settlement_terms || "-"}</span>
                  </div>
                  {partner.business_number && (
                    <p className="mt-1 text-xs text-slate-400">
                      사업자번호: {partner.business_number}
                    </p>
                  )}
                </div>

                <div className="text-sm">
                  {partner.is_active ? (
                    <span className="font-medium text-green-700">사용중</span>
                  ) : (
                    <span className="font-medium text-red-600">중지</span>
                  )}
                </div>

                <div className="flex gap-2 md:justify-end">
  <form action={togglePartnerActiveAction}>
    <input type="hidden" name="id" value={partner.id} />
    <input
      type="hidden"
      name="next_is_active"
      value={partner.is_active ? "false" : "true"}
    />
    <button
      type="submit"
      className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
    >
      {partner.is_active ? "사용중지" : "재사용"}
    </button>
  </form>

  <PartnerDeleteButton
  partnerId={partner.id}
  partnerName={partner.name}
/>
</div>
              </div>

              <details className="mt-4 rounded-lg border border-slate-200 bg-slate-50">
                <summary className="cursor-pointer px-4 py-3 text-sm font-semibold text-slate-700">
                  거래처 정보 수정
                </summary>

                <form action={updatePartnerAction} className="space-y-5 p-4">
                  <input type="hidden" name="id" value={partner.id} />

                  <PartnerFormFields
                    defaultValues={{
                      partner_type: partner.partner_type,
                      name: partner.name,
                      business_number: partner.business_number || "",
                      manager_name: partner.manager_name || "",
                      phone: partner.phone || "",
                      email: partner.email || "",
                      address: partner.address || "",
                      settlement_terms: partner.settlement_terms || "",
                      memo: partner.memo || "",
                    }}
                  />

                  <div className="flex justify-end">
                    <button
                      type="submit"
                      className="rounded-lg bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-slate-700"
                    >
                      수정 저장
                    </button>
                  </div>
                </form>
              </details>
            </div>
          ))}

          {partners.length === 0 && (
            <div className="px-6 py-10 text-center text-slate-400">
              등록된 거래처가 없습니다.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function PartnerFormFields({
  defaultValues,
}: {
  defaultValues?: {
    partner_type?: PartnerType;
    name?: string;
    business_number?: string;
    manager_name?: string;
    phone?: string;
    email?: string;
    address?: string;
    settlement_terms?: string;
    memo?: string;
  };
}) {
  return (
    <>
      <div className="grid gap-4 md:grid-cols-3">
        <div>
          <label className="text-sm font-medium text-slate-700">
            거래처 구분
          </label>
          <select
            name="partner_type"
            defaultValue={defaultValues?.partner_type || "buyer"}
            className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-900"
          >
            <option value="all">전체</option>
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
            defaultValue={defaultValues?.name || ""}
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
            defaultValue={defaultValues?.business_number || ""}
            placeholder="000-00-00000"
            className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-900"
          />
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div>
          <label className="text-sm font-medium text-slate-700">담당자</label>
          <input
            name="manager_name"
            defaultValue={defaultValues?.manager_name || ""}
            placeholder="담당자명"
            className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-900"
          />
        </div>

        <div>
          <label className="text-sm font-medium text-slate-700">연락처</label>
          <input
            name="phone"
            defaultValue={defaultValues?.phone || ""}
            placeholder="010-0000-0000"
            className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-900"
          />
        </div>

        <div>
          <label className="text-sm font-medium text-slate-700">이메일</label>
          <input
            name="email"
            type="email"
            defaultValue={defaultValues?.email || ""}
            placeholder="email@example.com"
            className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-900"
          />
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <label className="text-sm font-medium text-slate-700">주소</label>
          <input
            name="address"
            defaultValue={defaultValues?.address || ""}
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
            defaultValue={defaultValues?.settlement_terms || ""}
            placeholder="예: 월말 마감 / 익월 10일 입금"
            className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-900"
          />
        </div>
      </div>

      <div>
        <label className="text-sm font-medium text-slate-700">메모</label>
        <textarea
          name="memo"
          rows={3}
          defaultValue={defaultValues?.memo || ""}
          placeholder="거래처 관련 메모"
          className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-900"
        />
      </div>
    </>
  );
}