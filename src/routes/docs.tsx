import { createFileRoute, Link } from "@tanstack/react-router";
import { Flame, ArrowLeft } from "lucide-react";

export const Route = createFileRoute("/docs")({ component: PublicDocs });

function PublicDocs() {
  return (
    <div className="min-h-screen px-4 py-10">
      <div className="max-w-3xl mx-auto">
        <Link to="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary mb-8">
          <ArrowLeft className="h-4 w-4" /> Voltar
        </Link>
        <div className="flex items-center gap-3 mb-8">
          <div className="h-11 w-11 rounded-xl bg-gradient-fire flex items-center justify-center shadow-fire"><Flame className="h-6 w-6 text-white" /></div>
          <h1 className="font-display text-4xl font-bold">API FIRE</h1>
        </div>
        <p className="text-muted-foreground mb-8">Para acessar a documentação completa, chaves de API e endpoints, faça login como administrador e acesse <span className="text-primary font-medium">API & Docs</span> no painel.</p>
        <Link to="/login" className="inline-flex px-5 py-3 rounded-xl bg-gradient-fire text-white font-semibold shadow-fire">Acessar painel</Link>
      </div>
    </div>
  );
}
