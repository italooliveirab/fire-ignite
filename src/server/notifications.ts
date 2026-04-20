// Server functions for welcome emails and SMTP tests.
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { sendEmail, renderEmail } from "./email";

export const sendWelcomeEmailFn = createServerFn({ method: "POST" })
  .inputValidator(z.object({
    email: z.string().email(),
    full_name: z.string().min(1),
  }))
  .handler(async ({ data }) => {
    const dashUrl = "https://firefly-affiliates.lovable.app/app";
    const body = `
      <p>Olá <b>${data.full_name}</b>, seja bem-vindo(a) à FIRE! 🔥</p>
      <p>Sua conta de afiliado foi criada com sucesso. Agora você já pode começar a revender nossos produtos e ganhar comissões.</p>
      <p><b>Primeiros passos:</b></p>
      <ol>
        <li>Acesse seu painel e escolha os produtos que deseja revender.</li>
        <li>Pegue seu link único de afiliado em <i>Meu link</i>.</li>
        <li>Compartilhe nas redes sociais e WhatsApp.</li>
        <li>Acompanhe leads, comissões e saques em tempo real.</li>
      </ol>
      <p>Bons negócios!</p>
    `;
    const result = await sendEmail({
      to: data.email,
      subject: "Bem-vindo à FIRE — sua conta de afiliado está pronta",
      html: renderEmail({
        title: "Bem-vindo à FIRE 🔥",
        preheader: "Sua conta de afiliado foi criada com sucesso",
        bodyHtml: body,
        ctaUrl: dashUrl,
        ctaLabel: "Acessar meu painel",
      }),
      template: "welcome",
      context: { email: data.email },
    });
    return result;
  });

export const sendTestEmailFn = createServerFn({ method: "POST" })
  .inputValidator(z.object({ to: z.string().email() }))
  .handler(async ({ data }) => {
    const now = new Date().toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" });
    const result = await sendEmail({
      to: data.to,
      subject: "Teste de envio — FIRE",
      html: renderEmail({
        title: "✅ SMTP funcionando",
        preheader: "Teste de envio do painel admin",
        bodyHtml: `<p>Este é um email de teste enviado em <b>${now}</b>.</p><p>Se você recebeu, suas credenciais SMTP estão configuradas corretamente.</p>`,
      }),
      template: "smtp_test",
      context: { sent_at: now },
    });
    if (!result.ok) throw new Error(result.error ?? "Falha no envio");
    return { ok: true };
  });

// Notifica admin quando um lead vira "paid"
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
      ctaUrl: "https://firefly-affiliates.lovable.app/admin/leads",
      ctaLabel: "Ver no painel",
    }),
    template: "admin_lead_paid",
    context: { ...opts, amount: opts.amount ?? null },
  });
}

// Notifica o afiliado quando seu lead vira "paid"
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
      ctaUrl: "https://firefly-affiliates.lovable.app/app/commissions",
      ctaLabel: "Ver minhas comissões",
    }),
    template: "affiliate_lead_paid",
    context: { ...opts, payment_amount: opts.payment_amount ?? null, commission_amount: opts.commission_amount ?? null },
  });
}