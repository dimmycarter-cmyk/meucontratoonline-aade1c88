import { AlertTriangle, User, Home, DollarSign, Building2, FileText, Calendar, Users } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { TEMPLATE_VARIABLES } from "@/lib/template-variables";
import { LEGACY_BRACKET_MAP } from "@/lib/placeholder";

export interface UnresolvedItem {
  raw: string;          // ex: "{{vendedor_nome}}" ou "[NOME DO VENDEDOR]"
  key: string;          // chave canônica (vendedor_nome) ou label original quando não mapeado
  type: "curly" | "bracket";
}

interface CategoryGroup {
  category: string;
  icon: React.ComponentType<{ className?: string }>;
  items: Array<{ raw: string; label: string; key: string }>;
}

const CATEGORY_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  Comprador: User,
  Vendedor: User,
  Cônjuge: Users,
  Anuente: Users,
  Procuração: FileText,
  Testemunhas: Users,
  Imóvel: Home,
  Financeiro: DollarSign,
  Valores: DollarSign,
  Parcelas: Calendar,
  Empresa: Building2,
  Imobiliária: Building2,
  Intermediadoras: Building2,
  Contrato: FileText,
  Data: Calendar,
  Outros: AlertTriangle,
};

function categorizeKey(key: string): { category: string; label: string } {
  // Procura primeiro em TEMPLATE_VARIABLES
  const tv = TEMPLATE_VARIABLES.find((v) => v.key === key);
  if (tv) return { category: tv.category, label: tv.label };

  // Heurística por prefixo/raiz
  if (/^comprador/.test(key)) return { category: "Comprador", label: key };
  if (/^vendedor/.test(key)) return { category: "Vendedor", label: key };
  if (/^conjuge/.test(key)) return { category: "Cônjuge", label: key };
  if (/^anuente/.test(key)) return { category: "Anuente", label: key };
  if (/^procurador/.test(key)) return { category: "Procuração", label: key };
  if (/^testemunha/.test(key)) return { category: "Testemunhas", label: key };
  if (/^imovel/.test(key)) return { category: "Imóvel", label: key };
  if (/^valor|^forma_pagamento|^banco_financ|^multa|^parcela/.test(key)) return { category: "Valores", label: key };
  if (/^parcela/.test(key)) return { category: "Parcelas", label: key };
  if (/^empresa|^imobiliaria/.test(key)) return { category: "Empresa", label: key };
  if (/^intermediadora/.test(key)) return { category: "Intermediadoras", label: key };
  if (/^data|^cidade|^foro|^contrato/.test(key)) return { category: "Contrato", label: key };
  return { category: "Outros", label: key };
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  unresolved: UnresolvedItem[];
  /**
   * "hard" — bloqueia exportação. Único CTA: "Voltar para corrigir".
   * "soft" — permite continuar (ex: salvar como rascunho). Mostra ambos os CTAs.
   */
  mode: "hard" | "soft";
  onContinueAnyway?: () => void;
  onGoBack: () => void;
}

export default function UnresolvedPlaceholdersDialog({
  open,
  onOpenChange,
  unresolved,
  mode,
  onContinueAnyway,
  onGoBack,
}: Props) {
  // Agrupa por categoria
  const groups = new Map<string, CategoryGroup>();
  for (const item of unresolved) {
    const { category, label } = categorizeKey(item.key);
    if (!groups.has(category)) {
      groups.set(category, {
        category,
        icon: CATEGORY_ICONS[category] || AlertTriangle,
        items: [],
      });
    }
    groups.get(category)!.items.push({ raw: item.raw, label, key: item.key });
  }

  const groupsArray = Array.from(groups.values()).sort((a, b) => a.category.localeCompare(b.category));
  const total = unresolved.length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-warning" />
            {mode === "hard" ? "Não é possível exportar" : "Campos não preenchidos"}
          </DialogTitle>
          <DialogDescription>
            {mode === "hard" ? (
              <>
                Existem <strong>{total}</strong> placeholder{total > 1 ? "s" : ""} sem dados no contrato.
                Preencha-os antes de exportar o PDF para evitar contratos com campos órfãos.
              </>
            ) : (
              <>
                Foram detectados <strong>{total}</strong> campo{total > 1 ? "s" : ""} ainda sem dados.
                O contrato será salvo como <strong>rascunho</strong> automaticamente.
              </>
            )}
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[50vh] pr-3">
          <div className="space-y-4">
            {groupsArray.map((group) => {
              const Icon = group.icon;
              return (
                <div key={group.category} className="rounded-lg border border-border p-3">
                  <div className="mb-2 flex items-center gap-2">
                    <Icon className="h-4 w-4 text-primary" />
                    <h4 className="text-sm font-semibold text-foreground">{group.category}</h4>
                    <Badge variant="secondary" className="text-xs">
                      {group.items.length}
                    </Badge>
                  </div>
                  <ul className="space-y-1.5 pl-6">
                    {group.items.map((it, idx) => (
                      <li key={`${it.raw}-${idx}`} className="text-xs text-muted-foreground">
                        <span className="font-medium text-foreground">{it.label}</span>
                        <span className="ml-2 font-mono text-[11px] text-muted-foreground/70">
                          {it.raw}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
        </ScrollArea>

        <DialogFooter>
          {mode === "hard" ? (
            <Button onClick={onGoBack} className="gap-2">
              Voltar para corrigir
            </Button>
          ) : (
            <>
              <Button variant="outline" onClick={onGoBack}>
                Voltar para corrigir
              </Button>
              {onContinueAnyway && (
                <Button onClick={onContinueAnyway}>
                  Salvar como rascunho mesmo assim
                </Button>
              )}
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/**
 * Converte a saída de getUnresolvedPlaceholders (string[]) em UnresolvedItem[].
 */
export function parseUnresolvedStrings(items: string[]): UnresolvedItem[] {
  return items.map((raw) => {
    if (raw.startsWith("{{")) {
      const key = raw.replace(/[{}\s]/g, "");
      return { raw, key, type: "curly" as const };
    }
    const label = raw.replace(/^\[|\]$/g, "").trim();
    const canonical = LEGACY_BRACKET_MAP[label.toUpperCase()] || label;
    return { raw, key: canonical, type: "bracket" as const };
  });
}
