import { createFileRoute, Link } from "@tanstack/react-router";
import { Flame, ArrowLeft, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export const Route = createFileRoute("/docs")({ component: PublicDocs });

function CodeBlock({ code }: { code: string }) {
  return (
    <div className="relative group rounded-lg border border-border bg-background/60 my-3">
      <Button
        size="icon"
        variant="ghost"
        className="absolute top-2 right-2 h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
        onClick={() => { navigator.clipboard.writeText(code); toast.success("Copiado!"); }}
      >
        <Copy className="h-3.5 w-3.5" />
      </Button>
      <pre className="text-xs md:text-[13px] font-mono p-4 overflow-x-auto whitespace-pre"><code>{code}</code></pre>
    </div>
  );
}

const EVENTS: { event: string; status: string; descricao: string }[] = [
  { event: "link_clicked", status: "—", descricao: "Cliente clicou no link de afiliado (registra em link_clicks, não cria lead)" },
  { event: "conversation_started", status: "initiated_conversation", descricao: "Cliente iniciou conversa no WhatsApp" },
  { event: "trial_requested", status: "generated_trial", descricao: "Cliente pediu teste grátis" },
  { event: "support_received", status: "support_received", descricao: "Cliente recebeu suporte/atendimento" },
  { event: "payment_generated", status: "generated_payment", descricao: "Cobrança/PIX foi gerado para o cliente" },
  { event: "paid", status: "paid", descricao: "Cliente pagou (1ª compra) — dispara comissões automaticamente" },
  { event: "renewed", status: "renewed", descricao: "Cliente renovou plano — incrementa ciclo de pagamento" },
  { event: "not_paid", status: "not_paid", descricao: "Cliente não concluiu o pagamento" },
  { event: "lost", status: "lost", descricao: "Cliente perdido (sem retorno)" },
  { event: "abandoned", status: "not_paid", descricao: "Cliente abandonou o atendimento" },
];

function PublicDocs() {
  const trackEventCurl = `curl -X POST https://firefly-affiliates.lovable.app/api/track-event \\
  -H "Content-Type: application/json" \\
  -H "x-api-key: SUA_CHAVE_AQUI" \\
  -d '{
    "event": "conversation_started",
    "whatsapp_id": "5575988306130@c.us",
    "whatsapp_number": "+55 75 98830-6130",
    "customer_name": "João Silva",
    "affiliate_slug": "joaoaff",
    "product_slug": "fire-pro"
  }'`;

  const linkClickCurl = `curl -X POST https://firefly-affiliates.lovable.app/api/track-event \\
  -H "Content-Type: application/json" \\
  -H "x-api-key: SUA_CHAVE_AQUI" \\
  -d '{
    "event": "link_clicked",
    "whatsapp_id": "anon-' + Date.now() + '",
    "affiliate_slug": "joaoaff",
    "product_slug": "fire-pro",
    "referrer": "https://instagram.com/...",
    "user_agent": "Mozilla/5.0 ..."
  }'`;

  const paidCurl = `curl -X POST https://firefly-affiliates.lovable.app/api/track-event \\
  -H "Content-Type: application/json" \\
  -H "x-api-key: SUA_CHAVE_AQUI" \\
  -d '{
    "event": "paid",
    "whatsapp_id": "5575988306130@c.us",
    "payment_amount": 49.90
  }'`;

  const renewedCurl = `curl -X POST https://firefly-affiliates.lovable.app/api/track-event \\
  -H "Content-Type: application/json" \\
  -H "x-api-key: SUA_CHAVE_AQUI" \\
  -d '{
    "event": "renewed",
    "whatsapp_id": "5575988306130@c.us",
    "payment_amount": 49.90
  }'`;

  const leadsGet = `curl "https://firefly-affiliates.lovable.app/api/leads?status=paid&limit=50" \\
  -H "x-api-key: SUA_CHAVE_AQUI"`;

  const statsGet = `curl "https://firefly-affiliates.lovable.app/api/stats?affiliate_slug=joaoaff" \\
  -H "x-api-key: SUA_CHAVE_AQUI"`;

  return (
    <div className="min-h-screen px-4 py-10">
      <div className="max-w-4xl mx-auto">
        <Link to="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary mb-8">
          <ArrowLeft className="h-4 w-4" /> Voltar
        </Link>
        <div className="flex items-center gap-3 mb-3">
          <div className="h-11 w-11 rounded-xl bg-gradient-fire flex items-center justify-center shadow-fire"><Flame className="h-6 w-6 text-white" /></div>
          <h1 className="font-display text-4xl font-bold">API FIRE</h1>
        </div>
        <p className="text-muted-foreground mb-10">Documentação para o time do bot do WhatsApp e integrações externas. Todos os endpoints exigem o header <code className="text-primary text-sm">x-api-key</code>. Solicite sua chave no painel admin → <strong>API & Docs</strong>.</p>

        {/* Autenticação */}
        <section className="mb-10">
          <h2 className="font-display text-2xl font-bold mb-2">Autenticação</h2>
          <p className="text-sm text-muted-foreground mb-2">Envie sua chave em <strong>todos</strong> os requests via header:</p>
          <CodeBlock code={`x-api-key: SUA_CHAVE_AQUI`} />
          <p className="text-xs text-muted-foreground">Alternativa: <code>Authorization: Bearer SUA_CHAVE_AQUI</code></p>
        </section>

        {/* POST /api/track-event */}
        <section className="mb-10">
          <h2 className="font-display text-2xl font-bold mb-2">POST <span className="text-primary">/api/track-event</span></h2>
          <p className="text-sm text-muted-foreground mb-3">Endpoint principal do bot. Atualiza o status do lead (ou cria se ainda não existir) e dispara comissões/notificações automaticamente quando aplicável.</p>

          <h3 className="font-semibold mt-5 mb-2">Eventos suportados</h3>
          <div className="rounded-lg border border-border overflow-hidden">
            <table className="w-full text-xs md:text-sm">
              <thead className="bg-background/50 text-muted-foreground uppercase text-[10px] tracking-wider">
                <tr>
                  <th className="text-left px-3 py-2">event</th>
                  <th className="text-left px-3 py-2">status resultante</th>
                  <th className="text-left px-3 py-2">descrição</th>
                </tr>
              </thead>
              <tbody>
                {EVENTS.map((e) => (
                  <tr key={e.event} className="border-t border-border/50">
                    <td className="px-3 py-2 font-mono text-primary">{e.event}</td>
                    <td className="px-3 py-2 font-mono text-xs text-muted-foreground">{e.status}</td>
                    <td className="px-3 py-2 text-muted-foreground">{e.descricao}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <h3 className="font-semibold mt-6 mb-2">Campos aceitos no body (JSON)</h3>
          <ul className="text-sm text-muted-foreground space-y-1 list-disc pl-5">
            <li><code className="text-primary">event</code> <em>(obrigatório)</em> — um dos eventos da tabela acima</li>
            <li><code className="text-primary">whatsapp_id</code> <em>(obrigatório)</em> — ID único do cliente no WhatsApp (ex: <code>5575988306130@c.us</code>)</li>
            <li><code>affiliate_slug</code> — slug do afiliado (obrigatório se o lead ainda não existir ou para <code>link_clicked</code>)</li>
            <li><code>product_slug</code> — slug do produto</li>
            <li><code>customer_name</code>, <code>whatsapp_number</code> — dados do cliente</li>
            <li><code>payment_amount</code> — valor pago (use em <code>paid</code> e <code>renewed</code>)</li>
            <li><code>referrer</code>, <code>user_agent</code> — metadados de origem (opcional, usado em <code>link_clicked</code>)</li>
          </ul>

          <h3 className="font-semibold mt-6 mb-2">Exemplo: registrar clique no link</h3>
          <CodeBlock code={linkClickCurl} />

          <h3 className="font-semibold mt-6 mb-2">Exemplo: cliente iniciou conversa</h3>
          <CodeBlock code={trackEventCurl} />

          <h3 className="font-semibold mt-6 mb-2">Exemplo: cliente pagou (1ª compra)</h3>
          <CodeBlock code={paidCurl} />

          <h3 className="font-semibold mt-6 mb-2">Exemplo: renovação</h3>
          <CodeBlock code={renewedCurl} />
        </section>

        {/* GET /api/leads */}
        <section className="mb-10">
          <h2 className="font-display text-2xl font-bold mb-2">GET <span className="text-primary">/api/leads</span></h2>
          <p className="text-sm text-muted-foreground mb-2">Lista leads com filtros opcionais. Query params:</p>
          <ul className="text-sm text-muted-foreground space-y-1 list-disc pl-5 mb-3">
            <li><code>status</code> — qualquer um dos status (paid, renewed, lost, etc.)</li>
            <li><code>affiliate_slug</code> — filtra por afiliado</li>
            <li><code>since</code> — data ISO (ex: <code>2025-01-01</code>)</li>
            <li><code>limit</code> — máx 500, default 100</li>
          </ul>
          <CodeBlock code={leadsGet} />
        </section>

        {/* GET /api/stats */}
        <section className="mb-10">
          <h2 className="font-display text-2xl font-bold mb-2">GET <span className="text-primary">/api/stats</span></h2>
          <p className="text-sm text-muted-foreground mb-3">Métricas agregadas (geral ou de um afiliado).</p>
          <CodeBlock code={statsGet} />
        </section>

        {/* Outros endpoints */}
        <section className="mb-10">
          <h2 className="font-display text-2xl font-bold mb-3">Outros endpoints</h2>
          <ul className="text-sm text-muted-foreground space-y-2 list-disc pl-5">
            <li><code className="text-primary">GET /api/affiliates</code> — lista afiliados ativos</li>
            <li><code className="text-primary">GET /api/affiliates/:slug</code> — detalhe de um afiliado</li>
            <li><code className="text-primary">GET /api/products</code> — lista produtos</li>
            <li><code className="text-primary">GET /api/commissions</code> — lista comissões</li>
            <li><code className="text-primary">GET /api/leads/:whatsappId</code> — busca lead por whatsapp_id</li>
          </ul>
        </section>

        {/* Webhooks */}
        <section className="mb-10">
          <h2 className="font-display text-2xl font-bold mb-2">Webhooks de saída</h2>
          <p className="text-sm text-muted-foreground mb-2">Configure URLs no painel admin para receber eventos automaticamente (assinados com HMAC-SHA256). Eventos atuais:</p>
          <ul className="text-sm text-muted-foreground space-y-1 list-disc pl-5">
            <li><code className="text-primary">lead.paid</code> — cliente pagou (com dados do afiliado, produto e comissão)</li>
          </ul>
        </section>

        <div className="text-center text-xs text-muted-foreground border-t border-border pt-6 mt-12">
          Suporte? Acesse o painel admin em <Link to="/admin" className="text-primary hover:underline">/admin</Link> ou faça <Link to="/login" className="text-primary hover:underline">login</Link>.
        </div>
      </div>
    </div>
  );
}
