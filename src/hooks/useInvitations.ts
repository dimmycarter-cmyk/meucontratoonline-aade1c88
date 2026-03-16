import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

export interface Invitation {
  id: string;
  tenant_id: string;
  email: string;
  role: string;
  invited_by: string;
  status: string;
  token: string;
  created_at: string;
  expires_at: string;
}

export const useInvitations = () => {
  const { profile, hasRole } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const isAdmin = hasRole("admin_empresa") || hasRole("super_admin");

  const query = useQuery({
    queryKey: ["invitations", profile?.tenant_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("invitations")
        .select("*")
        .eq("tenant_id", profile!.tenant_id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as Invitation[];
    },
    enabled: !!profile?.tenant_id && isAdmin,
  });

  const sendInvite = useMutation({
    mutationFn: async ({ email, role }: { email: string; role: string }) => {
      const { data, error } = await supabase.functions.invoke("send-invite", {
        body: { email, role },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["invitations"] });
      toast({ title: "Convite enviado com sucesso!" });
    },
    onError: (error: Error) => {
      toast({ title: "Erro ao enviar convite", description: error.message, variant: "destructive" });
    },
  });

  const deleteInvite = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("invitations").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["invitations"] });
      toast({ title: "Convite excluído com sucesso!" });
    },
    onError: (error: Error) => {
      toast({ title: "Erro ao excluir convite", description: error.message, variant: "destructive" });
    },
  });

  return {
    invitations: query.data ?? [],
    isLoading: query.isLoading,
    sendInvite: sendInvite.mutateAsync,
    isSending: sendInvite.isPending,
    deleteInvite: deleteInvite.mutateAsync,
    isDeleting: deleteInvite.isPending,
    isAdmin,
  };
};
