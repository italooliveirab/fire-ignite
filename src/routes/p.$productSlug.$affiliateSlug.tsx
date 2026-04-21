import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Flame, Loader2 } from "lucide-react";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

export const Route = createFileRoute("/p/$productSlug/$affiliateSlug")({
  server: {
    handlers: {
      // Anonymous lead-tracking endpoint. Public POST — no auth required.
      // Uses service role to bypass RLS (insert into leads).
      POST: async ({ request }) => {
        try {
          const url = new URL(request.url);
          // /p/{productSlug}/{affiliateSlug}
          const parts = url.pathname.split("/").filter(Boolean);
          const productSlug = decodeURIComponent(parts[1] ?? "");
          const affiliateSlug = decodeURIComponent(parts[2] ?? "");

          if (!productSlug || !affiliateSlug) {
            return new Response(JSON.stringify({ ok: false }), { status: 400 });
          }

          const ua = request.headers.get("user-agent") ?? null;
          const referrer = request.headers.get("referer") ?? null;
          const ipRaw = request.headers.get("cf-connecting-ip")
            ?? request.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
            ?? null;
          let ipHash: string | null = null;
          if (ipRaw) {
            try {
              const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(ipRaw));
              ipHash = Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("").slice(0, 32);
            } catch { /* noop */ }
          }

          const { data: product } = await supabaseAdmin
            .from("products").select("id, is_active").eq("slug", productSlug).maybeSingle();

          if (!product || !product.is_active) {
            // log click anyway with null product
            await supabaseAdmin.from("link_clicks").insert({
              product_slug: productSlug, affiliate_slug: affiliateSlug,
              ip_hash: ipHash, user_agent: ua, referrer,
            });
            return new Response(JSON.stringify({ ok: false }), { status: 404 });
          }

          // 1) Try to resolve via custom_slug for this product
          let affiliateId: string | null = null;
          const { data: customMatch } = await supabaseAdmin
            .from("affiliate_products")
            .select("affiliate_id, status")
            .eq("product_id", product.id)
            .eq("custom_slug", affiliateSlug)
            .eq("status", "approved")
            .maybeSingle();

          if (customMatch) {
            affiliateId = customMatch.affiliate_id;
          } else {
            // 2) Fallback: default affiliate slug + must have approved affiliation
            const { data: affiliate } = await supabaseAdmin
              .from("affiliates").select("id, status").eq("slug", affiliateSlug).maybeSingle();
            if (!affiliate || affiliate.status !== "active") {
              return new Response(JSON.stringify({ ok: false }), { status: 404 });
            }
            const { data: ap } = await supabaseAdmin
              .from("affiliate_products")
              .select("status")
              .eq("affiliate_id", affiliate.id)
              .eq("product_id", product.id)
              .maybeSingle();
            if (!ap || ap.status !== "approved") {
              return new Response(JSON.stringify({ ok: false }), { status: 403 });
            }
            affiliateId = affiliate.id;
          }

          // Always log the click first (even if lead insert fails)
          await supabaseAdmin.from("link_clicks").insert({
            product_id: product.id,
            affiliate_id: affiliateId,
            product_slug: productSlug,
            affiliate_slug: affiliateSlug,
            ip_hash: ipHash,
            user_agent: ua,
            referrer,
          });

          await supabaseAdmin.from("leads").insert({
            affiliate_id: affiliateId,
            product_id: product.id,
            status: "initiated_conversation",
            conversation_started_at: new Date().toISOString(),
          });

          return new Response(JSON.stringify({ ok: true }), { status: 200 });
        } catch (e) {
          console.error("[p/track] error:", e);
          return new Response(JSON.stringify({ ok: false }), { status: 500 });
        }
      },
    },
  },
  component: PublicLandingRedirect,
});

interface RouteData {
  product: { name: string; slug: string } | null;
  affiliate: { full_name: string; slug: string } | null;
  whatsapp: string | null;
  companyName: string;
  approved: boolean;
}

function PublicLandingRedirect() {
  const { productSlug, affiliateSlug } = Route.useParams();
  const [data, setData] = useState<RouteData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      try {
        // Use the public anon client — RLS allows reading active products,
        // affiliates (public ranking policy), settings, and approved affiliations.
        const { supabase } = await import("@/integrations/supabase/client");

        const [productRes, settingsRes] = await Promise.all([
          supabase.from("products").select("id, name, slug, is_active").eq("slug", productSlug).maybeSingle(),
          supabase.from("settings").select("support_whatsapp, company_name").limit(1).maybeSingle(),
        ]);

        const product = productRes.data;
        const settings = settingsRes.data;

        if (!product || !product.is_active) { setError("Produto indisponível."); return; }

        // Resolve affiliate: try custom_slug first, then default slug
        let affiliateRow: { id: string; full_name: string; slug: string; status: string } | null = null;

        const { data: customMatch } = await supabase
          .from("affiliate_products")
          .select("affiliate_id, status, affiliate:affiliates(id, full_name, slug, status)")
          .eq("product_id", product.id)
          .eq("custom_slug", affiliateSlug)
          .eq("status", "approved")
          .maybeSingle();

        if (customMatch?.affiliate) {
          affiliateRow = customMatch.affiliate as unknown as typeof affiliateRow;
        } else {
          const { data: affiliate } = await supabase
            .from("affiliates").select("id, full_name, slug, status").eq("slug", affiliateSlug).maybeSingle();
          if (!affiliate || affiliate.status !== "active") { setError("Afiliado não encontrado."); return; }
          const { data: ap } = await supabase
            .from("affiliate_products")
            .select("status")
            .eq("affiliate_id", affiliate.id)
            .eq("product_id", product.id)
            .maybeSingle();
          if (ap?.status !== "approved") { setError("Este link não está mais ativo."); return; }
          affiliateRow = affiliate;
        }

        if (!affiliateRow || affiliateRow.status !== "active") { setError("Afiliado não encontrado."); return; }
        const affiliate = affiliateRow;
        const approved = true;

        if (cancelled) return;
        setData({
          product: { name: product.name, slug: product.slug },
          affiliate: { full_name: affiliate.full_name, slug: affiliate.slug },
          whatsapp: settings?.support_whatsapp ?? null,
          companyName: settings?.company_name ?? "FIRE",
          approved,
        });

        // Fire-and-forget: track the lead via the server POST endpoint
        fetch(window.location.pathname, { method: "POST" }).catch(() => undefined);

        // Redirect to WhatsApp shortly after — fallback to official sales number
        const OFFICIAL_WHATSAPP = "5575883306130";
        const phone = (settings?.support_whatsapp ?? "").replace(/\D/g, "") || OFFICIAL_WHATSAPP;
        const trackingCode = `${product.slug}-${affiliate.slug}`;
        const msg = encodeURIComponent(
          `Olá! Vim pelo link do afiliado *${affiliate.full_name}* e quero saber mais sobre *${product.name}*.\n\n_Código de rastreamento: ${trackingCode}_`,
        );
        setTimeout(() => {
          window.location.href = `https://wa.me/${phone}?text=${msg}`;
        }, 1200);
      } catch (e) {
        console.error(e);
        setError("Não foi possível abrir o atendimento. Tente novamente em instantes.");
      }
    };
    run();
    return () => { cancelled = true; };
  }, [productSlug, affiliateSlug]);

  return (
    <div className="min-h-screen relative flex items-center justify-center px-4 overflow-hidden">
      <div className="absolute inset-0 -z-10">
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[700px] h-[500px] bg-primary/25 rounded-full blur-[160px]" />
      </div>

      <div className="w-full max-w-md text-center">
        <div className="mx-auto mb-6 h-14 w-14 rounded-xl bg-gradient-fire flex items-center justify-center shadow-fire">
          <Flame className="h-7 w-7 text-white" />
        </div>

        {error ? (
          <>
            <h1 className="font-display text-2xl font-bold mb-2">{error}</h1>
            <p className="text-sm text-muted-foreground">
              Se o problema persistir, fale diretamente com a {data?.companyName ?? "FIRE"}.
            </p>
          </>
        ) : !data ? (
          <>
            <h1 className="font-display text-2xl font-bold mb-2">Abrindo atendimento…</h1>
            <p className="text-sm text-muted-foreground flex items-center justify-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" /> Carregando informações
            </p>
          </>
        ) : (
          <>
            <div className="text-xs uppercase tracking-wider text-muted-foreground mb-2">
              Indicado por <span className="text-primary font-semibold">{data.affiliate?.full_name}</span>
            </div>
            <h1 className="font-display text-3xl font-bold mb-3">{data.product?.name}</h1>
            <p className="text-sm text-muted-foreground mb-6">
              Estamos abrindo seu WhatsApp para falar com a equipe {data.companyName}…
            </p>
            <div className="inline-flex items-center gap-2 text-sm text-primary">
              <Loader2 className="h-4 w-4 animate-spin" /> Redirecionando
            </div>
          </>
        )}
      </div>
    </div>
  );
}
