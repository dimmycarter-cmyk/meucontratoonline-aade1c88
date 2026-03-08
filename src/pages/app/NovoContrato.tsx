import { useState } from "react";
import { FileText, ChevronRight, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const modelos = [
  {
    id: "compra-venda-financiado",
    nome: "Promessa de Compra e Venda (Financiado)",
    descricao: "Contrato para transações com financiamento bancário. Inclui cláusulas de financiamento, alienação fiduciária e condições suspensivas.",
    campos: 32,
    clausulas: 18,
  },
  {
    id: "compra-venda-avista",
    nome: "Promessa de Compra e Venda (À Vista)",
    descricao: "Contrato para transações com pagamento integral. Inclui cláusulas de quitação, transferência e prazos de escritura.",
    campos: 28,
    clausulas: 15,
  },
];

const steps = [
  { id: 1, label: "Modelo" },
  { id: 2, label: "Partes" },
  { id: 3, label: "Documentos" },
  { id: 4, label: "Dados" },
  { id: 5, label: "Cláusulas" },
  { id: 6, label: "Editor" },
  { id: 7, label: "Finalizar" },
];

const NovoContrato = () => {
  const [currentStep, setCurrentStep] = useState(1);
  const [selectedModel, setSelectedModel] = useState<string | null>(null);

  return (
    <div className="p-6 lg:p-8">
      <div className="mb-8">
        <h1 className="font-display text-2xl font-bold text-foreground">Novo Contrato</h1>
        <p className="text-sm text-muted-foreground">Siga as etapas para gerar seu contrato</p>
      </div>

      {/* Steps */}
      <div className="mb-8 flex items-center gap-2 overflow-x-auto pb-2">
        {steps.map((step, i) => (
          <div key={step.id} className="flex items-center">
            <div className={`flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
              currentStep === step.id
                ? "bg-primary text-primary-foreground"
                : currentStep > step.id
                ? "bg-success/10 text-success"
                : "bg-muted text-muted-foreground"
            }`}>
              {currentStep > step.id ? <CheckCircle2 className="h-3.5 w-3.5" /> : <span>{step.id}</span>}
              <span className="hidden sm:inline">{step.label}</span>
            </div>
            {i < steps.length - 1 && <ChevronRight className="mx-1 h-4 w-4 text-muted-foreground" />}
          </div>
        ))}
      </div>

      {/* Step 1: Modelo */}
      {currentStep === 1 && (
        <div className="space-y-4">
          <h2 className="font-display text-lg font-semibold text-foreground">Escolha o modelo de contrato</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {modelos.map((modelo) => (
              <Card
                key={modelo.id}
                className={`cursor-pointer shadow-card transition-all hover:shadow-elevated ${
                  selectedModel === modelo.id ? "ring-2 ring-primary" : ""
                }`}
                onClick={() => setSelectedModel(modelo.id)}
              >
                <CardHeader>
                  <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <FileText className="h-5 w-5" />
                    </div>
                    <div>
                      <CardTitle className="text-base">{modelo.nome}</CardTitle>
                      <CardDescription className="mt-1">{modelo.descricao}</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="flex gap-3">
                  <Badge variant="secondary" className="text-xs">{modelo.campos} campos</Badge>
                  <Badge variant="secondary" className="text-xs">{modelo.clausulas} cláusulas</Badge>
                </CardContent>
              </Card>
            ))}
          </div>
          <div className="flex justify-end pt-4">
            <Button disabled={!selectedModel} onClick={() => setCurrentStep(2)}>
              Próximo <ChevronRight className="ml-1 h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Placeholder for other steps */}
      {currentStep > 1 && (
        <Card className="shadow-card">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-primary">
              <FileText className="h-8 w-8" />
            </div>
            <h3 className="mb-2 font-display text-lg font-semibold text-foreground">
              {steps[currentStep - 1].label}
            </h3>
            <p className="mb-6 text-sm text-muted-foreground">
              Esta etapa será implementada com a integração ao Supabase
            </p>
            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setCurrentStep(currentStep - 1)}>Voltar</Button>
              {currentStep < steps.length && (
                <Button onClick={() => setCurrentStep(currentStep + 1)}>
                  Próximo <ChevronRight className="ml-1 h-4 w-4" />
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default NovoContrato;
