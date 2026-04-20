import { useEffect } from "react";
import { useBrand } from "@/hooks/useBrand";

/**
 * Aplica branding dinâmico (document.title + favicon) usando configurações globais.
 * Renderizado no root para afetar todas as rotas.
 */
export function BrandHead() {
  const { logoUrl, companyName } = useBrand();

  useEffect(() => {
    if (typeof document === "undefined") return;
    const name = companyName || "FIRE";
    document.title = `${name} Afiliados — Plataforma Premium`;

    if (logoUrl) {
      let link = document.querySelector<HTMLLinkElement>("link[rel~='icon']");
      if (!link) {
        link = document.createElement("link");
        link.rel = "icon";
        document.head.appendChild(link);
      }
      link.href = logoUrl;
    }
  }, [logoUrl, companyName]);

  return null;
}
