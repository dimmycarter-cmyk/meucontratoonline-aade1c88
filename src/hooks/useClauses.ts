import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

export interface Clause {
  id: string;
  tenant_id: string;
  titulo: string;
  categoria: string;
  conteudo: string;
  ativa: boolean;
  ordem: number;
  created_at: string;
  updated_at: string;
}

export const useClauses = () => {
  const { profile } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const query = useQuery({
    queryKey: ["clauses", profile?.tenant_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("clauses")
        .select("*")
        .order("ordem");
      if (error) throw error;
      return data as Clause[];
    },
    enabled: !!profile?.tenant_id,
  });

  const createMutation = useMutation({
    mutationFn: async (clause: Partial<Clause>) => {
      const { data, error } = await supabase
        .from("clauses")
        .insert({ ...clause, tenant_id: profile!.tenant_id } as any)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["clauses"] });
      toast({ title: "Cláusula criada com sucesso" });
    },
    onError: (error: Error) => {
      toast({ title: "Erro ao criar cláusula", description: error.message, variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Clause> & { id: string }) => {
      const { data, error } = await supabase
        .from("clauses")
        .update({ ...updates, updated_at: new Date().toISOString() } as any)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["clauses"] });
    },
    onError: (error: Error) => {
      toast({ title: "Erro ao atualizar cláusula", description: error.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("clauses").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["clauses"] });
      toast({ title: "Cláusula removida" });
    },
    onError: (error: Error) => {
      toast({ title: "Erro ao remover cláusula", description: error.message, variant: "destructive" });
    },
  });

  return {
    clauses: query.data ?? [],
    isLoading: query.isLoading,
    createClause: createMutation.mutateAsync,
    updateClause: updateMutation.mutateAsync,
    deleteClause: deleteMutation.mutateAsync,
    isCreating: createMutation.isPending,
  };
};
