import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { useTenantLimits } from "@/hooks/useTenantLimits";
import { logAction } from "@/lib/audit";
import { parseSupabaseError } from "@/lib/supabase-errors";
import { resolveSaveMode, buildDraftContractPayload } from "@/lib/contract-save";
import { buildContractDraftWrite } from "@/lib/wizard-draft";

export interface Contract {
  id: string;
  tenant_id: string;
  template_id: string | null;
  nome: string;
  internal_code: string;
  status: string;
  comprador_id: string | null;
  vendedor_id: string | null;
  empresa_id: string | null;
  dados: Record<string, string>;
  /** Snapshot do wizard p/ retomada de rascunho (NULL em finalizados/legados). */
  wizard_state?: Record<string, unknown> | null;
  conteudo_final: string;
  clausulas_ids: string[];
  valor_total: number | null;
  valor_sinal: number | null;
  valor_financiamento: number | null;
  created_at: string;
  updated_at: string;
}

/** Entrada da mutação dedicada de rascunho persistente. */
export interface SaveDraftInput {
  /** Id efetivo (rota :id ou capturado do 1º INSERT). null → INSERT. */
  id: string | null;
  nome: string;
  currentStep: string;
  templateId: string | null;
  /** Snapshot canônico do wizard (`wizardSnapshot`). */
  snapshot: Record<string, unknown>;
  clausulasIds: string[];
  conteudoFinal: string;
  compradorId: string | null;
  vendedorId: string | null;
  empresaId: string | null;
}

export const useContracts = () => {
  const { profile, effectiveTenantId } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { canCreateContract, limits } = useTenantLimits();

  const query = useQuery({
    queryKey: ["contracts", effectiveTenantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("contracts")
        .select("*")
        .eq("tenant_id", effectiveTenantId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as Contract[];
    },
    enabled: !!effectiveTenantId,
  });

  const createMutation = useMutation({
    mutationFn: async (contract: Partial<Contract>) => {
      // TODO: Re-enable limit check after launch
      // if (!canCreateContract) {
      //   throw new Error(
      //     `Limite de contratos atingido (${limits?.current_contracts_this_month ?? 0}/${limits?.max_contracts_per_month ?? 0}). Faça upgrade do seu plano.`
      //   );
      // }
      const { data, error } = await supabase
        .from("contracts")
        .insert({ ...contract, tenant_id: effectiveTenantId } as any)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["contracts"] });
      queryClient.invalidateQueries({ queryKey: ["tenant-limits"] });
      toast({ title: "Contrato salvo com sucesso" });
      logAction({
        tenantId: effectiveTenantId,
        action: "contract.created",
        entityType: "contract",
        entityId: data?.id,
        metadata: { internal_code: data?.internal_code, status: data?.status },
      });
    },
    onError: (error) => {
      toast({ title: "Erro ao salvar contrato", description: parseSupabaseError(error), variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Contract> & { id: string }) => {
      let previousStatus: string | null = null;
      if (updates.status !== undefined) {
        const { data: prev } = await supabase
          .from("contracts")
          .select("status")
          .eq("id", id)
          .maybeSingle();
        previousStatus = (prev as any)?.status ?? null;
      }

      const STATUS_CONCLUIDO = "concluido";
      if (
        updates.status === STATUS_CONCLUIDO &&
        previousStatus !== STATUS_CONCLUIDO
      ) {
        const { data: existing } = await supabase
          .from("contracts")
          .select("conteudo_final, conteudo_final_snapshot")
          .eq("id", id)
          .maybeSingle();
        const conteudoFinal =
          (updates as any).conteudo_final ?? (existing as any)?.conteudo_final;
        if (conteudoFinal && !(existing as any)?.conteudo_final_snapshot) {
          (updates as any).conteudo_final_snapshot = conteudoFinal;
          (updates as any).snapshot_saved_at = new Date().toISOString();
        }
      }

      const { data, error } = await supabase
        .from("contracts")
        .update({ ...updates, updated_at: new Date().toISOString() } as any)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;

      const changedFields = Object.keys(updates);
      if (updates.status !== undefined && previousStatus !== updates.status) {
        logAction({
          tenantId: effectiveTenantId,
          action: "contract.status_changed",
          entityType: "contract",
          entityId: id,
          metadata: { from: previousStatus, to: updates.status },
        });
      } else {
        logAction({
          tenantId: effectiveTenantId,
          action: "contract.updated",
          entityType: "contract",
          entityId: id,
          metadata: { fields: changedFields },
        });
      }
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contracts"] });
      toast({ title: "Contrato atualizado" });
    },
    onError: (error) => {
      toast({ title: "Erro ao atualizar contrato", description: parseSupabaseError(error), variant: "destructive" });
    },
  });

  // Rascunho persistente (botão do wizard + modal de saída). Mutação DEDICADA:
  // isPending próprio (isSavingDraft) e toast "Rascunho salvo", desacoplados dos
  // toasts genéricos de create/update. Usa o MESMO core UPSERT-by-ID.
  const saveDraftMutation = useMutation({
    mutationFn: async (input: SaveDraftInput) => {
      const draftWrite = buildContractDraftWrite(input.snapshot);
      const payload = buildDraftContractPayload({
        nome: input.nome,
        currentStep: input.currentStep,
        templateId: input.templateId,
        dados: draftWrite.dados,
        wizardState: draftWrite.wizard_state,
        clausulasIds: input.clausulasIds,
        conteudoFinal: input.conteudoFinal,
        compradorId: input.compradorId,
        vendedorId: input.vendedorId,
        empresaId: input.empresaId,
      });

      const mode = resolveSaveMode(input.id);
      let row: any;
      if (mode === "update") {
        const { data, error } = await supabase
          .from("contracts")
          .update({ ...payload, updated_at: new Date().toISOString() } as any)
          .eq("id", input.id!)
          .select()
          .single();
        if (error) throw error;
        row = data;
      } else {
        const { data, error } = await supabase
          .from("contracts")
          .insert({ ...payload, tenant_id: effectiveTenantId } as any)
          .select()
          .single();
        if (error) throw error;
        row = data;
      }

      logAction({
        tenantId: effectiveTenantId,
        action: mode === "update" ? "contract.updated" : "contract.created",
        entityType: "contract",
        entityId: row?.id,
        metadata: { status: "rascunho", via: "draft", internal_code: row?.internal_code },
      });
      return row;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contracts"] });
      queryClient.invalidateQueries({ queryKey: ["tenant-limits"] });
      toast({ title: "Rascunho salvo" });
    },
    onError: (error) => {
      toast({ title: "Erro ao salvar rascunho", description: parseSupabaseError(error), variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("contracts").delete().eq("id", id);
      if (error) throw error;
      return id;
    },
    onSuccess: (id: string) => {
      queryClient.invalidateQueries({ queryKey: ["contracts"] });
      toast({ title: "Contrato removido" });
      logAction({
        tenantId: effectiveTenantId,
        action: "contract.deleted",
        entityType: "contract",
        entityId: id,
      });
    },
    onError: (error) => {
      toast({ title: "Erro ao remover contrato", description: parseSupabaseError(error), variant: "destructive" });
    },
  });

  return {
    contracts: query.data ?? [],
    isLoading: query.isLoading,
    createContract: createMutation.mutateAsync,
    updateContract: updateMutation.mutateAsync,
    saveDraftContract: saveDraftMutation.mutateAsync,
    deleteContract: deleteMutation.mutateAsync,
    isCreating: createMutation.isPending,
    isSaving: updateMutation.isPending,
    isSavingDraft: saveDraftMutation.isPending,
    canCreateContract,
    limits,
  };
};
