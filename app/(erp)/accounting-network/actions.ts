"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

const ACCOUNTING_PATH = "/accounting-network";

export type ActionResult = {
  ok: boolean;
  message: string;
};

export type TaxInvoiceInput = {
  invoice_number: string;
  issue_date: string;
  partner_id: string;
  order_ids: string[];
  memo?: string;
  paid_full?: boolean;
};

export type TaxInvoiceUpdateInput = TaxInvoiceInput & {
  id: string;
};

export type PaymentInput = {
  tax_invoice_id: string;
  payment_date: string;
  amount: number;
  memo?: string;
};

export type PaymentUpdateInput = PaymentInput & {
  id: string;
};

function cleanString(value: unknown) {
  if (typeof value !== "string") return "";
  return value.trim();
}

function toNumber(value: unknown) {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  if (typeof value === "string") {
    const parsed = Number(value.replace(/,/g, ""));
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
}

function getRecordAmount(record: Record<string, unknown>) {
  const candidates = [
    "total_amount",
    "order_total",
    "final_amount",
    "sales_amount",
    "amount",
    "total_price",
    "supply_amount",
  ];

  for (const key of candidates) {
    const value = toNumber(record[key]);
    if (value > 0) return value;
  }

  return 0;
}

async function getSupabase() {
  return await createClient();
}

async function calculateOrderTotal(orderIds: string[]) {
  if (orderIds.length === 0) return 0;

  const supabase = await getSupabase();

  const { data, error } = await supabase
    .from("orders")
    .select("*")
    .in("id", orderIds);

  if (error) {
    throw new Error(`연결 주문 금액을 불러오지 못했습니다. ${error.message}`);
  }

  return (data ?? []).reduce((sum, order) => {
    return sum + getRecordAmount(order as Record<string, unknown>);
  }, 0);
}

async function rollbackInvoice(invoiceId: string) {
  const supabase = await getSupabase();

  await supabase
    .from("tax_invoice_payments")
    .delete()
    .eq("tax_invoice_id", invoiceId);

  await supabase
    .from("tax_invoice_orders")
    .delete()
    .eq("tax_invoice_id", invoiceId);

  await supabase.from("tax_invoices").delete().eq("id", invoiceId);
}

export async function createTaxInvoice(
  input: TaxInvoiceInput,
): Promise<ActionResult> {
  try {
    const invoiceNumber = cleanString(input.invoice_number);
    const issueDate = cleanString(input.issue_date);
    const partnerId = cleanString(input.partner_id);
    const memo = cleanString(input.memo);
    const orderIds = Array.isArray(input.order_ids)
      ? input.order_ids.filter(Boolean)
      : [];

    if (!invoiceNumber) {
      return { ok: false, message: "계산서 번호를 입력해주세요." };
    }

    if (!issueDate) {
      return { ok: false, message: "발행일을 선택해주세요." };
    }

    if (!partnerId) {
      return { ok: false, message: "거래처를 선택해주세요." };
    }

    if (orderIds.length === 0) {
      return { ok: false, message: "연결할 주문을 1개 이상 선택해주세요." };
    }

    const totalAmount = await calculateOrderTotal(orderIds);
    const supabase = await getSupabase();

    const { data: invoice, error: invoiceError } = await supabase
      .from("tax_invoices")
      .insert({
        invoice_number: invoiceNumber,
        issue_date: issueDate,
        partner_id: partnerId,
        total_amount: totalAmount,
        memo,
      })
      .select("id")
      .single();

    if (invoiceError || !invoice?.id) {
      return {
        ok: false,
        message: `세금계산서 등록에 실패했습니다. ${
          invoiceError?.message ?? ""
        }`,
      };
    }

    const invoiceId = invoice.id as string;

    const orderRows = orderIds.map((orderId) => ({
      tax_invoice_id: invoiceId,
      order_id: orderId,
    }));

    const { error: orderLinkError } = await supabase
      .from("tax_invoice_orders")
      .insert(orderRows);

    if (orderLinkError) {
      await rollbackInvoice(invoiceId);
      return {
        ok: false,
        message: `연결 주문 저장에 실패했습니다. ${orderLinkError.message}`,
      };
    }

    if (input.paid_full && totalAmount > 0) {
      const { error: paymentError } = await supabase
        .from("tax_invoice_payments")
        .insert({
          tax_invoice_id: invoiceId,
          payment_date: issueDate,
          amount: totalAmount,
          memo: "등록 시 입금완료 처리",
        });

      if (paymentError) {
        await rollbackInvoice(invoiceId);
        return {
          ok: false,
          message: `입금완료 처리에 실패했습니다. ${paymentError.message}`,
        };
      }
    }

    revalidatePath(ACCOUNTING_PATH);

    return { ok: true, message: "세금계산서가 등록되었습니다." };
  } catch (error) {
    return {
      ok: false,
      message:
        error instanceof Error
          ? error.message
          : "세금계산서 등록 중 오류가 발생했습니다.",
    };
  }
}

export async function updateTaxInvoice(
  input: TaxInvoiceUpdateInput,
): Promise<ActionResult> {
  try {
    const id = cleanString(input.id);
    const invoiceNumber = cleanString(input.invoice_number);
    const issueDate = cleanString(input.issue_date);
    const partnerId = cleanString(input.partner_id);
    const memo = cleanString(input.memo);
    const orderIds = Array.isArray(input.order_ids)
      ? input.order_ids.filter(Boolean)
      : [];

    if (!id) {
      return { ok: false, message: "수정할 세금계산서 정보가 없습니다." };
    }

    if (!invoiceNumber) {
      return { ok: false, message: "계산서 번호를 입력해주세요." };
    }

    if (!issueDate) {
      return { ok: false, message: "발행일을 선택해주세요." };
    }

    if (!partnerId) {
      return { ok: false, message: "거래처를 선택해주세요." };
    }

    if (orderIds.length === 0) {
      return { ok: false, message: "연결할 주문을 1개 이상 선택해주세요." };
    }

    const totalAmount = await calculateOrderTotal(orderIds);
    const supabase = await getSupabase();

    const { error: updateError } = await supabase
      .from("tax_invoices")
      .update({
        invoice_number: invoiceNumber,
        issue_date: issueDate,
        partner_id: partnerId,
        total_amount: totalAmount,
        memo,
      })
      .eq("id", id);

    if (updateError) {
      return {
        ok: false,
        message: `세금계산서 수정에 실패했습니다. ${updateError.message}`,
      };
    }

    const { error: deleteLinkError } = await supabase
      .from("tax_invoice_orders")
      .delete()
      .eq("tax_invoice_id", id);

    if (deleteLinkError) {
      return {
        ok: false,
        message: `기존 연결 주문 삭제에 실패했습니다. ${deleteLinkError.message}`,
      };
    }

    const { error: insertLinkError } = await supabase
      .from("tax_invoice_orders")
      .insert(
        orderIds.map((orderId) => ({
          tax_invoice_id: id,
          order_id: orderId,
        })),
      );

    if (insertLinkError) {
      return {
        ok: false,
        message: `새 연결 주문 저장에 실패했습니다. ${insertLinkError.message}`,
      };
    }

    revalidatePath(ACCOUNTING_PATH);

    return {
      ok: true,
      message: "세금계산서가 수정되었습니다. 입금 상태도 자동 재계산됩니다.",
    };
  } catch (error) {
    return {
      ok: false,
      message:
        error instanceof Error
          ? error.message
          : "세금계산서 수정 중 오류가 발생했습니다.",
    };
  }
}

export async function deleteTaxInvoice(id: string): Promise<ActionResult> {
  try {
    const invoiceId = cleanString(id);

    if (!invoiceId) {
      return { ok: false, message: "삭제할 세금계산서 정보가 없습니다." };
    }

    const supabase = await getSupabase();

    const { error: paymentError } = await supabase
      .from("tax_invoice_payments")
      .delete()
      .eq("tax_invoice_id", invoiceId);

    if (paymentError) {
      return {
        ok: false,
        message: `입금 내역 삭제에 실패했습니다. ${paymentError.message}`,
      };
    }

    const { error: orderLinkError } = await supabase
      .from("tax_invoice_orders")
      .delete()
      .eq("tax_invoice_id", invoiceId);

    if (orderLinkError) {
      return {
        ok: false,
        message: `연결 주문 삭제에 실패했습니다. ${orderLinkError.message}`,
      };
    }

    const { error: invoiceError } = await supabase
      .from("tax_invoices")
      .delete()
      .eq("id", invoiceId);

    if (invoiceError) {
      return {
        ok: false,
        message: `세금계산서 삭제에 실패했습니다. ${invoiceError.message}`,
      };
    }

    revalidatePath(ACCOUNTING_PATH);

    return { ok: true, message: "세금계산서가 삭제되었습니다." };
  } catch (error) {
    return {
      ok: false,
      message:
        error instanceof Error
          ? error.message
          : "세금계산서 삭제 중 오류가 발생했습니다.",
    };
  }
}

export async function createTaxInvoicePayment(
  input: PaymentInput,
): Promise<ActionResult> {
  try {
    const taxInvoiceId = cleanString(input.tax_invoice_id);
    const paymentDate = cleanString(input.payment_date);
    const amount = toNumber(input.amount);
    const memo = cleanString(input.memo);

    if (!taxInvoiceId) {
      return { ok: false, message: "세금계산서 정보가 없습니다." };
    }

    if (!paymentDate) {
      return { ok: false, message: "입금일을 선택해주세요." };
    }

    if (amount <= 0) {
      return { ok: false, message: "입금액은 0원보다 커야 합니다." };
    }

    const supabase = await getSupabase();

    const { error } = await supabase.from("tax_invoice_payments").insert({
      tax_invoice_id: taxInvoiceId,
      payment_date: paymentDate,
      amount,
      memo,
    });

    if (error) {
      return {
        ok: false,
        message: `입금 등록에 실패했습니다. ${error.message}`,
      };
    }

    revalidatePath(ACCOUNTING_PATH);

    return { ok: true, message: "입금 내역이 등록되었습니다." };
  } catch (error) {
    return {
      ok: false,
      message:
        error instanceof Error
          ? error.message
          : "입금 등록 중 오류가 발생했습니다.",
    };
  }
}

export async function updateTaxInvoicePayment(
  input: PaymentUpdateInput,
): Promise<ActionResult> {
  try {
    const id = cleanString(input.id);
    const taxInvoiceId = cleanString(input.tax_invoice_id);
    const paymentDate = cleanString(input.payment_date);
    const amount = toNumber(input.amount);
    const memo = cleanString(input.memo);

    if (!id) {
      return { ok: false, message: "수정할 입금 내역 정보가 없습니다." };
    }

    if (!taxInvoiceId) {
      return { ok: false, message: "세금계산서 정보가 없습니다." };
    }

    if (!paymentDate) {
      return { ok: false, message: "입금일을 선택해주세요." };
    }

    if (amount <= 0) {
      return { ok: false, message: "입금액은 0원보다 커야 합니다." };
    }

    const supabase = await getSupabase();

    const { error } = await supabase
      .from("tax_invoice_payments")
      .update({
        payment_date: paymentDate,
        amount,
        memo,
      })
      .eq("id", id)
      .eq("tax_invoice_id", taxInvoiceId);

    if (error) {
      return {
        ok: false,
        message: `입금 내역 수정에 실패했습니다. ${error.message}`,
      };
    }

    revalidatePath(ACCOUNTING_PATH);

    return {
      ok: true,
      message: "입금 내역이 수정되었습니다. 미수금 상태도 자동 재계산됩니다.",
    };
  } catch (error) {
    return {
      ok: false,
      message:
        error instanceof Error
          ? error.message
          : "입금 내역 수정 중 오류가 발생했습니다.",
    };
  }
}

export async function deleteTaxInvoicePayment(input: {
  id: string;
  tax_invoice_id: string;
}): Promise<ActionResult> {
  try {
    const id = cleanString(input.id);
    const taxInvoiceId = cleanString(input.tax_invoice_id);

    if (!id) {
      return { ok: false, message: "삭제할 입금 내역 정보가 없습니다." };
    }

    if (!taxInvoiceId) {
      return { ok: false, message: "세금계산서 정보가 없습니다." };
    }

    const supabase = await getSupabase();

    const { error } = await supabase
      .from("tax_invoice_payments")
      .delete()
      .eq("id", id)
      .eq("tax_invoice_id", taxInvoiceId);

    if (error) {
      return {
        ok: false,
        message: `입금 내역 삭제에 실패했습니다. ${error.message}`,
      };
    }

    revalidatePath(ACCOUNTING_PATH);

    return {
      ok: true,
      message: "입금 내역이 삭제되었습니다. 미수금 상태도 자동 재계산됩니다.",
    };
  } catch (error) {
    return {
      ok: false,
      message:
        error instanceof Error
          ? error.message
          : "입금 내역 삭제 중 오류가 발생했습니다.",
    };
  }
}