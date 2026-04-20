import { supabaseAdmin } from "@/integrations/supabase/client.server";

export async function trackLeadFromLink(productSlug: string, affiliateSlug: string) {
  if (!productSlug || !affiliateSlug) return { ok: false, status: 400 } as const;

  const [{ data: product }, { data: affiliate }] = await Promise.all([
    supabaseAdmin.from("products").select("id, is_active").eq("slug", productSlug).maybeSingle(),
    supabaseAdmin.from("affiliates").select("id, status").eq("slug", affiliateSlug).maybeSingle(),
  ]);

  if (!product || !product.is_active) return { ok: false, status: 404 } as const;
  if (!affiliate || affiliate.status !== "active") return { ok: false, status: 404 } as const;

  const { data: ap } = await supabaseAdmin
    .from("affiliate_products")
    .select("status")
    .eq("affiliate_id", affiliate.id)
    .eq("product_id", product.id)
    .maybeSingle();

  if (!ap || ap.status !== "approved") return { ok: false, status: 403 } as const;

  await supabaseAdmin.from("leads").insert({
    affiliate_id: affiliate.id,
    product_id: product.id,
    status: "initiated_conversation",
    conversation_started_at: new Date().toISOString(),
  });

  return { ok: true, status: 200 } as const;
}
