"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const menuItems = [
  { name: "대시보드", href: "/dashboard" },
  { name: "주문 관리", href: "/orders" },
  { name: "거래처 관리", href: "/partners" },
  { name: "제품 관리", href: "/products" },
  { name: "수입/포워딩", href: "/import-forwarding" },
  { name: "재고 관리", href: "/inventory" },
  { name: "회계/유통망", href: "/accounting-network" },
  { name: "운영자 관리", href: "/operators" },
];

export function ErpSidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden w-64 border-r border-slate-200 bg-white md:block">
      <div className="border-b border-slate-200 px-5 py-5">
        <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
          ERP
        </p>
        <h1 className="mt-1 text-xl font-bold text-slate-900">vvildkorea</h1>
      </div>

      <nav className="space-y-1 p-3">
        {menuItems.map((item) => {
          const isActive = pathname.startsWith(item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={[
                "block rounded-lg px-4 py-3 text-sm font-medium transition",
                isActive
                  ? "bg-slate-900 text-white"
                  : "text-slate-600 hover:bg-slate-100 hover:text-slate-900",
              ].join(" ")}
            >
              {item.name}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}