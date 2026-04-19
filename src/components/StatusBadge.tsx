import { cn } from "@/lib/utils";

const styles: Record<string, string> = {
  // Lead
  initiated_conversation: "bg-info/15 text-info border-info/30",
  generated_trial: "bg-purple-500/15 text-purple-400 border-purple-500/30",
  generated_payment: "bg-warning/15 text-warning border-warning/30",
  paid: "bg-success/15 text-success border-success/30",
  not_paid: "bg-destructive/15 text-destructive border-destructive/30",
  // Commission
  pending: "bg-warning/15 text-warning border-warning/30",
  released: "bg-info/15 text-info border-info/30",
  // Affiliate
  active: "bg-success/15 text-success border-success/30",
  paused: "bg-warning/15 text-warning border-warning/30",
  blocked: "bg-destructive/15 text-destructive border-destructive/30",
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
      "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border whitespace-nowrap",
      styles[status] ?? "bg-muted text-muted-foreground border-border",
      className,
    )}>
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {labels[status] ?? status}
    </span>
  );
}
