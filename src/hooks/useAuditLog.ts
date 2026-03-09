import { useMutation, useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface AuditLogEntry {
  id: string;
  user_id: string;
  action: string;
  target_type: string;
  target_id: string;
  details: Record<string, unknown>;
  created_at: string;
}

export const useAuditLog = () => {
  const logMutation = useMutation({
    mutationFn: async (entry: Omit<AuditLogEntry, "id" | "created_at">) => {
      const { error } = await supabase
        .from("admin_audit_logs" as any)
        .insert(entry as any);
      if (error) throw error;
    },
  });

  const query = useQuery({
    queryKey: ["admin", "audit_logs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("admin_audit_logs" as any)
        .select("*")
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      return (data ?? []) as unknown as AuditLogEntry[];
    },
  });

  return {
    logs: query.data ?? [],
    isLoading: query.isLoading,
    logAction: logMutation.mutateAsync,
  };
};
