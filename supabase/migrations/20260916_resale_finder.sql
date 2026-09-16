-- VVILD ERP - 리셀 상품 발굴기 v1
-- Supabase SQL Editor에서 1회 실행하세요.

create extension if not exists pgcrypto;

create table if not exists public.resale_candidates (
  id uuid primary key default gen_random_uuid(),
  brand text not null,
  product_name text not null,
  model_number text,
  size text not null,
  purchase_source text,
  purchase_url text,
  purchase_price numeric(14,2) not null default 0 check (purchase_price >= 0),
  discount_rate numeric(7,2) not null default 0 check (discount_rate >= 0 and discount_rate <= 100),
  kream_sale_price numeric(14,2) not null default 0 check (kream_sale_price >= 0),
  kream_30d_sales integer not null default 0 check (kream_30d_sales >= 0),
  kream_url text,
  poizon_sale_price numeric(14,2) not null default 0 check (poizon_sale_price >= 0),
  poizon_30d_sales integer not null default 0 check (poizon_30d_sales >= 0),
  poizon_url text,
  memo text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists resale_candidates_brand_idx
  on public.resale_candidates (brand);

create index if not exists resale_candidates_model_number_idx
  on public.resale_candidates (model_number);

create index if not exists resale_candidates_updated_at_idx
  on public.resale_candidates (updated_at desc);

create table if not exists public.resale_settings (
  id smallint primary key default 1 check (id = 1),
  min_profit numeric(14,2) not null default 20000 check (min_profit >= 0),
  min_margin_rate numeric(7,2) not null default 15 check (min_margin_rate >= 0),
  min_30d_sales integer not null default 10 check (min_30d_sales >= 0),

  -- 아래 비용은 ERP 화면의 '판정 기준'에서 언제든 수정할 수 있습니다.
  kream_fee_rate numeric(7,3) not null default 6 check (kream_fee_rate >= 0),
  kream_fixed_fee numeric(14,2) not null default 2500 check (kream_fixed_fee >= 0),
  kream_shipping_fee numeric(14,2) not null default 3000 check (kream_shipping_fee >= 0),

  -- 기존 VVILD 리셀 마진 계산기의 고정값(포이즌 15,000원 + 국내 택배 2,000원)을 기본값으로 사용합니다.
  poizon_fee_rate numeric(7,3) not null default 0 check (poizon_fee_rate >= 0),
  poizon_fixed_fee numeric(14,2) not null default 15000 check (poizon_fixed_fee >= 0),
  poizon_shipping_fee numeric(14,2) not null default 2000 check (poizon_shipping_fee >= 0),

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into public.resale_settings (id)
values (1)
on conflict (id) do nothing;
