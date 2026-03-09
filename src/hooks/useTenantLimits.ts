import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface TenantLimits {
  can_create_contract: boolean;
  can_add_user: boolean;
  current_contracts_this_month: number;
  max_contracts_per_month: number;
  current_users: number;
  max_users: number;
  plan_name: string;
  subscription_status: string;
  trial_end: string | null;
}

export const useTenantLimits = () => {
  const { effectiveTenantId } = useAuth();

  const query = useQuery({
    queryKey: ["tenant-limits", effectiveTenantId],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("check_tenant_limits", {
        p_tenant_id: effectiveTenantId!,
      });
      if (error) throw error;
      return data as unknown as TenantLimits;
    },
    enabled: !!effectiveTenantId,
    refetchInterval: 60000,
  });

  return {
    limits: query.data ?? null,
    isLoading: query.isLoading,
    canCreateContract: query.data?.can_create_contract ?? true,
    canAddUser: query.data?.can_add_user ?? true,
  };
};
