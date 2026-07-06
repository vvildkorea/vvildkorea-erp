import { ErpHeader } from "./erp-header";
import { ErpSidebar } from "./erp-sidebar";

export function ErpShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-100 text-slate-900">
      <div className="flex min-h-screen">
        <ErpSidebar />

        <div className="flex min-w-0 flex-1 flex-col">
          <ErpHeader />

          <main className="flex-1 p-4 md:p-6">
            <div className="mx-auto max-w-7xl">{children}</div>
          </main>
        </div>
      </div>
    </div>
  );
}