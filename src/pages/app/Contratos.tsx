import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search, Filter, Download, MoreHorizontal, FileText, Eye, Plus, Trash2, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useContracts } from "@/hooks/useContracts";
import { useAuth } from "@/contexts/AuthContext";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { format } from "date-fns";
import { getContractStatusMeta } from "@/lib/contract-status";

const Contratos = () => {
  const navigate = useNavigate();
  const { contracts, isLoading, deleteContract } = useContracts();
  const { hasRole } = useAuth();
  const canDelete = hasRole("admin_empresa") || hasRole("super_admin");
  const [search, setSearch] = useState("");

  const filtered = contracts.filter((c) => {
    const term = search.toLowerCase();
    return (
      c.nome.toLowerCase().includes(term) ||
      (c.internal_code ?? "").toLowerCase().includes(term)
    );
  });

  const formatCurrency = (value: number | null) => {
    if (!value) return "—";
    return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
  };

  return (
    <div className="p-6 lg:p-8">
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">Contratos</h1>
          <p className="text-sm text-muted-foreground">{contracts.length} contratos</p>
        </div>
        <Button onClick={() => navigate("/app/novo-contrato")} className="gap-2">
          <Plus className="h-4 w-4" /> Novo Contrato
        </Button>
      </div>

      <Card className="shadow-card">
        <CardHeader className="pb-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input placeholder="Buscar por código ou nome..." className="pl-10" value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="py-12 text-center text-sm text-muted-foreground">Carregando...</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border text-left">
                    <th className="pb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Código</th>
                    <th className="pb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Contrato</th>
                    <th className="pb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Status</th>
                    <th className="hidden pb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground lg:table-cell">Valor</th>
                    <th className="hidden pb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground sm:table-cell">Data</th>
                    <th className="pb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filtered.map((contrato) => (
                    <tr key={contrato.id} className="transition-colors hover:bg-muted/50">
                      <td className="py-3">
                        <span className="font-mono text-sm font-medium text-foreground">
                          {contrato.internal_code ?? "—"}
                        </span>
                      </td>
                      <td className="py-3">
                        <div className="flex items-center gap-3">
                          <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                            <FileText className="h-4 w-4" />
                          </div>
                          <div>
                            <p className="text-sm font-medium text-foreground">{contrato.nome || "Sem nome"}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-3">
                        {(() => {
                          const meta = getContractStatusMeta(contrato.status);
                          return (
                            <Badge className={meta.className + " text-xs font-medium"}>
                              {meta.label}
                            </Badge>
                          );
                        })()}
                      </td>
                      <td className="hidden py-3 text-sm font-medium text-foreground lg:table-cell">
                        {formatCurrency(contrato.valor_total)}
                      </td>
                      <td className="hidden py-3 text-sm text-muted-foreground sm:table-cell">
                        {format(new Date(contrato.created_at), "dd/MM/yyyy")}
                      </td>
                      <td className="py-3 text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => navigate(`/app/contratos/${contrato.id}`)}>
                              <Eye className="mr-2 h-4 w-4" /> Visualizar
                            </DropdownMenuItem>
                            {canDelete && (
                              <DropdownMenuItem
                                className="text-destructive"
                                onClick={() => deleteContract(contrato.id)}
                              >
                                <Trash2 className="mr-2 h-4 w-4" /> Excluir
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {!isLoading && filtered.length === 0 && (
            <div className="py-12 text-center">
              <p className="text-sm text-muted-foreground">Nenhum contrato encontrado.</p>
              <Button variant="outline" className="mt-4" onClick={() => navigate("/app/novo-contrato")}>
                Criar primeiro contrato
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Contratos;
