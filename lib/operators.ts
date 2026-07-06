import { currentUser } from "@clerk/nextjs/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

export type OperatorRole = "owner" | "admin" | "staff" | "viewer" | "pending";

export type Operator = {
  id: string;
  clerk_user_id: string;
  email: string;
  name: string | null;
  role: OperatorRole;
  is_active: boolean;
  last_login_at: string | null;
  created_at: string;
  updated_at: string;
};

export async function syncCurrentOperator() {
  const user = await currentUser();

  if (!user) {
    return null;
  }

  const email = user.emailAddresses[0]?.emailAddress ?? "";
  const name =
    [user.firstName, user.lastName].filter(Boolean).join(" ") ||
    user.username ||
    email;

  const { data: existingOperator, error: existingError } = await supabaseAdmin
    .from("operators")
    .select("*")
    .eq("clerk_user_id", user.id)
    .maybeSingle();

  if (existingError) {
    throw new Error(existingError.message);
  }

  if (existingOperator) {
    const { data, error } = await supabaseAdmin
      .from("operators")
      .update({
        email,
        name,
        last_login_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("clerk_user_id", user.id)
      .select("*")
      .single();

    if (error) {
      throw new Error(error.message);
    }

    return data as Operator;
  }

  const { count, error: countError } = await supabaseAdmin
    .from("operators")
    .select("*", { count: "exact", head: true });

  if (countError) {
    throw new Error(countError.message);
  }

  const role: OperatorRole = count === 0 ? "owner" : "pending";

  const { data, error } = await supabaseAdmin
    .from("operators")
    .insert({
      clerk_user_id: user.id,
      email,
      name,
      role,
      is_active: true,
      last_login_at: new Date().toISOString(),
    })
    .select("*")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return data as Operator;
}

export async function getOperators() {
  const { data, error } = await supabaseAdmin
    .from("operators")
    .select("*")
    .order("created_at", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return data as Operator[];
}