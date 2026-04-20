import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Edit, Trash2, Power, ExternalLink, Package } from "lucide-react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { slugify } from "@/lib/format";

export const Route = createFileRoute("/admin/products")({ component: ProductsPage });

interface Product {
  id: string; name: string; slug: string; description: string | null; media_kit_url: string | null;
  is_active: boolean; created_at: string;
}

function ProductsPage() {
  const qc = useQueryClient();
  const [editing, setEditing] = useState<Product | null>(null);
  const [open, setOpen] = useState(false);

  const { data: products = [], isLoading } = useQuery({
    queryKey: ["products"],
    queryFn: async () => {
      const { data, error } = await supabase.from("products").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data as Product[];
    },
  });

  const del = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("products").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Produto excluído"); qc.invalidateQueries({ queryKey: ["products"] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  const toggle = useMutation({
    mutationFn: async (p: Product) => {
      const { error } = await supabase.from("products").update({ is_active: !p.is_active }).eq("id", p.id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Status atualizado"); qc.invalidateQueries({ queryKey: ["products"] }); },
  });

  return (
    <DashboardLayout variant="admin" title="Produtos">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="font-display text-3xl font-bold">Produtos & Serviços</h1>
          <p className="text-muted-foreground text-sm mt-1">{products.length} cadastrados — a comissão é definida por afiliado em "Solicitações".</p>
        </div>
        <Button onClick={() => { setEditing(null); setOpen(true); }} className="bg-gradient-fire shadow-fire text-white font-semibold">
          <Plus className="h-4 w-4 mr-1" /> Novo produto
        </Button>
      </div>

      {isLoading ? (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-48 rounded-2xl bg-card border border-border animate-pulse" />)}
        </div>
      ) : products.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-card/50 p-16 text-center">
          <Package className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
          <h3 className="font-display text-lg font-semibold mb-1">Nenhum produto ainda</h3>
          <p className="text-sm text-muted-foreground mb-6">Cadastre o primeiro produto/serviço da FIRE para os afiliados começarem a divulgar.</p>
          <Button onClick={() => { setEditing(null); setOpen(true); }} className="bg-gradient-fire text-white shadow-fire">
            <Plus className="h-4 w-4 mr-1" /> Cadastrar produto
          </Button>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {products.map((p) => (
            <div key={p.id} className={`rounded-2xl border bg-card p-5 shadow-card-premium transition ${p.is_active ? "border-border" : "border-border/40 opacity-60"}`}>
              <div className="flex items-start justify-between gap-2 mb-3">
                <div>
                  <h3 className="font-display font-bold text-lg leading-tight">{p.name}</h3>
                  <div className="font-mono text-xs text-muted-foreground mt-0.5">/p/{p.slug}</div>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full border ${p.is_active ? "bg-success/15 text-success border-success/30" : "bg-muted/30 text-muted-foreground border-border"}`}>
                  {p.is_active ? "Ativo" : "Pausado"}
                </span>
              </div>
              {p.description && <p className="text-sm text-muted-foreground line-clamp-2 mb-3">{p.description}</p>}
              <div className="text-xs text-muted-foreground mb-4">
                Comissão definida por afiliado na aprovação da solicitação.
              </div>
              {p.media_kit_url && (
                <a href={p.media_kit_url} target="_blank" rel="noreferrer" className="text-xs text-primary hover:underline inline-flex items-center gap-1 mb-3">
                  <ExternalLink className="h-3 w-3" /> Mídia kit
                </a>
              )}
              <div className="flex gap-1 pt-3 border-t border-border">
                <Button size="sm" variant="ghost" onClick={() => { setEditing(p); setOpen(true); }} className="flex-1">
                  <Edit className="h-3.5 w-3.5 mr-1" /> Editar
                </Button>
                <Button size="icon" variant="ghost" onClick={() => toggle.mutate(p)}>
                  <Power className="h-4 w-4" />
                </Button>
                <Button size="icon" variant="ghost" onClick={() => { if (confirm("Excluir este produto?")) del.mutate(p.id); }}>
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl bg-card border-border max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-display text-2xl">{editing ? "Editar produto" : "Novo produto"}</DialogTitle>
          </DialogHeader>
          <ProductForm initial={editing} onClose={() => { setOpen(false); qc.invalidateQueries({ queryKey: ["products"] }); }} />
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}

function ProductForm({ initial, onClose }: { initial: Product | null; onClose: () => void }) {
  const [form, setForm] = useState({
    name: initial?.name ?? "",
    slug: initial?.slug ?? "",
    description: initial?.description ?? "",
    media_kit_url: initial?.media_kit_url ?? "",
    is_active: initial?.is_active ?? true,
  });
  const [saving, setSaving] = useState(false);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const payload = {
      name: form.name,
      slug: form.slug || slugify(form.name),
      description: form.description || null,
      media_kit_url: form.media_kit_url || null,
      is_active: form.is_active,
    };
    const { error } = initial
      ? await supabase.from("products").update(payload).eq("id", initial.id)
      : await supabase.from("products").insert(payload);
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success(initial ? "Produto atualizado" : "Produto criado");
    onClose();
  };

  return (
    <form onSubmit={handleSave} className="space-y-4">
      <div className="space-y-1.5">
        <Label className="text-xs">Nome do produto/serviço</Label>
        <Input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value, slug: form.slug || slugify(e.target.value) })} placeholder="Ex: FireNet — Internet Ilimitada" />
      </div>
      <div className="space-y-1.5">
        <Label className="text-xs">Slug (parte do link)</Label>
        <Input value={form.slug} onChange={(e) => setForm({ ...form, slug: slugify(e.target.value) })} placeholder="firenet" />
        <p className="text-xs text-muted-foreground">Link gerado: /p/{form.slug || "slug"}/{"{afiliado}"}</p>
      </div>
      <div className="space-y-1.5">
        <Label className="text-xs">Descrição</Label>
        <Textarea rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Descreva o produto/serviço para o afiliado entender o que vai divulgar." />
      </div>
      <div className="space-y-1.5">
        <Label className="text-xs">Link do Mídia Kit (opcional)</Label>
        <Input type="url" value={form.media_kit_url} onChange={(e) => setForm({ ...form, media_kit_url: e.target.value })} placeholder="https://drive.google.com/..." />
        <p className="text-xs text-muted-foreground">Materiais de divulgação para o afiliado (banners, textos, vídeos).</p>
      </div>
      <div className="rounded-lg bg-muted/40 border border-border p-3 text-xs text-muted-foreground">
        💡 A <strong className="text-foreground">comissão é definida por afiliado</strong> ao aprovar cada solicitação em <code>Solicitações</code>. Cada afiliado pode ter % ou R$ fixo diferente neste mesmo produto.
      </div>
      <div className="flex items-center gap-2 pt-2">
        <input type="checkbox" id="active" checked={form.is_active} onChange={(e) => setForm({ ...form, is_active: e.target.checked })} className="h-4 w-4 accent-primary" />
        <Label htmlFor="active" className="text-sm cursor-pointer">Produto ativo (visível para afiliados)</Label>
      </div>
      <div className="flex justify-end gap-2 pt-3 border-t border-border">
        <Button type="button" variant="ghost" onClick={onClose}>Cancelar</Button>
        <Button type="submit" disabled={saving} className="bg-gradient-fire text-white shadow-fire">
          {saving ? "Salvando..." : "Salvar"}
        </Button>
      </div>
    </form>
  );
}
