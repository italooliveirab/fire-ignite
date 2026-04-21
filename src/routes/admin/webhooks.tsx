import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Plus, Trash2, Webhook, PlayCircle, Eye, Copy, RefreshCw } from "lucide-react";
import { formatDateTime } from "@/lib/format";

export const Route = createFileRoute("/admin/webhooks")({ component: WebhooksPage });

const ALL_EVENTS = [
  { id: "lead.paid", label: "Lead pago", desc: "Quando um lead muda para 'paid'" },
];

type Webhook = {
  id: string;
  name: string;
  url: string;
  secret: string;
  events: string[];
  is_active: boolean;
  created_at: string;
};

type Delivery = {
  id: string;
  webhook_id: string;
  event: string;
  status: string;
  http_status: number | null;
  attempts: number;
  error: string | null;
  response_body: string | null;
  payload: unknown;
  created_at: string;
  delivered_at: string | null;
};

function WebhooksPage() {
  const [list, setList] = useState<Webhook[]>([]);
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [events, setEvents] = useState<string[]>(["lead.paid"]);
  const [showSecret, setShowSecret] = useState<string | null>(null);
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [openLogs, setOpenLogs] = useState<string | null>(null);

  const load = async () => {
    const { data } = await supabase.from("webhooks").select("*").order("created_at", { ascending: false });
    setList((data ?? []) as Webhook[]);
  };
  useEffect(() => { load(); }, []);

  const create = async () => {
    if (!name || !url) return toast.error("Preencha nome e URL");
    try { new URL(url); } catch { return toast.error("URL inválida"); }
    const secret = "whsec_" + crypto.randomUUID().replace(/-/g, "") + crypto.randomUUID().replace(/-/g, "").slice(0, 16);
    const { error } = await supabase.from("webhooks").insert({ name, url, secret, events, is_active: true });
    if (error) return toast.error(error.message);
    toast.success("Webhook criado!");
    setName(""); setUrl(""); setEvents(["lead.paid"]);
    load();
  };

  const remove = async (id: string) => {
    if (!confirm("Remover este webhook? O histórico de entregas também será apagado.")) return;
    await supabase.from("webhooks").delete().eq("id", id);
    load();
  };

  const toggleActive = async (w: Webhook) => {
    await supabase.from("webhooks").update({ is_active: !w.is_active }).eq("id", w.id);
    load();
  };

  const rotate = async (id: string) => {
    if (!confirm("Gerar um novo segredo? Você precisará atualizar o sistema externo.")) return;
    const secret = "whsec_" + crypto.randomUUID().replace(/-/g, "") + crypto.randomUUID().replace(/-/g, "").slice(0, 16);
    await supabase.from("webhooks").update({ secret }).eq("id", id);
    setShowSecret(id);
    toast.success("Segredo rotacionado");
    load();
  };

  const test = async (id: string) => {
    const session = (await supabase.auth.getSession()).data.session;
    if (!session) return toast.error("Sem sessão");
    const res = await fetch("/api/webhooks/test", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` },
      body: JSON.stringify({ webhook_id: id }),
    });
    if (res.ok) toast.success("Webhook de teste enviado! Veja o log abaixo.");
    else toast.error(`Erro ${res.status}`);
    setTimeout(() => loadDeliveries(id), 800);
  };

  const loadDeliveries = async (webhookId: string) => {
    setOpenLogs(webhookId);
    const { data } = await supabase
      .from("webhook_deliveries")
      .select("*")
      .eq("webhook_id", webhookId)
      .order("created_at", { ascending: false })
      .limit(20);
    setDeliveries((data ?? []) as Delivery[]);
  };

  const copy = (t: string) => { navigator.clipboard.writeText(t); toast.success("Copiado!"); };

  return (
    <DashboardLayout variant="admin">
      <div className="mb-6">
        <h1 className="font-display text-3xl font-bold flex items-center gap-3">
          <Webhook className="w-8 h-8 text-primary" /> Webhooks
        </h1>
        <p className="text-muted-foreground mt-1">Notifique sistemas externos em tempo real quando eventos importantes acontecerem na FIRE.</p>
      </div>

      {/* Create */}
      <section className="rounded-2xl border border-border bg-card p-6 mb-6">
        <h2 className="font-display font-bold text-xl mb-4">Novo webhook</h2>
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <Label>Nome interno</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Bot WhatsApp Vendas" />
          </div>
          <div>
            <Label>URL de destino</Label>
            <Input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://meu-bot.com/webhook" />
          </div>
        </div>
        <div className="mt-4">
          <Label className="block mb-2">Eventos assinados</Label>
          <div className="flex flex-wrap gap-2">
            {ALL_EVENTS.map((ev) => {
              const active = events.includes(ev.id);
              return (
                <button
                  key={ev.id}
                  type="button"
                  onClick={() => setEvents((e) => active ? e.filter((x) => x !== ev.id) : [...e, ev.id])}
                  className={`px-3 py-1.5 rounded-lg border text-sm font-mono transition ${active ? "bg-primary/15 border-primary text-primary" : "bg-background/40 border-border text-muted-foreground hover:border-primary/40"}`}
                  title={ev.desc}
                >
                  {ev.id}
                </button>
              );
            })}
          </div>
        </div>
        <Button onClick={create} className="mt-4 gap-2">
          <Plus className="w-4 h-4" /> Criar webhook
        </Button>
      </section>

      {/* List */}
      <section className="rounded-2xl border border-border bg-card overflow-hidden">
        <div className="p-6 border-b border-border">
          <h2 className="font-display font-bold text-xl">Webhooks configurados ({list.length})</h2>
        </div>
        {list.length === 0 ? (
          <p className="p-8 text-center text-muted-foreground">Nenhum webhook configurado.</p>
        ) : (
          <ul className="divide-y divide-border">
            {list.map((w) => (
              <li key={w.id} className="p-6 space-y-3">
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-lg">{w.name}</span>
                      <Badge variant={w.is_active ? "default" : "secondary"}>
                        {w.is_active ? "Ativo" : "Pausado"}
                      </Badge>
                      {(w.events ?? []).map((e) => (
                        <span key={e} className="text-xs font-mono px-2 py-0.5 rounded bg-primary/10 text-primary border border-primary/30">{e}</span>
                      ))}
                    </div>
                    <p className="text-xs font-mono text-muted-foreground break-all mt-1">{w.url}</p>
                    <p className="text-xs text-muted-foreground mt-1">Criado em {formatDateTime(w.created_at)}</p>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <Switch checked={w.is_active} onCheckedChange={() => toggleActive(w)} />
                    <Button size="sm" variant="outline" onClick={() => test(w.id)} className="gap-1">
                      <PlayCircle className="w-4 h-4" /> Testar
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => loadDeliveries(w.id)} className="gap-1">
                      <Eye className="w-4 h-4" /> Logs
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => rotate(w.id)} className="gap-1">
                      <RefreshCw className="w-4 h-4" /> Rotacionar
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => remove(w.id)}>
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  </div>
                </div>

                <div className="bg-background/40 rounded-lg p-3 flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-bold text-muted-foreground">Segredo HMAC:</span>
                  <code className="font-mono text-xs flex-1 min-w-0 break-all">
                    {showSecret === w.id ? w.secret : w.secret.slice(0, 12) + "•".repeat(20)}
                  </code>
                  <Button size="sm" variant="ghost" onClick={() => setShowSecret(showSecret === w.id ? null : w.id)}>
                    <Eye className="w-3 h-3" />
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => copy(w.secret)}>
                    <Copy className="w-3 h-3" />
                  </Button>
                </div>

                {openLogs === w.id && (
                  <div className="rounded-lg border border-border bg-background/40 p-4">
                    <h4 className="font-bold mb-3 text-sm">Últimas 20 entregas</h4>
                    {deliveries.length === 0 ? (
                      <p className="text-xs text-muted-foreground">Nenhuma entrega ainda.</p>
                    ) : (
                      <div className="space-y-2">
                        {deliveries.map((d) => (
                          <div key={d.id} className="text-xs font-mono flex items-center gap-3 p-2 rounded bg-card">
                            <span className={`px-2 py-0.5 rounded ${d.status === "delivered" ? "bg-success/15 text-success" : d.status === "failed" ? "bg-destructive/15 text-destructive" : "bg-warning/15 text-warning"}`}>
                              {d.status}
                            </span>
                            <span className="text-primary">{d.event}</span>
                            <span className="text-muted-foreground">HTTP {d.http_status ?? "—"}</span>
                            <span className="text-muted-foreground">tentativas: {d.attempts}</span>
                            <span className="text-muted-foreground ml-auto">{formatDateTime(d.created_at)}</span>
                            {d.error && <span className="text-destructive truncate max-w-xs" title={d.error}>{d.error}</span>}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Docs */}
      <section className="rounded-2xl border border-border bg-card p-6 mt-6 text-sm space-y-3">
        <h2 className="font-display font-bold text-xl">Como verificar a assinatura</h2>
        <p className="text-muted-foreground">Cada POST inclui os headers:</p>
        <ul className="text-xs font-mono space-y-1 ml-4">
          <li><span className="text-primary">X-Fire-Event</span>: nome do evento (ex: <code>lead.paid</code>)</li>
          <li><span className="text-primary">X-Fire-Timestamp</span>: timestamp Unix (segundos)</li>
          <li><span className="text-primary">X-Fire-Signature</span>: <code>sha256=&lt;hex&gt;</code> — HMAC-SHA256 de <code>{`${"{timestamp}.${body}"}`}</code> com seu segredo</li>
          <li><span className="text-primary">X-Fire-Delivery-Id</span>: id único da entrega (para idempotência)</li>
        </ul>
        <pre className="font-mono text-xs bg-background/60 border border-border rounded-xl p-4 overflow-x-auto">{`// Node.js
import crypto from "crypto";
const expected = crypto
  .createHmac("sha256", process.env.WEBHOOK_SECRET)
  .update(\`\${timestamp}.\${rawBody}\`)
  .digest("hex");
const ok = crypto.timingSafeEqual(
  Buffer.from(\`sha256=\${expected}\`),
  Buffer.from(signatureHeader),
);`}</pre>
        <p className="text-muted-foreground">Retentativas automáticas: até 3x com backoff (500ms, 2s). Timeout: 10s.</p>
      </section>
    </DashboardLayout>
  );
}