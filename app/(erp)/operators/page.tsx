import { getOperators, syncCurrentOperator } from "@/lib/operators";

const roleLabels = {
  owner: "최고관리자",
  admin: "관리자",
  staff: "일반 운영자",
  viewer: "조회 전용",
  pending: "승인 대기",
};

export default async function OperatorsPage() {
  const currentOperator = await syncCurrentOperator();
  const operators = await getOperators();

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-bold">운영자 관리</h1>
        <p className="mt-2 text-sm text-slate-500">
          운영자 계정, 권한, 로그인 기록을 관리합니다.
        </p>

        {currentOperator && (
          <div className="mt-5 rounded-lg bg-slate-50 p-4 text-sm">
            <p className="font-semibold text-slate-800">현재 로그인 계정</p>
            <p className="mt-1 text-slate-600">
              {currentOperator.email} / {roleLabels[currentOperator.role]}
            </p>
          </div>
        )}
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 px-6 py-4">
          <h2 className="font-bold">운영자 목록</h2>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="bg-slate-50 text-slate-500">
              <tr>
                <th className="px-6 py-3 font-medium">이름</th>
                <th className="px-6 py-3 font-medium">이메일</th>
                <th className="px-6 py-3 font-medium">권한</th>
                <th className="px-6 py-3 font-medium">상태</th>
                <th className="px-6 py-3 font-medium">마지막 로그인</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {operators.map((operator) => (
                <tr key={operator.id}>
                  <td className="px-6 py-4 font-medium text-slate-900">
                    {operator.name || "-"}
                  </td>

                  <td className="px-6 py-4 text-slate-600">
                    {operator.email}
                  </td>

                  <td className="px-6 py-4">
                    <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">
                      {roleLabels[operator.role]}
                    </span>
                  </td>

                  <td className="px-6 py-4">
                    {operator.is_active ? "사용중" : "중지"}
                  </td>

                  <td className="px-6 py-4 text-slate-500">
                    {operator.last_login_at
                      ? new Date(operator.last_login_at).toLocaleString("ko-KR")
                      : "-"}
                  </td>
                </tr>
              ))}

              {operators.length === 0 && (
                <tr>
                  <td
                    colSpan={5}
                    className="px-6 py-10 text-center text-slate-400"
                  >
                    등록된 운영자가 없습니다.
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