import { useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { logAction } from "@/lib/audit";
import { parseSupabaseError } from "@/lib/supabase-errors";

/**
 * Campos do perfil que o próprio usuário pode editar via Configurações.
 * E-mail (de auth.users) e tenant_id NÃO são editáveis aqui — fluxos
 * separados.
 */
export interface ProfileEditable {
  nome?: string;
  whatsapp?: string | null;
  cargo?: string | null;
  avatar_url?: string | null;
}

export const useProfile = () => {
  const { user, profile, refreshProfile } = useAuth();
  const { toast } = useToast();

  const updateMutation = useMutation({
    mutationFn: async (updates: ProfileEditable) => {
      if (!user?.id) throw new Error("Sessão expirada — faça login novamente.");

      const { data, error } = await supabase
        .from("profiles")
        .update(updates as never)
        .eq("id", user.id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: async (data: any, variables) => {
      // Refresca o profile no AuthContext para que `useAuth().profile`
      // reflita as mudanças imediatamente em todos os componentes.
      await refreshProfile();
      toast({ title: "Perfil atualizado" });
      logAction({
        tenantId: data?.tenant_id,
        action: "profile.updated",
        entityType: "profile",
        entityId: data?.id,
        metadata: { fields: Object.keys(variables) },
      });
    },
    onError: (error) => {
      toast({
        title: "Erro ao atualizar perfil",
        description: parseSupabaseError(error),
        variant: "destructive",
      });
    },
  });

  return {
    profile,
    updateProfile: updateMutation.mutateAsync,
    isUpdating: updateMutation.isPending,
  };
};
