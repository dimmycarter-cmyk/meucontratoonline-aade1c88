import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import type { AuditAction } from "@/lib/audit";

export interface AuditLogRow {
  id: string;
  tenant_id: string | null;
  user_id: string | null;
  action: string;
  entity_type: string;
  entity_id: string | null;
  metadata: Record<string, unknown>;
  ip_address: string | null;
  created_at: string;
  user?: { nome: string | null; email: string | null } | null;
}

interface Params {
  page: number;
  pageSize?: number;
  action?: AuditAction | "all";
  dateFrom?: Date | null;
  dateTo?: Date | null;
}

export const useAuditLogs = ({ page, pageSize = 20, action = "all", dateFrom, dateTo }: Params) => {
  const { effectiveTenantId, isSuperAdmin } = useAuth();

  return useQuery({
    queryKey: ["audit_logs", effectiveTenantId, page, pageSize, action, dateFrom?.toISOString(), dateTo?.toISOString()],
    queryFn: async () => {
      let q = supabase
        .from("audit_logs" as any)
        .select("*", { count: "exact" })
        .order("created_at", { ascending: false });

      if (!isSuperAdmin && effectiveTenantId) {
        q = q.eq("tenant_id", effectiveTenantId);
      } else if (isSuperAdmin && effectiveTenantId) {
        q = q.eq("tenant_id", effectiveTenantId);
      }

      if (action && action !== "all") {
        q = q.eq("action", action);
      }
      if (dateFrom) {
        q = q.gte("created_at", dateFrom.toISOString());
      }
      if (dateTo) {
        const end = new Date(dateTo);
        end.setHours(23, 59, 59, 999);
        q = q.lte("created_at", end.toISOString());
      }

      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;
      q = q.range(from, to);

      const { data, error, count } = await q;
      if (error) throw error;
      const rows = (data ?? []) as unknown as AuditLogRow[];

      // Hidrata user info
      const userIds = Array.from(new Set(rows.map((r) => r.user_id).filter(Boolean))) as string[];
      let usersMap: Record<string, { nome: string | null; email: string | null }> = {};
      if (userIds.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, nome, email")
          .in("id", userIds);
        (profiles ?? []).forEach((p: any) => {
          usersMap[p.id] = { nome: p.nome, email: p.email };
        });
      }

      return {
        rows: rows.map((r) => ({ ...r, user: r.user_id ? usersMap[r.user_id] ?? null : null })),
        total: count ?? 0,
        pageSize,
      };
    },
    enabled: !!effectiveTenantId || isSuperAdmin,
  });
};
