import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { parseSupabaseError } from "@/lib/supabase-errors";
export interface Company {
  id: string;
  tenant_id: string;
  cnpj: string | null;
  nome_fantasia: string;
  razao_social: string | null;
  whatsapp: string | null;
  email: string | null;
  pix: string | null;
  banco: string | null;
  agencia: string | null;
  conta: string | null;
  cep: string | null;
  estado: string | null;
  cidade: string | null;
  bairro: string | null;
  rua: string | null;
  numero: string | null;
  complemento: string | null;
  logo_url: string | null;
  created_at: string;
  updated_at: string;
}

export type CompanyInsert = Omit<Company, "id" | "created_at" | "updated_at">;

export const useCompanies = () => {
  const { profile, isSuperAdmin, effectiveTenantId, impersonatedTenantId } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const query = useQuery({
    queryKey: ["companies", isSuperAdmin, effectiveTenantId],
    queryFn: async () => {
      let queryBuilder = supabase
        .from("companies")
        .select("*")
        .order("nome_fantasia");

      // If super_admin is impersonating a tenant, filter by that tenant
      // If super_admin without impersonation, show all (no filter)
      // Regular users: RLS handles filtering
      if (isSuperAdmin && impersonatedTenantId) {
        queryBuilder = queryBuilder.eq("tenant_id", impersonatedTenantId);
      } else if (!isSuperAdmin && effectiveTenantId) {
        // Regular user - RLS already filters, but we keep the query consistent
      }

      const { data, error } = await queryBuilder;
      if (error) throw error;
      return data as Company[];
    },
    enabled: isSuperAdmin || !!profile?.tenant_id,
  });

  const createMutation = useMutation({
    mutationFn: async (company: Partial<CompanyInsert>) => {
      const { data, error } = await supabase
        .from("companies")
        .insert({ ...company, tenant_id: profile!.tenant_id } as any)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["companies"] });
      toast({ title: "Empresa criada com sucesso" });
    },
    onError: (error) => {
      toast({ title: "Erro ao criar empresa", description: parseSupabaseError(error), variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Company> & { id: string }) => {
      const { data, error } = await supabase
        .from("companies")
        .update(updates)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["companies"] });
      toast({ title: "Empresa atualizada" });
    },
    onError: (error) => {
      toast({ title: "Erro ao atualizar empresa", description: parseSupabaseError(error), variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("companies").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["companies"] });
      toast({ title: "Empresa removida" });
    },
    onError: (error) => {
      toast({ title: "Erro ao remover empresa", description: parseSupabaseError(error), variant: "destructive" });
    },
  });

  return {
    companies: query.data ?? [],
    isLoading: query.isLoading,
    createCompany: createMutation.mutateAsync,
    updateCompany: updateMutation.mutateAsync,
    deleteCompany: deleteMutation.mutateAsync,
    isCreating: createMutation.isPending,
  };
};
