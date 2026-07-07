"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

function toNumber(value: FormDataEntryValue | null) {
  if (value === null) return 0;

  const text = String(value)
    .replaceAll(",", "")
    .replaceAll("₩", "")
    .trim();

  const numberValue = Number(text);
  return Number.isFinite(numberValue) ? numberValue : 0;
}

function toStringValue(value: FormDataEntryValue | null) {
  return String(value ?? "").trim();
}

function parseOrderIds(value: FormDataEntryValue | null) {
  try {
    const parsed = JSON.parse(String(value ?? "[]"));
    if (!Array.isArray(parsed)) return [];

    return parsed
      .map((item) => String(item))
      .filter((item) => item.length > 0);
  } catch {
    return [];
  }
}

export async function createTaxInvoiceAction(formData: FormData) {
  const supabase = await createClient();

  const invoice_number = toStringValue(formData.get("invoice_number"));
  const partner_id = toStringValue(formData.get("partner_id"));
  const issue_date = toStringValue(formData.get("issue_date"));
  const total_amount = toNumber(formData.get("total_amount"));
  const memo = toStringValue(formData.get("memo"));
  const orderIds = parseOrderIds(formData.get("order_ids"));

  const is_paid_on_create =
    toStringValue(formData.get("is_paid_on_create")) === "on";

  const payment_date = toStringValue(formData.get("payment_date"));
  const payment_method =
    toStringValue(formData.get("payment_method")) || "계좌이체";

  if (!invoice_number) {
    throw new Error("계산서 번호를 입력해주세요.");
  }

  if (!partner_id) {
    throw new Error("거래처를 선택해주세요.");
  }

  if (orderIds.length === 0) {
    throw new Error("연결 주문을 선택해주세요.");
  }

  if (total_amount <= 0) {
    throw new Error("연결 주문의 합계금액이 0원입니다.");
  }

  const { data: invoice, error } = await supabase
    .from("tax_invoices")
    .insert({
      invoice_number,
      partner_id,
      issue_date: issue_date || new Date().toISOString().slice(0, 10),
      total_amount,
      memo: memo || null,
    })
    .select("id")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  if (invoice?.id && orderIds.length > 0) {
    const rows = orderIds.map((order_id) => ({
      tax_invoice_id: invoice.id,
      order_id,
    }));

    const { error: linkError } = await supabase
      .from("tax_invoice_orders")
      .insert(rows);

    if (linkError) {
      throw new Error(linkError.message);
    }
  }

  if (invoice?.id && is_paid_on_create) {
    const { error: paymentError } = await supabase
      .from("tax_invoice_payments")
      .insert({
        tax_invoice_id: invoice.id,
        payment_date:
          payment_date ||
          issue_date ||
          new Date().toISOString().slice(0, 10),
        amount: total_amount,
        payment_method,
        memo: "세금계산서 등록 시 입금완료 처리",
      });

    if (paymentError) {
      throw new Error(paymentError.message);
    }
  }

  revalidatePath("/accounting-network");
}

export async function createTaxInvoicePaymentAction(formData: FormData) {
  const supabase = await createClient();

  const tax_invoice_id = toStringValue(formData.get("tax_invoice_id"));
  const payment_date = toStringValue(formData.get("payment_date"));
  const amount = toNumber(formData.get("amount"));
  const payment_method = toStringValue(formData.get("payment_method"));
  const memo = toStringValue(formData.get("memo"));

  if (!tax_invoice_id) {
    throw new Error("세금계산서 정보가 없습니다.");
  }

  if (amount <= 0) {
    throw new Error("입금액은 0원보다 커야 합니다.");
  }

  const { error } = await supabase.from("tax_invoice_payments").insert({
    tax_invoice_id,
    payment_date: payment_date || new Date().toISOString().slice(0, 10),
    amount,
    payment_method: payment_method || null,
    memo: memo || null,
  });

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/accounting-network");
}

export async function deleteTaxInvoiceAction(formData: FormData) {
  const supabase = await createClient();

  const id = toStringValue(formData.get("id"));

  if (!id) {
    throw new Error("삭제할 세금계산서 정보가 없습니다.");
  }

  const { error } = await supabase.from("tax_invoices").delete().eq("id", id);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/accounting-network");
}