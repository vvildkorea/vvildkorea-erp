"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { formatKrw, calculateOrderItemAmount } from "@/lib/orders";
import { createOrder } from "./actions";

type OrderType = "order" | "sample";
type SampleTargetType = "partner" | "manual";

type Partner = {
  id: string;
  name?: string | null;
  partner_name?: string | null;
  company_name?: string | null;
  business_name?: string | null;
  customer_name?: string | null;

  partner_type?: string | null;
  type?: string | null;
  category?: string | null;
  partner_category?: string | null;
  customer_type?: string | null;
  business_type?: string | null;
};

type ProductVariant = {
  id: string;
  name?: string | null;
  flavor?: string | null;
  color?: string | null;
  option_name?: string | null;
  variant_name?: string | null;
  value?: string | null;
};

type ProductPrice = {
  id: string;

  product_model_id?: string | null;
  product_id?: string | null;
  model_id?: string | null;

  product_variant_id?: string | null;
  variant_id?: string | null;
  option_id?: string | null;
  product_option_id?: string | null;

  price_type?: string | null;
  partner_type?: string | null;
  type?: string | null;
  price_key?: string | null;
  key?: string | null;
  name?: string | null;

  price?: number | string | null;
  amount?: number | string | null;
  value?: number | string | null;
  unit_price?: number | string | null;
  unitPrice?: number | string | null;
};

type Product = {
  id: string;
  category?: string | null;
  product_category?: string | null;
  product_type?: string | null;
  type?: string | null;
  model_name?: string | null;
  product_name?: string | null;
  name?: string | null;
  title?: string | null;
  model?: string | null;

  variants: ProductVariant[];
  prices: ProductPrice[];
};

type OrderItemState = {
  productModelId: string;
  productVariantId: string;
  priceType: string;
  unitPrice: number;
  quantity: number;
};

type OrderCreateModalProps = {
  partners: Partner[];
  products: Product[];
};

function getPartnerName(partner: Partner | undefined) {
  return (
    partner?.name ||
    partner?.partner_name ||
    partner?.company_name ||
    partner?.business_name ||
    partner?.customer_name ||
    ""
  );
}

function getPartnerType(partner: Partner | undefined) {
  return (
    partner?.category ||
    partner?.partner_category ||
    partner?.customer_type ||
    partner?.business_type ||
    partner?.type ||
    partner?.partner_type ||
    ""
  );
}

function getPartnerTypeLabel(partnerType: string) {
  const type = String(partnerType || "").trim();

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
  };

  return labels[type] || type;
}

function getPriceTypeByPartnerType(partnerType: string) {
  const type = String(partnerType || "").trim();

  const map: Record<string, string> = {
    판매처: "wholesale",
    도매점: "wholesale",
    소매점: "retail",
    직영점: "direct_store",
    기타: "etc",

    seller: "wholesale",
    sales: "wholesale",

    wholesale: "wholesale",
    retail: "retail",
    direct_store: "direct_store",
    etc: "etc",
  };

  return map[type] || "etc";
}

function getPriceLabel(priceType: string) {
  const labels: Record<string, string> = {
    headquarters: "도착원가",
    wholesale: "공급가",
    retail: "도매가",
    direct_store: "직영점가",
    etc: "판매가",
    sample: "샘플",
  };

  return labels[String(priceType || "").trim()] || priceType;
}

function getProductName(product: Product | undefined) {
  return (
    product?.model_name ||
    product?.product_name ||
    product?.name ||
    product?.title ||
    product?.model ||
    ""
  );
}

function getProductCategory(product: Product | undefined) {
  return (
    product?.category ||
    product?.product_category ||
    product?.product_type ||
    product?.type ||
    ""
  );
}

function getProductCategoryLabel(category: string) {
  const value = String(category || "").trim();

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

  return labels[value] || value;
}

function getVariantName(variant: ProductVariant | undefined) {
  return (
    variant?.name ||
    variant?.flavor ||
    variant?.color ||
    variant?.option_name ||
    variant?.variant_name ||
    variant?.value ||
    ""
  );
}

function normalizePriceType(value: string) {
  const raw = String(value || "").trim();

  const map: Record<string, string> = {
    도착원가: "headquarters",
    공급가: "wholesale",
    도매가: "retail",
    직영점가: "direct_store",
    판매가: "etc",
    샘플: "sample",

    판매처: "wholesale",
    도매점: "wholesale",
    소매점: "retail",
    직영점: "direct_store",
    기타: "etc",

    seller: "wholesale",
    sales: "wholesale",

    headquarters: "headquarters",
    wholesale: "wholesale",
    retail: "retail",
    direct_store: "direct_store",
    etc: "etc",
    sample: "sample",
  };

  return map[raw] || raw;
}

function getNumberFromObject(row: any, keys: string[]) {
  for (const key of keys) {
    const value = row?.[key];

    if (value === null || value === undefined || value === "") {
      continue;
    }

    const numberValue = Number(value);

    if (!Number.isNaN(numberValue) && numberValue > 0) {
      return numberValue;
    }
  }

  return 0;
}

function getPriceValue(price: ProductPrice | undefined) {
  if (!price) return 0;

  return getNumberFromObject(price, [
    "price",
    "amount",
    "value",
    "unit_price",
    "unitPrice",
  ]);
}

function getPriceRowType(price: ProductPrice | undefined) {
  if (!price) return "";

  return normalizePriceType(
    price.price_type ||
      price.partner_type ||
      price.type ||
      price.price_key ||
      price.key ||
      price.name ||
      ""
  );
}

function getPriceVariantId(price: ProductPrice | undefined) {
  if (!price) return "";

  return String(
    price.product_variant_id ||
      price.variant_id ||
      price.option_id ||
      price.product_option_id ||
      ""
  );
}

function getProductPrice(
  product: Product | undefined,
  priceType: string,
  productVariantId?: string
) {
  if (!product || !priceType) return 0;

  const normalizedPriceType = normalizePriceType(priceType);
  const selectedVariantId = String(productVariantId || "");

  if (selectedVariantId) {
    const variantPrice = product.prices.find((price) => {
      return (
        getPriceVariantId(price) === selectedVariantId &&
        getPriceRowType(price) === normalizedPriceType
      );
    });

    const variantPriceValue = getPriceValue(variantPrice);

    if (variantPriceValue > 0) {
      return variantPriceValue;
    }
  }

  const matchedPrice = product.prices.find((price) => {
    return getPriceRowType(price) === normalizedPriceType;
  });

  const matchedPriceValue = getPriceValue(matchedPrice);

  if (matchedPriceValue > 0) {
    return matchedPriceValue;
  }

  return 0;
}

export default function OrderCreateModal({
  partners,
  products,
}: OrderCreateModalProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [open, setOpen] = useState(false);
  const [orderType, setOrderType] = useState<OrderType>("order");
  const [sampleTargetType, setSampleTargetType] =
    useState<SampleTargetType>("partner");
  const [manualRecipientName, setManualRecipientName] = useState("");

  const [partnerId, setPartnerId] = useState("");
  const [orderDate, setOrderDate] = useState(() => {
    return new Date().toISOString().slice(0, 10);
  });
  const [memo, setMemo] = useState("");
  const [bulkQuantity, setBulkQuantity] = useState(1);

  const [items, setItems] = useState<OrderItemState[]>([
    {
      productModelId: "",
      productVariantId: "",
      priceType: "",
      unitPrice: 0,
      quantity: 1,
    },
  ]);

  const selectedPartner = useMemo(() => {
    return partners.find((partner) => partner.id === partnerId);
  }, [partners, partnerId]);

  const selectedPartnerType = getPartnerType(selectedPartner);

  const selectedPriceType =
    orderType === "sample"
      ? "sample"
      : selectedPartnerType
        ? getPriceTypeByPartnerType(selectedPartnerType)
        : "";

  const selectedPriceLabel = selectedPriceType
    ? getPriceLabel(selectedPriceType)
    : "거래처 선택 필요";

  const totalQuantity = useMemo(() => {
    return items.reduce((sum, item) => sum + Number(item.quantity || 0), 0);
  }, [items]);

  const totalAmount = useMemo(() => {
    return items.reduce((sum, item) => {
      return (
        sum +
        calculateOrderItemAmount(
          Number(item.quantity || 0),
          Number(item.unitPrice || 0)
        )
      );
    }, 0);
  }, [items]);

  function resetForm() {
    setOrderType("order");
    setSampleTargetType("partner");
    setManualRecipientName("");
    setPartnerId("");
    setOrderDate(new Date().toISOString().slice(0, 10));
    setMemo("");
    setBulkQuantity(1);
    setItems([
      {
        productModelId: "",
        productVariantId: "",
        priceType: "",
        unitPrice: 0,
        quantity: 1,
      },
    ]);
  }

  function recalculateItems(nextOrderType: OrderType, nextPriceType: string) {
    setItems((prev) =>
      prev.map((item) => {
        const product = products.find(
          (productItem) => productItem.id === item.productModelId
        );

        return {
          ...item,
          priceType: nextPriceType,
          unitPrice:
            nextOrderType === "sample"
              ? 0
              : getProductPrice(product, nextPriceType, item.productVariantId),
        };
      })
    );
  }

  function handleOrderTypeChange(value: OrderType) {
    setOrderType(value);

    const nextPriceType =
      value === "sample"
        ? "sample"
        : selectedPartnerType
          ? getPriceTypeByPartnerType(selectedPartnerType)
          : "";

    recalculateItems(value, nextPriceType);
  }

  function handlePartnerChange(value: string) {
    const partner = partners.find((item) => item.id === value);
    const partnerType = getPartnerType(partner);
    const priceType =
      orderType === "sample"
        ? "sample"
        : partnerType
          ? getPriceTypeByPartnerType(partnerType)
          : "";

    setPartnerId(value);

    setItems((prev) =>
      prev.map((item) => {
        const product = products.find(
          (productItem) => productItem.id === item.productModelId
        );

        return {
          ...item,
          priceType,
          unitPrice:
            orderType === "sample"
              ? 0
              : getProductPrice(product, priceType, item.productVariantId),
        };
      })
    );
  }

  function handleProductChange(index: number, productModelId: string) {
    setItems((prev) =>
      prev.map((item, itemIndex) => {
        if (itemIndex !== index) return item;

        const product = products.find(
          (productItem) => productItem.id === productModelId
        );

        return {
          ...item,
          productModelId,
          productVariantId: "",
          priceType: selectedPriceType,
          unitPrice:
            orderType === "sample"
              ? 0
              : getProductPrice(product, selectedPriceType),
        };
      })
    );
  }

  function handleVariantChange(index: number, productVariantId: string) {
    setItems((prev) =>
      prev.map((item, itemIndex) => {
        if (itemIndex !== index) return item;

        const product = products.find(
          (productItem) => productItem.id === item.productModelId
        );

        return {
          ...item,
          productVariantId,
          unitPrice:
            orderType === "sample"
              ? 0
              : getProductPrice(product, item.priceType, productVariantId),
        };
      })
    );
  }

  function handleQuantityChange(index: number, quantity: number) {
    setItems((prev) =>
      prev.map((item, itemIndex) => {
        if (itemIndex !== index) return item;

        return {
          ...item,
          quantity,
        };
      })
    );
  }

  function applyBulkQuantity() {
    const quantity = Number(bulkQuantity || 0);

    if (quantity <= 0) {
      alert("전체 적용 수량은 1 이상이어야 합니다.");
      return;
    }

    setItems((prev) =>
      prev.map((item) => ({
        ...item,
        quantity,
      }))
    );
  }

  function addItem() {
    setItems((prev) => [
      ...prev,
      {
        productModelId: "",
        productVariantId: "",
        priceType: selectedPriceType,
        unitPrice: 0,
        quantity: bulkQuantity > 0 ? bulkQuantity : 1,
      },
    ]);
  }

  function removeItem(index: number) {
    setItems((prev) => {
      if (prev.length === 1) return prev;
      return prev.filter((_, itemIndex) => itemIndex !== index);
    });
  }

  async function handleSubmit() {
    const partner = selectedPartner;
    const isSample = orderType === "sample";

    if (!isSample && !partner) {
      alert("거래처를 선택해주세요.");
      return;
    }

    if (isSample && sampleTargetType === "partner" && !partner) {
      alert("샘플 수령 거래처를 선택해주세요.");
      return;
    }

    if (
      isSample &&
      sampleTargetType === "manual" &&
      !manualRecipientName.trim()
    ) {
      alert("샘플 수령자명을 입력해주세요.");
      return;
    }

    const partnerName = partner ? getPartnerName(partner) : "";
    const partnerType = partner ? getPartnerType(partner) : "";

    if (!isSample && (!partnerName || !partnerType)) {
      alert("거래처 정보가 올바르지 않습니다.");
      return;
    }

    const orderItems = items
      .filter((item) => item.productModelId && Number(item.quantity || 0) > 0)
      .map((item) => {
        const product = products.find(
          (productItem) => productItem.id === item.productModelId
        );

        const variant = product?.variants.find(
          (variantItem) => variantItem.id === item.productVariantId
        );

        return {
          productModelId: item.productModelId,
          productVariantId: item.productVariantId || null,
          productCategory: getProductCategory(product),
          modelName: getProductName(product),
          optionName: getVariantName(variant) || null,
          priceType: isSample ? "sample" : item.priceType,
          unitPrice: isSample ? 0 : Number(item.unitPrice || 0),
          quantity: Number(item.quantity || 0),
        };
      });

    if (orderItems.length === 0) {
      alert("주문 품목을 1개 이상 입력해주세요.");
      return;
    }

    startTransition(async () => {
      try {
        await createOrder({
          orderType,
          partnerId: partner?.id || null,
          partnerName:
            isSample && sampleTargetType === "manual" ? null : partnerName,
          partnerType:
            isSample && sampleTargetType === "manual" ? null : partnerType,
          recipientName:
            isSample && sampleTargetType === "manual"
              ? manualRecipientName.trim()
              : partnerName,
          orderDate,
          memo,
          items: orderItems,
        });

        alert("주문이 저장되었습니다.");
        resetForm();
        setOpen(false);
        router.refresh();
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : "주문 저장 중 오류가 발생했습니다.";

        alert(message);
      }
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-lg bg-black px-4 py-2 text-sm font-medium text-white"
      >
        주문 생성
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="max-h-[90vh] w-full max-w-6xl overflow-y-auto rounded-2xl bg-white p-6 shadow-xl">
            <div className="mb-6 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold">주문 생성</h2>
                <p className="mt-1 text-sm text-gray-500">
                  일반 주문과 샘플 출고를 구분해서 저장합니다.
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

            <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-4">
              <div>
                <label className="mb-1 block text-sm font-medium">
                  주문 구분
                </label>
                <select
                  value={orderType}
                  onChange={(event) =>
                    handleOrderTypeChange(event.target.value as OrderType)
                  }
                  className="w-full rounded-lg border px-3 py-2 text-sm"
                >
                  <option value="order">일반 주문</option>
                  <option value="sample">샘플</option>
                </select>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium">주문일</label>
                <input
                  type="date"
                  value={orderDate}
                  onChange={(event) => setOrderDate(event.target.value)}
                  className="w-full rounded-lg border px-3 py-2 text-sm"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium">거래처</label>
                <select
                  value={partnerId}
                  onChange={(event) => handlePartnerChange(event.target.value)}
                  disabled={orderType === "sample" && sampleTargetType === "manual"}
                  className="w-full rounded-lg border px-3 py-2 text-sm disabled:bg-gray-100"
                >
                  <option value="">거래처 선택</option>
                  {partners.map((partner) => (
                    <option key={partner.id} value={partner.id}>
                      {getPartnerName(partner)} /{" "}
                      {getPartnerTypeLabel(getPartnerType(partner))}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium">
                  적용 가격
                </label>
                <input
                  value={selectedPriceLabel}
                  readOnly
                  className="w-full rounded-lg border bg-gray-50 px-3 py-2 text-sm"
                />
              </div>
            </div>

            {orderType === "sample" && (
              <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm font-medium">
                    샘플 수령 방식
                  </label>
                  <select
                    value={sampleTargetType}
                    onChange={(event) => {
                      const value = event.target.value as SampleTargetType;
                      setSampleTargetType(value);

                      if (value === "manual") {
                        setPartnerId("");
                      }
                    }}
                    className="w-full rounded-lg border px-3 py-2 text-sm"
                  >
                    <option value="partner">거래처 선택</option>
                    <option value="manual">직접 입력</option>
                  </select>
                </div>

                {sampleTargetType === "manual" && (
                  <div>
                    <label className="mb-1 block text-sm font-medium">
                      수령자명
                    </label>
                    <input
                      value={manualRecipientName}
                      onChange={(event) =>
                        setManualRecipientName(event.target.value)
                      }
                      className="w-full rounded-lg border px-3 py-2 text-sm"
                      placeholder="샘플 수령자 또는 업체명을 입력하세요."
                    />
                  </div>
                )}
              </div>
            )}

            <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
              <h3 className="font-semibold">주문 품목</h3>

              <div className="flex items-end gap-2">
                <div>
                  <label className="mb-1 block text-sm font-medium">
                    전체 동일 수량
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={bulkQuantity}
                    onChange={(event) =>
                      setBulkQuantity(Number(event.target.value || 0))
                    }
                    className="w-32 rounded-lg border px-3 py-2 text-right text-sm"
                  />
                </div>

                <button
                  type="button"
                  onClick={applyBulkQuantity}
                  className="rounded-lg border px-3 py-2 text-sm"
                >
                  전체 적용
                </button>

                <button
                  type="button"
                  onClick={addItem}
                  className="rounded-lg border px-3 py-2 text-sm"
                >
                  품목 추가
                </button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px] border-collapse text-sm">
                <thead>
                  <tr className="border-y bg-gray-50">
                    <th className="px-3 py-2 text-left">제품 모델</th>
                    <th className="px-3 py-2 text-left">맛/색상</th>
                    <th className="px-3 py-2 text-right">단가</th>
                    <th className="px-3 py-2 text-right">수량</th>
                    <th className="px-3 py-2 text-right">금액</th>
                    <th className="px-3 py-2 text-center">삭제</th>
                  </tr>
                </thead>

                <tbody>
                  {items.map((item, index) => {
                    const product = products.find(
                      (productItem) => productItem.id === item.productModelId
                    );

                    const amount = calculateOrderItemAmount(
                      Number(item.quantity || 0),
                      Number(item.unitPrice || 0)
                    );

                    return (
                      <tr key={index} className="border-b">
                        <td className="px-3 py-2">
                          <select
                            value={item.productModelId}
                            onChange={(event) =>
                              handleProductChange(index, event.target.value)
                            }
                            className="w-full rounded-lg border px-3 py-2"
                          >
                            <option value="">제품 선택</option>
                            {products.map((productItem) => (
                              <option
                                key={productItem.id}
                                value={productItem.id}
                              >
                                [{getProductCategoryLabel(
                                  getProductCategory(productItem)
                                )}]{" "}
                                {getProductName(productItem)}
                              </option>
                            ))}
                          </select>
                        </td>

                        <td className="px-3 py-2">
                          <select
                            value={item.productVariantId}
                            onChange={(event) =>
                              handleVariantChange(index, event.target.value)
                            }
                            className="w-full rounded-lg border px-3 py-2"
                          >
                            <option value="">맛/색상 선택</option>
                            {product?.variants.map((variant) => (
                              <option key={variant.id} value={variant.id}>
                                {getVariantName(variant)}
                              </option>
                            ))}
                          </select>
                        </td>

                        <td className="px-3 py-2 text-right">
                          <input
                            value={formatKrw(item.unitPrice)}
                            readOnly
                            className="w-full rounded-lg border bg-gray-50 px-3 py-2 text-right"
                          />
                        </td>

                        <td className="px-3 py-2 text-right">
                          <input
                            type="number"
                            min="1"
                            value={item.quantity}
                            onChange={(event) =>
                              handleQuantityChange(
                                index,
                                Number(event.target.value || 0)
                              )
                            }
                            className="w-full rounded-lg border px-3 py-2 text-right"
                          />
                        </td>

                        <td className="px-3 py-2 text-right font-medium">
                          {formatKrw(amount)}
                        </td>

                        <td className="px-3 py-2 text-center">
                          <button
                            type="button"
                            onClick={() => removeItem(index)}
                            className="rounded-lg border px-3 py-2 text-sm"
                          >
                            삭제
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-medium">메모</label>
                <textarea
                  value={memo}
                  onChange={(event) => setMemo(event.target.value)}
                  rows={4}
                  className="w-full rounded-lg border px-3 py-2 text-sm"
                  placeholder="주문 메모를 입력하세요."
                />
              </div>

              <div className="rounded-xl border bg-gray-50 p-4">
                <div className="flex justify-between py-2">
                  <span className="text-gray-500">총 수량</span>
                  <span className="font-semibold">
                    {totalQuantity.toLocaleString()}개
                  </span>
                </div>

                <div className="flex justify-between py-2">
                  <span className="text-gray-500">총 주문금액</span>
                  <span className="text-lg font-bold">
                    {formatKrw(totalAmount)}
                  </span>
                </div>
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-lg border px-4 py-2 text-sm"
              >
                취소
              </button>

              <button
                type="button"
                onClick={handleSubmit}
                disabled={isPending}
                className="rounded-lg bg-black px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
              >
                {isPending ? "저장 중..." : "주문 저장"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}