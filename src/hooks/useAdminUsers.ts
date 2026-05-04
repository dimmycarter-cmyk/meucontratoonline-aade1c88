import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { parseSupabaseError } from "@/lib/supabase-errors";
import type { Database } from "@/integrations/supabase/types";

type AppRole = Database["public"]["Enums"]["app_role"];

export interface AdminUser {
  id: string;
  nome: string;
  email: string;
  status: string;
  tenant_id: string;
  tenant_nome: string | null;
  roles: AppRole[];
}

const mapTenantNome = (row: any): string | null => {
  // Supabase can return tenants as object or array depending on relationship configuration
  const t = row?.tenants;
  if (!t) return null;
  if (Array.isArray(t)) return t[0]?.nome ?? null;
  return t?.nome ?? null;
};

export const ADMIN_ROLE_OPTIONS: AppRole[] = [
  "super_admin",
  "admin_empresa",
  "corretor",
  "assistente",
  "operacional",
];

export const useAdminUsers = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const query = useQuery({
    queryKey: ["admin", "users"],
    queryFn: async () => {
      const [profilesRes, rolesRes] = await Promise.all([
        supabase
          .from("profiles")
          .select("id,nome,email,status,tenant_id,created_at,tenants(nome)")
          .order("created_at", { ascending: false }),
        supabase.from("user_roles").select("user_id,role"),
      ]);

      if (profilesRes.error) throw profilesRes.error;
      if (rolesRes.error) throw rolesRes.error;

      const profiles = profilesRes.data ?? [];
      const roles = rolesRes.data ?? [];

      const rolesByUser = new Map<string, AppRole[]>();
      for (const r of roles) {
        const list = rolesByUser.get(r.user_id) ?? [];
        list.push(r.role as AppRole);
        rolesByUser.set(r.user_id, list);
      }

      return profiles.map((p: any) => {
        const userRoles = rolesByUser.get(p.id) ?? [];
        return {
          id: p.id,
          nome: p.nome,
          email: p.email,
          status: p.status,
          tenant_id: p.tenant_id,
          tenant_nome: mapTenantNome(p),
          roles: userRoles,
        } satisfies AdminUser;
      });
    },
  });

  const updateUserStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase.from("profiles").update({ status }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "users"] });
      toast({ title: "Usuário atualizado" });
    },
    onError: (error) => {
      toast({ title: "Erro ao atualizar usuário", description: parseSupabaseError(error), variant: "destructive" });
    },
  });

  const addRoleMutation = useMutation({
    mutationFn: async ({ userId, tenantId, role }: { userId: string; tenantId: string; role: AppRole }) => {
      const { error } = await supabase.from("user_roles").insert({ user_id: userId, tenant_id: tenantId, role } as any);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "users"] });
      toast({ title: "Role adicionada" });
    },
    onError: (error) => {
      toast({ title: "Erro ao adicionar role", description: parseSupabaseError(error), variant: "destructive" });
    },
  });

  const removeRoleMutation = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: AppRole }) => {
      const { error } = await supabase.from("user_roles").delete().eq("user_id", userId).eq("role", role);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "users"] });
      toast({ title: "Role removida" });
    },
    onError: (error) => {
      toast({ title: "Erro ao remover role", description: parseSupabaseError(error), variant: "destructive" });
    },
  });

  return {
    users: query.data ?? [],
    isLoading: query.isLoading,
    updateUserStatus: updateUserStatusMutation.mutateAsync,
    addRole: addRoleMutation.mutateAsync,
    removeRole: removeRoleMutation.mutateAsync,
    isSaving:
      updateUserStatusMutation.isPending || addRoleMutation.isPending || removeRoleMutation.isPending,
  };
};
