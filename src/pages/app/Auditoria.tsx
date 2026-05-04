import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, ShieldCheck, CalendarIcon, X } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { AUDIT_ACTION_LABELS, type AuditAction } from "@/lib/audit";
import { useAuditLogs } from "@/hooks/useAuditLogs";

const ACTIONS: AuditAction[] = Object.keys(AUDIT_ACTION_LABELS) as AuditAction[];

const Auditoria = () => {
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [actionFilter, setActionFilter] = useState<AuditAction | "all">("all");
  const [dateFrom, setDateFrom] = useState<Date | null>(null);
  const [dateTo, setDateTo] = useState<Date | null>(null);

  const { data, isLoading } = useAuditLogs({
    page,
    pageSize: 20,
    action: actionFilter,
    dateFrom,
    dateTo,
  });

  const rows = data?.rows ?? [];
  const total = data?.total ?? 0;
  const pageSize = data?.pageSize ?? 20;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const fromIdx = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const toIdx = Math.min(page * pageSize, total);

  const clearFilters = () => {
    setActionFilter("all");
    setDateFrom(null);
    setDateTo(null);
    setPage(1);
  };

  const summarizeMetadata = (meta: Record<string, unknown>) => {
    if (!meta || Object.keys(meta).length === 0) return "—";
    const entries = Object.entries(meta).slice(0, 3);
    return entries.map(([k, v]) => `${k}: ${typeof v === "object" ? JSON.stringify(v) : String(v)}`).join(" · ");
  };

  return (
    <div className="p-6 lg:p-8">
      <div className="mb-6 flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate("/app/configuracoes")}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <h1 className="font-display text-2xl font-bold text-foreground flex items-center gap-2">
            <ShieldCheck className="h-6 w-6 text-primary" /> Auditoria
          </h1>
          <p className="text-sm text-muted-foreground">Registros imutáveis das ações dos usuários (LGPD)</p>
        </div>
      </div>

      <Card className="shadow-card">
        <CardHeader className="pb-4">
          <CardTitle className="text-base">Filtros</CardTitle>
          <CardDescription>Filtre por tipo de ação e período</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-6 flex flex-wrap items-center gap-3">
            <Select value={actionFilter} onValueChange={(v) => { setActionFilter(v as any); setPage(1); }}>
              <SelectTrigger className="w-[260px]">
                <SelectValue placeholder="Todas as ações" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as ações</SelectItem>
                {ACTIONS.map((a) => (
                  <SelectItem key={a} value={a}>{AUDIT_ACTION_LABELS[a]}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className={cn("justify-start text-left font-normal", !dateFrom && "text-muted-foreground")}>
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {dateFrom ? format(dateFrom, "dd/MM/yyyy", { locale: ptBR }) : "Data inicial"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={dateFrom ?? undefined}
                  onSelect={(d) => { setDateFrom(d ?? null); setPage(1); }}
                  initialFocus
                  className={cn("p-3 pointer-events-auto")}
                />
              </PopoverContent>
            </Popover>

            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className={cn("justify-start text-left font-normal", !dateTo && "text-muted-foreground")}>
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {dateTo ? format(dateTo, "dd/MM/yyyy", { locale: ptBR }) : "Data final"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={dateTo ?? undefined}
                  onSelect={(d) => { setDateTo(d ?? null); setPage(1); }}
                  initialFocus
                  className={cn("p-3 pointer-events-auto")}
                />
              </PopoverContent>
            </Popover>

            {(actionFilter !== "all" || dateFrom || dateTo) && (
              <Button variant="ghost" size="sm" onClick={clearFilters} className="gap-1">
                <X className="h-4 w-4" /> Limpar
              </Button>
            )}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border text-left">
                  <th className="pb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Data/hora</th>
                  <th className="pb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Usuário</th>
                  <th className="pb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Ação</th>
                  <th className="pb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Entidade</th>
                  <th className="pb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Detalhes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {isLoading ? (
                  <tr><td colSpan={5} className="py-8 text-center text-sm text-muted-foreground">Carregando...</td></tr>
                ) : rows.length === 0 ? (
                  <tr><td colSpan={5} className="py-8 text-center text-sm text-muted-foreground">Nenhum registro encontrado.</td></tr>
                ) : (
                  rows.map((row) => {
                    const label = AUDIT_ACTION_LABELS[row.action as AuditAction] ?? row.action;
                    const summary = summarizeMetadata(row.metadata ?? {});
                    return (
                      <tr key={row.id} className="hover:bg-muted/50">
                        <td className="py-3 text-sm text-foreground whitespace-nowrap">
                          {format(new Date(row.created_at), "dd/MM/yyyy HH:mm:ss", { locale: ptBR })}
                        </td>
                        <td className="py-3 text-sm">
                          <div className="font-medium text-foreground">{row.user?.nome || "—"}</div>
                          <div className="text-xs text-muted-foreground">{row.user?.email || row.user_id?.slice(0, 8)}</div>
                        </td>
                        <td className="py-3">
                          <Badge variant="outline" className="text-xs">{label}</Badge>
                        </td>
                        <td className="py-3 text-sm">
                          <span className="text-foreground">{row.entity_type}</span>
                          {row.entity_id && (
                            <span className="ml-2 font-mono text-xs text-muted-foreground">{row.entity_id.slice(0, 8)}</span>
                          )}
                        </td>
                        <td className="py-3 text-sm max-w-[400px]">
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <code className="block truncate text-xs text-muted-foreground cursor-help">
                                  {summary}
                                </code>
                              </TooltipTrigger>
                              <TooltipContent className="max-w-md">
                                <pre className="text-xs whitespace-pre-wrap break-all">
                                  {JSON.stringify(row.metadata, null, 2)}
                                </pre>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          <div className="mt-4 flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              {total === 0 ? "0 registros" : `${fromIdx}–${toIdx} de ${total}`}
            </p>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                Anterior
              </Button>
              <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
                Próxima
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Auditoria;
