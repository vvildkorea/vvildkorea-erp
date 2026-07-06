import { createPartnerAction } from "./actions";
import { getPartners, type PartnerType } from "@/lib/partners";

const partnerTypeLabels: Record<PartnerType, string> = {
  buyer: "판매처",
  supplier: "매입처",
  forwarder: "포워딩",
  warehouse: "물류/창고",
  etc: "기타",
};

export default async function PartnersPage() {
  const partners = await getPartners();

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-bold">거래처 관리</h1>
        <p className="mt-2 text-sm text-slate-500">
          판매처, 매입처, 포워딩 업체, 물류/창고 업체를 관리합니다.
        </p>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-bold">거래처 등록</h2>

        <form action={createPartnerAction} className="mt-5 space-y-5">
          <div className="grid gap-4 md:grid-cols-3">
            <div>
              <label className="text-sm font-medium text-slate-700">
                거래처 구분
              </label>
              <select
                name="partner_type"
                defaultValue="buyer"
                className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-900"
              >
                <option value="buyer">판매처</option>
                <option value="supplier">매입처</option>
                <option value="forwarder">포워딩</option>
                <option value="warehouse">물류/창고</option>
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
                placeholder="예: 비빌드코리아"
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
            <label className="text-sm font-medium text-slate-700">메모</label>
            <textarea
              name="memo"
              rows={3}
              placeholder="거래처 관련 메모"
              className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-900"
            />
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              className="rounded-lg bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-slate-700"
            >
              거래처 등록
            </button>
          </div>
        </form>
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 px-6 py-4">
          <h2 className="font-bold">거래처 목록</h2>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[980px] text-left text-sm">
            <thead className="bg-slate-50 text-slate-500">
              <tr>
                <th className="px-6 py-3 font-medium">구분</th>
                <th className="px-6 py-3 font-medium">거래처명</th>
                <th className="px-6 py-3 font-medium">담당자</th>
                <th className="px-6 py-3 font-medium">연락처</th>
                <th className="px-6 py-3 font-medium">이메일</th>
                <th className="px-6 py-3 font-medium">정산 조건</th>
                <th className="px-6 py-3 font-medium">상태</th>
                <th className="px-6 py-3 font-medium">등록일</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {partners.map((partner) => (
                <tr key={partner.id}>
                  <td className="px-6 py-4">
                    <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">
                      {partnerTypeLabels[partner.partner_type]}
                    </span>
                  </td>

                  <td className="px-6 py-4 font-medium text-slate-900">
                    {partner.name}
                    {partner.business_number && (
                      <p className="mt-1 text-xs font-normal text-slate-400">
                        {partner.business_number}
                      </p>
                    )}
                  </td>

                  <td className="px-6 py-4 text-slate-600">
                    {partner.manager_name || "-"}
                  </td>

                  <td className="px-6 py-4 text-slate-600">
                    {partner.phone || "-"}
                  </td>

                  <td className="px-6 py-4 text-slate-600">
                    {partner.email || "-"}
                  </td>

                  <td className="px-6 py-4 text-slate-600">
                    {partner.settlement_terms || "-"}
                  </td>

                  <td className="px-6 py-4">
                    {partner.is_active ? "사용중" : "중지"}
                  </td>

                  <td className="px-6 py-4 text-slate-500">
                    {new Date(partner.created_at).toLocaleDateString("ko-KR")}
                  </td>
                </tr>
              ))}

              {partners.length === 0 && (
                <tr>
                  <td
                    colSpan={8}
                    className="px-6 py-10 text-center text-slate-400"
                  >
                    등록된 거래처가 없습니다.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}