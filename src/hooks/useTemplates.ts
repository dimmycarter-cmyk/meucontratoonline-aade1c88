import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { logAction } from "@/lib/audit";
import { parseSupabaseError } from "@/lib/supabase-errors";
import { resolveTemplateOwnership } from "@/lib/template-ownership";

export interface ContractTemplate {
  id: string;
  tenant_id: string;
  nome: string;
  descricao: string | null;
  tipo: string;
  conteudo: string;
  variaveis: string[];
  status: string;
  is_global: boolean;
  created_at: string;
  updated_at: string;
}

export const useTemplates = () => {
  const { profile, isSuperAdmin, impersonatedTenantId } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const tenantId = profile?.tenant_id;

  const query = useQuery({
    queryKey: ["contract_templates", tenantId, isSuperAdmin, impersonatedTenantId],
    queryFn: async () => {
      let q = supabase.from("contract_templates").select("*");

      if (isSuperAdmin && !impersonatedTenantId) {
        // Super admin without impersonation: see all templates
      } else if (isSuperAdmin && impersonatedTenantId) {
        // Super admin impersonating: see that tenant's + global
        q = q.or(`tenant_id.eq.${impersonatedTenantId},is_global.eq.true`);
      } else if (tenantId) {
        // Regular user: own tenant + global (RLS handles it, but filter for clarity)
        q = q.or(`tenant_id.eq.${tenantId},is_global.eq.true`);
      }

      const { data, error } = await q.order("created_at", { ascending: false });
      if (error) throw error;
      return data as ContractTemplate[];
    },
    enabled: !!tenantId,
  });

  const createMutation = useMutation({
    mutationFn: async (template: Partial<ContractTemplate>) => {
      // Ownership puro (tenant_id + is_global) que SEMPRE satisfaz o CHECK
      // contract_templates_tenant_or_global. Ver src/lib/template-ownership.ts.
      const ownership = resolveTemplateOwnership({
        isSuperAdmin,
        impersonatedTenantId: impersonatedTenantId ?? null,
        profileTenantId: profile?.tenant_id ?? null,
      });
      const insertData: any = { ...template, ...ownership };
      const { data, error } = await supabase
        .from("contract_templates")
        .insert(insertData)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["contract_templates"] });
      toast({ title: "Modelo criado com sucesso" });
      logAction({
        tenantId: data?.tenant_id,
        action: "template.created",
        entityType: "template",
        entityId: data?.id,
        metadata: { nome: data?.nome, tipo: data?.tipo, is_global: data?.is_global },
      });
    },
    onError: (error) => {
      toast({ title: "Erro ao criar modelo", description: parseSupabaseError(error), variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<ContractTemplate> & { id: string }) => {
      const { data, error } = await supabase
        .from("contract_templates")
        .update({ ...updates, updated_at: new Date().toISOString() } as any)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data: any, variables) => {
      queryClient.invalidateQueries({ queryKey: ["contract_templates"] });
      toast({ title: "Modelo salvo" });
      logAction({
        tenantId: data?.tenant_id,
        action: "template.updated",
        entityType: "template",
        entityId: data?.id ?? variables.id,
        metadata: { fields: Object.keys(variables).filter((k) => k !== "id") },
      });
    },
    onError: (error) => {
      toast({ title: "Erro ao salvar modelo", description: parseSupabaseError(error), variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { count, error: checkError } = await supabase
        .from("contracts")
        .select("id", { count: "exact", head: true })
        .eq("template_id", id);

      if (checkError) throw checkError;

      if (count && count > 0) {
        throw new Error(
          `Este modelo está em uso em ${count} contrato${count > 1 ? "s" : ""}. Desvincule antes de excluir.`
        );
      }

      const { error } = await supabase.from("contract_templates").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contract_templates"] });
      toast({ title: "Modelo removido" });
    },
    onError: (error) => {
      toast({ title: "Erro ao remover modelo", description: parseSupabaseError(error), variant: "destructive" });
    },
  });

  return {
    templates: query.data ?? [],
    isLoading: query.isLoading,
    createTemplate: createMutation.mutateAsync,
    updateTemplate: updateMutation.mutateAsync,
    deleteTemplate: deleteMutation.mutateAsync,
    isCreating: createMutation.isPending,
    isSaving: updateMutation.isPending,
  };
};
