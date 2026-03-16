import { Clock, CheckCircle, XCircle, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useInvitations } from "@/hooks/useInvitations";
import { Skeleton } from "@/components/ui/skeleton";

const statusConfig: Record<string, { label: string; variant: "default" | "secondary" | "destructive"; icon: typeof Clock }> = {
  pending: { label: "Pendente", variant: "secondary", icon: Clock },
  accepted: { label: "Aceito", variant: "default", icon: CheckCircle },
  expired: { label: "Expirado", variant: "destructive", icon: XCircle },
};

export const PendingInvites = () => {
  const { invitations, isLoading, deleteInvite, isDeleting } = useInvitations();

  if (isLoading) {
    return <div className="space-y-2">{[1, 2].map((i) => <Skeleton key={i} className="h-10 w-full" />)}</div>;
  }

  if (invitations.length === 0) return null;

  return (
    <div className="mt-6">
      <h3 className="mb-3 text-sm font-semibold text-foreground">Convites enviados</h3>
      <div className="space-y-2">
        {invitations.map((inv) => {
          const config = statusConfig[inv.status] || statusConfig.pending;
          const Icon = config.icon;
          const isExpired = inv.status === "pending" && new Date(inv.expires_at) < new Date();
          const displayStatus = isExpired ? statusConfig.expired : config;
          const DisplayIcon = displayStatus.icon;

          return (
            <div key={inv.id} className="flex items-center justify-between rounded-lg border border-border bg-card p-3">
              <div className="flex items-center gap-3">
                <DisplayIcon className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium text-foreground">{inv.email}</p>
                  <p className="text-xs text-muted-foreground capitalize">{inv.role.replace("_", " ")}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant={displayStatus.variant}>{displayStatus.label}</Badge>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-muted-foreground hover:text-destructive"
                  disabled={isDeleting}
                  onClick={() => deleteInvite(inv.id)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
