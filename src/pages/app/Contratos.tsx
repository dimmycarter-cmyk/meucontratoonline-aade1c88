import { useState } from "react";
import { Search, Filter, Download, MoreHorizontal, FileText, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const statusColors: Record<string, string> = {
  rascunho: "bg-muted text-muted-foreground",
  "em preenchimento": "bg-info/10 text-info",
  "aguardando revisão": "bg-warning/10 text-warning",
  pronto: "bg-success/10 text-success",
  exportado: "bg-primary/10 text-primary",
  cancelado: "bg-destructive/10 text-destructive",
};

const mockContratos = [
  { id: 1, nome: "Compra e Venda - Apt 302 Vila Mariana", tipo: "Compra e Venda (Financiado)", status: "pronto", valor: "R$ 450.000,00", data: "05/03/2026", partes: "Maria Silva → João Oliveira" },
  { id: 2, nome: "Compra e Venda - Casa Jardim Europa", tipo: "Compra e Venda (À Vista)", status: "em preenchimento", valor: "R$ 1.200.000,00", data: "04/03/2026", partes: "Ana Ferreira → Roberto Lima" },
  { id: 3, nome: "Compra e Venda - Terreno Alphaville", tipo: "Compra e Venda (À Vista)", status: "rascunho", valor: "R$ 350.000,00", data: "03/03/2026", partes: "Carla Costa → Pedro Santos" },
  { id: 4, nome: "Compra e Venda - Sala Comercial Centro", tipo: "Compra e Venda (Financiado)", status: "exportado", valor: "R$ 280.000,00", data: "01/03/2026", partes: "Empresa XYZ → Carlos Mendes" },
  { id: 5, nome: "Compra e Venda - Cobertura Ipanema", tipo: "Compra e Venda (Financiado)", status: "aguardando revisão", valor: "R$ 3.500.000,00", data: "28/02/2026", partes: "Paulo Ricardo → Fernanda Lopes" },
];

const Contratos = () => {
  const [search, setSearch] = useState("");
  const filtered = mockContratos.filter((c) => c.nome.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="p-6 lg:p-8">
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">Histórico de Contratos</h1>
          <p className="text-sm text-muted-foreground">{mockContratos.length} contratos</p>
        </div>
      </div>

      <Card className="shadow-card">
        <CardHeader className="pb-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input placeholder="Buscar contratos..." className="pl-10" value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm"><Filter className="mr-1 h-4 w-4" /> Filtros</Button>
              <Button variant="outline" size="sm"><Download className="mr-1 h-4 w-4" /> Exportar</Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border text-left">
                  <th className="pb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Contrato</th>
                  <th className="hidden pb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground md:table-cell">Tipo</th>
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
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                          <FileText className="h-4 w-4" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-foreground">{contrato.nome}</p>
                          <p className="text-xs text-muted-foreground">{contrato.partes}</p>
                        </div>
                      </div>
                    </td>
                    <td className="hidden py-3 text-sm text-muted-foreground md:table-cell">{contrato.tipo}</td>
                    <td className="py-3">
                      <Badge className={statusColors[contrato.status] + " text-xs font-medium"}>{contrato.status}</Badge>
                    </td>
                    <td className="hidden py-3 text-sm font-medium text-foreground lg:table-cell">{contrato.valor}</td>
                    <td className="hidden py-3 text-sm text-muted-foreground sm:table-cell">{contrato.data}</td>
                    <td className="py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="ghost" size="icon" className="h-8 w-8"><Eye className="h-4 w-4" /></Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8"><MoreHorizontal className="h-4 w-4" /></Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {filtered.length === 0 && (
            <div className="py-12 text-center text-sm text-muted-foreground">Nenhum contrato encontrado.</div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Contratos;
