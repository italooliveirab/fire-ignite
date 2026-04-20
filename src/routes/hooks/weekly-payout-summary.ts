import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { sendEmail, renderEmail } from "@/server/email";

export const Route = createFileRoute("/hooks/weekly-payout-summary")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const auth = request.headers.get("authorization");
        const expected = `Bearer ${process.env.SUPABASE_ANON_KEY}`;
        if (auth !== expected) {
          return new Response(JSON.stringify({ error: "unauthorized" }), { status: 401 });
        }
        const adminEmail = process.env.ADMIN_NOTIFICATION_EMAIL;
        if (!adminEmail) {
          return new Response(JSON.stringify({ error: "ADMIN_NOTIFICATION_EMAIL não configurado" }), { status: 400 });
        }
        const sb = createClient<Database>(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
          auth: { persistSession: false, autoRefreshToken: false },
        });
        const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
        const { data: pending, error } = await sb
          .from("payouts")
          .select("id, status, amount_requested, requested_at, affiliates(full_name, email)")
          .in("status", ["requested", "approved"])
          .order("requested_at", { ascending: false });
        if (error) {
          return new Response(JSON.stringify({ error: error.message }), { status: 500 });
        }
        const list = pending ?? [];
        const total = list.reduce((s, p) => s + Number(p.amount_requested ?? 0), 0);
        const fmt = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
        const rows = list.map((p) => `<tr>
          <td style="padding:8px;border-bottom:1px solid #eee">${p.affiliates?.full_name ?? "—"}<br><span style="color:#888;font-size:12px">${p.affiliates?.email ?? ""}</span></td>
          <td style="padding:8px;border-bottom:1px solid #eee"><span style="background:${p.status === "approved" ? "#dbeafe" : "#fef3c7"};color:${p.status === "approved" ? "#1e40af" : "#92400e"};padding:2px 8px;border-radius:999px;font-size:12px">${p.status === "approved" ? "Aprovado" : "Solicitado"}</span></td>
          <td style="padding:8px;border-bottom:1px solid #eee;text-align:right;font-family:monospace">${fmt(Number(p.amount_requested ?? 0))}</td>
        </tr>`).join("");
        const body = list.length === 0
          ? `<p>Nenhuma solicitação pendente nesta semana. ✅</p><p style="color:#888">Período analisado: últimos 7 dias.</p>`
          : `<p>Total pendente: <b>${fmt(total)}</b> em <b>${list.length}</b> solicitação(ões).</p>
             <table style="width:100%;border-collapse:collapse;margin-top:12px">
               <thead><tr style="background:#f5f5f5"><th style="padding:8px;text-align:left">Afiliado</th><th style="padding:8px;text-align:left">Status</th><th style="padding:8px;text-align:right">Valor</th></tr></thead>
               <tbody>${rows}</tbody>
             </table>`;
        const result = await sendEmail({
          to: adminEmail,
          subject: `[FIRE] Resumo semanal — ${list.length} saque(s) pendente(s)`,
          html: renderEmail({
            title: "Resumo semanal de saques",
            preheader: `${list.length} solicitação(ões) pendente(s)`,
            bodyHtml: body,
            ctaUrl: "https://firefly-affiliates.lovable.app/admin/payouts",
            ctaLabel: "Abrir painel de pagamentos",
          }),
        });
        return Response.json({ ok: result.ok, count: list.length, total, error: result.error });
      },
    },
  },
});
