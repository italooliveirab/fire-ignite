// GET /manifest.webmanifest — manifest dinâmico do PWA usando logo configurada no admin.
import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

export const Route = createFileRoute("/manifest/webmanifest")({
  server: {
    handlers: {
      GET: async () => {
        let companyName = "FIRE";
        let iconUrl = "/brand/fire-icon.png";
        try {
          const { data } = await supabaseAdmin
            .from("settings")
            .select("company_name, logo_url")
            .limit(1)
            .maybeSingle();
          if (data?.company_name) companyName = data.company_name;
          if (data?.logo_url) iconUrl = data.logo_url;
        } catch {
          // fallback values
        }

        const manifest = {
          name: `${companyName} — Afiliados`,
          short_name: companyName,
          description: `Plataforma de afiliados ${companyName} — acompanhe leads, vendas e comissões em tempo real.`,
          start_url: "/app",
          scope: "/",
          display: "standalone",
          orientation: "portrait",
          background_color: "#0a0a0a",
          theme_color: "#ff5722",
          categories: ["business", "finance", "productivity"],
          icons: [
            { src: iconUrl, sizes: "192x192", type: "image/png", purpose: "any" },
            { src: iconUrl, sizes: "512x512", type: "image/png", purpose: "any" },
            { src: iconUrl, sizes: "192x192", type: "image/png", purpose: "maskable" },
            { src: iconUrl, sizes: "512x512", type: "image/png", purpose: "maskable" },
          ],
        };

        return new Response(JSON.stringify(manifest), {
          status: 200,
          headers: {
            "Content-Type": "application/manifest+json; charset=utf-8",
            "Cache-Control": "public, max-age=300",
          },
        });
      },
    },
  },
});