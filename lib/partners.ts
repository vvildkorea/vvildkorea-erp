import { supabaseAdmin } from "@/lib/supabase/admin";

export type PartnerType =
  | "buyer"
  | "supplier"
  | "forwarder"
  | "warehouse"
  | "etc";

export type Partner = {
  id: string;
  partner_type: PartnerType;
  name: string;
  business_number: string | null;
  manager_name: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  settlement_terms: string | null;
  memo: string | null;
  is_active: boolean;
  created_by_operator_id: string | null;
  created_at: string;
  updated_at: string;
};

export async function getPartners() {
  const { data, error } = await supabaseAdmin
    .from("partners")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return data as Partner[];
}

export async function createPartner(input: {
  partner_type: PartnerType;
  name: string;
  business_number?: string;
  manager_name?: string;
  phone?: string;
  email?: string;
  address?: string;
  settlement_terms?: string;
  memo?: string;
  created_by_operator_id?: string;
}) {
  const { data, error } = await supabaseAdmin
    .from("partners")
    .insert({
      partner_type: input.partner_type,
      name: input.name,
      business_number: input.business_number || null,
      manager_name: input.manager_name || null,
      phone: input.phone || null,
      email: input.email || null,
      address: input.address || null,
      settlement_terms: input.settlement_terms || null,
      memo: input.memo || null,
      created_by_operator_id: input.created_by_operator_id || null,
    })
    .select("*")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return data as Partner;
}