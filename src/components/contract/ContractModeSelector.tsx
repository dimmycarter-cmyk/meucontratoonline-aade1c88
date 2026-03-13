import { Sparkles, Edit3 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

interface ContractModeSelectorProps {
  onSelect: (mode: "ai" | "manual") => void;
}

const ContractModeSelector = ({ onSelect }: ContractModeSelectorProps) => {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-lg font-semibold text-foreground">
          Como deseja preencher o contrato?
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          Escolha entre preenchimento inteligente com IA ou manual
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {/* AI Mode */}
        <Card
          className="group cursor-pointer shadow-card transition-all hover:shadow-elevated hover:ring-2 hover:ring-primary border-2 border-transparent"
          onClick={() => onSelect("ai")}
        >
          <CardContent className="p-8 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary transition-transform group-hover:scale-110">
              <Sparkles className="h-8 w-8" />
            </div>
            <h3 className="font-display text-lg font-bold text-foreground mb-2">
              Preencher com IA
            </h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Anexe os documentos dos participantes e nossa IA extrai e preenche o contrato automaticamente
            </p>
            <div className="mt-4 flex flex-wrap justify-center gap-1.5">
              {["CNH", "RG", "Comprovante", "Matrícula"].map((tag) => (
                <span
                  key={tag}
                  className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary"
                >
                  {tag}
                </span>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Manual Mode */}
        <Card
          className="group cursor-pointer shadow-card transition-all hover:shadow-elevated hover:ring-2 hover:ring-muted-foreground/30 border-2 border-transparent"
          onClick={() => onSelect("manual")}
        >
          <CardContent className="p-8 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-muted text-muted-foreground transition-transform group-hover:scale-110">
              <Edit3 className="h-8 w-8" />
            </div>
            <h3 className="font-display text-lg font-bold text-foreground mb-2">
              Preencher Manualmente
            </h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Preencha todos os dados do contrato nos formulários campo a campo
            </p>
            <div className="mt-4">
              <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
                Fluxo tradicional
              </span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ContractModeSelector;
