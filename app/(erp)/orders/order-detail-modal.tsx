"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { formatKrw } from "@/lib/orders";
import { deleteOrder } from "./actions";

type OrderItem = {
  id: string;
  product_category?: string | null;
  model_name?: string | null;
  option_name?: string | null;
  price_type?: string | null;
  unit_price?: number | string | null;
  quantity?: number | string | null;
  amount?: number | string | null;
};

type Order = {
  id: string;
  order_type?: string | null;
  order_number?: string | null;
  partner_name?: string | null;
  partner_type?: string | null;
  recipient_name?: string | null;
  order_date?: string | null;
  status?: string | null;
  total_quantity?: number | string | null;
  total_amount?: number | string | null;
  memo?: string | null;
  created_at?: string | null;
  order_items?: OrderItem[];
};

type OrderDetailModalProps = {
  order: Order;
};

function getOrderTypeLabel(orderType: string | null | undefined) {
  return orderType === "sample" ? "샘플" : "일반 주문";
}

function getPartnerTypeLabel(partnerType: string | null | undefined) {
  const labels: Record<string, string> = {
    판매처: "판매처",
    도매점: "도매점",
    소매점: "소매점",
    직영점: "직영점",
    기타: "기타",

    seller: "판매처",
    sales: "판매처",
    wholesale: "도매점",
    retail: "소매점",
    direct_store: "직영점",
    etc: "기타",
    직접입력: "직접입력",
  };

  const key = String(partnerType || "").trim();

  return labels[key] || key || "-";
}

function getProductCategoryLabel(category: string | null | undefined) {
  const labels: Record<string, string> = {
    일회용기기: "일회용기기",
    팟: "팟",
    디바이스: "디바이스",
    액상: "액상",

    disposable: "일회용기기",
    pod: "팟",
    device: "디바이스",
    liquid: "액상",
    e_liquid: "액상",
    eLiquid: "액상",
  };

  const key = String(category || "").trim();

  return labels[key] || key || "-";
}

function getPriceTypeLabel(priceType: string | null | undefined) {
  const labels: Record<string, string> = {
    headquarters: "도착원가",
    wholesale: "공급가",
    retail: "도매가",
    direct_store: "직영점가",
    etc: "판매가",
    sample: "샘플",
  };

  const key = String(priceType || "").trim();

  return labels[key] || key || "-";
}

export default function OrderDetailModal({ order }: OrderDetailModalProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const items = order.order_items || [];

  function handleDelete() {
    const confirmed = window.confirm(
      `주문번호 ${
        order.order_number || ""
      } 주문을 삭제하시겠습니까?\n삭제 후 복구할 수 없습니다.`
    );

    if (!confirmed) return;

    startTransition(async () => {
      try {
        await deleteOrder(order.id);

        alert("주문이 삭제되었습니다.");
        setOpen(false);
        router.refresh();
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : "주문 삭제 중 오류가 발생했습니다.";

        alert(message);
      }
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-lg border px-3 py-2 text-sm"
      >
        상세
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="max-h-[90vh] w-full max-w-5xl overflow-y-auto rounded-2xl bg-white p-6 shadow-xl">
            <div className="mb-6 flex items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-semibold">주문 상세</h2>
                <p className="mt-1 text-sm text-gray-500">
                  주문번호 {order.order_number || "-"}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-lg border px-3 py-2 text-sm"
              >
                닫기
              </button>
            </div>

            <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-5">
              <div className="rounded-xl border bg-gray-50 p-4">
                <p className="text-sm text-gray-500">주문 구분</p>
                <p className="mt-1 font-semibold">
                  {getOrderTypeLabel(order.order_type)}
                </p>
              </div>

              <div className="rounded-xl border bg-gray-50 p-4">
                <p className="text-sm text-gray-500">주문일</p>
                <p className="mt-1 font-semibold">{order.order_date || "-"}</p>
              </div>

              <div className="rounded-xl border bg-gray-50 p-4">
                <p className="text-sm text-gray-500">
                  {order.order_type === "sample" ? "수령처" : "거래처"}
                </p>
                <p className="mt-1 font-semibold">
                  {order.recipient_name || order.partner_name || "-"}
                </p>
              </div>

              <div className="rounded-xl border bg-gray-50 p-4">
                <p className="text-sm text-gray-500">구분</p>
                <p className="mt-1 font-semibold">
                  {getPartnerTypeLabel(order.partner_type)}
                </p>
              </div>

              <div className="rounded-xl border bg-gray-50 p-4">
                <p className="text-sm text-gray-500">상태</p>
                <p className="mt-1 font-semibold">{order.status || "-"}</p>
              </div>
            </div>

            <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="rounded-xl border p-4">
                <p className="text-sm text-gray-500">총 수량</p>
                <p className="mt-1 text-lg font-bold">
                  {Number(order.total_quantity || 0).toLocaleString()}개
                </p>
              </div>

              <div className="rounded-xl border p-4">
                <p className="text-sm text-gray-500">총 주문금액</p>
                <p className="mt-1 text-lg font-bold">
                  {formatKrw(order.total_amount)}
                </p>
              </div>
            </div>

            <div className="mb-6 rounded-2xl border">
              <div className="border-b px-4 py-3">
                <h3 className="font-semibold">주문 품목</h3>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full min-w-[800px] border-collapse text-sm">
                  <thead>
                    <tr className="border-b bg-gray-50">
                      <th className="px-4 py-3 text-left">제품 구분</th>
                      <th className="px-4 py-3 text-left">모델명</th>
                      <th className="px-4 py-3 text-left">맛/색상</th>
                      <th className="px-4 py-3 text-left">가격 구분</th>
                      <th className="px-4 py-3 text-right">단가</th>
                      <th className="px-4 py-3 text-right">수량</th>
                      <th className="px-4 py-3 text-right">금액</th>
                    </tr>
                  </thead>

                  <tbody>
                    {items.length === 0 ? (
                      <tr>
                        <td
                          colSpan={7}
                          className="px-4 py-8 text-center text-gray-500"
                        >
                          주문 품목이 없습니다.
                        </td>
                      </tr>
                    ) : (
                      items.map((item) => (
                        <tr key={item.id} className="border-b last:border-b-0">
                          <td className="px-4 py-3">
                            {getProductCategoryLabel(item.product_category)}
                          </td>
                          <td className="px-4 py-3 font-medium">
                            {item.model_name || "-"}
                          </td>
                          <td className="px-4 py-3">
                            {item.option_name || "-"}
                          </td>
                          <td className="px-4 py-3">
                            {getPriceTypeLabel(item.price_type)}
                          </td>
                          <td className="px-4 py-3 text-right">
                            {formatKrw(item.unit_price)}
                          </td>
                          <td className="px-4 py-3 text-right">
                            {Number(item.quantity || 0).toLocaleString()}개
                          </td>
                          <td className="px-4 py-3 text-right font-semibold">
                            {formatKrw(item.amount)}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="mb-6 rounded-xl border p-4">
              <p className="mb-2 text-sm font-medium">메모</p>
              <p className="whitespace-pre-wrap text-sm text-gray-600">
                {order.memo || "-"}
              </p>
            </div>

            <div className="flex justify-between gap-2">
              <button
                type="button"
                onClick={handleDelete}
                disabled={isPending}
                className="rounded-lg border border-red-300 px-4 py-2 text-sm font-medium text-red-600 disabled:opacity-50"
              >
                {isPending ? "삭제 중..." : "주문 삭제"}
              </button>

              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-lg bg-black px-4 py-2 text-sm font-medium text-white"
              >
                확인
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}