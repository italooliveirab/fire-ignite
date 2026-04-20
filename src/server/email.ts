// Server-only SMTP helper. Configure via env: SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASSWORD, SMTP_FROM
import nodemailer from "nodemailer";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

let _transporter: nodemailer.Transporter | null = null;

function getTransporter() {
  if (_transporter) return _transporter;
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT ?? 465);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASSWORD;
  if (!host || !user || !pass) {
    throw new Error("SMTP não configurado: defina SMTP_HOST, SMTP_USER, SMTP_PASSWORD");
  }
  _transporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465, // true para 465, false para 587/STARTTLS
    auth: { user, pass },
  });
  return _transporter;
}

export interface SendEmailInput {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  replyTo?: string;
  template?: string;
  context?: Record<string, unknown>;
}

export async function sendEmail(input: SendEmailInput): Promise<{ ok: boolean; error?: string }> {
  const recipient = Array.isArray(input.to) ? input.to.join(",") : input.to;
  let okFlag = false;
  let errorMsg: string | undefined;
  try {
    const from = process.env.SMTP_FROM ?? process.env.SMTP_USER!;
    const transporter = getTransporter();
    await transporter.sendMail({
      from,
      to: recipient,
      subject: input.subject,
      html: input.html,
      text: input.text ?? input.html.replace(/<[^>]+>/g, ""),
      replyTo: input.replyTo,
    });
    okFlag = true;
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
