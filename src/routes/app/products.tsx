import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { ExternalLink, Copy, Clock, CheckCircle2, XCircle, Package, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { formatBRL } from "@/lib/format";

export const Route = createFileRoute("/app/products")({ component: AffiliateProducts });

interface Product {
  id: string; name: string; slug: string; description: string | null; media_kit_url: string | null;
  commission_type: "percentage" | "fixed"; commission_value: number;
}
interface Affiliation { id: string; product_id: string; status: "pending" | "approved" | "rejected" }

function AffiliateProducts() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [domain, setDomain] = useState("fire.com");

  useEffect(() => {
    supabase.from("settings").select("affiliate_link_domain").limit(1).single()
      .then(({ data }) => { if (data) setDomain(data.affiliate_link_domain); });
  }, []);

  const { data: aff } = useQuery({
    queryKey: ["my-aff", user?.id], enabled: !!user,
    queryFn: async () => (await supabase.from("affiliates").select("id, slug").eq("user_id", user!.id).maybeSingle()).data,
  });

  const { data: products = [], isLoading: loadingProducts } = useQuery({
    queryKey: ["public-products"],
    queryFn: async () => {
      const { data, error } = await supabase.from("products").select("*").eq("is_active", true).order("name");
      if (error) throw error;
      return data as Product[];
    },
  });

  const { data: affiliations = [] } = useQuery({
    queryKey: ["my-affiliations", aff?.id], enabled: !!aff?.id,
    queryFn: async () => {
      const { data, error } = await supabase.from("affiliate_products").select("id, product_id, status").eq("affiliate_id", aff!.id);
      if (error) throw error;
      return data as Affiliation[];
    },
  });

  const request = useMutation({
    mutationFn: async (productId: string) => {
      if (!aff?.id) throw new Error("Conta não vinculada");
      const { error } = await supabase.from("affiliate_products").insert({ affiliate_id: aff.id, product_id: productId });
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Solicitação enviada!", { description: "Aguarde a aprovação do admin." }); qc.invalidateQueries({ queryKey: ["my-affiliations"] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  const statusOf = (pid: string) => affiliations.find((a) => a.product_id === pid)?.status;
  const linkFor = (pSlug: string) => `https://${domain}/p/${pSlug}/${aff?.slug ?? ""}`;
  const copy = (txt: string) => { navigator.clipboard.writeText(txt); toast.success("Link copiado!"); };

  return (
    <DashboardLayout variant="affiliate" title="Produtos">
      <div className="mb-6">
        <h1 className="font-display text-3xl font-bold">Catálogo de produtos</h1>
        <p className="text-muted-foreground text-sm mt-1">Escolha quais produtos da FIRE você quer revender. Cada solicitação passa por aprovação.</p>
      </div>

      {!aff && (
        <div className="rounded-2xl border border-warning/30 bg-warning/10 text-warning-foreground p-4 mb-6 text-sm">
          Sua conta ainda não está vinculada a um perfil de afiliado. Entre em contato com o admin.
        </div>
      )}

      {loadingProducts ? (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-56 rounded-2xl bg-card border border-border animate-pulse" />)}
        </div>
      ) : products.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-card/50 p-16 text-center">
          <Package className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
          <h3 className="font-display text-lg font-semibold mb-1">Nenhum produto disponível</h3>
          <p className="text-sm text-muted-foreground">Aguarde a FIRE cadastrar produtos para você revender.</p>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {products.map((p) => {
            const status = statusOf(p.id);
            return (
              <div key={p.id} className="rounded-2xl border border-border bg-card p-5 shadow-card-premium flex flex-col">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <h3 className="font-display font-bold text-lg leading-tight">{p.name}</h3>
                  <Sparkles className="h-4 w-4 text-primary shrink-0" />
                </div>
                {p.description && <p className="text-sm text-muted-foreground line-clamp-3 mb-3">{p.description}</p>}
                <div className="text-sm mb-3">
                  <span className="text-muted-foreground">Sua comissão: </span>
                  <span className="font-semibold text-primary">
                    {p.commission_type === "percentage" ? `${p.commission_value}%` : formatBRL(p.commission_value)}
                  </span>
                </div>
                {p.media_kit_url && (
                  <a href={p.media_kit_url} target="_blank" rel="noreferrer" className="text-xs text-primary hover:underline inline-flex items-center gap-1 mb-3">
                    <ExternalLink className="h-3 w-3" /> Ver mídia kit
                  </a>
                )}

                <div className="mt-auto pt-3 border-t border-border">
                  {!status && (
                    <Button onClick={() => request.mutate(p.id)} disabled={!aff || request.isPending} className="w-full bg-gradient-fire text-white shadow-fire">
                      Solicitar afiliação
                    </Button>
                  )}
                  {status === "pending" && (
                    <div className="flex items-center justify-center gap-2 text-sm text-warning py-2 px-3 rounded-lg bg-warning/10 border border-warning/30">
                      <Clock className="h-4 w-4" /> Aguardando aprovação
                    </div>
                  )}
                  {status === "rejected" && (
                    <div className="flex items-center justify-center gap-2 text-sm text-destructive py-2 px-3 rounded-lg bg-destructive/10 border border-destructive/30">
                      <XCircle className="h-4 w-4" /> Solicitação recusada
                    </div>
                  )}
                  {status === "approved" && (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-xs text-success">
                        <CheckCircle2 className="h-4 w-4" /> Aprovado — seu link:
                      </div>
                      <div className="font-mono text-xs text-primary break-all p-2 rounded bg-background/50 border border-border">
                        {linkFor(p.slug)}
                      </div>
                      <Button size="sm" onClick={() => copy(linkFor(p.slug))} className="w-full bg-gradient-fire text-white">
                        <Copy className="h-3.5 w-3.5 mr-1" /> Copiar link
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </DashboardLayout>
  );
}
