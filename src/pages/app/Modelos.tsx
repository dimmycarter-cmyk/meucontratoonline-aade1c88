import { FileText, Plus, Eye, Copy, MoreHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const mockModelos = [
  { id: 1, nome: "Promessa de Compra e Venda (Financiado)", tipo: "Compra e Venda", campos: 32, clausulas: 18, status: "ativo" },
  { id: 2, nome: "Promessa de Compra e Venda (À Vista)", tipo: "Compra e Venda", campos: 28, clausulas: 15, status: "ativo" },
  { id: 3, nome: "Contrato de Locação Residencial", tipo: "Locação", campos: 24, clausulas: 20, status: "em breve" },
  { id: 4, nome: "Contrato de Locação Comercial", tipo: "Locação", campos: 26, clausulas: 22, status: "em breve" },
  { id: 5, nome: "Proposta de Compra", tipo: "Proposta", campos: 16, clausulas: 8, status: "em breve" },
  { id: 6, nome: "Contrato de Intermediação Imobiliária", tipo: "Intermediação", campos: 20, clausulas: 12, status: "em breve" },
];

const Modelos = () => {
  return (
    <div className="p-6 lg:p-8">
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">Modelos de Contrato</h1>
          <p className="text-sm text-muted-foreground">Modelos disponíveis para geração de contratos</p>
        </div>
        <Button><Plus className="mr-2 h-4 w-4" /> Novo Modelo</Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {mockModelos.map((modelo) => (
          <Card key={modelo.id} className="shadow-card transition-all hover:shadow-elevated">
            <CardContent className="p-5">
              <div className="mb-3 flex items-start justify-between">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <FileText className="h-5 w-5" />
                </div>
                <Badge variant={modelo.status === "ativo" ? "default" : "secondary"} className="text-xs">
                  {modelo.status === "ativo" ? "Ativo" : "Em breve"}
                </Badge>
              </div>
              <h3 className="mb-1 font-display text-sm font-semibold text-foreground">{modelo.nome}</h3>
              <p className="mb-3 text-xs text-muted-foreground">{modelo.tipo}</p>
              <div className="mb-4 flex gap-2">
                <Badge variant="secondary" className="text-xs">{modelo.campos} campos</Badge>
                <Badge variant="secondary" className="text-xs">{modelo.clausulas} cláusulas</Badge>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" className="flex-1" disabled={modelo.status !== "ativo"}>
                  <Eye className="mr-1 h-3 w-3" /> Ver
                </Button>
                <Button variant="outline" size="sm" disabled={modelo.status !== "ativo"}>
                  <Copy className="h-3 w-3" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default Modelos;
