import { createServerFn } from "@tanstack/react-start";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

interface CreateAffiliateInput {
  email: string;
  password: string;
  full_name: string;
  username: string;
  slug: string;
  phone?: string | null;
  instagram?: string | null;
  pix_key?: string | null;
  pix_type?: "cpf" | "cnpj" | "email" | "phone" | "random" | null;
  status: "active" | "paused" | "blocked";
}

export const adminCreateAffiliate = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: CreateAffiliateInput) => {
    if (!input.email || !input.password || !input.full_name || !input.username || !input.slug) {
      throw new Error("Campos obrigatórios faltando");
    }
    if (input.password.length < 6) throw new Error("Senha precisa ter pelo menos 6 caracteres");
    return input;
  })
  .handler(async ({ data, context }) => {
    // Verify caller is admin
    const { data: roles } = await context.supabase.from("user_roles").select("role").eq("user_id", context.userId);
    const isAdmin = roles?.some((r) => r.role === "admin");
    if (!isAdmin) throw new Error("Apenas admins podem criar afiliados");

    // 1. Create auth user (auto-confirmed)
    const { data: created, error: authErr } = await supabaseAdmin.auth.admin.createUser({
      email: data.email,
      password: data.password,
      email_confirm: true,
      user_metadata: { full_name: data.full_name },
    });
    if (authErr) throw new Error(authErr.message);
    const uid = created.user.id;

    // 2. Insert affiliate record
    const { data: aff, error: affErr } = await supabaseAdmin.from("affiliates").insert({
      user_id: uid,
      email: data.email,
      full_name: data.full_name,
      username: data.username,
      slug: data.slug,
      phone: data.phone ?? null,
      instagram: data.instagram ?? null,
      pix_key: data.pix_key ?? null,
      pix_type: data.pix_type ?? null,
      status: data.status,
    }).select().single();

    if (affErr) {
      await supabaseAdmin.auth.admin.deleteUser(uid).catch(() => {});
      throw new Error(affErr.message);
    }

    // 3. Assign role
    const { error: roleErr } = await supabaseAdmin.from("user_roles").insert({ user_id: uid, role: "affiliate" });
    if (roleErr) {
      await supabaseAdmin.auth.admin.deleteUser(uid).catch(() => {});
      throw new Error(roleErr.message);
    }

    return { id: aff.id, user_id: uid };
  });
