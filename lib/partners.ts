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

export type PartnerFilters = {
  q?: string;
  partner_type?: PartnerType | "all";
  active?: "all" | "active" | "inactive";
};

export async function getPartners(filters?: PartnerFilters) {
  let query = supabaseAdmin
    .from("partners")
    .select("*")
    .order("created_at", { ascending: false });

  if (filters?.q) {
    query = query.ilike("name", `%${filters.q}%`);
  }

  if (filters?.partner_type && filters.partner_type !== "all") {
    query = query.eq("partner_type", filters.partner_type);
  }

  if (filters?.active === "active") {
    query = query.eq("is_active", true);
  }

  if (filters?.active === "inactive") {
    query = query.eq("is_active", false);
  }

  const { data, error } = await query;

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

export async function updatePartner(input: {
  id: string;
  partner_type: PartnerType;
  name: string;
  business_number?: string;
  manager_name?: string;
  phone?: string;
  email?: string;
  address?: string;
  settlement_terms?: string;
  memo?: string;
}) {
  const { data, error } = await supabaseAdmin
    .from("partners")
    .update({
      partner_type: input.partner_type,
      name: input.name,
      business_number: input.business_number || null,
      manager_name: input.manager_name || null,
      phone: input.phone || null,
      email: input.email || null,
      address: input.address || null,
      settlement_terms: input.settlement_terms || null,
      memo: input.memo || null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", input.id)
    .select("*")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return data as Partner;
}

export async function setPartnerActive(input: {
  id: string;
  is_active: boolean;
}) {
  const { data, error } = await supabaseAdmin
    .from("partners")
    .update({
      is_active: input.is_active,
      updated_at: new Date().toISOString(),
    })
    .eq("id", input.id)
    .select("*")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return data as Partner;
}