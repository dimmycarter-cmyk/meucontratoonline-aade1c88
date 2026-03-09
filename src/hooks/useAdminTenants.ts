import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface AdminTenant {
  id: string;
  nome: string;
  slug: string;
  status: string;
  created_at: string;
}

export const useAdminTenants = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const query = useQuery({
    queryKey: ["admin", "tenants"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tenants")
        .select("id,nome,slug,status,created_at")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as AdminTenant[];
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { data, error } = await supabase
        .from("tenants")
        .update({ status })
        .eq("id", id)
        .select("id")
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "tenants"] });
      toast({ title: "Tenant atualizado" });
    },
    onError: (error: Error) => {
      toast({ title: "Erro ao atualizar tenant", description: error.message, variant: "destructive" });
    },
  });

  return {
    tenants: query.data ?? [],
    isLoading: query.isLoading,
    updateTenantStatus: updateStatusMutation.mutateAsync,
    isSaving: updateStatusMutation.isPending,
  };
};
