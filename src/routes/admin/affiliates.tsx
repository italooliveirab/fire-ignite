import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Search, Edit, Trash2, Pause, Play } from "lucide-react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { slugify } from "@/lib/format";
import { adminCreateAffiliate } from "@/server/admin-affiliates";

export const Route = createFileRoute("/admin/affiliates")({ component: AffiliatesPage });

interface Affiliate {
  id: string; full_name: string; username: string; email: string; phone: string | null;
  instagram: string | null; pix_key: string | null; pix_type: string | null;
  slug: string;
  status: "active" | "paused" | "blocked"; created_at: string;
}

function AffiliatesPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<Affiliate | null>(null);
  const [open, setOpen] = useState(false);

  const { data: affiliates = [], isLoading } = useQuery({
    queryKey: ["affiliates"],
    queryFn: async () => {
      const { data, error } = await supabase.from("affiliates").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data as Affiliate[];
    },
  });

  const filtered = affiliates.filter((a) =>
    [a.full_name, a.username, a.email].some((f) => f?.toLowerCase().includes(search.toLowerCase())),
  );

  const deleteAff = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("affiliates").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Afiliado excluído"); qc.invalidateQueries({ queryKey: ["affiliates"] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  const toggleStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase.from("affiliates").update({ status: status as "active" | "paused" | "blocked" }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Status atualizado"); qc.invalidateQueries({ queryKey: ["affiliates"] }); },
  });

  return (
    <DashboardLayout variant="admin" title="Afiliados">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="font-display text-3xl font-bold">Afiliados</h1>
          <p className="text-muted-foreground text-sm mt-1">{affiliates.length} cadastrados · comissões são definidas por produto em "Solicitações"</p>
        </div>
        <Button onClick={() => { setEditing(null); setOpen(true); }} className="bg-gradient-fire shadow-fire text-white font-semibold">
          <Plus className="h-4 w-4 mr-1" /> Novo Afiliado
        </Button>
      </div>

      <div className="relative mb-4 max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar por nome, usuário, email..." className="pl-10 bg-card" />
      </div>

      <div className="rounded-2xl border border-border bg-card overflow-hidden shadow-card-premium">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-background/50 border-b border-border text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="text-left px-5 py-3.5">Afiliado</th>
                <th className="text-left px-5 py-3.5 hidden md:table-cell">Slug</th>
                <th className="text-left px-5 py-3.5">Status</th>
                <th className="text-right px-5 py-3.5">Ações</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={4} className="py-12 text-center text-muted-foreground">Carregando...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={4} className="py-12 text-center text-muted-foreground">Nenhum afiliado encontrado.</td></tr>
              ) : filtered.map((a) => (
                <tr key={a.id} className="border-b border-border/50 hover:bg-background/40 transition">
                  <td className="px-5 py-3.5">
                    <div className="font-medium text-foreground">{a.full_name}</div>
                    <div className="text-xs text-muted-foreground">{a.email}</div>
                  </td>
                  <td className="px-5 py-3.5 hidden md:table-cell font-mono text-xs text-muted-foreground">/{a.slug}</td>
                  <td className="px-5 py-3.5"><StatusBadge status={a.status} /></td>
                  <td className="px-5 py-3.5 text-right">
                    <div className="inline-flex gap-1">
                      <Button size="icon" variant="ghost" onClick={() => { setEditing(a); setOpen(true); }}><Edit className="h-4 w-4" /></Button>
                      <Button size="icon" variant="ghost" onClick={() => toggleStatus.mutate({ id: a.id, status: a.status === "active" ? "paused" : "active" })}>
                        {a.status === "active" ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                      </Button>
                      <Button size="icon" variant="ghost" onClick={() => { if (confirm("Excluir este afiliado?")) deleteAff.mutate(a.id); }}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl bg-card border-border max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-display text-2xl">{editing ? "Editar afiliado" : "Novo afiliado"}</DialogTitle>
          </DialogHeader>
          <AffiliateForm initial={editing} onClose={() => { setOpen(false); qc.invalidateQueries({ queryKey: ["affiliates"] }); }} />
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}

function AffiliateForm({ initial, onClose }: { initial: Affiliate | null; onClose: () => void }) {
  const [form, setForm] = useState({
    full_name: initial?.full_name ?? "",
    username: initial?.username ?? "",
    email: initial?.email ?? "",
    password: "",
    phone: initial?.phone ?? "",
    instagram: initial?.instagram ?? "",
    pix_key: initial?.pix_key ?? "",
    pix_type: (initial?.pix_type ?? "email") as "cpf" | "cnpj" | "email" | "phone" | "random",
    slug: initial?.slug ?? "",
    status: (initial?.status ?? "active") as "active" | "paused" | "blocked",
  });
  const [saving, setSaving] = useState(false);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (initial) {
        const payload = {
          full_name: form.full_name, username: form.username, email: form.email,
          phone: form.phone || null, instagram: form.instagram || null,
          pix_key: form.pix_key || null, pix_type: form.pix_type,
          slug: form.slug || slugify(form.username || form.full_name), status: form.status,
        };
        const { error } = await supabase.from("affiliates").update(payload).eq("id", initial.id);
        if (error) throw error;
        toast.success("Afiliado atualizado");
      } else {
        if (!form.password || form.password.length < 6) {
          throw new Error("Defina uma senha de pelo menos 6 caracteres para o afiliado");
        }
        await adminCreateAffiliate({
          data: {
            email: form.email,
            password: form.password,
            full_name: form.full_name,
            username: form.username,
            slug: form.slug || slugify(form.username || form.full_name),
            phone: form.phone || null,
            instagram: form.instagram || null,
            pix_key: form.pix_key || null,
            pix_type: form.pix_type,
            status: form.status,
          },
        });
        toast.success("Afiliado criado e conta de acesso gerada");
      }
      onClose();
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSave} className="space-y-4">
      <div className="grid sm:grid-cols-2 gap-3">
        <Field label="Nome completo"><Input required value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} /></Field>
        <Field label="Username"><Input required value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value, slug: form.slug || slugify(e.target.value) })} /></Field>
        <Field label="Email"><Input type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} disabled={!!initial} /></Field>
        {!initial && (
          <Field label="Senha de acesso">
            <Input type="password" required minLength={6} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder="Mínimo 6 caracteres" />
          </Field>
        )}
        <Field label="Telefone"><Input value={form.phone ?? ""} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></Field>
        <Field label="Instagram"><Input value={form.instagram ?? ""} onChange={(e) => setForm({ ...form, instagram: e.target.value })} /></Field>
        <Field label="Slug (link)"><Input value={form.slug} onChange={(e) => setForm({ ...form, slug: slugify(e.target.value) })} /></Field>
        <Field label="Tipo Pix">
          <Select value={form.pix_type} onValueChange={(v: "cpf" | "cnpj" | "email" | "phone" | "random") => setForm({ ...form, pix_type: v })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="cpf">CPF</SelectItem><SelectItem value="cnpj">CNPJ</SelectItem>
              <SelectItem value="email">Email</SelectItem><SelectItem value="phone">Telefone</SelectItem>
              <SelectItem value="random">Aleatória</SelectItem>
            </SelectContent>
          </Select>
        </Field>
        <Field label="Chave Pix"><Input value={form.pix_key ?? ""} onChange={(e) => setForm({ ...form, pix_key: e.target.value })} /></Field>
        <Field label="Status">
          <Select value={form.status} onValueChange={(v: "active" | "paused" | "blocked") => setForm({ ...form, status: v })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="active">Ativo</SelectItem>
              <SelectItem value="paused">Pausado</SelectItem>
              <SelectItem value="blocked">Bloqueado</SelectItem>
            </SelectContent>
          </Select>
        </Field>
      </div>
      <div className="rounded-lg bg-muted/40 border border-border p-3 text-xs text-muted-foreground">
        💡 A comissão deste afiliado é definida <strong className="text-foreground">por produto</strong>, na tela de Solicitações ao aprovar cada afiliação.
      </div>
      <div className="flex justify-end gap-2 pt-2 border-t border-border">
        <Button type="button" variant="ghost" onClick={onClose}>Cancelar</Button>
        <Button type="submit" disabled={saving} className="bg-gradient-fire text-white shadow-fire">
          {saving ? "Salvando..." : "Salvar"}
        </Button>
      </div>
    </form>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="space-y-1.5"><Label className="text-xs">{label}</Label>{children}</div>;
}
