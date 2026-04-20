// Server functions: gerencia payouts e dispara emails.
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { createClient } from "@supabase/supabase-js";
import { getRequestHeader } from "@tanstack/react-start/server";
import type { Database } from "@/integrations/supabase/types";
import { sendEmail, renderEmail } from "./email";

function getUserClient() {
  const auth = getRequestHeader("authorization");
  if (!auth) throw new Error("Não autenticado");
  return createClient<Database>(process.env.SUPABASE_URL!, process.env.SUPABASE_ANON_KEY!, {
    global: { headers: { Authorization: auth } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

function getAdminClient() {
  return createClient<Database>(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

const fmtBRL = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

async function notifyAffiliate(payoutId: string, kind: "approved" | "rejected" | "paid") {
  const admin = getAdminClient();
  const { data: p } = await admin
    .from("payouts")
    .select("id, amount_requested, amount_paid, rejected_reason, proof_file_url, affiliates(full_name, email)")
    .eq("id", payoutId)
    .maybeSingle();
  if (!p?.affiliates?.email) return;
  const aff = p.affiliates;
  const amount = Number(p.amount_paid ?? p.amount_requested ?? 0);
  let subject = "", title = "", body = "";
  if (kind === "approved") {
    subject = "Sua solicitação de saque foi aprovada";
    title = "Saque aprovado ✓";
    body = `<p>Olá <b>${aff.full_name}</b>,</p><p>Sua solicitação de saque de <b>${fmtBRL(amount)}</b> foi aprovada e está aguardando o pagamento.</p>`;
  } else if (kind === "rejected") {
    subject = "Sua solicitação de saque foi rejeitada";
    title = "Saque rejeitado";
    body = `<p>Olá <b>${aff.full_name}</b>,</p><p>Sua solicitação de saque foi rejeitada.</p>${p.rejected_reason ? `<p><b>Motivo:</b> ${p.rejected_reason}</p>` : ""}<p>Entre em contato com o suporte se tiver dúvidas.</p>`;
  } else {
    subject = "Pagamento realizado!";
    title = "Pagamento concluído 🎉";
    body = `<p>Olá <b>${aff.full_name}</b>,</p><p>Seu pagamento de <b>${fmtBRL(amount)}</b> foi realizado.</p><p>O comprovante está disponível no painel.</p>`;
  }
  await sendEmail({
    to: aff.email,
    subject,
    html: renderEmail({ title, bodyHtml: body, preheader: subject }),
  });
}

export const requestPayoutFn = createServerFn({ method: "POST" })
  .inputValidator(z.object({ affiliate_id: z.string().uuid() }))
  .handler(async ({ data }) => {
    const sb = getUserClient();
    const { data: id, error } = await sb.rpc("request_payout", { _affiliate_id: data.affiliate_id });
    if (error) throw new Error(error.message);
    // notifica admin
    const adminEmail = process.env.ADMIN_NOTIFICATION_EMAIL;
    if (adminEmail) {
      const admin = getAdminClient();
      const { data: p } = await admin.from("payouts").select("amount_requested, affiliates(full_name, email)").eq("id", id as string).maybeSingle();
      if (p) {
        await sendEmail({
          to: adminEmail,
          subject: "Nova solicitação de saque",
          html: renderEmail({
            title: "Nova solicitação de saque",
            bodyHtml: `<p><b>${p.affiliates?.full_name}</b> (${p.affiliates?.email}) solicitou um saque de <b>${fmtBRL(Number(p.amount_requested ?? 0))}</b>.</p>`,
            ctaUrl: "https://firefly-affiliates.lovable.app/admin/payouts",
            ctaLabel: "Ver no painel",
          }),
        });
      }
    }
    return { id };
  });

export const approvePayoutFn = createServerFn({ method: "POST" })
  .inputValidator(z.object({ payout_id: z.string().uuid() }))
  .handler(async ({ data }) => {
    const sb = getUserClient();
    const { error } = await sb.rpc("approve_payout", { _payout_id: data.payout_id });
    if (error) throw new Error(error.message);
    await notifyAffiliate(data.payout_id, "approved");
    return { ok: true };
  });

export const rejectPayoutFn = createServerFn({ method: "POST" })
  .inputValidator(z.object({ payout_id: z.string().uuid(), reason: z.string().min(1) }))
  .handler(async ({ data }) => {
    const sb = getUserClient();
    const { error } = await sb.rpc("reject_payout", { _payout_id: data.payout_id, _reason: data.reason });
    if (error) throw new Error(error.message);
    await notifyAffiliate(data.payout_id, "rejected");
    return { ok: true };
  });

export const markPayoutPaidFn = createServerFn({ method: "POST" })
  .inputValidator(z.object({
    payout_id: z.string().uuid(),
    amount_paid: z.number().positive(),
    proof_url: z.string().optional(),
    notes: z.string().optional(),
  }))
  .handler(async ({ data }) => {
    const sb = getUserClient();
    const { error } = await sb.rpc("mark_payout_paid", {
      _payout_id: data.payout_id,
      _amount_paid: data.amount_paid,
      _proof_url: data.proof_url,
      _notes: data.notes,
    });
    if (error) throw new Error(error.message);
    await notifyAffiliate(data.payout_id, "paid");
    return { ok: true };
  });
