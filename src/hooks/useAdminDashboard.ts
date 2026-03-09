import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface MonthData {
  month: string;
  total: number;
}

interface AdminMetrics {
  total_tenants: number;
  active_tenants: number;
  suspended_tenants: number;
  trial_tenants: number;
  total_users: number;
  total_contracts: number;
  contracts_this_month: number;
  tenants_by_month: MonthData[] | null;
  contracts_by_month: MonthData[] | null;
}

export const useAdminDashboard = () => {
  const { isSuperAdmin } = useAuth();

  const query = useQuery({
    queryKey: ["admin-metrics"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_admin_metrics");
      if (error) throw error;
      return data as unknown as AdminMetrics;
    },
    enabled: isSuperAdmin,
    refetchInterval: 60000, // Refresh every minute
  });

  return {
    metrics: query.data ?? null,
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
  };
};
