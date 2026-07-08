import Link from "next/link";
import { headers } from "next/headers";
import { UserButton } from "@clerk/nextjs";
import { syncCurrentOperator } from "@/lib/operators";

export const dynamic = "force-dynamic";

type OperatorRole = "owner" | "admin" | "staff" | "viewer" | "pending";

type PermissionKey =
  | "can_access_dashboard"
  | "can_access_orders"
  | "can_access_partners"
  | "can_access_products"
  | "can_access_import_forwarding"
  | "can_access_inventory"
  | "can_access_accounting_network"
  | "can_access_operators";

type OperatorWithPermissions = {
  id: string;
  email: string;
  name?: string | null;
  role: OperatorRole;
  is_active: boolean;
  can_access_dashboard?: boolean | null;
  can_access_orders?: boolean | null;
  can_access_partners?: boolean | null;
  can_access_products?: boolean | null;
  can_access_import_forwarding?: boolean | null;
  can_access_inventory?: boolean | null;
  can_access_accounting_network?: boolean | null;
  can_access_operators?: boolean | null;
};

const menus: {
  href: string;
  label: string;
  permissionKey: PermissionKey;
}[] = [
  {
    href: "/dashboard",
    label: "대시보드",
    permissionKey: "can_access_dashboard",
  },
  {
    href: "/orders",
    label: "주문 관리",
    permissionKey: "can_access_orders",
  },
  {
    href: "/partners",
    label: "거래처 관리",
    permissionKey: "can_access_partners",
  },
  {
    href: "/products",
    label: "제품 관리",
    permissionKey: "can_access_products",
  },
  {
    href: "/import-forwarding",
    label: "수입/포워딩",
    permissionKey: "can_access_import_forwarding",
  },
  {
    href: "/inventory",
    label: "재고 관리",
    permissionKey: "can_access_inventory",
  },
  {
    href: "/accounting-network",
    label: "회계/유통망",
    permissionKey: "can_access_accounting_network",
  },
  {
    href: "/operators",
    label: "운영자 관리",
    permissionKey: "can_access_operators",
  },
];

const roleLabels: Record<OperatorRole, string> = {
  owner: "최고관리자",
  admin: "관리자",
  staff: "일반 운영자",
  viewer: "조회 전용",
  pending: "승인 대기",
};

export default async function ErpLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const headerList = await headers();
  const pathname = headerList.get("x-pathname") ?? "";

  const currentOperator =
    (await syncCurrentOperator()) as OperatorWithPermissions | null;

  if (!currentOperator) {
    return (
      <BlockedOperatorLayout
        title="운영자 정보를 확인할 수 없습니다."
        description="로그인 정보가 정상적으로 등록되지 않았습니다. 관리자에게 문의해 주세요."
      />
    );
  }

  if (!currentOperator.is_active) {
    return (
      <BlockedOperatorLayout
        title="중지된 계정입니다."
        description="현재 계정은 ERP 접근이 중지되어 있습니다. 관리자에게 문의해 주세요."
        operator={currentOperator}
      />
    );
  }

  if (currentOperator.role === "pending") {
    return (
      <BlockedOperatorLayout
        title="승인 대기 계정입니다."
        description="관리자가 계정을 승인하고 메뉴 권한을 부여한 뒤 사용할 수 있습니다."
        operator={currentOperator}
      />
    );
  }

  const allowedMenus = menus.filter((menu) =>
    canAccessMenu(currentOperator, menu.permissionKey),
  );

  const currentMenu = findCurrentMenu(pathname);

  if (
    currentMenu &&
    !canAccessMenu(currentOperator, currentMenu.permissionKey)
  ) {
    return (
      <PermissionDeniedLayout
        operator={currentOperator}
        menus={allowedMenus}
        blockedMenuLabel={currentMenu.label}
        blockedPath={pathname}
      />
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <MobilePermissionMenu menus={allowedMenus} operator={currentOperator} />

      <div className="flex min-h-screen">
        <aside className="hidden w-64 shrink-0 flex-col border-r border-slate-200 bg-white text-slate-900 md:flex">
          <div className="flex h-16 items-center border-b border-slate-200 px-6">
            <div>
              <div className="text-lg font-bold text-slate-900">
                vvildkorea
              </div>
              <div className="text-xs text-slate-500">ERP Admin</div>
            </div>
          </div>

          <nav className="flex-1 space-y-1 px-3 py-4">
            {allowedMenus.length > 0 ? (
              allowedMenus.map((menu) => (
                <Link
                  key={menu.href}
                  href={menu.href}
                  className="block rounded-lg px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-100 hover:text-slate-950"
                >
                  {menu.label}
                </Link>
              ))
            ) : (
              <div className="rounded-lg bg-slate-50 px-4 py-3 text-sm text-slate-500">
                접근 가능한 메뉴가 없습니다.
              </div>
            )}
          </nav>

          <div className="border-t border-slate-200 px-4 py-4">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="truncate text-sm font-semibold text-slate-900">
                  {currentOperator.name || "운영자"}
                </div>
                <div className="truncate text-xs text-slate-500">
                  {currentOperator.email}
                </div>
                <div className="mt-1 text-xs font-medium text-slate-400">
                  {roleLabels[currentOperator.role] ?? currentOperator.role}
                </div>
              </div>

              <div className="shrink-0">
                <UserButton />
              </div>
            </div>
          </div>
        </aside>

        <main className="min-w-0 flex-1 bg-slate-50 p-4 text-slate-900 md:p-6">
          <div className="[&_h1]:text-slate-900 [&_h2]:text-slate-900 [&_h3]:text-slate-900 [&_label]:text-slate-700 [&_p]:text-slate-600">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}

function MobilePermissionMenu({
  menus,
  operator,
}: {
  menus: {
    href: string;
    label: string;
    permissionKey: PermissionKey;
  }[];
  operator: OperatorWithPermissions;
}) {
  return (
    <div className="sticky top-0 z-40 border-b border-slate-200 bg-white md:hidden">
      <details className="group">
        <summary className="flex h-14 cursor-pointer list-none items-center justify-between px-4">
          <div>
            <div className="text-base font-bold text-slate-900">
              vvildkorea
            </div>
            <div className="text-xs text-slate-500">ERP Admin</div>
          </div>

          <div className="flex items-center gap-3">
            <UserButton />
            <span className="rounded-lg border border-slate-200 px-3 py-1 text-sm font-bold text-slate-700">
              메뉴
            </span>
          </div>
        </summary>

        <div className="border-t border-slate-100 px-4 py-4">
          <div className="mb-4 rounded-xl bg-slate-50 p-3">
            <p className="text-sm font-bold text-slate-900">
              {operator.name || "운영자"}
            </p>
            <p className="mt-1 text-xs text-slate-500">{operator.email}</p>
            <p className="mt-1 text-xs font-medium text-slate-400">
              {roleLabels[operator.role] ?? operator.role}
            </p>
          </div>

          <nav className="space-y-1">
            {menus.length > 0 ? (
              menus.map((menu) => (
                <Link
                  key={menu.href}
                  href={menu.href}
                  className="block rounded-lg px-4 py-3 text-sm font-bold text-slate-700 hover:bg-slate-100 hover:text-slate-950"
                >
                  {menu.label}
                </Link>
              ))
            ) : (
              <div className="rounded-lg bg-slate-50 px-4 py-3 text-sm text-slate-500">
                접근 가능한 메뉴가 없습니다.
              </div>
            )}
          </nav>
        </div>
      </details>
    </div>
  );
}

function PermissionDeniedLayout({
  operator,
  menus,
  blockedMenuLabel,
  blockedPath,
}: {
  operator: OperatorWithPermissions;
  menus: {
    href: string;
    label: string;
    permissionKey: PermissionKey;
  }[];
  blockedMenuLabel: string;
  blockedPath: string;
}) {
  const firstAllowedMenu = menus[0];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <MobilePermissionMenu menus={menus} operator={operator} />

      <div className="flex min-h-screen">
        <aside className="hidden w-64 shrink-0 flex-col border-r border-slate-200 bg-white text-slate-900 md:flex">
          <div className="flex h-16 items-center border-b border-slate-200 px-6">
            <div>
              <div className="text-lg font-bold text-slate-900">
                vvildkorea
              </div>
              <div className="text-xs text-slate-500">ERP Admin</div>
            </div>
          </div>

          <nav className="flex-1 space-y-1 px-3 py-4">
            {menus.length > 0 ? (
              menus.map((menu) => (
                <Link
                  key={menu.href}
                  href={menu.href}
                  className="block rounded-lg px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-100 hover:text-slate-950"
                >
                  {menu.label}
                </Link>
              ))
            ) : (
              <div className="rounded-lg bg-slate-50 px-4 py-3 text-sm text-slate-500">
                접근 가능한 메뉴가 없습니다.
              </div>
            )}
          </nav>

          <div className="border-t border-slate-200 px-4 py-4">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="truncate text-sm font-semibold text-slate-900">
                  {operator.name || "운영자"}
                </div>
                <div className="truncate text-xs text-slate-500">
                  {operator.email}
                </div>
                <div className="mt-1 text-xs font-medium text-slate-400">
                  {roleLabels[operator.role] ?? operator.role}
                </div>
              </div>

              <div className="shrink-0">
                <UserButton />
              </div>
            </div>
          </div>
        </aside>

        <main className="flex min-w-0 flex-1 items-center justify-center bg-slate-50 p-6">
          <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-50 text-lg font-black text-red-600">
              !
            </div>

            <h1 className="mt-4 text-2xl font-bold text-slate-900">
              접근 권한이 없습니다.
            </h1>

            <p className="mt-3 text-sm leading-6 text-slate-500">
              현재 계정은 <b className="text-slate-800">{blockedMenuLabel}</b>{" "}
              메뉴에 접근할 수 없습니다.
            </p>

            <div className="mt-5 rounded-xl bg-slate-50 p-4 text-left text-sm">
              <p className="font-semibold text-slate-800">요청 경로</p>
              <p className="mt-1 break-all text-slate-500">
                {blockedPath || "-"}
              </p>
            </div>

            <div className="mt-6 flex flex-wrap justify-center gap-2">
              {firstAllowedMenu ? (
                <Link
                  href={firstAllowedMenu.href}
                  className="rounded-xl bg-slate-900 px-5 py-3 text-sm font-bold text-white"
                >
                  접근 가능한 메뉴로 이동
                </Link>
              ) : null}

              <Link
                href="/dashboard"
                className="rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-bold text-slate-700"
              >
                대시보드로 이동
              </Link>
            </div>

            <p className="mt-5 text-xs text-slate-400">
              권한 변경이 필요하면 최고관리자 또는 관리자에게 요청해 주세요.
            </p>
          </div>
        </main>
      </div>
    </div>
  );
}

function BlockedOperatorLayout({
  title,
  description,
  operator,
}: {
  title: string;
  description: string;
  operator?: OperatorWithPermissions | null;
}) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 p-6">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-sm">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-50 text-red-600">
          !
        </div>

        <h1 className="mt-4 text-xl font-bold text-slate-900">{title}</h1>

        <p className="mt-2 text-sm leading-6 text-slate-500">{description}</p>

        {operator ? (
          <div className="mt-5 rounded-xl bg-slate-50 p-4 text-left text-sm">
            <p className="font-semibold text-slate-800">현재 로그인 계정</p>
            <p className="mt-1 text-slate-600">{operator.email}</p>
            <p className="mt-1 text-slate-500">
              {roleLabels[operator.role] ?? operator.role}
            </p>
          </div>
        ) : null}

        <div className="mt-6 flex justify-center">
          <UserButton />
        </div>
      </div>
    </div>
  );
}

function findCurrentMenu(pathname: string) {
  return menus.find((menu) => {
    if (pathname === menu.href) {
      return true;
    }

    return pathname.startsWith(`${menu.href}/`);
  });
}

function canAccessMenu(
  operator: OperatorWithPermissions,
  permissionKey: PermissionKey,
) {
  if (operator.role === "owner") {
    return true;
  }

  if (operator.role === "pending") {
    return false;
  }

  return operator[permissionKey] === true;
}