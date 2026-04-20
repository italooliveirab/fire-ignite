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

async function assertAdmin(context: { supabase: ReturnType<typeof supabaseAdmin.from> extends never ? never : any; userId: string }) {
  const { data: roles } = await context.supabase.from("user_roles").select("role").eq("user_id", context.userId);
  const isAdmin = roles?.some((r: { role: string }) => r.role === "admin");
  if (!isAdmin) throw new Error("Apenas admins podem executar esta ação");
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
    await assertAdmin(context);

    const { data: created, error: authErr } = await supabaseAdmin.auth.admin.createUser({
      email: data.email,
      password: data.password,
      email_confirm: true,
      user_metadata: { full_name: data.full_name },
    });
    if (authErr) throw new Error(authErr.message);
    const uid = created.user.id;

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

    const { error: roleErr } = await supabaseAdmin.from("user_roles").insert({ user_id: uid, role: "affiliate" });
    if (roleErr) {
      await supabaseAdmin.auth.admin.deleteUser(uid).catch(() => {});
      throw new Error(roleErr.message);
    }

    return { id: aff.id, user_id: uid };
  });

interface UpdateAffiliateAuthInput {
  affiliate_id: string;
  email?: string;
  password?: string;
}

export const adminUpdateAffiliateAuth = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: UpdateAffiliateAuthInput) => {
    if (!input.affiliate_id) throw new Error("affiliate_id obrigatório");
    if (!input.email && !input.password) throw new Error("Informe email ou senha para alterar");
    if (input.password && input.password.length < 6) throw new Error("Senha precisa ter pelo menos 6 caracteres");
    if (input.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.email)) throw new Error("Email inválido");
    return input;
  })
  .handler(async ({ data, context }) => {
    await assertAdmin(context);

    const { data: aff, error: affErr } = await supabaseAdmin
      .from("affiliates")
      .select("id, user_id, email")
      .eq("id", data.affiliate_id)
      .single();
    if (affErr || !aff?.user_id) throw new Error("Afiliado não encontrado ou sem usuário vinculado");

    const updates: { email?: string; password?: string } = {};
    if (data.email) updates.email = data.email;
    if (data.password) updates.password = data.password;

    const { error: updErr } = await supabaseAdmin.auth.admin.updateUserById(aff.user_id, {
      ...updates,
      email_confirm: true,
    });
    if (updErr) throw new Error(updErr.message);

    if (data.email) {
      const { error: syncErr } = await supabaseAdmin
        .from("affiliates")
        .update({ email: data.email })
        .eq("id", aff.id);
      if (syncErr) throw new Error(syncErr.message);
    }

    // Lookup admin email for audit
    const { data: adminUser } = await supabaseAdmin.auth.admin.getUserById(context.userId);

    const { error: auditErr } = await supabaseAdmin.from("affiliate_credential_audit").insert({
      affiliate_id: aff.id,
      changed_by: context.userId,
      changed_by_email: adminUser?.user?.email ?? null,
      email_changed: !!data.email,
      password_changed: !!data.password,
      old_email: data.email ? aff.email : null,
      new_email: data.email ?? null,
    });
    if (auditErr) {
      console.error("[adminUpdateAffiliateAuth] audit insert failed:", auditErr);
    }

    return { ok: true };
  });

interface GetAffiliateAuthInfoInput {
  affiliate_id: string;
}

export const adminGetAffiliateAuthInfo = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: GetAffiliateAuthInfoInput) => {
    if (!input.affiliate_id) throw new Error("affiliate_id obrigatório");
    return input;
  })
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { data: aff, error: affErr } = await supabaseAdmin
      .from("affiliates")
      .select("user_id")
      .eq("id", data.affiliate_id)
      .single();
    if (affErr || !aff?.user_id) return { last_sign_in_at: null, created_at: null, email_confirmed_at: null };
    const { data: u } = await supabaseAdmin.auth.admin.getUserById(aff.user_id);
    return {
      last_sign_in_at: u?.user?.last_sign_in_at ?? null,
      created_at: u?.user?.created_at ?? null,
      email_confirmed_at: u?.user?.email_confirmed_at ?? null,
    };
  });

export const adminListAffiliatesLastSignIn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    // Fetch all affiliates with user_id
    const { data: affs } = await supabaseAdmin
      .from("affiliates")
      .select("id, user_id")
      .not("user_id", "is", null);
    if (!affs) return {} as Record<string, string | null>;

    // Page through auth users (admin API)
    const map: Record<string, string | null> = {};
    const userIdToAffId = new Map<string, string>();
    for (const a of affs) if (a.user_id) userIdToAffId.set(a.user_id, a.id);

    let page = 1;
    const perPage = 200;
    // limit to ~10 pages (2000 users) for safety
    for (let i = 0; i < 10; i++) {
      const { data, error } = await supabaseAdmin.auth.admin.listUsers({ page, perPage });
      if (error || !data?.users?.length) break;
      for (const u of data.users) {
        const affId = userIdToAffId.get(u.id);
        if (affId) map[affId] = u.last_sign_in_at ?? null;
      }
      if (data.users.length < perPage) break;
      page++;
    }
    return map;
  });
