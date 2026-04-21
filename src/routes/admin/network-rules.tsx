import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { DashboardLayout } from "@/components/DashboardLayout";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Settings2, Plus, Trash2, Save, RefreshCw } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Trophy } from "lucide-react";

export const Route = createFileRoute("/admin/network-rules")({ component: AdminNetworkRules });

type Rule = {
  id: string;
  name: string;
  product_id: string | null;
  priority: number;
  is_active: boolean;
  seller_commission_type: "percentage" | "fixed";
  seller_commission_value: number;
  seller_recurrence: "one_time" | "recurring";
  referrer_commission_type: "percentage" | "fixed";
  referrer_commission_value: number;
  referrer_recurrence: "one_time" | "recurring";
};

type Product = { id: string; name: string };

function AdminNetworkRules() {
  const qc = useQueryClient();

  const { data: products = [] } = useQuery({
    queryKey: ["products-min"],
    queryFn: async () => {
      const { data } = await supabase.from("products").select("id, name").order("name");
      return (data ?? []) as Product[];
    },
  });

  const { data: rules = [], isLoading } = useQuery({
    queryKey: ["network-rules"],
    queryFn: async () => {
      const { data } = await supabase.from("network_commission_rules").select("*").order("priority", { ascending: false }).order("created_at", { ascending: false });
      return (data ?? []) as Rule[];
    },
  });

  const productMap = new Map(products.map((p) => [p.id, p.name]));

  // Resolve qual regra vence para cada produto (mesma lógica do trigger SQL):
  // produto específico ativo > regra global ativa, maior prioridade, mais recente
  const winningRulePerProduct = new Map<string, string>(); // productId -> ruleId
  for (const p of products) {
    const candidates = rules.filter((r) => r.is_active && (r.product_id === p.id || r.product_id === null));
    candidates.sort((a, b) => {
      const aSpec = a.product_id === p.id ? 1 : 0;
      const bSpec = b.product_id === p.id ? 1 : 0;
      if (aSpec !== bSpec) return bSpec - aSpec;
      return b.priority - a.priority;
    });
    if (candidates[0]) winningRulePerProduct.set(p.id, candidates[0].id);
  }
  const winningRuleIds = new Set(winningRulePerProduct.values());
  const productsByWinningRule = new Map<string, string[]>();
  for (const [pid, rid] of winningRulePerProduct.entries()) {
    const list = productsByWinningRule.get(rid) ?? [];
    list.push(productMap.get(pid) ?? "");
    productsByWinningRule.set(rid, list);
  }

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("network_commission_rules").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["network-rules"] }); toast.success("Regra removida"); },
    onError: (e) => toast.error("Erro", { description: (e as Error).message }),
  });

  const toggleActive = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase.from("network_commission_rules").update({ is_active }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["network-rules"] }); },
    onError: (e) => toast.error("Erro", { description: (e as Error).message }),
  });

  const recalc = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.rpc("recalculate_network_commissions");
      if (error) throw error;
      return (data?.[0] ?? { processed: 0, skipped: 0 }) as { processed: number; skipped: number };
    },
    onSuccess: (r) => {
      toast.success(`Recálculo concluído`, { description: `Processadas: ${r.processed} · Ignoradas: ${r.skipped}` });
      qc.invalidateQueries({ queryKey: ["network-rules"] });
    },
    onError: (e) => toast.error("Erro ao recalcular", { description: (e as Error).message }),
  });

  return (
    <DashboardLayout variant="admin" title="Regras de Comissão da Rede">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-display text-3xl font-bold flex items-center gap-2"><Settings2 className="h-7 w-7 text-primary" /> Regras de Comissão</h1>
          <p className="text-sm text-muted-foreground mt-1">Defina % do vendedor, do afiliador e a recorrência por produto.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" disabled={recalc.isPending} onClick={() => { if (confirm("Recalcular comissões para todos os leads pagos sem comissão registrada?")) recalc.mutate(); }}>
            <RefreshCw className={`h-4 w-4 mr-2 ${recalc.isPending ? "animate-spin" : ""}`} />
            {recalc.isPending ? "Recalculando..." : "Recalcular comissões"}
          </Button>
          <RuleDialog products={products} mode="create" />
        </div>
      </div>

      {products.length > 0 && rules.length > 0 && (
        <div className="mb-6 rounded-xl border border-border bg-card/50 p-4">
          <div className="text-xs uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1.5">
            <Trophy className="h-3.5 w-3.5" /> Regra aplicada por produto
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {products.map((p) => {
              const winId = winningRulePerProduct.get(p.id);
              const winRule = rules.find((r) => r.id === winId);
              return (
                <div key={p.id} className="flex items-center justify-between rounded-lg border border-border/60 bg-background/40 px-3 py-2 text-sm">
                  <span className="font-medium truncate">{p.name}</span>
                  {winRule ? (
                    <span className="ml-2 text-xs text-muted-foreground flex items-center gap-1.5">
                      →
                      <span className={`font-mono px-2 py-0.5 rounded-full border ${winRule.product_id ? "border-orange-500/30 bg-orange-500/10 text-orange-300" : "border-blue-500/30 bg-blue-500/10 text-blue-300"}`}>
                        {winRule.name}
                      </span>
                    </span>
                  ) : (
                    <span className="text-xs italic text-muted-foreground">sem regra</span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="rounded-2xl border border-border bg-card overflow-hidden shadow-card-premium">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-background/50 border-b border-border text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="text-left px-5 py-3.5">Regra</th>
                <th className="text-left px-5 py-3.5">Produto</th>
                <th className="text-left px-5 py-3.5">Vendedor</th>
                <th className="text-left px-5 py-3.5">Afiliador</th>
                <th className="text-center px-5 py-3.5">Prioridade</th>
                <th className="text-center px-5 py-3.5">Ativa</th>
                <th className="text-right px-5 py-3.5">Ações</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? <tr><td colSpan={7} className="py-12 text-center text-muted-foreground">Carregando...</td></tr>
              : rules.length === 0 ? <tr><td colSpan={7} className="py-12 text-center text-muted-foreground">Nenhuma regra criada. Crie uma para o sistema começar a calcular comissões da rede.</td></tr>
              : rules.map((r) => (
                <tr key={r.id} className="border-b border-border/50 hover:bg-background/40">
                  <td className="px-5 py-3.5 font-medium">
                    <div className="flex items-center gap-2">
                      {r.name}
                      {winningRuleIds.has(r.id) && (
                        <span title={`Aplicada em: ${productsByWinningRule.get(r.id)?.join(", ")}`} className="inline-flex items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-1.5 py-0.5 text-[10px] font-medium text-emerald-300">
                          <Trophy className="h-2.5 w-2.5" /> vence
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-5 py-3.5 text-xs">
                    {r.product_id ? (
                      <span className="inline-flex items-center gap-1.5 rounded-full border border-orange-500/30 bg-orange-500/10 px-2 py-0.5 font-medium text-orange-300">
                        <span className="h-1.5 w-1.5 rounded-full bg-orange-400" />
                        {productMap.get(r.product_id) ?? "Produto removido"}
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 rounded-full border border-blue-500/30 bg-blue-500/10 px-2 py-0.5 font-medium text-blue-300">
                        <span className="h-1.5 w-1.5 rounded-full bg-blue-400" />
                        Global (todos os produtos)
                      </span>
                    )}
                  </td>
                  <td className="px-5 py-3.5 text-xs">
                    <span className="font-mono">{r.seller_commission_type === "percentage" ? `${r.seller_commission_value}%` : `R$ ${r.seller_commission_value}`}</span>
                    <span className="text-muted-foreground ml-2">{r.seller_recurrence === "recurring" ? "recorrente" : "única"}</span>
                  </td>
                  <td className="px-5 py-3.5 text-xs">
                    <span className="font-mono">{r.referrer_commission_type === "percentage" ? `${r.referrer_commission_value}%` : `R$ ${r.referrer_commission_value}`}</span>
                    <span className="text-muted-foreground ml-2">{r.referrer_recurrence === "recurring" ? "recorrente" : "única"}</span>
                  </td>
                  <td className="px-5 py-3.5 text-center font-mono">{r.priority}</td>
                  <td className="px-5 py-3.5 text-center">
                    <Switch checked={r.is_active} onCheckedChange={(v) => toggleActive.mutate({ id: r.id, is_active: v })} />
                  </td>
                  <td className="px-5 py-3.5 text-right">
                    <div className="flex items-center gap-1 justify-end">
                      <RuleDialog products={products} mode="edit" rule={r} />
                      <Button size="sm" variant="ghost" onClick={() => { if (confirm("Remover regra?")) remove.mutate(r.id); }}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </DashboardLayout>
  );
}

function RuleDialog({ products, mode, rule }: { products: Product[]; mode: "create" | "edit"; rule?: Rule }) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<Partial<Rule>>(
    rule ?? {
      name: "", product_id: null, priority: 0, is_active: true,
      seller_commission_type: "percentage", seller_commission_value: 30, seller_recurrence: "one_time",
      referrer_commission_type: "percentage", referrer_commission_value: 20, referrer_recurrence: "one_time",
    },
  );

  const save = useMutation({
    mutationFn: async () => {
      if (!form.name) throw new Error("Nome é obrigatório");
      if (form.seller_commission_type === "percentage" && form.referrer_commission_type === "percentage") {
        const tot = (form.seller_commission_value ?? 0) + (form.referrer_commission_value ?? 0);
        if (tot > 100) throw new Error("Soma das porcentagens não pode passar de 100%");
      }
      const payload = {
        name: form.name,
        product_id: form.product_id || null,
        priority: Number(form.priority ?? 0),
        is_active: form.is_active ?? true,
        seller_commission_type: form.seller_commission_type,
        seller_commission_value: Number(form.seller_commission_value ?? 0),
        seller_recurrence: form.seller_recurrence,
        referrer_commission_type: form.referrer_commission_type,
        referrer_commission_value: Number(form.referrer_commission_value ?? 0),
        referrer_recurrence: form.referrer_recurrence,
      };
      if (mode === "edit" && rule) {
        const { error } = await supabase.from("network_commission_rules").update(payload).eq("id", rule.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("network_commission_rules").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["network-rules"] });
      toast.success(mode === "edit" ? "Regra atualizada" : "Regra criada");
      setOpen(false);
    },
    onError: (e) => toast.error("Erro", { description: (e as Error).message }),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {mode === "create"
          ? <Button className="bg-gradient-fire shadow-fire text-white"><Plus className="h-4 w-4 mr-2" /> Nova regra</Button>
          : <Button size="sm" variant="ghost"><Settings2 className="h-4 w-4" /></Button>}
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader><DialogTitle>{mode === "edit" ? "Editar regra" : "Nova regra de comissão"}</DialogTitle></DialogHeader>
        <div className="space-y-4 pt-2">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium mb-2 block">Nome</label>
              <Input value={form.name ?? ""} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Ex: Padrão FIRE" />
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Produto</label>
              <Select value={form.product_id ?? "global"} onValueChange={(v) => setForm({ ...form, product_id: v === "global" ? null : v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="global">Global (todos os produtos)</SelectItem>
                  {products.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="rounded-lg border border-border p-4 space-y-3">
            <div className="font-semibold text-sm">Vendedor (afiliado que fez a venda)</div>
            <div className="grid grid-cols-3 gap-3">
              <Select value={form.seller_commission_type} onValueChange={(v) => setForm({ ...form, seller_commission_type: v as "percentage" | "fixed" })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="percentage">Porcentagem</SelectItem>
                  <SelectItem value="fixed">Valor fixo (R$)</SelectItem>
                </SelectContent>
              </Select>
              <Input type="number" step="0.01" value={form.seller_commission_value ?? 0} onChange={(e) => setForm({ ...form, seller_commission_value: Number(e.target.value) })} />
              <Select value={form.seller_recurrence} onValueChange={(v) => setForm({ ...form, seller_recurrence: v as "one_time" | "recurring" })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="one_time">Única</SelectItem>
                  <SelectItem value="recurring">Recorrente</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="rounded-lg border border-border p-4 space-y-3">
            <div className="font-semibold text-sm">Afiliador (quem indicou o vendedor)</div>
            <div className="grid grid-cols-3 gap-3">
              <Select value={form.referrer_commission_type} onValueChange={(v) => setForm({ ...form, referrer_commission_type: v as "percentage" | "fixed" })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="percentage">Porcentagem</SelectItem>
                  <SelectItem value="fixed">Valor fixo (R$)</SelectItem>
                </SelectContent>
              </Select>
              <Input type="number" step="0.01" value={form.referrer_commission_value ?? 0} onChange={(e) => setForm({ ...form, referrer_commission_value: Number(e.target.value) })} />
              <Select value={form.referrer_recurrence} onValueChange={(v) => setForm({ ...form, referrer_recurrence: v as "one_time" | "recurring" })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="one_time">Única</SelectItem>
                  <SelectItem value="recurring">Recorrente</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium mb-2 block">Prioridade (maior vence)</label>
              <Input type="number" value={form.priority ?? 0} onChange={(e) => setForm({ ...form, priority: Number(e.target.value) })} />
            </div>
            <div className="flex items-center gap-3 pt-7">
              <Switch checked={form.is_active ?? true} onCheckedChange={(v) => setForm({ ...form, is_active: v })} />
              <span className="text-sm">Ativa</span>
            </div>
          </div>

          <Button onClick={() => save.mutate()} disabled={save.isPending} className="w-full bg-gradient-fire text-white">
            <Save className="h-4 w-4 mr-2" /> {save.isPending ? "Salvando..." : "Salvar regra"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}