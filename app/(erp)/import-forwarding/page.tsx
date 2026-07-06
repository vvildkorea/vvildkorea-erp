import { ImportOrderCreateModal } from "./import-order-create-modal";
import { getImportOrders } from "@/lib/imports";
import { getProductModels, type ProductCategory } from "@/lib/products";

const categoryLabels: Record<ProductCategory, string> = {
  disposable: "일회용기기",
  pod: "팟",
  device: "디바이스",
  liquid: "액상",
};

function formatNumber(value: number | null | undefined) {
  if (value === null || value === undefined) {
    return "-";
  }

  return Number(value).toLocaleString("ko-KR");
}

export default async function ImportForwardingPage() {
  const [importOrders, productModels] = await Promise.all([
    getImportOrders(),
    getProductModels({
      active: "active",
    }),
  ]);

  const productModelOptions = productModels.map((model) => ({
    id: model.id,
    category: model.category,
    model_name: model.model_name,
  }));

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-bold">수입/포워딩</h1>
            <p className="mt-2 text-sm text-slate-500">
              수입 비용을 등록하고 모델별 도착원가를 자동 계산합니다.
            </p>
          </div>

          <ImportOrderCreateModal productModels={productModelOptions} />
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <h2 className="font-bold">수입 건 목록</h2>
          <p className="text-sm text-slate-500">총 {importOrders.length}건</p>
        </div>

        <div className="divide-y divide-slate-100">
          {importOrders.map((order) => {
            const items = order.import_order_items || [];

            return (
              <div key={order.id} className="p-6">
                <div className="grid gap-4 md:grid-cols-[1fr_280px]">
                  <div>
                    <p className="text-lg font-bold text-slate-900">
                      {order.po_number}
                    </p>

                    <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-slate-500">
                      <span>공급업체: {order.supplier_name || "-"}</span>
                      <span>수입일자: {order.import_date || "-"}</span>
                      <span>품목: {items.length}개</span>
                    </div>

                    {order.memo && (
                      <p className="mt-2 text-sm text-slate-500">
                        메모: {order.memo}
                      </p>
                    )}
                  </div>

                  <div className="rounded-xl bg-slate-50 p-4 text-sm text-slate-600">
                    <p>물건 원가: {formatNumber(order.product_cost_total)}</p>
                    <p>관세: {formatNumber(order.duty_amount)}</p>
                    <p>부가세: {formatNumber(order.vat_amount)}</p>
                    <p>운송비: {formatNumber(order.freight_amount)}</p>
                    <p>관세사 비용: {formatNumber(order.customs_broker_fee)}</p>
                    <p>담배별 세금: {formatNumber(order.tobacco_tax_amount)}</p>
                    <p className="mt-2 font-bold text-slate-900">
                      총 비용: {formatNumber(order.total_cost)}
                    </p>
                  </div>
                </div>

                <div className="mt-5 overflow-hidden rounded-xl border border-slate-200">
                  <table className="w-full min-w-[900px] text-left text-sm">
                    <thead className="bg-slate-50 text-slate-500">
                      <tr>
                        <th className="px-4 py-3 font-medium">모델</th>
                        <th className="px-4 py-3 font-medium">수량</th>
                        <th className="px-4 py-3 font-medium">송금 금액</th>
                        <th className="px-4 py-3 font-medium">배부 비용</th>
                        <th className="px-4 py-3 font-medium">총 도착금액</th>
                        <th className="px-4 py-3 font-medium">개당 도착원가</th>
                      </tr>
                    </thead>

                    <tbody className="divide-y divide-slate-100">
                      {items.map((item) => (
                        <tr key={item.id}>
                          <td className="px-4 py-3 font-medium text-slate-900">
                            {item.product_models ? (
                              <>
                                [
                                {
                                  categoryLabels[
                                    item.product_models
                                      .category as ProductCategory
                                  ]
                                }
                                ] {item.product_models.model_name}
                              </>
                            ) : (
                              "-"
                            )}
                          </td>
                          <td className="px-4 py-3 text-slate-600">
                            {formatNumber(item.quantity)}
                          </td>
                          <td className="px-4 py-3 text-slate-600">
                            {formatNumber(item.product_cost)}
                          </td>
                          <td className="px-4 py-3 text-slate-600">
                            {formatNumber(item.allocated_extra_cost)}
                          </td>
                          <td className="px-4 py-3 text-slate-600">
                            {formatNumber(item.landed_cost_total)}
                          </td>
                          <td className="px-4 py-3 font-bold text-slate-900">
                            {formatNumber(item.landed_cost_unit)}
                          </td>
                        </tr>
                      ))}

                      {items.length === 0 && (
                        <tr>
                          <td
                            colSpan={6}
                            className="px-4 py-8 text-center text-slate-400"
                          >
                            등록된 품목이 없습니다.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })}

          {importOrders.length === 0 && (
            <div className="px-6 py-10 text-center text-slate-400">
              등록된 수입 건이 없습니다.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}