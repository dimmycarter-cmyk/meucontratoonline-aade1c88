import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { useTenantLimits } from "@/hooks/useTenantLimits";
import { logAction } from "@/lib/audit";
import { parseSupabaseError } from "@/lib/supabase-errors";

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
  conteudo_final: string;
  clausulas_ids: string[];
  valor_total: number | null;
  valor_sinal: number | null;
  valor_financiamento: number | null;
  created_at: string;
  updated_at: string;
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
    deleteContract: deleteMutation.mutateAsync,
    isCreating: createMutation.isPending,
    isSaving: updateMutation.isPending,
    canCreateContract,
    limits,
  };
};
