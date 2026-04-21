// GET /api/leads/:whatsappId — buscar lead pelo whatsapp_id (para o bot consultar status)
// POST /api/leads/:whatsappId/note — adiciona nota ao lead (POST aqui via body { note })
import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { apiCors, checkApiKey, jsonRes, unauthorized, optionsRes } from "@/lib/api-auth";

export const Route = createFileRoute("/api/leads/$whatsappId")({
  server: {
    handlers: {
      OPTIONS: async () => optionsRes(),
      GET: async ({ request, params }) => {
        try {
          if (!(await checkApiKey(request))) return unauthorized();
          const { data, error } = await supabaseAdmin.from("leads")
            .select("*, affiliates(full_name, slug), products(name, slug), commissions(commission_value, status)")
            .eq("whatsapp_id", params.whatsappId)
            .order("created_at", { ascending: false }).limit(10);
          if (error) throw error;
          if (!data?.length) return jsonRes({ error: "Lead not found" }, 404);
          return jsonRes({ success: true, count: data.length, data });
        } catch (e) {
          return new Response(JSON.stringify({ error: (e as Error).message }), { status: 500, headers: apiCors });
        }
      },
      POST: async ({ request, params }) => {
        // body: { note: string } -> append (substitui notas)
        try {
          if (!(await checkApiKey(request))) return unauthorized();
          const { note } = await request.json();
          if (!note) return jsonRes({ error: "note is required" }, 400);
          const { data: lead } = await supabaseAdmin.from("leads").select("id, notes").eq("whatsapp_id", params.whatsappId).order("created_at", { ascending: false }).limit(1).maybeSingle();
          if (!lead) return jsonRes({ error: "Lead not found" }, 404);
          const stamp = new Date().toISOString();
          const merged = lead.notes ? `${lead.notes}\n[${stamp}] ${note}` : `[${stamp}] ${note}`;
          const { data: updated, error } = await supabaseAdmin.from("leads").update({ notes: merged }).eq("id", lead.id).select().single();
          if (error) throw error;
          return jsonRes({ success: true, lead: updated });
        } catch (e) {
          return new Response(JSON.stringify({ error: (e as Error).message }), { status: 500, headers: apiCors });
        }
      },
    },
  },
});