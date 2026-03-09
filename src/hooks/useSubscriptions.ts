import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

export interface Subscription {
  id: string;
  tenant_id: string;
  plan_id: string;
  status: string;
  start_date: string;
  end_date: string | null;
  trial_start: string | null;
  trial_end: string | null;
  created_at: string;
  updated_at: string;
}

export interface SubscriptionWithDetails extends Subscription {
  plan_name?: string;
  tenant_name?: string;
}

export const useSubscriptions = () => {
  const { isSuperAdmin } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // All subscriptions (super admin only)
  const allQuery = useQuery({
    queryKey: ["admin", "subscriptions"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("subscriptions")
        .select("*, plans(name), tenants(nome)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []).map((s: any) => ({
        ...s,
        plan_name: s.plans?.name ?? "—",
        tenant_name: s.tenants?.nome ?? "—",
      })) as SubscriptionWithDetails[];
    },
    enabled: isSuperAdmin,
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Subscription> & { id: string }) => {
      const { data, error } = await supabase
        .from("subscriptions")
        .update({ ...updates, updated_at: new Date().toISOString() } as any)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "subscriptions"] });
      toast({ title: "Assinatura atualizada" });
    },
    onError: (error: Error) => {
      toast({ title: "Erro ao atualizar assinatura", description: error.message, variant: "destructive" });
    },
  });

  return {
    subscriptions: allQuery.data ?? [],
    isLoading: allQuery.isLoading,
    updateSubscription: updateMutation.mutateAsync,
    isSaving: updateMutation.isPending,
  };
};
