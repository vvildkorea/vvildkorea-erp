"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { calculateOrderItemAmount, formatKrw } from "@/lib/orders";
import { updateOrder } from "./actions";

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

type OrderItem = {
  id: string;
  product_model_id?: string | null;
  product_variant_id?: string | null;
  product_category?: string | null;
  model_name?: string | null;
  option_name?: string | null;
  price_type?: string | null;
  unit_price?: number | string | null;
  quantity?: number | string | null;
  amount?: number | string | null;
};

type TaxInvoiceInfo = {
  id: string;
  invoiceNumber: string;
  issueDate: string;
};

type Order = {
  id: string;
  order_type?: string | null;
  order_number?: string | null;
  partner_id?: string | null;
  partner_name?: string | null;
  partner_type?: string | null;
  recipient_name?: string | null;
  order_date?: string | null;
  status?: string | null;
  total_quantity?: number | string | null;
  total_amount?: number | string | null;
  memo?: string | null;
  order_items?: OrderItem[];
  taxInvoiceInfo?: TaxInvoiceInfo | null;
};

type EditItemState = {
  key: string;
  existingItemId: string | null;
  productModelId: string;
  productVariantId: string;
  priceType: string;
  unitPrice: number;
  quantity: number;
  selected: boolean;
};

type OrderEditModalProps = {
  order: Order;
  partners: Partner[];
  products: Product[];
};

function getOrderType(order: Order): OrderType {
  return String(order.order_type || "").trim().toLowerCase() === "sample"
    ? "sample"
    : "order";
}

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

    if (!Number.isNaN(numberValue) && numberValue >= 0) {
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
      "",
  );
}

function getPriceVariantId(price: ProductPrice | undefined) {
  if (!price) return "";

  return String(
    price.product_variant_id ||
      price.variant_id ||
      price.option_id ||
      price.product_option_id ||
      "",
  );
}

function getProductPrice(
  product: Product | undefined,
  priceType: string,
  productVariantId?: string,
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

    if (variantPrice) {
      return getPriceValue(variantPrice);
    }
  }

  const matchedPrice = product.prices.find((price) => {
    return getPriceRowType(price) === normalizedPriceType;
  });

  return getPriceValue(matchedPrice);
}

function findProductIdByItem(item: OrderItem, products: Product[]) {
  if (item.product_model_id) {
    return String(item.product_model_id);
  }

  const modelName = String(item.model_name || "").trim();

  return (
    products.find((product) => getProductName(product) === modelName)?.id || ""
  );
}

function findVariantIdByItem(
  item: OrderItem,
  product: Product | undefined,
) {
  if (item.product_variant_id) {
    return String(item.product_variant_id);
  }

  const optionName = String(item.option_name || "").trim();

  return (
    product?.variants.find((variant) => getVariantName(variant) === optionName)
      ?.id || ""
  );
}

function createInitialItems(order: Order, products: Product[]): EditItemState[] {
  const orderType = getOrderType(order);
  const sourceItems = order.order_items || [];

  if (sourceItems.length === 0) {
    return [
      {
        key: crypto.randomUUID(),
        existingItemId: null,
        productModelId: "",
        productVariantId: "",
        priceType: orderType === "sample" ? "sample" : "",
        unitPrice: 0,
        quantity: 1,
        selected: false,
      },
    ];
  }

  return sourceItems.map((item) => {
    const productModelId = findProductIdByItem(item, products);
    const product = products.find((row) => row.id === productModelId);

    return {
      key: item.id || crypto.randomUUID(),
      existingItemId: item.id || null,
      productModelId,
      productVariantId: findVariantIdByItem(item, product),
      priceType:
        orderType === "sample"
          ? "sample"
          : normalizePriceType(String(item.price_type || "")),
      unitPrice: orderType === "sample" ? 0 : Number(item.unit_price || 0),
      quantity: Math.max(1, Number(item.quantity || 1)),
      selected: false,
    };
  });
}

function findInitialPartnerId(order: Order, partners: Partner[]) {
  if (order.partner_id) {
    return String(order.partner_id);
  }

  const orderPartnerName = String(order.partner_name || "").trim();

  return (
    partners.find((partner) => getPartnerName(partner) === orderPartnerName)
      ?.id || ""
  );
}

export default function OrderEditModal({
  order,
  partners,
  products,
}: OrderEditModalProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);

  const orderType = getOrderType(order);
  const initialPartnerId = findInitialPartnerId(order, partners);
  const initialSampleTargetType: SampleTargetType =
    orderType === "sample" && !initialPartnerId ? "manual" : "partner";

  const [sampleTargetType, setSampleTargetType] =
    useState<SampleTargetType>(initialSampleTargetType);
  const [manualRecipientName, setManualRecipientName] = useState(
    orderType === "sample" && !initialPartnerId
      ? String(order.recipient_name || order.partner_name || "")
      : "",
  );
  const [partnerId, setPartnerId] = useState(initialPartnerId);
  const [orderDate, setOrderDate] = useState(
    String(order.order_date || "").slice(0, 10),
  );
  const [memo, setMemo] = useState(String(order.memo || ""));
  const [bulkUnitPrice, setBulkUnitPrice] = useState("");
  const [bulkQuantity, setBulkQuantity] = useState("");
  const [items, setItems] = useState<EditItemState[]>(() =>
    createInitialItems(order, products),
  );

  const selectedPartner = useMemo(
    () => partners.find((partner) => partner.id === partnerId),
    [partners, partnerId],
  );

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

  const totalQuantity = useMemo(
    () => items.reduce((sum, item) => sum + Number(item.quantity || 0), 0),
    [items],
  );

  const totalAmount = useMemo(
    () =>
      items.reduce(
        (sum, item) =>
          sum +
          calculateOrderItemAmount(
            Number(item.quantity || 0),
            Number(item.unitPrice || 0),
          ),
        0,
      ),
    [items],
  );

  const selectedItemCount = useMemo(
    () => items.filter((item) => item.selected).length,
    [items],
  );

  const allItemsSelected =
    items.length > 0 && items.every((item) => item.selected);

  function resetForm() {
    const nextPartnerId = findInitialPartnerId(order, partners);
    const nextSampleTargetType: SampleTargetType =
      orderType === "sample" && !nextPartnerId ? "manual" : "partner";

    setSampleTargetType(nextSampleTargetType);
    setManualRecipientName(
      orderType === "sample" && !nextPartnerId
        ? String(order.recipient_name || order.partner_name || "")
        : "",
    );
    setPartnerId(nextPartnerId);
    setOrderDate(String(order.order_date || "").slice(0, 10));
    setMemo(String(order.memo || ""));
    setBulkUnitPrice("");
    setBulkQuantity("");
    setItems(createInitialItems(order, products));
  }

  function openModal() {
    resetForm();
    setOpen(true);
  }

  function closeModal() {
    if (isPending) return;
    setOpen(false);
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
          (productItem) => productItem.id === item.productModelId,
        );

        return {
          ...item,
          priceType,
          unitPrice:
            orderType === "sample"
              ? 0
              : getProductPrice(product, priceType, item.productVariantId),
        };
      }),
    );
  }

  function handleProductChange(index: number, productModelId: string) {
    setItems((prev) =>
      prev.map((item, itemIndex) => {
        if (itemIndex !== index) return item;

        const product = products.find(
          (productItem) => productItem.id === productModelId,
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
      }),
    );
  }

  function handleVariantChange(index: number, productVariantId: string) {
    setItems((prev) =>
      prev.map((item, itemIndex) => {
        if (itemIndex !== index) return item;

        const product = products.find(
          (productItem) => productItem.id === item.productModelId,
        );

        return {
          ...item,
          productVariantId,
          unitPrice:
            orderType === "sample"
              ? 0
              : getProductPrice(product, item.priceType, productVariantId),
        };
      }),
    );
  }

  function handleUnitPriceChange(index: number, unitPrice: number) {
    if (orderType === "sample") return;

    setItems((prev) =>
      prev.map((item, itemIndex) =>
        itemIndex === index
          ? { ...item, unitPrice: Math.max(0, unitPrice) }
          : item,
      ),
    );
  }

  function handleQuantityChange(index: number, quantity: number) {
    setItems((prev) =>
      prev.map((item, itemIndex) =>
        itemIndex === index
          ? { ...item, quantity: Math.max(1, quantity) }
          : item,
      ),
    );
  }

  function handleItemSelectedChange(index: number, selected: boolean) {
    setItems((prev) =>
      prev.map((item, itemIndex) =>
        itemIndex === index ? { ...item, selected } : item,
      ),
    );
  }

  function toggleSelectAllItems() {
    const nextSelected = !allItemsSelected;
    setItems((prev) =>
      prev.map((item) => ({ ...item, selected: nextSelected })),
    );
  }

  function applyBulkUnitPrice() {
    if (orderType === "sample") {
      alert("샘플 출고는 단가가 0원으로 저장됩니다.");
      return;
    }

    if (selectedItemCount === 0) {
      alert("단가를 변경할 품목을 체크해주세요.");
      return;
    }

    if (bulkUnitPrice.trim() === "") {
      alert("적용할 단가를 입력해주세요.");
      return;
    }

    const unitPrice = Number(bulkUnitPrice);

    if (Number.isNaN(unitPrice) || unitPrice < 0) {
      alert("단가는 0원 이상의 숫자로 입력해주세요.");
      return;
    }

    setItems((prev) =>
      prev.map((item) =>
        item.selected ? { ...item, unitPrice } : item,
      ),
    );
  }

  function applyBulkQuantity() {
    if (selectedItemCount === 0) {
      alert("수량을 변경할 품목을 체크해주세요.");
      return;
    }

    if (bulkQuantity.trim() === "") {
      alert("적용할 수량을 입력해주세요.");
      return;
    }

    const quantity = Number(bulkQuantity);

    if (Number.isNaN(quantity) || quantity < 1) {
      alert("수량은 1개 이상 입력해주세요.");
      return;
    }

    setItems((prev) =>
      prev.map((item) =>
        item.selected ? { ...item, quantity } : item,
      ),
    );
  }

  function addItem() {
    setItems((prev) => [
      ...prev,
      {
        key: crypto.randomUUID(),
        existingItemId: null,
        productModelId: "",
        productVariantId: "",
        priceType: selectedPriceType,
        unitPrice: 0,
        quantity: 1,
        selected: false,
      },
    ]);
  }

  function removeItem(index: number) {
    setItems((prev) => {
      if (prev.length === 1) {
        alert("주문 품목은 최소 1개가 필요합니다.");
        return prev;
      }

      return prev.filter((_, itemIndex) => itemIndex !== index);
    });
  }

  function handleSubmit() {
    const partner = selectedPartner;
    const isSample = orderType === "sample";

    if (!orderDate) {
      alert("주문일을 선택해주세요.");
      return;
    }

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
          (productItem) => productItem.id === item.productModelId,
        );
        const variant = product?.variants.find(
          (variantItem) => variantItem.id === item.productVariantId,
        );

        return {
          id: item.existingItemId,
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

    if (orderItems.some((item) => !item.productVariantId)) {
      alert("모든 품목의 맛/색상을 선택해주세요.");
      return;
    }

    if (order.taxInvoiceInfo) {
      const confirmed = window.confirm(
        "이 주문은 세금계산서가 연결되어 있습니다.\n주문금액이나 수량을 변경하면 세금계산서 금액과 일치하는지 반드시 확인해야 합니다.\n\n그래도 수정하시겠습니까?",
      );

      if (!confirmed) return;
    }

    startTransition(async () => {
      try {
        await updateOrder({
          orderId: order.id,
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

        alert("주문이 수정되었습니다.");
        setOpen(false);
        router.refresh();
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : "주문 수정 중 오류가 발생했습니다.";

        alert(message);
      }
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={openModal}
        className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
      >
        주문 수정
      </button>

      {open && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 px-4">
          <div className="max-h-[92vh] w-full max-w-7xl overflow-y-auto rounded-2xl bg-white p-6 shadow-xl">
            <div className="mb-6 flex items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-semibold">주문 수정</h2>
                <p className="mt-1 text-sm text-gray-500">
                  주문번호 {order.order_number || "-"} · 기존 재고 출고이력도 함께 수정됩니다.
                </p>
              </div>

              <button
                type="button"
                onClick={closeModal}
                disabled={isPending}
                className="rounded-lg border px-3 py-2 text-sm disabled:opacity-50"
              >
                닫기
              </button>
            </div>

            {order.taxInvoiceInfo ? (
              <div className="mb-5 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
                이 주문은 세금계산서가 연결되어 있습니다. 금액이나 수량을 수정한 뒤 회계/계산서 금액이 일치하는지 확인해주세요.
              </div>
            ) : null}

            <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-4">
              <div>
                <label className="mb-1 block text-sm font-medium">주문 구분</label>
                <input
                  value={orderType === "sample" ? "샘플" : "일반 주문"}
                  readOnly
                  className="w-full rounded-lg border bg-gray-50 px-3 py-2 text-sm"
                />
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
                      {getPartnerName(partner)} / {getPartnerTypeLabel(getPartnerType(partner))}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium">적용 가격</label>
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
                  <label className="mb-1 block text-sm font-medium">샘플 수령 방식</label>
                  <select
                    value={sampleTargetType}
                    onChange={(event) => {
                      const value = event.target.value as SampleTargetType;
                      setSampleTargetType(value);
                      if (value === "manual") setPartnerId("");
                    }}
                    className="w-full rounded-lg border px-3 py-2 text-sm"
                  >
                    <option value="partner">거래처 선택</option>
                    <option value="manual">직접 입력</option>
                  </select>
                </div>

                {sampleTargetType === "manual" && (
                  <div>
                    <label className="mb-1 block text-sm font-medium">수령자명</label>
                    <input
                      value={manualRecipientName}
                      onChange={(event) => setManualRecipientName(event.target.value)}
                      className="w-full rounded-lg border px-3 py-2 text-sm"
                      placeholder="샘플 수령자 또는 업체명"
                    />
                  </div>
                )}
              </div>
            )}

            <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
              <div>
                <h3 className="font-semibold">주문 품목</h3>
                <p className="mt-1 text-xs text-gray-500">
                  제품, 맛/색상, 단가, 수량을 수정할 수 있습니다. 체크한 품목은 단가나 수량을 한 번에 변경할 수 있습니다.
                </p>
              </div>

              <div className="flex flex-wrap items-end gap-2">
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-500">선택 수량</label>
                  <input
                    type="number"
                    min="1"
                    value={bulkQuantity}
                    onChange={(event) => setBulkQuantity(event.target.value)}
                    placeholder="수량"
                    className="w-24 rounded-lg border px-3 py-2 text-right text-sm"
                  />
                </div>
                <button
                  type="button"
                  onClick={applyBulkQuantity}
                  className="rounded-lg border px-3 py-2 text-sm"
                >
                  수량 적용
                </button>

                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-500">선택 단가</label>
                  <input
                    type="number"
                    min="0"
                    value={bulkUnitPrice}
                    onChange={(event) => setBulkUnitPrice(event.target.value)}
                    disabled={orderType === "sample"}
                    placeholder="단가"
                    className="w-28 rounded-lg border px-3 py-2 text-right text-sm disabled:bg-gray-100"
                  />
                </div>
                <button
                  type="button"
                  onClick={applyBulkUnitPrice}
                  disabled={orderType === "sample"}
                  className="rounded-lg border px-3 py-2 text-sm disabled:bg-gray-100 disabled:text-gray-400"
                >
                  단가 적용
                </button>

                <button
                  type="button"
                  onClick={addItem}
                  className="rounded-lg border px-3 py-2 text-sm font-medium"
                >
                  품목 추가
                </button>
              </div>
            </div>

            <div className="overflow-x-auto rounded-xl border">
              <table className="w-full min-w-[1060px] border-collapse text-sm">
                <thead>
                  <tr className="border-b bg-gray-50">
                    <th className="w-12 px-3 py-2 text-center">
                      <input
                        type="checkbox"
                        checked={allItemsSelected}
                        onChange={toggleSelectAllItems}
                        aria-label="전체 품목 선택"
                        className="h-4 w-4"
                      />
                    </th>
                    <th className="px-3 py-2 text-left">제품 모델</th>
                    <th className="px-3 py-2 text-left">맛/색상</th>
                    <th className="px-3 py-2 text-right">단가</th>
                    <th className="px-3 py-2 text-right">수량</th>
                    <th className="px-3 py-2 text-right">금액</th>
                    <th className="px-3 py-2 text-center">관리</th>
                  </tr>
                </thead>

                <tbody>
                  {items.map((item, index) => {
                    const product = products.find(
                      (productItem) => productItem.id === item.productModelId,
                    );
                    const amount = calculateOrderItemAmount(
                      Number(item.quantity || 0),
                      Number(item.unitPrice || 0),
                    );

                    return (
                      <tr key={item.key} className="border-b last:border-b-0">
                        <td className="px-3 py-2 text-center">
                          <input
                            type="checkbox"
                            checked={item.selected}
                            onChange={(event) =>
                              handleItemSelectedChange(index, event.target.checked)
                            }
                            className="h-4 w-4"
                          />
                        </td>

                        <td className="px-3 py-2">
                          <select
                            value={item.productModelId}
                            onChange={(event) => handleProductChange(index, event.target.value)}
                            className="w-full rounded-lg border px-3 py-2"
                          >
                            <option value="">제품 선택</option>
                            {products.map((productItem) => (
                              <option key={productItem.id} value={productItem.id}>
                                [{getProductCategoryLabel(getProductCategory(productItem))}] {getProductName(productItem)}
                              </option>
                            ))}
                          </select>
                        </td>

                        <td className="px-3 py-2">
                          <select
                            value={item.productVariantId}
                            onChange={(event) => handleVariantChange(index, event.target.value)}
                            disabled={!item.productModelId}
                            className="w-full rounded-lg border px-3 py-2 disabled:bg-gray-100"
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
                            type="number"
                            min="0"
                            value={item.unitPrice}
                            onChange={(event) =>
                              handleUnitPriceChange(index, Number(event.target.value || 0))
                            }
                            disabled={orderType === "sample"}
                            className="w-full rounded-lg border px-3 py-2 text-right disabled:bg-gray-100"
                          />
                        </td>

                        <td className="px-3 py-2 text-right">
                          <input
                            type="number"
                            min="1"
                            value={item.quantity}
                            onChange={(event) =>
                              handleQuantityChange(index, Number(event.target.value || 1))
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
                            className="rounded-lg border px-3 py-2 text-sm text-red-600"
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

            {selectedItemCount > 0 ? (
              <p className="mt-2 text-right text-xs text-gray-500">
                {selectedItemCount}개 품목이 선택되었습니다.
              </p>
            ) : null}

            <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-medium">메모</label>
                <textarea
                  value={memo}
                  onChange={(event) => setMemo(event.target.value)}
                  rows={4}
                  className="w-full rounded-lg border px-3 py-2 text-sm"
                  placeholder="주문 메모"
                />
              </div>

              <div className="rounded-xl border bg-gray-50 p-4">
                <div className="flex justify-between py-2">
                  <span className="text-gray-500">총 수량</span>
                  <span className="font-semibold">{totalQuantity.toLocaleString()}개</span>
                </div>
                <div className="flex justify-between py-2">
                  <span className="text-gray-500">총 주문금액</span>
                  <span className="text-lg font-bold">{formatKrw(totalAmount)}</span>
                </div>
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-2 border-t pt-4">
              <button
                type="button"
                onClick={closeModal}
                disabled={isPending}
                className="rounded-lg border px-4 py-2 text-sm disabled:opacity-50"
              >
                취소
              </button>
              <button
                type="button"
                onClick={handleSubmit}
                disabled={isPending}
                className="rounded-lg bg-black px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
              >
                {isPending ? "수정 중..." : "수정 저장"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}