import {
  toggleProductModelActiveAction,
  toggleProductVariantActiveAction,
} from "./actions";
import {
  ProductModelDeleteButton,
  ProductVariantDeleteButton,
} from "./product-delete-button";
import { ProductModelCreateModal } from "./product-model-create-modal";
import { ProductVariantCreateModal } from "./product-variant-create-modal";
import {
  getProductModels,
  type PricePartnerType,
  type ProductCategory,
  type ProductVariant,
} from "@/lib/products";

const categoryLabels: Record<ProductCategory, string> = {
  disposable: "일회용기기",
  pod: "팟",
  device: "디바이스",
  liquid: "액상",
};

const priceLabels: Record<PricePartnerType, string> = {
  headquarters: "도착원가",
  wholesale: "공급가",
  retail: "도매가",
  direct_store: "직영점가",
  etc: "판매가",
};

type ProductsPageProps = {
  searchParams: Promise<{
    q?: string;
    category?: string;
    active?: string;
  }>;
};

function normalizeCategory(value?: string): ProductCategory | "all" {
  if (
    value === "disposable" ||
    value === "pod" ||
    value === "device" ||
    value === "liquid"
  ) {
    return value;
  }

  return "all";
}

function normalizeActive(value?: string): "all" | "active" | "inactive" {
  if (value === "active" || value === "inactive") {
    return value;
  }

  return "all";
}

function formatNumber(value: number | null | undefined) {
  if (value === null || value === undefined) {
    return "-";
  }

  return Number(value).toLocaleString("ko-KR");
}

function getVariantName(variant: ProductVariant, category: ProductCategory) {
  if (category === "device") {
    return variant.color || "색상 미입력";
  }

  return `${variant.flavor || "맛 미입력"} / ${
    variant.nicotine_content || "니코틴 미입력"
  }`;
}

function getVariantPrice(
  variant: ProductVariant,
  partnerType: PricePartnerType
) {
  return (
    variant.product_variant_prices?.find(
      (price) => price.partner_type === partnerType
    )?.price ?? null
  );
}

export default async function ProductsPage({ searchParams }: ProductsPageProps) {
  const params = await searchParams;

  const q = params.q?.trim() || "";
  const category = normalizeCategory(params.category);
  const active = normalizeActive(params.active);

  const productModels = await getProductModels({
    q,
    category,
    active,
  });

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-bold">제품 관리</h1>
            <p className="mt-2 text-sm text-slate-500">
              일회용기기, 팟, 디바이스, 액상 모델과 옵션별 가격을 관리합니다.
            </p>
          </div>

          <ProductModelCreateModal />
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-bold">제품 검색</h2>

        <form className="mt-5 grid gap-4 md:grid-cols-4" action="/products">
          <div>
            <label className="text-sm font-medium text-slate-700">
              모델명 / 브랜드 / 영문명
            </label>
            <input
              name="q"
              defaultValue={q}
              placeholder="검색어 입력"
              className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-900"
            />
          </div>

          <div>
            <label className="text-sm font-medium text-slate-700">
              제품 구분
            </label>
            <select
              name="category"
              defaultValue={category}
              className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-900"
            >
              <option value="all">전체</option>
              <option value="disposable">일회용기기</option>
              <option value="pod">팟</option>
              <option value="device">디바이스</option>
              <option value="liquid">액상</option>
            </select>
          </div>

          <div>
            <label className="text-sm font-medium text-slate-700">상태</label>
            <select
              name="active"
              defaultValue={active}
              className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-900"
            >
              <option value="all">전체</option>
              <option value="active">사용중</option>
              <option value="inactive">중지</option>
            </select>
          </div>

          <div className="flex items-end gap-2">
            <button
              type="submit"
              className="w-full rounded-lg bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-slate-700"
            >
              검색
            </button>

            <a
              href="/products"
              className="w-full rounded-lg border border-slate-300 px-5 py-2.5 text-center text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              초기화
            </a>
          </div>
        </form>
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <h2 className="font-bold">제품 모델 목록</h2>
          <p className="text-sm text-slate-500">총 {productModels.length}개</p>
        </div>

        <div className="divide-y divide-slate-100">
          {productModels.map((model) => {
            const variants = model.product_variants || [];

            return (
              <div key={model.id} className="p-6">
                <div className="grid gap-4 md:grid-cols-[120px_1fr_260px] md:items-start">
                  <div>
                    <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">
                      {categoryLabels[model.category]}
                    </span>
                  </div>

                  <div>
                    <p className="font-bold text-slate-900">
                      {model.model_name}
                    </p>

                    <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-sm text-slate-500">
                      <span>브랜드: {model.brand || "-"}</span>
                      <span>원산지: {model.origin_country || "-"}</span>
                      <span>규격: {model.specification || "-"}</span>
                      <span>단위: {model.unit}</span>
                      <span>옵션: {variants.length}개</span>
                      <span>
                        상태: {model.is_active ? "사용중" : "중지"}
                      </span>
                    </div>

                    {model.hs_code && (
                      <p className="mt-1 text-xs text-slate-400">
                        HS CODE: {model.hs_code}
                      </p>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-2 md:justify-end">
                    <ProductVariantCreateModal
                      productModelId={model.id}
                      category={model.category}
                      modelName={model.model_name}
                    />

                    <form action={toggleProductModelActiveAction}>
                      <input type="hidden" name="id" value={model.id} />
                      <input
                        type="hidden"
                        name="next_is_active"
                        value={model.is_active ? "false" : "true"}
                      />
                      <button
                        type="submit"
                        className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                      >
                        {model.is_active ? "사용중지" : "재사용"}
                      </button>
                    </form>

                    <ProductModelDeleteButton
                      productModelId={model.id}
                      modelName={model.model_name}
                    />
                  </div>
                </div>

                <div className="mt-5 overflow-hidden rounded-xl border border-slate-200">
                  <div className="border-b border-slate-200 bg-slate-50 px-4 py-3">
                    <p className="text-sm font-bold text-slate-700">
                      옵션 목록
                    </p>
                  </div>

                  {variants.length > 0 ? (
                    <div className="divide-y divide-slate-100">
                      {variants.map((variant) => (
                        <div key={variant.id} className="p-4">
                          <div className="grid gap-4 md:grid-cols-[1fr_360px_180px] md:items-center">
                            <div>
                              <p className="font-semibold text-slate-900">
                                {getVariantName(variant, model.category)}
                              </p>

                              <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-sm text-slate-500">
                                <span>SKU: {variant.sku || "-"}</span>
                                <span>바코드: {variant.barcode || "-"}</span>
                                <span>
                                  박스입수: {variant.box_quantity || "-"}
                                </span>
                                <span>
                                  상태:{" "}
                                  {variant.is_active ? "사용중" : "중지"}
                                </span>
                              </div>
                            </div>

                            <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm text-slate-600">
                              {(
                                [
                                  "headquarters",
                                  "wholesale",
                                  "retail",
                                  "direct_store",
                                  "etc",
                                ] as PricePartnerType[]
                              ).map((partnerType) => (
                                <p key={partnerType}>
                                  {priceLabels[partnerType]}:{" "}
                                  {formatNumber(
                                    getVariantPrice(variant, partnerType)
                                  )}
                                </p>
                              ))}
                            </div>

                            <div className="flex gap-2 md:justify-end">
                              <form action={toggleProductVariantActiveAction}>
                                <input
                                  type="hidden"
                                  name="id"
                                  value={variant.id}
                                />
                                <input
                                  type="hidden"
                                  name="next_is_active"
                                  value={
                                    variant.is_active ? "false" : "true"
                                  }
                                />
                                <button
                                  type="submit"
                                  className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                                >
                                  {variant.is_active ? "사용중지" : "재사용"}
                                </button>
                              </form>

                              <ProductVariantDeleteButton
                                productVariantId={variant.id}
                                variantName={getVariantName(
                                  variant,
                                  model.category
                                )}
                              />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="px-4 py-8 text-center text-sm text-slate-400">
                      등록된 옵션이 없습니다. 옵션 추가 버튼을 눌러 등록하세요.
                    </div>
                  )}
                </div>
              </div>
            );
          })}

          {productModels.length === 0 && (
            <div className="px-6 py-10 text-center text-slate-400">
              등록된 제품 모델이 없습니다.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}