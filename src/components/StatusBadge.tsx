import { cn } from "@/lib/utils";

const styles: Record<string, string> = {
  initiated_conversation: "bg-info/10 text-info border-info/40",
  generated_trial: "bg-purple-500/10 text-purple-400 border-purple-500/40",
  generated_payment: "bg-warning/10 text-warning border-warning/40",
  paid: "bg-success/10 text-success border-success/40",
  not_paid: "bg-destructive/10 text-destructive border-destructive/40",
  pending: "bg-warning/10 text-warning border-warning/40",
  released: "bg-info/10 text-info border-info/40",
  active: "bg-success/10 text-success border-success/40",
  paused: "bg-warning/10 text-warning border-warning/40",
  blocked: "bg-destructive/10 text-destructive border-destructive/40",
};

const labels: Record<string, string> = {
  initiated_conversation: "Iniciou conversa",
  generated_trial: "Gerou teste",
  generated_payment: "Gerou pagamento",
  paid: "Pagou",
  not_paid: "Não pagou",
  pending: "Pendente",
  released: "Liberada",
  active: "Ativo",
  paused: "Pausado",
  blocked: "Bloqueado",
};

export function StatusBadge({ status, className }: { status: string; className?: string }) {
  return (
    <span className={cn(
      "inline-flex items-center gap-1.5 px-2 py-0.5 text-[10px] font-display uppercase tracking-wider border whitespace-nowrap font-bold",
      styles[status] ?? "bg-muted text-muted-foreground border-border",
      className,
    )}>
      <span className="h-1.5 w-1.5 bg-current" />
      {labels[status] ?? status}
    </span>
  );
}
