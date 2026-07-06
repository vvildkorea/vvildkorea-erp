export default function OrdersPage() {
  return (
    <PageFrame
      title="주문 관리"
      description="주문 등록, 출고 상태, 결제 상태를 관리합니다."
    />
  );
}

function PageFrame({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <h1 className="text-2xl font-bold">{title}</h1>
      <p className="mt-2 text-sm text-slate-500">{description}</p>
      <div className="mt-6 rounded-lg border border-dashed border-slate-300 p-8 text-center text-sm text-slate-400">
        아직 기능을 연결하지 않았습니다.
      </div>
    </div>
  );
}