import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

export interface ContractTemplate {
  id: string;
  tenant_id: string;
  nome: string;
  descricao: string | null;
  tipo: string;
  conteudo: string;
  variaveis: string[];
  status: string;
  created_at: string;
  updated_at: string;
}

export const useTemplates = () => {
  const { profile } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const query = useQuery({
    queryKey: ["contract_templates", profile?.tenant_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("contract_templates")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as ContractTemplate[];
    },
    enabled: !!profile?.tenant_id,
  });

  const createMutation = useMutation({
    mutationFn: async (template: Partial<ContractTemplate>) => {
      const { data, error } = await supabase
        .from("contract_templates")
        .insert({ ...template, tenant_id: profile!.tenant_id } as any)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contract_templates"] });
      toast({ title: "Modelo criado com sucesso" });
    },
    onError: (error: Error) => {
      toast({ title: "Erro ao criar modelo", description: error.message, variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<ContractTemplate> & { id: string }) => {
      const { data, error } = await supabase
        .from("contract_templates")
        .update({ ...updates, updated_at: new Date().toISOString() } as any)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contract_templates"] });
      toast({ title: "Modelo salvo" });
    },
    onError: (error: Error) => {
      toast({ title: "Erro ao salvar modelo", description: error.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("contract_templates").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contract_templates"] });
      toast({ title: "Modelo removido" });
    },
    onError: (error: Error) => {
      toast({ title: "Erro ao remover modelo", description: error.message, variant: "destructive" });
    },
  });

  return {
    templates: query.data ?? [],
    isLoading: query.isLoading,
    createTemplate: createMutation.mutateAsync,
    updateTemplate: updateMutation.mutateAsync,
    deleteTemplate: deleteMutation.mutateAsync,
    isCreating: createMutation.isPending,
    isSaving: updateMutation.isPending,
  };
};
