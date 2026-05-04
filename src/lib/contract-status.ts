// Mapeamento canônico de status de contrato (label + classe Tailwind via tokens semânticos).
// Cores escolhidas para reutilizar tokens já existentes no design system.

export type ContractStatus =
  | "rascunho"
  | "partes_pendentes"
  | "dados_pendentes"
  | "revisao_juridica"
  | "aguardando_assinatura"
  | "concluido"
  | "arquivado"
  | "cancelado";

export type ContractStep =
  | "template"
  | "parties-docs"
  | "participants"
  | "review-data"
  | "data-clauses"
  | "editor-finish"
  | "concluido";

export const CONTRACT_STATUS_META: Record<
  ContractStatus,
  { label: string; className: string }
> = {
  rascunho: {
    label: "Rascunho",
    className: "bg-muted text-muted-foreground",
  },
  partes_pendentes: {
    label: "Partes pendentes",
    className: "bg-warning/10 text-warning",
  },
  dados_pendentes: {
    label: "Dados pendentes",
    // laranja: usa primary do design (laranja da marca)
    className: "bg-primary/10 text-primary",
  },
  revisao_juridica: {
    label: "Em revisão",
    className: "bg-info/10 text-info",
  },
  aguardando_assinatura: {
    label: "Aguardando assinatura",
    // roxo via accent semântico (fallback para info se accent não existir)
    className: "bg-accent/20 text-accent-foreground",
  },
  concluido: {
    label: "Concluído",
    className: "bg-success/10 text-success",
  },
  arquivado: {
    label: "Arquivado",
    className: "bg-foreground/10 text-foreground/70",
  },
  cancelado: {
    label: "Cancelado",
    className: "bg-destructive/10 text-destructive",
  },
};

export function getContractStatusMeta(status: string) {
  return (
    CONTRACT_STATUS_META[status as ContractStatus] ??
    CONTRACT_STATUS_META.rascunho
  );
}
