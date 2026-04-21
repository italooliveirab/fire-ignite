// Shared API auth + CORS helpers for public REST endpoints
import crypto from "crypto";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

export const apiCors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, x-api-key, authorization",
  "Content-Type": "application/json",
};

export function sha256(input: string) {
  return crypto.createHash("sha256").update(input).digest("hex");
}

export async function checkApiKey(req: Request): Promise<boolean> {
  const key = req.headers.get("x-api-key") || req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!key) return false;
  const { data } = await supabaseAdmin.from("api_keys").select("id").eq("key_hash", sha256(key)).maybeSingle();
  if (!data) return false;
  await supabaseAdmin.from("api_keys").update({ last_used_at: new Date().toISOString() }).eq("id", data.id);
  return true;
}

export function jsonRes(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: apiCors });
}

export function unauthorized() {
  return jsonRes({ error: "Unauthorized: invalid x-api-key" }, 401);
}

export function optionsRes() {
  return new Response(null, { status: 204, headers: apiCors });
}