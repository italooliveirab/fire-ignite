import { Outlet, Link, createRootRoute, HeadContent, Scripts } from "@tanstack/react-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";
import { Toaster } from "@/components/ui/sonner";
import { AuthProvider } from "@/lib/auth";
import { BrandHead } from "@/components/BrandHead";
import { ClickSpark } from "@/components/ClickSpark";
import { Flame } from "lucide-react";

import appCss from "../styles.css?url";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <div className="mx-auto mb-6 h-16 w-16 rounded-2xl bg-gradient-fire flex items-center justify-center shadow-fire">
          <Flame className="h-8 w-8 text-white" />
        </div>
        <h1 className="font-display text-7xl font-bold text-gradient-fire">404</h1>
        <h2 className="mt-4 text-xl font-semibold">Página não encontrada</h2>
        <p className="mt-2 text-sm text-muted-foreground">A página que você procura não existe.</p>
        <Link to="/" className="inline-flex mt-6 px-5 py-2.5 rounded-lg bg-gradient-fire text-white font-medium shadow-fire">
          Voltar ao início
        </Link>
      </div>
    </div>
  );
}

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "FIRE Afiliados — Plataforma de Gestão Premium" },
      { name: "description", content: "Plataforma FIRE para gestão completa de afiliados, leads, comissões e pagamentos. Performance, lucro e tecnologia." },
      { name: "author", content: "FIRE" },
      { property: "og:title", content: "FIRE Afiliados — Plataforma de Gestão Premium" },
      { property: "og:description", content: "Plataforma FIRE para gestão completa de afiliados, leads, comissões e pagamentos. Performance, lucro e tecnologia." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "twitter:title", content: "FIRE Afiliados — Plataforma de Gestão Premium" },
      { name: "twitter:description", content: "Plataforma FIRE para gestão completa de afiliados, leads, comissões e pagamentos. Performance, lucro e tecnologia." },
      { property: "og:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/d437c6de-6772-4341-bcfd-22615a3b9c0b/id-preview-34f7799c--b36fcbfb-a1d3-4343-8110-326ce3245ab1.lovable.app-1776704255697.png" },
      { name: "twitter:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/d437c6de-6772-4341-bcfd-22615a3b9c0b/id-preview-34f7799c--b36fcbfb-a1d3-4343-8110-326ce3245ab1.lovable.app-1776704255697.png" },
    ],
    links: [{ rel: "stylesheet", href: appCss }],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
});

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className="dark">
      <head><HeadContent /></head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const [qc] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 5 * 60_000,
        gcTime: 30 * 60_000,
        retry: 1,
        refetchOnWindowFocus: false,
        refetchOnReconnect: false,
      },
    },
  }));
  return (
    <QueryClientProvider client={qc}>
      <AuthProvider>
        <BrandHead />
        <ClickSpark />
        <Outlet />
        <Toaster theme="dark" position="top-right" richColors />
      </AuthProvider>
    </QueryClientProvider>
  );
}
