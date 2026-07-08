import { getOperators, syncCurrentOperator } from "@/lib/operators";
import { updateOperatorPermissions } from "./actions";

export const dynamic = "force-dynamic";

type OperatorRole = "owner" | "admin" | "staff" | "viewer" | "pending";

type OperatorPermissionKey =
  | "can_access_dashboard"
  | "can_access_orders"
  | "can_access_partners"
  | "can_access_products"
  | "can_access_import_forwarding"
  | "can_access_inventory"
  | "can_access_accounting_network"
  | "can_access_operators";

type OperatorLike = {
  id: string;
  name: string | null;
  email: string;
  role: OperatorRole;
  is_active: boolean;
  last_login_at: string | null;
  can_access_dashboard?: boolean | null;
  can_access_orders?: boolean | null;
  can_access_partners?: boolean | null;
  can_access_products?: boolean | null;
  can_access_import_forwarding?: boolean | null;
  can_access_inventory?: boolean | null;
  can_access_accounting_network?: boolean | null;
  can_access_operators?: boolean | null;
};

const roleLabels: Record<OperatorRole, string> = {
  owner: "최고관리자",
  admin: "관리자",
  staff: "일반 운영자",
  viewer: "조회 전용",
  pending: "승인 대기",
};

const roleOptions: { value: OperatorRole; label: string }[] = [
  { value: "owner", label: "최고관리자" },
  { value: "admin", label: "관리자" },
  { value: "staff", label: "일반 운영자" },
  { value: "viewer", label: "조회 전용" },
  { value: "pending", label: "승인 대기" },
];

const permissionItems: {
  key: OperatorPermissionKey;
  label: string;
  path: string;
}[] = [
  {
    key: "can_access_dashboard",
    label: "대시보드",
    path: "/dashboard",
  },
  {
    key: "can_access_orders",
    label: "주문 관리",
    path: "/orders",
  },
  {
    key: "can_access_partners",
    label: "거래처 관리",
    path: "/partners",
  },
  {
    key: "can_access_products",
    label: "제품 관리",
    path: "/products",
  },
  {
    key: "can_access_import_forwarding",
    label: "수입/포워딩",
    path: "/import-forwarding",
  },
  {
    key: "can_access_inventory",
    label: "재고 관리",
    path: "/inventory",
  },
  {
    key: "can_access_accounting_network",
    label: "회계/유통망",
    path: "/accounting-network",
  },
  {
    key: "can_access_operators",
    label: "운영자 관리",
    path: "/operators",
  },
];

export default async function OperatorsPage() {
  const currentOperator = await syncCurrentOperator();
  const operators = (await getOperators()) as OperatorLike[];

  const canManageOperators =
    currentOperator?.role === "owner" ||
    currentOperator?.role === "admin" ||
    currentOperator?.can_access_operators === true;

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-bold text-slate-900">운영자 관리</h1>
        <p className="mt-2 text-sm text-slate-500">
          직원별 계정 상태와 메뉴 접근 권한을 관리합니다.
        </p>

        {currentOperator ? (
          <div className="mt-5 rounded-xl bg-slate-50 p-4 text-sm">
            <p className="font-semibold text-slate-800">현재 로그인 계정</p>
            <p className="mt-1 text-slate-600">
              {currentOperator.email} /{" "}
              {roleLabels[currentOperator.role as OperatorRole] ??
                currentOperator.role}
            </p>
          </div>
        ) : null}

        {!canManageOperators ? (
          <div className="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
            현재 계정은 운영자 권한을 수정할 수 없습니다. 권한 확인만
            가능합니다.
          </div>
        ) : null}
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 px-6 py-4">
          <h2 className="font-bold text-slate-900">운영자 목록</h2>
          <p className="mt-1 text-sm text-slate-500">
            직원별로 접근 가능한 메뉴를 체크한 뒤 저장해 주세요.
          </p>
        </div>

        <div className="divide-y divide-slate-100">
          {operators.map((operator) => {
            const isOwner = operator.role === "owner";
            const isSelf = currentOperator?.id === operator.id;
            const canEditThisOperator =
              canManageOperators &&
              (currentOperator?.role === "owner" || !isOwner);

            return (
              <form
                key={operator.id}
                action={updateOperatorPermissions}
                className="p-6"
              >
                <input type="hidden" name="operatorId" value={operator.id} />

                <div className="grid gap-6 lg:grid-cols-[1.1fr_1.6fr_auto] lg:items-start">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-lg font-bold text-slate-900">
                        {operator.name || "이름 없음"}
                      </p>

                      <span
                        className={`rounded-full px-3 py-1 text-xs font-bold ${
                          operator.is_active
                            ? "bg-green-50 text-green-700"
                            : "bg-red-50 text-red-700"
                        }`}
                      >
                        {operator.is_active ? "사용중" : "중지"}
                      </span>

                      {isSelf ? (
                        <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700">
                          현재 계정
                        </span>
                      ) : null}
                    </div>

                    <p className="mt-1 text-sm text-slate-500">
                      {operator.email}
                    </p>

                    <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
                      <label className="block">
                        <span className="text-xs font-bold text-slate-500">
                          역할
                        </span>
                        <select
                          name="role"
                          defaultValue={operator.role}
                          disabled={!canEditThisOperator}
                          className="mt-1 h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 outline-none disabled:bg-slate-50 disabled:text-slate-400"
                        >
                          {roleOptions.map((role) => (
                            <option
                              key={role.value}
                              value={role.value}
                              disabled={
                                role.value === "owner" &&
                                currentOperator?.role !== "owner"
                              }
                            >
                              {role.label}
                            </option>
                          ))}
                        </select>
                      </label>

                      <label className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700">
                        <input
                          type="checkbox"
                          name="is_active"
                          defaultChecked={operator.is_active}
                          disabled={!canEditThisOperator || isSelf}
                          className="h-4 w-4 rounded border-slate-300"
                        />
                        <span>계정 사용</span>
                        {isSelf ? (
                          <span className="ml-auto text-xs text-slate-400">
                            본인 중지 불가
                          </span>
                        ) : null}
                      </label>
                    </div>

                    <div className="mt-4 text-xs text-slate-400">
                      마지막 로그인:{" "}
                      {operator.last_login_at
                        ? new Date(operator.last_login_at).toLocaleString(
                            "ko-KR",
                          )
                        : "-"}
                    </div>
                  </div>

                  <div>
                    <p className="text-xs font-bold text-slate-500">
                      메뉴 접근 권한
                    </p>

                    <div className="mt-3 grid gap-3 sm:grid-cols-2">
                      {permissionItems.map((permission) => {
                        const checked = isOwner
                          ? true
                          : operator[permission.key] ?? false;

                        return (
                          <label
                            key={permission.key}
                            className="flex items-start gap-3 rounded-xl border border-slate-200 p-3 text-sm"
                          >
                            <input
                              type="checkbox"
                              name={permission.key}
                              defaultChecked={checked}
                              disabled={!canEditThisOperator || isOwner}
                              className="mt-0.5 h-4 w-4 rounded border-slate-300"
                            />

                            <span>
                              <span className="block font-bold text-slate-800">
                                {permission.label}
                              </span>
                              <span className="mt-0.5 block text-xs text-slate-400">
                                {permission.path}
                              </span>
                            </span>
                          </label>
                        );
                      })}
                    </div>

                    {isOwner ? (
                      <p className="mt-3 text-xs text-slate-400">
                        최고관리자는 모든 메뉴 접근 권한이 자동으로 적용됩니다.
                      </p>
                    ) : null}
                  </div>

                  <div className="flex lg:justify-end">
                    <button
                      type="submit"
                      disabled={!canEditThisOperator}
                      className="h-11 rounded-xl bg-slate-900 px-5 text-sm font-bold text-white shadow-sm disabled:cursor-not-allowed disabled:bg-slate-300"
                    >
                      저장
                    </button>
                  </div>
                </div>
              </form>
            );
          })}

          {operators.length === 0 ? (
            <div className="px-6 py-12 text-center text-sm text-slate-400">
              등록된 운영자가 없습니다.
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}