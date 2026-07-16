import { AlertTriangle, User, Home, DollarSign, Building2, FileText, Calendar, Users, Printer } from "lucide-react";
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

/** Itens exibidos por grupo antes do "e mais X" — pós-inversão (2.2b) a lista
 *  pode passar de 50; despejar tudo é ruído tão inútil quanto o número seco. */
const MAX_ITEMS_PER_GROUP = 5;

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
  const tv = TEMPLATE_VARIABLES.find((v) => v.key === key);
  if (tv) return { category: tv.category, label: tv.label };

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
  onGoBack: () => void;
  /**
   * Lacunas ANÔNIMAS: spans `.lacuna` de campos intra-{{#each}} (qualificação
   * de participantes), já resolvidos pelo render — não têm token nomeável sem
   * API nova no motor (assimetria deliberada da 2.2a). Entram na contagem
   * total e ganham uma linha própria, não itens nominais.
   */
  lacunaCount?: number;
  /**
   * Quando presente, o dialog é um CONFIRM (2.2b, D4): "Imprimir mesmo assim"
   * chama onConfirm. Sem ele, degrada para o hard block antigo (só "Voltar").
   */
  onConfirm?: () => void;
}

/**
 * Confirm de impressão/exportação (2.2b, D4 — substitui o hard block).
 *
 * Pós-inversão a contagem é GRANDE (template real vazio ≈ 57): "57 campos em
 * branco — continuar?" é ruído que mata o aviso também onde ele está certo.
 * Por isso o dialog LISTA os campos por família ("Faltou o CPF do comprador"
 * é acionável; "57" não é), truncando cada grupo em MAX_ITEMS_PER_GROUP.
 */
export default function UnresolvedPlaceholdersDialog({
  open,
  onOpenChange,
  unresolved,
  onGoBack,
  lacunaCount = 0,
  onConfirm,
}: Props) {
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
  const total = unresolved.length + lacunaCount;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-warning" />
            {total} campo{total === 1 ? "" : "s"} em branco no contrato
          </DialogTitle>
          <DialogDescription>
            Os campos abaixo sairão como linha para preenchimento à mão
            (__________). Complete-os no sistema ou confirme a impressão assim
            mesmo.
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[50vh] pr-3">
          <div className="space-y-4">
            {groupsArray.map((group) => {
              const Icon = group.icon;
              const visible = group.items.slice(0, MAX_ITEMS_PER_GROUP);
              const hidden = group.items.length - visible.length;
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
                    {visible.map((it, idx) => (
                      <li key={`${it.raw}-${idx}`} className="text-xs text-muted-foreground">
                        <span className="font-medium text-foreground">{it.label}</span>
                        <span className="ml-2 font-mono text-[11px] text-muted-foreground/70">
                          {it.raw}
                        </span>
                      </li>
                    ))}
                    {hidden > 0 && (
                      <li className="text-xs italic text-muted-foreground">
                        e mais {hidden} campo{hidden === 1 ? "" : "s"} de {group.category.toLowerCase()}
                      </li>
                    )}
                  </ul>
                </div>
              );
            })}

            {lacunaCount > 0 && (
              <div className="rounded-lg border border-border p-3">
                <div className="mb-1 flex items-center gap-2">
                  <Users className="h-4 w-4 text-primary" />
                  <h4 className="text-sm font-semibold text-foreground">Qualificação dos participantes</h4>
                  <Badge variant="secondary" className="text-xs">
                    {lacunaCount}
                  </Badge>
                </div>
                <p className="pl-6 text-xs text-muted-foreground">
                  {lacunaCount} lacuna{lacunaCount === 1 ? "" : "s"} realçada
                  {lacunaCount === 1 ? "" : "s"} em amarelo no texto do contrato
                  (RG, CPF, endereço e afins dos participantes) — localize-as
                  pelo destaque no documento.
                </p>
              </div>
            )}
          </div>
        </ScrollArea>

        <DialogFooter>
          <Button variant={onConfirm ? "outline" : "default"} onClick={onGoBack} className="gap-2">
            Voltar para corrigir
          </Button>
          {onConfirm && (
            <Button onClick={onConfirm} className="gap-2">
              <Printer className="h-4 w-4" />
              Imprimir mesmo assim
            </Button>
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
