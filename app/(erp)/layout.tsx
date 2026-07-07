import Link from "next/link";
import { UserButton } from "@clerk/nextjs";
import MobileMenu from "./mobile-menu";

const menus = [
  { href: "/dashboard", label: "대시보드" },
  { href: "/orders", label: "주문 관리" },
  { href: "/partners", label: "거래처 관리" },
  { href: "/products", label: "제품 관리" },
  { href: "/import-forwarding", label: "수입/포워딩" },
  { href: "/inventory", label: "재고 관리" },
  { href: "/accounting-network", label: "회계/유통망" },
  { href: "/operators", label: "운영자 관리" },
];

export default function ErpLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <MobileMenu />

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
            {menus.map((menu) => (
              <Link
                key={menu.href}
                href={menu.href}
                className="block rounded-lg px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-100 hover:text-slate-950"
              >
                {menu.label}
              </Link>
            ))}
          </nav>

          <div className="border-t border-slate-200 px-4 py-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-semibold text-slate-900">
                  운영자
                </div>
                <div className="text-xs text-slate-500">Google 로그인</div>
              </div>

              <UserButton />
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