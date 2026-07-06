import { UserButton } from "@clerk/nextjs";

export function ErpHeader() {
  return (
    <header className="border-b border-slate-200 bg-white px-4 py-3 md:px-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-medium text-slate-400">vvildkorea ERP</p>
          <h2 className="text-lg font-bold text-slate-900">관리자 시스템</h2>
        </div>

        <UserButton />
      </div>
    </header>
  );
}