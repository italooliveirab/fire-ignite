import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Copy, Share2, Package } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { toast } from "sonner";
import { Link } from "@tanstack/react-router";

export const Route = createFileRoute("/app/link")({ component: MyLinks });

interface ApprovedRow {
  product: { id: string; name: string; slug: string } | null;
}

function MyLinks() {
  const { user } = useAuth();
  const [domain, setDomain] = useState("fire.com");

  useEffect(() => {
    supabase.from("settings").select("affiliate_link_domain").limit(1).single()
      .then(({ data }) => { if (data) setDomain(data.affiliate_link_domain); });
  }, []);

  const { data: aff } = useQuery({
    queryKey: ["aff-link", user?.id], enabled: !!user,
    queryFn: async () => (await supabase.from("affiliates").select("id, slug").eq("user_id", user!.id).maybeSingle()).data,
  });

  const { data: approved = [] } = useQuery({
    queryKey: ["approved-products", aff?.id], enabled: !!aff?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("affiliate_products")
        .select("product:products(id, name, slug)")
        .eq("affiliate_id", aff!.id)
        .eq("status", "approved");
      if (error) throw error;
      return (data as unknown as ApprovedRow[]).filter((r) => r.product);
    },
  });

  if (!aff) return <DashboardLayout variant="affiliate"><div className="h-40 rounded-2xl bg-card animate-pulse" /></DashboardLayout>;

  const copy = (txt: string) => { navigator.clipboard.writeText(txt); toast.success("Link copiado"); };
  const share = async (url: string) => navigator.share ? navigator.share({ url }) : copy(url);

  return (
    <DashboardLayout variant="affiliate" title="Meus Links">
      <div className="mb-6">
        <h1 className="font-display text-3xl font-bold">Meus links</h1>
        <p className="text-muted-foreground text-sm mt-1">Um link exclusivo para cada produto aprovado.</p>
      </div>

      {approved.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-card/50 p-16 text-center">
          <Package className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
          <h3 className="font-display text-lg font-semibold mb-1">Você ainda não tem produtos aprovados</h3>
          <p className="text-sm text-muted-foreground mb-6">Solicite afiliação no catálogo de produtos.</p>
          <Link to="/app/products" className="inline-flex px-5 py-2.5 rounded-lg bg-gradient-fire text-white font-semibold shadow-fire">
            Ver produtos
          </Link>
        </div>
      ) : (
        <div className="grid lg:grid-cols-2 gap-4">
          {approved.map((row) => {
            const link = `https://${domain}/p/${row.product!.slug}/${aff.slug}`;
            return (
              <div key={row.product!.id} className="rounded-2xl border border-border bg-card p-6 shadow-card-premium">
                <div className="text-xs uppercase tracking-wider text-muted-foreground mb-1">{row.product!.name}</div>
                <div className="font-mono text-base text-primary break-all mb-4">{link}</div>
                <div className="flex gap-2 flex-wrap mb-5">
                  <Button onClick={() => copy(link)} className="bg-gradient-fire text-white shadow-fire"><Copy className="h-4 w-4 mr-1" /> Copiar</Button>
                  <Button onClick={() => share(link)} variant="outline" className="border-primary/40 text-primary"><Share2 className="h-4 w-4 mr-1" /> Compartilhar</Button>
                </div>
                <div className="flex justify-center pt-4 border-t border-border">
                  <div className="bg-white p-3 rounded-xl"><QRCodeSVG value={link} size={140} fgColor="#050505" /></div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </DashboardLayout>
  );
}
