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
export function renderEmail(opts: {
  title: string;
  preheader?: string;
  bodyHtml: string;
  ctaUrl?: string;
  ctaLabel?: string;
  highlightAmount?: string;     // ex.: "R$ 197,00"
  highlightLabel?: string;      // ex.: "Comissão" / "Valor da venda"
  logoUrl?: string;             // logo do settings
  companyName?: string;         // nome da empresa
}) {
  const { title, preheader = "", bodyHtml, ctaUrl, ctaLabel, highlightAmount, highlightLabel, logoUrl, companyName = "FIRE" } = opts;
  const cta = ctaUrl && ctaLabel
    ? `<div style="text-align:center;margin:28px 0 8px">
         <a href="${ctaUrl}" style="background:linear-gradient(135deg,#f97316,#ea580c);color:#fff;text-decoration:none;padding:14px 32px;border-radius:12px;font-weight:700;display:inline-block;box-shadow:0 6px 16px rgba(249,115,22,0.35)">${ctaLabel}</a>
       </div>` : "";
  const highlight = highlightAmount
    ? `<div style="background:linear-gradient(135deg,#fff7ed,#ffedd5);border:1px solid #fdba74;border-radius:14px;padding:20px;text-align:center;margin:20px 0">
         ${highlightLabel ? `<div style="font-size:11px;letter-spacing:1.5px;text-transform:uppercase;color:#9a3412;font-weight:600">${highlightLabel}</div>` : ""}
         <div style="font-size:34px;font-weight:800;color:#ea580c;margin-top:6px;letter-spacing:-1px">${highlightAmount}</div>
       </div>` : "";
  const logo = logoUrl
    ? `<img src="${logoUrl}" alt="${companyName}" style="max-height:42px;max-width:160px;display:block;margin:0 auto 4px"/>`
    : `<div style="font-weight:800;font-size:24px;color:#f97316;letter-spacing:-0.5px;text-align:center">🔥 ${companyName}</div>`;
  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title}</title></head>
<body style="margin:0;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#18181b">
<span style="display:none;opacity:0;visibility:hidden;height:0;width:0;overflow:hidden">${preheader}</span>
<div style="max-width:580px;margin:0 auto;padding:28px 16px">
  <div style="background:#fff;border-radius:18px;padding:32px;box-shadow:0 4px 24px rgba(0,0,0,0.06);border:1px solid #f4f4f5">
    <div style="text-align:center;padding-bottom:20px;border-bottom:1px solid #f4f4f5">
      ${logo}
    </div>
    <h1 style="font-size:22px;margin:24px 0 12px;font-weight:700;color:#0f172a;letter-spacing:-0.3px">${title}</h1>
    ${highlight}
    <div style="font-size:15px;line-height:1.65;color:#3f3f46">${bodyHtml}</div>
    ${cta}
  </div>
  <div style="text-align:center;font-size:11px;color:#a1a1aa;margin-top:20px;letter-spacing:0.3px">${companyName} — Programa de Afiliados</div>
</div></body></html>`;
}

/** Busca branding (logo + nome) do settings, usado em emails. */
export async function getEmailBranding(): Promise<{ logoUrl?: string; companyName?: string }> {
  try {
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) return {};
    const sb = createClient<Database>(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
    const { data } = await sb.from("settings").select("logo_url, company_name").limit(1).maybeSingle();
    return { logoUrl: data?.logo_url ?? undefined, companyName: data?.company_name ?? "FIRE" };
  } catch { return {}; }
}
