import { useState } from "react";
import { Plus, Search, ScrollText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";

const mockClausulas = [
  { id: 1, titulo: "Quitação e Liberação de Ônus", categoria: "Financeiro", descricao: "Estabelece condições para quitação de ônus existentes sobre o imóvel.", ativa: true },
  { id: 2, titulo: "Alienação Fiduciária", categoria: "Financiamento", descricao: "Define as condições de alienação fiduciária junto à instituição financeira.", ativa: true },
  { id: 3, titulo: "Habite-se", categoria: "Regularização", descricao: "Condições para obtenção ou apresentação do habite-se do imóvel.", ativa: false },
  { id: 4, titulo: "Regularização do Imóvel", categoria: "Regularização", descricao: "Obrigações de regularização documental e predial do imóvel.", ativa: true },
  { id: 5, titulo: "Positividade de Certidões", categoria: "Documental", descricao: "Requisitos de apresentação de certidões negativas das partes.", ativa: true },
  { id: 6, titulo: "Rescisão Contratual", categoria: "Geral", descricao: "Condições e penalidades para rescisão do contrato por qualquer parte.", ativa: true },
  { id: 7, titulo: "Pagamento Parcelado", categoria: "Financeiro", descricao: "Define condições de parcelamento do valor, datas e formas de pagamento.", ativa: false },
  { id: 8, titulo: "Obrigações do Comprador", categoria: "Geral", descricao: "Lista as obrigações específicas do comprador no negócio.", ativa: true },
  { id: 9, titulo: "Obrigações do Vendedor", categoria: "Geral", descricao: "Lista as obrigações específicas do vendedor no negócio.", ativa: true },
];

const Clausulas = () => {
  const [search, setSearch] = useState("");
  const [clausulas, setClausulas] = useState(mockClausulas);
  const filtered = clausulas.filter((c) => c.titulo.toLowerCase().includes(search.toLowerCase()));

  const toggleClausula = (id: number) => {
    setClausulas((prev) => prev.map((c) => (c.id === id ? { ...c, ativa: !c.ativa } : c)));
  };

  return (
    <div className="p-6 lg:p-8">
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">Cláusulas Específicas</h1>
          <p className="text-sm text-muted-foreground">{clausulas.filter((c) => c.ativa).length} cláusulas ativas</p>
        </div>
        <Button><Plus className="mr-2 h-4 w-4" /> Nova Cláusula</Button>
      </div>

      <div className="mb-6">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Buscar cláusulas..." className="pl-10" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
      </div>

      <div className="space-y-3">
        {filtered.map((clausula) => (
          <Card key={clausula.id} className="shadow-card">
            <CardContent className="flex items-center gap-4 p-4">
              <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <ScrollText className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-semibold text-foreground">{clausula.titulo}</h3>
                  <Badge variant="secondary" className="text-xs">{clausula.categoria}</Badge>
                </div>
                <p className="mt-0.5 text-xs text-muted-foreground">{clausula.descricao}</p>
              </div>
              <Switch checked={clausula.ativa} onCheckedChange={() => toggleClausula(clausula.id)} />
            </CardContent>
          </Card>
        ))}
      </div>
      {filtered.length === 0 && (
        <div className="py-12 text-center text-sm text-muted-foreground">Nenhuma cláusula encontrada.</div>
      )}
    </div>
  );
};

export default Clausulas;
