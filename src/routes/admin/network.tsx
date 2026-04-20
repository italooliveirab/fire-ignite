import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { DashboardLayout } from "@/components/DashboardLayout";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { formatDate } from "@/lib/format";
import { Network, Trash2, Search, Link2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

export const Route = createFileRoute("/admin/network")({ component: AdminNetwork });

type AffRow = { id: string; full_name: string; email: string; slug: string; referral_code: string | null };
type LinkRow = {
  id: string;
  affiliate_id: string;
  referrer_id: string;
  status: "active" | "paused" | "removed";
  linked_at: string;
  notes: string | null;
};

function AdminNetwork() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");

  const { data: affiliates = [] } = useQuery({
    queryKey: ["admin-affiliates-min"],
    queryFn: async () => {
      const { data } = await supabase.from("affiliates").select("id, full_name, email, slug, referral_code").order("full_name");
      return (data ?? []) as AffRow[];
    },
  });

  const { data: links = [], isLoading } = useQuery({
    queryKey: ["admin-network-links"],
    queryFn: async () => {
      const { data } = await supabase.from("affiliate_network").select("*").order("linked_at", { ascending: false });
      return (data ?? []) as LinkRow[];
    },
  });

  const affMap = new Map(affiliates.map((a) => [a.id, a]));

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: LinkRow["status"] }) => {
      const { error } = await supabase.from("affiliate_network").update({ status }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin-network-links"] }); toast.success("Status atualizado"); },
    onError: (e) => toast.error("Erro", { description: (e as Error).message }),
  });

  const removeLink = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("affiliate_network").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin-network-links"] }); toast.success("Vínculo removido"); },
    onError: (e) => toast.error("Erro", { description: (e as Error).message }),
  });

  const filtered = links.filter((l) => {
    if (!search) return true;
    const a = affMap.get(l.affiliate_id);
    const r = affMap.get(l.referrer_id);
    const q = search.toLowerCase();
    return [a?.full_name, a?.email, r?.full_name, r?.email].some((v) => v?.toLowerCase().includes(q));
  });

  return (
    <DashboardLayout variant="admin" title="Rede de Afiliados">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-display text-3xl font-bold flex items-center gap-2"><Network className="h-7 w-7 text-primary" /> Rede de Afiliados</h1>
          <p className="text-sm text-muted-foreground mt-1">Vínculos afiliador → afiliado para comissionamento em cascata.</p>
        </div>
        <CreateLinkDialog affiliates={affiliates} />
      </div>

      <div className="rounded-2xl border border-border bg-card p-4 mb-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar por nome ou e-mail..." className="pl-10" />
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-card overflow-hidden shadow-card-premium">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-background/50 border-b border-border text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="text-left px-5 py-3.5">Afiliado (vendedor)</th>
                <th className="text-left px-5 py-3.5">Afiliador</th>
                <th className="text-left px-5 py-3.5">Status</th>
                <th className="text-left px-5 py-3.5 hidden md:table-cell">Vinculado em</th>
                <th className="text-right px-5 py-3.5">Ações</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? <tr><td colSpan={5} className="py-12 text-center text-muted-foreground">Carregando...</td></tr>
              : filtered.length === 0 ? <tr><td colSpan={5} className="py-12 text-center text-muted-foreground">Nenhum vínculo ainda.</td></tr>
              : filtered.map((l) => {
                const a = affMap.get(l.affiliate_id);
                const r = affMap.get(l.referrer_id);
                return (
                  <tr key={l.id} className="border-b border-border/50 hover:bg-background/40">
                    <td className="px-5 py-3.5">
                      <div className="font-medium">{a?.full_name ?? "—"}</div>
                      <div className="text-xs text-muted-foreground">{a?.email}</div>
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="font-medium">{r?.full_name ?? "—"}</div>
                      <div className="text-xs text-muted-foreground">{r?.email}</div>
                    </td>
                    <td className="px-5 py-3.5">
                      <Select value={l.status} onValueChange={(v) => updateStatus.mutate({ id: l.id, status: v as LinkRow["status"] })}>
                        <SelectTrigger className="w-32 h-8"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="active">Ativo</SelectItem>
                          <SelectItem value="paused">Pausado</SelectItem>
                          <SelectItem value="removed">Removido</SelectItem>
                        </SelectContent>
                      </Select>
                    </td>
                    <td className="px-5 py-3.5 hidden md:table-cell text-xs text-muted-foreground">{formatDate(l.linked_at)}</td>
                    <td className="px-5 py-3.5 text-right">
                      <Button size="sm" variant="ghost" onClick={() => { if (confirm("Remover vínculo?")) removeLink.mutate(l.id); }}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </DashboardLayout>
  );
}

function CreateLinkDialog({ affiliates }: { affiliates: AffRow[] }) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [affiliateId, setAffiliateId] = useState("");
  const [referrerId, setReferrerId] = useState("");

  const create = useMutation({
    mutationFn: async () => {
      if (!affiliateId || !referrerId) throw new Error("Selecione ambos os afiliados");
      if (affiliateId === referrerId) throw new Error("Afiliado e afiliador não podem ser o mesmo");
      const { error } = await supabase.from("affiliate_network").insert({
        affiliate_id: affiliateId, referrer_id: referrerId, status: "active",
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-network-links"] });
      toast.success("Vínculo criado!");
      setOpen(false); setAffiliateId(""); setReferrerId("");
    },
    onError: (e) => {
      const msg = (e as Error).message;
      if (msg.includes("unique")) toast.error("Esse afiliado já tem um afiliador vinculado");
      else toast.error("Erro", { description: msg });
    },
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="bg-gradient-fire shadow-fire text-white"><Link2 className="h-4 w-4 mr-2" /> Novo vínculo</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Vincular afiliado a um afiliador</DialogTitle></DialogHeader>
        <div className="space-y-4 pt-2">
          <div>
            <label className="text-sm font-medium mb-2 block">Afiliado (quem vende)</label>
            <Select value={affiliateId} onValueChange={setAffiliateId}>
              <SelectTrigger><SelectValue placeholder="Selecionar afiliado..." /></SelectTrigger>
              <SelectContent>
                {affiliates.map((a) => <SelectItem key={a.id} value={a.id}>{a.full_name} — {a.email}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-sm font-medium mb-2 block">Afiliador (quem indicou)</label>
            <Select value={referrerId} onValueChange={setReferrerId}>
              <SelectTrigger><SelectValue placeholder="Selecionar afiliador..." /></SelectTrigger>
              <SelectContent>
                {affiliates.filter((a) => a.id !== affiliateId).map((a) => <SelectItem key={a.id} value={a.id}>{a.full_name} — {a.email}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <Button onClick={() => create.mutate()} disabled={create.isPending} className="w-full bg-gradient-fire text-white">
            {create.isPending ? "Criando..." : "Criar vínculo"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}