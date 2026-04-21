// GET /api/push/vapid-key — retorna a chave pública VAPID (sem auth)
// Rota REST independente para evitar falhas do createServerFn em produção.
import { createFileRoute } from "@tanstack/react-router";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, authorization",
  "Content-Type": "application/json",
  "Cache-Control": "no-store",
};

export const Route = createFileRoute("/api/push/vapid-key")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: cors }),
      GET: async () => {
        const publicKey = process.env.VAPID_PUBLIC_KEY || "";
        if (!publicKey) {
          return new Response(JSON.stringify({ error: "VAPID_PUBLIC_KEY not configured", publicKey: "" }), { status: 500, headers: cors });
        }
        return new Response(JSON.stringify({ publicKey }), { status: 200, headers: cors });
      },
    },
  },
});
