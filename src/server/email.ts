// Server-only Resend helper via Lovable connector gateway.
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

const RESEND_GATEWAY_URL = "https://connector-gateway.lovable.dev/resend/emails";
const DEFAULT_FROM = "FIRE <onboarding@resend.dev>";

export interface SendEmailInput {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  replyTo?: string;
  template?: string;
  context?: Record<string, unknown>;
}

function normalizeFrom(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return DEFAULT_FROM;
  return trimmed.includes("<") ? trimmed : `FIRE <${trimmed}>`;
}

function getSenderCandidates() {
  const candidates = [
    process.env.RESEND_FROM,
    process.env.SMTP_FROM,
    DEFAULT_FROM,
  ]
    .filter((value): value is string => Boolean(value?.trim()))
    .map(normalizeFrom);

  return [...new Set(candidates)];
}

async function parseError(response: Response) {
  const raw = await response.text();
  if (!raw) return `Resend retornou ${response.status}`;

  try {
    const parsed = JSON.parse(raw) as { message?: string; error?: string; name?: string };
    return parsed.message ?? parsed.error ?? parsed.name ?? raw;
  } catch {
    return raw;
  }
}

function canFallbackToSandbox(sender: string, errorMsg: string, status: number) {
  if (sender === DEFAULT_FROM) return false;
  if (![400, 403, 422].includes(status)) return false;

  const normalized = errorMsg.toLowerCase();
  return [
    "verify a domain",
    "verified domain",
    "domain is not verified",
    "valid from address",
    "testing emails",
    "sandbox",
    "from address",
  ].some((snippet) => normalized.includes(snippet));
}

export async function sendEmail(input: SendEmailInput): Promise<{ ok: boolean; error?: string }> {
  const recipients = Array.isArray(input.to) ? input.to : [input.to];
  const recipient = recipients.join(",");
  let okFlag = false;
  let errorMsg: string | undefined;
  try {
    const LOVABLE_API_KEY = process.env.LOVABLE_API_KEY;
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY não configurada");

    const RESEND_API_KEY = process.env.RESEND_API_KEY;
    if (!RESEND_API_KEY) throw new Error("RESEND_API_KEY não configurada");

    const payload = {
      to: recipients,
      subject: input.subject,
      html: input.html,
      text: input.text ?? input.html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim(),
      ...(input.replyTo ? { reply_to: input.replyTo } : {}),
    };

    for (const from of getSenderCandidates()) {
      const response = await fetch(RESEND_GATEWAY_URL, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "X-Connection-Api-Key": RESEND_API_KEY,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ from, ...payload }),
      });

      if (response.ok) {
        okFlag = true;
        errorMsg = undefined;
        break;
      }

      const resendError = await parseError(response);
      errorMsg = resendError;
      if (canFallbackToSandbox(from, resendError, response.status)) continue;
      throw new Error(resendError);
    }

    if (!okFlag) throw new Error(errorMsg ?? "Falha ao enviar email pelo Resend");
  } catch (e) {
    console.error("[email] send failed:", e);
    errorMsg = (e as Error).message;
  }
  // log no banco (best-effort, usa service role)
  try {
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (url && key) {
      const sb = createClient<Database>(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
      await sb.from("email_log").insert({
        recipient,
        subject: input.subject,
        template: input.template ?? null,
        status: okFlag ? "sent" : "failed",
        error: errorMsg ?? null,
        context: (input.context ?? null) as never,
      });
    }
  } catch (logErr) {
    console.error("[email] log failed:", logErr);
  }
  return okFlag ? { ok: true } : { ok: false, error: errorMsg };
}

// Brand wrapper for consistent styling
export function renderEmail(opts: { title: string; preheader?: string; bodyHtml: string; ctaUrl?: string; ctaLabel?: string }) {
  const { title, preheader = "", bodyHtml, ctaUrl, ctaLabel } = opts;
  const cta = ctaUrl && ctaLabel
    ? `<div style="text-align:center;margin:32px 0"><a href="${ctaUrl}" style="background:#f97316;color:#fff;text-decoration:none;padding:14px 28px;border-radius:10px;font-weight:600;display:inline-block">${ctaLabel}</a></div>`
    : "";
  return `<!doctype html><html><head><meta charset="utf-8"><title>${title}</title></head>
<body style="margin:0;background:#f5f5f5;font-family:-apple-system,Segoe UI,Roboto,sans-serif;color:#1a1a1a">
<span style="display:none;opacity:0;visibility:hidden">${preheader}</span>
<div style="max-width:560px;margin:0 auto;padding:32px 16px">
  <div style="background:#fff;border-radius:16px;padding:32px;box-shadow:0 2px 8px rgba(0,0,0,0.06)">
    <div style="font-weight:700;font-size:20px;color:#f97316;margin-bottom:8px">FIRE</div>
    <h1 style="font-size:22px;margin:0 0 16px">${title}</h1>
    <div style="font-size:15px;line-height:1.6;color:#333">${bodyHtml}</div>
    ${cta}
  </div>
  <div style="text-align:center;font-size:12px;color:#888;margin-top:16px">FIRE — Programa de Afiliados</div>
</div></body></html>`;
}
