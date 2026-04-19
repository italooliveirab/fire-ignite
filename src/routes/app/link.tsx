import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Copy, Share2 } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { toast } from "sonner";

export const Route = createFileRoute("/app/link")({ component: MyLink });

function MyLink() {
  const { user } = useAuth();
  const [domain, setDomain] = useState("fire.com");
  const [prefix, setPrefix] = useState("");

  useEffect(() => {
    supabase.from("settings").select("affiliate_link_domain, affiliate_link_prefix").limit(1).single()
      .then(({ data }) => { if (data) { setDomain(data.affiliate_link_domain); setPrefix(data.affiliate_link_prefix ?? ""); } });
  }, []);

  const { data: aff } = useQuery({
    queryKey: ["aff-link", user?.id], enabled: !!user,
    queryFn: async () => (await supabase.from("affiliates").select("*").eq("user_id", user!.id).maybeSingle()).data,
  });

  if (!aff) return <DashboardLayout variant="affiliate"><div className="h-40 rounded-2xl bg-card animate-pulse" /></DashboardLayout>;

  const link = `https://${domain}/${prefix}${aff.slug}`;
  const copy = () => { navigator.clipboard.writeText(link); toast.success("Link copiado"); };
  const share = async () => navigator.share ? navigator.share({ url: link }) : copy();

  return (
    <DashboardLayout variant="affiliate" title="Meu Link">
      <h1 className="font-display text-3xl font-bold mb-1">Meu link</h1>
      <p className="text-muted-foreground text-sm mb-6">Compartilhe com seu público e gere vendas.</p>

      <div className="grid lg:grid-cols-2 gap-4">
        <div className="rounded-2xl border border-border bg-card p-6 shadow-card-premium">
          <div className="text-xs uppercase tracking-wider text-muted-foreground mb-2">Link exclusivo</div>
          <div className="font-mono text-lg text-primary break-all mb-4">{link}</div>
          <div className="flex gap-2 flex-wrap">
            <Button onClick={copy} className="bg-gradient-fire text-white shadow-fire"><Copy className="h-4 w-4 mr-1" /> Copiar</Button>
            <Button onClick={share} variant="outline" className="border-primary/40 text-primary"><Share2 className="h-4 w-4 mr-1" /> Compartilhar</Button>
          </div>
        </div>
        <div className="rounded-2xl border border-border bg-card p-6 shadow-card-premium flex flex-col items-center">
          <div className="text-xs uppercase tracking-wider text-muted-foreground mb-3">QR Code</div>
          <div className="bg-white p-4 rounded-xl"><QRCodeSVG value={link} size={200} fgColor="#050505" /></div>
        </div>
      </div>
    </DashboardLayout>
  );
}
