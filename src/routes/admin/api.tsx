import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Copy, Plus, Trash2, KeyRound } from "lucide-react";
import { formatDateTime } from "@/lib/format";

export const Route = createFileRoute("/admin/api")({ component: ApiPage });

const ENDPOINT = "https://jaajatugxxhwfgthmtia.supabase.co/functions/v1/integration-leads";
const TRACK_EVENT_ENDPOINT = "/api/track-event";

async function sha256(input: string) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(input));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

function ApiPage() {
  const [keys, setKeys] = useState<{ id: string; name: string; key_prefix: string; last_used_at: string | null; created_at: string }[]>([]);
  const [name, setName] = useState("");
  const [newKey, setNewKey] = useState<string | null>(null);
  const [testKey, setTestKey] = useState("");
  const [testEvent, setTestEvent] = useState("conversation_started");
  const [testWhatsappId, setTestWhatsappId] = useState("5511999999999@c.us");
  const [testAffiliateSlug, setTestAffiliateSlug] = useState("");
  const [testLoading, setTestLoading] = useState(false);
  const [testResponse, setTestResponse] = useState<{ status: number; body: unknown } | null>(null);

  const load = async () => {
    const { data } = await supabase.from("api_keys").select("*").order("created_at", { ascending: false });
    setKeys(data ?? []);
  };
  useEffect(() => { load(); }, []);

  const create = async () => {
    if (!name) return toast.error("Dê um nome para a chave");
    const raw = "fire_" + crypto.randomUUID().replace(/-/g, "") + crypto.randomUUID().replace(/-/g, "").slice(0, 8);
    const hash = await sha256(raw);
    const prefix = raw.slice(0, 12) + "…";
    const { error } = await supabase.from("api_keys").insert({ name, key_hash: hash, key_prefix: prefix });
    if (error) return toast.error(error.message);
    setNewKey(raw); setName(""); load();
  };

  const remove = async (id: string) => {
    if (!confirm("Revogar esta chave?")) return;
    await supabase.from("api_keys").delete().eq("id", id);
    load();
  };

  const copy = (text: string) => { navigator.clipboard.writeText(text); toast.success("Copiado!"); };

  const runTest = async () => {
    if (!testKey) return toast.error("Cole uma chave de API para testar");
    if (!testWhatsappId) return toast.error("Informe um whatsapp_id");
    setTestLoading(true);
    setTestResponse(null);
    try {
      const res = await fetch(TRACK_EVENT_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-api-key": testKey },
        body: JSON.stringify({
          whatsapp_id: testWhatsappId,
          event: testEvent,
          affiliate_slug: testAffiliateSlug || undefined,
          customer_name: "Cliente Teste Bot",
          whatsapp_number: "+5511999999999",
          payment_amount: testEvent === "paid" ? 197 : undefined,
        }),
      });
      const body = await res.json().catch(() => ({}));
      setTestResponse({ status: res.status, body });
      if (res.ok) toast.success("Bot simulado com sucesso!");
      else toast.error(`Erro ${res.status}`);
    } catch (e) {
      toast.error((e as Error).message);
      setTestResponse({ status: 0, body: { error: (e as Error).message } });
    } finally {
      setTestLoading(false);
    }
  };

  return (
    <DashboardLayout variant="admin" title="API & Documentação">
      <div className="mb-6">
        <h1 className="font-display text-3xl font-bold">API & Documentação</h1>
        <p className="text-muted-foreground text-sm mt-1">Integre seu backend WhatsApp à plataforma FIRE.</p>
      </div>

      {/* API Keys */}
      <section className="rounded-2xl border border-border bg-card p-6 shadow-card-premium mb-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-primary/15 border border-primary/30 flex items-center justify-center text-primary"><KeyRound className="h-5 w-5" /></div>
            <div>
              <h3 className="font-display font-bold text-lg">Chaves de API</h3>
              <p className="text-xs text-muted-foreground">Use no header <code className="text-primary">X-API-Key</code></p>
            </div>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-2 mb-4">
          <Input placeholder="Nome (ex: Backend WhatsApp)" value={name} onChange={(e) => setName(e.target.value)} />
          <Button onClick={create} className="bg-gradient-fire text-white shadow-fire"><Plus className="h-4 w-4 mr-1" /> Gerar chave</Button>
        </div>

        {newKey && (
          <div className="rounded-xl border border-success/40 bg-success/10 p-4 mb-4">
            <div className="text-xs text-success font-semibold mb-2">⚠️ Copie agora — esta chave NÃO será mostrada novamente:</div>
            <div className="flex gap-2 items-center">
              <code className="flex-1 font-mono text-sm bg-background/60 px-3 py-2 rounded-lg break-all">{newKey}</code>
              <Button size="icon" variant="outline" onClick={() => copy(newKey)}><Copy className="h-4 w-4" /></Button>
            </div>
            <button className="text-xs text-muted-foreground mt-2 underline" onClick={() => setNewKey(null)}>Já copiei, ocultar</button>
          </div>
        )}

        {keys.length > 0 && (
          <div className="rounded-xl border border-border overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-background/40 text-xs uppercase text-muted-foreground">
                <tr><th className="text-left px-4 py-2.5">Nome</th><th className="text-left px-4 py-2.5">Prefixo</th><th className="text-left px-4 py-2.5 hidden md:table-cell">Último uso</th><th className="text-right px-4 py-2.5">Ação</th></tr>
              </thead>
              <tbody>
                {keys.map((k) => (
                  <tr key={k.id} className="border-t border-border/60">
                    <td className="px-4 py-3 font-medium">{k.name}</td>
                    <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{k.key_prefix}</td>
                    <td className="px-4 py-3 hidden md:table-cell text-xs text-muted-foreground">{k.last_used_at ? formatDateTime(k.last_used_at) : "Nunca"}</td>
                    <td className="px-4 py-3 text-right"><Button size="icon" variant="ghost" onClick={() => remove(k.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Documentação */}
      <section className="rounded-2xl border border-border bg-card p-6 md:p-8 shadow-card-premium space-y-8">
        <Block title="Visão geral">
          <p>A FIRE oferece um endpoint principal para receber leads e atualizações de status do seu backend WhatsApp. As comissões são geradas automaticamente quando um lead muda para <Badge>paid</Badge>.</p>
        </Block>

        <Block title="Autenticação">
          <p>Envie o header <Code>X-API-Key</Code> com a chave gerada acima. Alternativamente, pode usar <Code>Authorization: Bearer {`{key}`}</Code>.</p>
        </Block>

        <Block title="Endpoint principal">
          <Endpoint method="POST" url={ENDPOINT} />
          <p className="mt-2">Cria ou atualiza um lead. Se o <Code>whatsapp_id</Code> já existir para o afiliado, o lead é atualizado.</p>
        </Block>

        <Block title="Body (JSON)">
          <Pre>{`{
  "affiliate_slug": "joao",            // OU "affiliate_id"
  "customer_name": "Maria Silva",
  "whatsapp_number": "+5511999999999",
  "whatsapp_id": "5511999999999@c.us",
  "status": "paid",                    // ver lista abaixo
  "payment_amount": 197.00,
  "conversation_started_at": "2026-04-19T10:00:00Z",
  "trial_generated_at": null,
  "payment_generated_at": "2026-04-19T10:30:00Z",
  "paid_at": "2026-04-19T11:00:00Z"
}`}</Pre>
        </Block>

        <Block title="Status aceitos">
          <ul className="grid sm:grid-cols-2 gap-2 text-sm">
            <li><Badge>initiated_conversation</Badge> — Iniciou conversa</li>
            <li><Badge>generated_trial</Badge> — Gerou teste</li>
            <li><Badge>generated_payment</Badge> — Gerou pagamento</li>
            <li><Badge>paid</Badge> — Pagou (gera comissão)</li>
            <li><Badge>not_paid</Badge> — Não pagou</li>
          </ul>
        </Block>

        <Block title="Exemplo cURL">
          <Pre>{`curl -X POST "${ENDPOINT}" \\
  -H "X-API-Key: SUA_CHAVE_AQUI" \\
  -H "Content-Type: application/json" \\
  -d '{
    "affiliate_slug": "joao",
    "customer_name": "Maria Silva",
    "whatsapp_id": "5511999999999@c.us",
    "status": "paid",
    "payment_amount": 197.00
  }'`}</Pre>
        </Block>

        <Block title="Exemplo JavaScript (fetch)">
          <Pre>{`await fetch("${ENDPOINT}", {
  method: "POST",
  headers: {
    "X-API-Key": process.env.FIRE_API_KEY,
    "Content-Type": "application/json"
  },
  body: JSON.stringify({
    affiliate_slug: "joao",
    customer_name: "Maria Silva",
    whatsapp_id: "5511999999999@c.us",
    status: "paid",
    payment_amount: 197.00
  })
});`}</Pre>
        </Block>

        <Block title="Resposta de sucesso (200)">
          <Pre>{`{ "success": true, "lead": { "id": "uuid…", "status": "paid", ... } }`}</Pre>
        </Block>

        <Block title="Códigos de erro">
          <ul className="text-sm space-y-1">
            <li><Code>401</Code> — Chave inválida ou ausente</li>
            <li><Code>404</Code> — Afiliado não encontrado</li>
            <li><Code>400</Code> — Status inválido</li>
            <li><Code>500</Code> — Erro interno</li>
          </ul>
        </Block>

        <Block title="Listar leads (GET)">
          <Endpoint method="GET" url={ENDPOINT} />
          <p className="mt-2">Retorna os 100 leads mais recentes (apenas leitura).</p>
        </Block>
      </section>
    </DashboardLayout>
  );
}

function Block({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="font-display font-bold text-lg mb-3 text-gradient-fire">{title}</h3>
      <div className="text-sm text-muted-foreground space-y-2">{children}</div>
    </div>
  );
}
function Code({ children }: { children: React.ReactNode }) {
  return <code className="font-mono text-xs bg-background/60 px-1.5 py-0.5 rounded text-primary">{children}</code>;
}
function Badge({ children }: { children: React.ReactNode }) {
  return <span className="inline-block font-mono text-xs bg-primary/15 border border-primary/30 text-primary px-2 py-0.5 rounded">{children}</span>;
}
function Pre({ children }: { children: string }) {
  return <pre className="font-mono text-xs bg-background/60 border border-border rounded-xl p-4 overflow-x-auto whitespace-pre">{children}</pre>;
}
function Endpoint({ method, url }: { method: string; url: string }) {
  return (
    <div className="flex items-center gap-2 flex-wrap">
      <span className={`text-xs font-bold font-mono px-2.5 py-1 rounded ${method === "POST" ? "bg-success/15 text-success border border-success/30" : "bg-info/15 text-info border border-info/30"}`}>{method}</span>
      <code className="font-mono text-xs text-foreground bg-background/60 px-2 py-1 rounded break-all">{url}</code>
    </div>
  );
}
