import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Search, Edit, Trash2, Pause, Play } from "lucide-react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { slugify } from "@/lib/format";
import { adminCreateAffiliate, adminUpdateAffiliateAuth, adminGetAffiliateAuthInfo, adminListAffiliatesLastSignIn } from "@/server/admin-affiliates";

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

  const { data: lastSignInMap = {} } = useQuery({
    queryKey: ["affiliates-last-sign-in"],
    queryFn: () => adminListAffiliatesLastSignIn(),
    staleTime: 60_000,
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
                    <InactivityBadge lastSignInAt={lastSignInMap[a.id] ?? null} />
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
          {editing ? (
            <Tabs defaultValue="data" className="w-full">
              <TabsList className="grid grid-cols-4 w-full">
                <TabsTrigger value="data">Dados</TabsTrigger>
                <TabsTrigger value="auth">Acesso</TabsTrigger>
                <TabsTrigger value="products">Produtos</TabsTrigger>
                <TabsTrigger value="history">Histórico</TabsTrigger>
              </TabsList>
              <TabsContent value="data" className="mt-4">
                <AffiliateForm initial={editing} onClose={() => { setOpen(false); qc.invalidateQueries({ queryKey: ["affiliates"] }); }} />
              </TabsContent>
              <TabsContent value="auth" className="mt-4">
                <AuthForm affiliate={editing} onSaved={() => qc.invalidateQueries({ queryKey: ["affiliates"] })} />
              </TabsContent>
              <TabsContent value="products" className="mt-4">
                <ProductsTab affiliateId={editing.id} />
              </TabsContent>
              <TabsContent value="history" className="mt-4">
                <HistoryTab affiliateId={editing.id} />
              </TabsContent>
            </Tabs>
          ) : (
            <AffiliateForm initial={null} onClose={() => { setOpen(false); qc.invalidateQueries({ queryKey: ["affiliates"] }); }} />
          )}
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
          full_name: form.full_name, username: form.username,
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
      const msg = (err as Error)?.message;
      toast.error(!msg || msg === "[object Response]" ? "Sessão expirou. Recarregue a página e faça login novamente." : msg);
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSave} className="space-y-4">
      <div className="grid sm:grid-cols-2 gap-3">
        <Field label="Nome completo"><Input required value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} /></Field>
        <Field label="Username"><Input required value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value, slug: form.slug || slugify(e.target.value) })} /></Field>
        {!initial && (
          <Field label="Email"><Input type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></Field>
        )}
        {!initial && (
          <Field label="Senha de acesso">
            <Input type="password" required minLength={6} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder="Mínimo 6 caracteres" />
          </Field>
        )}
        <Field label="Telefone"><Input value={form.phone ?? ""} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></Field>
        <Field label="Instagram"><Input value={form.instagram ?? ""} onChange={(e) => setForm({ ...form, instagram: e.target.value })} /></Field>
        <Field label="Slug padrão (link)"><Input value={form.slug} onChange={(e) => setForm({ ...form, slug: slugify(e.target.value) })} /></Field>
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
      <div className="flex justify-end gap-2 pt-2 border-t border-border">
        <Button type="button" variant="ghost" onClick={onClose}>Cancelar</Button>
        <Button type="submit" disabled={saving} className="bg-gradient-fire text-white shadow-fire">
          {saving ? "Salvando..." : "Salvar"}
        </Button>
      </div>
    </form>
  );
}

function AuthForm({ affiliate, onSaved }: { affiliate: Affiliate; onSaved: () => void }) {
  const [email, setEmail] = useState(affiliate.email);
  const [password, setPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [authInfo, setAuthInfo] = useState<{ last_sign_in_at: string | null; created_at: string | null; email_confirmed_at: string | null } | null>(null);

  useEffect(() => {
    let cancelled = false;
    adminGetAffiliateAuthInfo({ data: { affiliate_id: affiliate.id } })
      .then((info) => { if (!cancelled) setAuthInfo(info); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [affiliate.id]);

  const fmt = (iso: string | null) => {
    if (!iso) return "—";
    const d = new Date(iso);
    return d.toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const emailChanged = email && email !== affiliate.email;
    const wantsPassword = password.length > 0;
    if (!emailChanged && !wantsPassword) {
      toast.info("Nada para alterar");
      return;
    }
    setSaving(true);
    try {
      await adminUpdateAffiliateAuth({
        data: {
          affiliate_id: affiliate.id,
          ...(emailChanged ? { email } : {}),
          ...(wantsPassword ? { password } : {}),
        },
      });
      toast.success("Credenciais atualizadas");
      setPassword("");
      onSaved();
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="rounded-lg bg-muted/40 border border-border p-3 text-xs space-y-1">
        <div className="flex justify-between"><span className="text-muted-foreground">Último login</span><span className="font-mono">{fmt(authInfo?.last_sign_in_at ?? null)}</span></div>
        <div className="flex justify-between"><span className="text-muted-foreground">Conta criada</span><span className="font-mono">{fmt(authInfo?.created_at ?? null)}</span></div>
        <div className="flex justify-between"><span className="text-muted-foreground">Email confirmado</span><span className="font-mono">{fmt(authInfo?.email_confirmed_at ?? null)}</span></div>
      </div>
      <div className="rounded-lg bg-amber-500/10 border border-amber-500/30 p-3 text-xs text-amber-200">
        ⚠️ Alterar o email muda o login do afiliado. A nova senha entra em vigor imediatamente.
      </div>
      <Field label="Email de login">
        <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
      </Field>
      <Field label="Nova senha (deixe em branco para não alterar)">
        <Input type="password" minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Mínimo 6 caracteres" />
      </Field>
      <div className="flex justify-end pt-2 border-t border-border">
        <Button type="submit" disabled={saving} className="bg-gradient-fire text-white shadow-fire">
          {saving ? "Salvando..." : "Atualizar credenciais"}
        </Button>
      </div>
    </form>
  );
}

interface AffiliateProductRow {
  id: string;
  product_id: string;
  status: "pending" | "approved" | "rejected";
  commission_type: "percentage" | "fixed";
  commission_value: number;
  custom_slug: string | null;
  product: { id: string; name: string; slug: string } | null;
}

function ProductsTab({ affiliateId }: { affiliateId: string }) {
  const qc = useQueryClient();
  const { data: rows = [], isLoading } = useQuery({
    queryKey: ["affiliate-products-admin", affiliateId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("affiliate_products")
        .select("id, product_id, status, commission_type, commission_value, custom_slug, product:products(id, name, slug)")
        .eq("affiliate_id", affiliateId)
        .eq("status", "approved")
        .order("requested_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as AffiliateProductRow[];
    },
  });

  if (isLoading) return <div className="py-8 text-center text-muted-foreground text-sm">Carregando...</div>;
  if (rows.length === 0) return <div className="py-8 text-center text-muted-foreground text-sm">Nenhum produto aprovado para este afiliado.</div>;

  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground">Edite a comissão e o slug personalizado de cada produto aprovado. Slug vazio usa o slug padrão do afiliado.</p>
      {rows.map((row) => (
        <ProductRowEditor key={row.id} row={row} onSaved={() => qc.invalidateQueries({ queryKey: ["affiliate-products-admin", affiliateId] })} />
      ))}
    </div>
  );
}

function ProductRowEditor({ row, onSaved }: { row: AffiliateProductRow; onSaved: () => void }) {
  const [type, setType] = useState<"percentage" | "fixed">(row.commission_type);
  const [value, setValue] = useState<string>(String(row.commission_value));
  const [slug, setSlug] = useState<string>(row.custom_slug ?? "");
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    try {
      const num = Number(value);
      if (Number.isNaN(num) || num < 0) throw new Error("Valor de comissão inválido");
      const { error } = await supabase
        .from("affiliate_products")
        .update({
          commission_type: type,
          commission_value: num,
          custom_slug: slug ? slugify(slug) : null,
        })
        .eq("id", row.id);
      if (error) throw error;
      toast.success(`${row.product?.name ?? "Produto"} atualizado`);
      onSaved();
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="rounded-lg border border-border bg-background/40 p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <div className="font-medium text-sm">{row.product?.name ?? "—"}</div>
          <div className="text-xs text-muted-foreground font-mono">/p/{row.product?.slug}/{slug ? slugify(slug) : "{slug-padrão}"}</div>
        </div>
      </div>
      <div className="grid sm:grid-cols-3 gap-3">
        <Field label="Tipo">
          <Select value={type} onValueChange={(v: "percentage" | "fixed") => setType(v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="percentage">Percentual (%)</SelectItem>
              <SelectItem value="fixed">Fixo (R$)</SelectItem>
            </SelectContent>
          </Select>
        </Field>
        <Field label={type === "percentage" ? "Valor (%)" : "Valor (R$)"}>
          <Input type="number" step="0.01" min="0" value={value} onChange={(e) => setValue(e.target.value)} />
        </Field>
        <Field label="Slug personalizado (opcional)">
          <Input value={slug} onChange={(e) => setSlug(e.target.value)} placeholder="ex: black-friday" />
        </Field>
      </div>
      <div className="flex justify-end">
        <Button size="sm" onClick={save} disabled={saving} className="bg-gradient-fire text-white shadow-fire">
          {saving ? "Salvando..." : "Salvar produto"}
        </Button>
      </div>
    </div>
  );
}

interface AuditRow {
  id: string;
  created_at: string;
  changed_by_email: string | null;
  email_changed: boolean;
  password_changed: boolean;
  old_email: string | null;
  new_email: string | null;
}

function HistoryTab({ affiliateId }: { affiliateId: string }) {
  const { data: rows = [], isLoading } = useQuery({
    queryKey: ["credential-audit", affiliateId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("affiliate_credential_audit")
        .select("id, created_at, changed_by_email, email_changed, password_changed, old_email, new_email")
        .eq("affiliate_id", affiliateId)
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return (data ?? []) as AuditRow[];
    },
  });

  if (isLoading) return <div className="py-8 text-center text-muted-foreground text-sm">Carregando histórico...</div>;
  if (rows.length === 0) return <div className="py-8 text-center text-muted-foreground text-sm">Nenhuma alteração de credenciais registrada.</div>;

  return (
    <div className="space-y-2">
      <p className="text-xs text-muted-foreground mb-2">Últimas 50 alterações de email/senha realizadas por administradores.</p>
      {rows.map((r) => (
        <div key={r.id} className="rounded-lg border border-border bg-background/40 p-3 text-sm">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex gap-1.5 flex-wrap">
              {r.email_changed && <span className="text-xs px-2 py-0.5 rounded bg-primary/15 text-primary font-medium">Email</span>}
              {r.password_changed && <span className="text-xs px-2 py-0.5 rounded bg-primary/15 text-primary font-medium">Senha</span>}
            </div>
            <span className="text-xs text-muted-foreground">
              {new Date(r.created_at).toLocaleString("pt-BR")}
            </span>
          </div>
          <div className="mt-2 text-xs text-muted-foreground">
            por <span className="text-foreground font-medium">{r.changed_by_email ?? "admin"}</span>
            {r.email_changed && r.old_email && r.new_email && (
              <div className="mt-1 font-mono">{r.old_email} → {r.new_email}</div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="space-y-1.5"><Label className="text-xs">{label}</Label>{children}</div>;
}
