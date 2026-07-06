export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">대시보드</h1>
        <p className="mt-1 text-sm text-slate-500">
          주문, 재고, 수입/포워딩, 회계 현황을 한눈에 확인합니다.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <DashboardCard title="오늘 주문" value="0건" />
        <DashboardCard title="입고 예정" value="0건" />
        <DashboardCard title="출고 대기" value="0건" />
        <DashboardCard title="미정산" value="0건" />
      </div>
    </div>
  );
}

function DashboardCard({ title, value }: { title: string; value: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-sm font-medium text-slate-500">{title}</p>
      <p className="mt-3 text-2xl font-bold text-slate-900">{value}</p>
    </div>
  );
}