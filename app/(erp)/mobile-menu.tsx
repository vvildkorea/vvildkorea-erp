"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

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

export default function MobileMenu() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  function isActive(href: string) {
    return pathname === href || pathname.startsWith(`${href}/`);
  }

  return (
    <>
      <div className="sticky top-0 z-40 flex h-14 items-center justify-between border-b bg-white px-4 md:hidden">
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="rounded-md border px-3 py-2 text-sm font-semibold text-gray-800"
        >
          ☰ 메뉴
        </button>

        <div className="text-sm font-bold text-gray-900">vvildkorea ERP</div>

        <div className="w-[66px]" />
      </div>

      {open ? (
        <div className="fixed inset-0 z-50 md:hidden">
          <button
            type="button"
            aria-label="메뉴 닫기"
            onClick={() => setOpen(false)}
            className="absolute inset-0 bg-black/40"
          />

          <aside className="relative h-full w-[280px] max-w-[82%] bg-white shadow-xl">
            <div className="flex h-14 items-center justify-between border-b px-4">
              <div className="font-bold text-gray-900">메뉴</div>

              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-md border px-3 py-1.5 text-sm font-semibold text-gray-700"
              >
                닫기
              </button>
            </div>

            <nav className="space-y-1 p-3">
              {menus.map((menu) => {
                const active = isActive(menu.href);

                return (
                  <Link
                    key={menu.href}
                    href={menu.href}
                    onClick={() => setOpen(false)}
                    className={`block rounded-lg px-4 py-3 text-sm font-medium ${
                      active
                        ? "bg-gray-900 text-white"
                        : "text-gray-700 hover:bg-gray-100"
                    }`}
                  >
                    {menu.label}
                  </Link>
                );
              })}
            </nav>
          </aside>
        </div>
      ) : null}
    </>
  );
}