// Server-only helpers (not server functions) for lead-related notifications.
// Kept separate from notifications.ts so client bundles importing server functions
// don't pull nodemailer through tree-shaking edge cases.
import { sendEmail, renderEmail, getEmailBranding } from "./email";

export async function notifyAdminLeadPaid(opts: {
  customer_name?: string | null;
  whatsapp_number?: string | null;
  affiliate_name?: string | null;
  product_name?: string | null;
  amount?: number | null;
  admin_email?: string | null;
}) {
  const adminEmail = opts.admin_email || process.env.ADMIN_NOTIFICATION_EMAIL;
  if (!adminEmail) {
    console.warn("[notify] ADMIN_NOTIFICATION_EMAIL not set; skipping paid notification");
    return { ok: false, error: "ADMIN_NOTIFICATION_EMAIL not configured" };
  }
  const valor = opts.amount != null ? `R$ ${Number(opts.amount).toFixed(2).replace(".", ",")}` : "—";
  const brand = await getEmailBranding();
  const body = `
    <p>🎉 Um novo pagamento foi confirmado!</p>
    <table style="width:100%;border-collapse:collapse;margin:16px 0">
      <tr><td style="padding:8px;border-bottom:1px solid #eee"><b>Cliente</b></td><td style="padding:8px;border-bottom:1px solid #eee">${opts.customer_name ?? "—"}</td></tr>
      <tr><td style="padding:8px;border-bottom:1px solid #eee"><b>WhatsApp</b></td><td style="padding:8px;border-bottom:1px solid #eee">${opts.whatsapp_number ?? "—"}</td></tr>
      <tr><td style="padding:8px;border-bottom:1px solid #eee"><b>Afiliado</b></td><td style="padding:8px;border-bottom:1px solid #eee">${opts.affiliate_name ?? "—"}</td></tr>
      <tr><td style="padding:8px;border-bottom:1px solid #eee"><b>Produto</b></td><td style="padding:8px;border-bottom:1px solid #eee">${opts.product_name ?? "—"}</td></tr>
      <tr><td style="padding:8px"><b>Valor</b></td><td style="padding:8px;color:#16a34a;font-weight:600">${valor}</td></tr>
    </table>
  `;
  return await sendEmail({
    to: adminEmail,
    subject: `💰 Nova venda confirmada — ${valor}`,
    html: renderEmail({
      title: "Nova venda confirmada",
      preheader: `Pagamento de ${valor} recebido`,
      bodyHtml: body,
      highlightAmount: valor,
      highlightLabel: "Valor da venda",
      logoUrl: brand.logoUrl,
      companyName: brand.companyName,
      ctaUrl: "https://firefly-affiliates.lovable.app/admin/leads",
      ctaLabel: "Ver no painel",
    }),
    template: "admin_lead_paid",
    context: { ...opts, amount: opts.amount ?? null },
  });
}

export async function notifyAffiliateLeadPaid(opts: {
  affiliate_email: string;
  affiliate_name?: string | null;
  customer_name?: string | null;
  product_name?: string | null;
  payment_amount?: number | null;
  commission_amount?: number | null;
}) {
  const valor = opts.payment_amount != null ? `R$ ${Number(opts.payment_amount).toFixed(2).replace(".", ",")}` : "—";
  const comissao = opts.commission_amount != null ? `R$ ${Number(opts.commission_amount).toFixed(2).replace(".", ",")}` : "—";
  const brand = await getEmailBranding();
  const body = `
    <p>Olá <b>${opts.affiliate_name ?? "afiliado(a)"}</b>, ótima notícia! 🎉</p>
    <p>Uma das suas indicações acabou de ser confirmada como <b>paga</b>.</p>
    <table style="width:100%;border-collapse:collapse;margin:16px 0">
      <tr><td style="padding:8px;border-bottom:1px solid #eee"><b>Cliente</b></td><td style="padding:8px;border-bottom:1px solid #eee">${opts.customer_name ?? "—"}</td></tr>
      <tr><td style="padding:8px;border-bottom:1px solid #eee"><b>Produto</b></td><td style="padding:8px;border-bottom:1px solid #eee">${opts.product_name ?? "—"}</td></tr>
      <tr><td style="padding:8px;border-bottom:1px solid #eee"><b>Valor da venda</b></td><td style="padding:8px;border-bottom:1px solid #eee">${valor}</td></tr>
      <tr><td style="padding:8px"><b>Sua comissão</b></td><td style="padding:8px;color:#16a34a;font-weight:700;font-size:16px">${comissao}</td></tr>
    </table>
    <p>Continue compartilhando seu link e aumentando seus ganhos!</p>
  `;
  return await sendEmail({
    to: opts.affiliate_email,
    subject: `🎉 Você ganhou ${comissao} de comissão!`,
    html: renderEmail({
      title: "Nova comissão confirmada",
      preheader: `Comissão de ${comissao} liberada`,
      bodyHtml: body,
      highlightAmount: comissao,
      highlightLabel: "Sua comissão",
      logoUrl: brand.logoUrl,
      companyName: brand.companyName,
      ctaUrl: "https://firefly-affiliates.lovable.app/app/commissions",
      ctaLabel: "Ver minhas comissões",
    }),
    template: "affiliate_lead_paid",
    context: { ...opts, payment_amount: opts.payment_amount ?? null, commission_amount: opts.commission_amount ?? null },
  });
}
