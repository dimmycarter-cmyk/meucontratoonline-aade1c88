import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { useTenantLimits } from "@/hooks/useTenantLimits";

export interface Contract {
  id: string;
  tenant_id: string;
  template_id: string | null;
  nome: string;
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
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as Contract[];
    },
    enabled: !!effectiveTenantId,
  });

  const createMutation = useMutation({
    mutationFn: async (contract: Partial<Contract>) => {
      // Check limits before creating
      if (!canCreateContract) {
        throw new Error(
          `Limite de contratos atingido (${limits?.current_contracts_this_month ?? 0}/${limits?.max_contracts_per_month ?? 0}). Faça upgrade do seu plano.`
        );
      }
      const { data, error } = await supabase
        .from("contracts")
        .insert({ ...contract, tenant_id: profile!.tenant_id } as any)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contracts"] });
      queryClient.invalidateQueries({ queryKey: ["tenant-limits"] });
      toast({ title: "Contrato salvo com sucesso" });
    },
    onError: (error: Error) => {
      toast({ title: "Erro ao salvar contrato", description: error.message, variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Contract> & { id: string }) => {
      const { data, error } = await supabase
        .from("contracts")
        .update({ ...updates, updated_at: new Date().toISOString() } as any)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contracts"] });
      toast({ title: "Contrato atualizado" });
    },
    onError: (error: Error) => {
      toast({ title: "Erro ao atualizar contrato", description: error.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("contracts").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contracts"] });
      toast({ title: "Contrato removido" });
    },
    onError: (error: Error) => {
      toast({ title: "Erro ao remover contrato", description: error.message, variant: "destructive" });
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
