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