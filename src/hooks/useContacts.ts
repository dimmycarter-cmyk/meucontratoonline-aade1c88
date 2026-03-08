import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

export interface Contact {
  id: string;
  tenant_id: string;
  nome: string;
  cpf: string | null;
  rg: string | null;
  orgao_expedidor: string | null;
  profissao: string | null;
  data_nascimento: string | null;
  whatsapp: string | null;
  email: string | null;
  genero: string | null;
  nacionalidade: string | null;
  estado_civil: string | null;
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
  created_at: string;
  updated_at: string;
}

export type ContactInsert = Omit<Contact, "id" | "created_at" | "updated_at">;

export const useContacts = () => {
  const { profile } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const query = useQuery({
    queryKey: ["contacts", profile?.tenant_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("contacts")
        .select("*")
        .order("nome");
      if (error) throw error;
      return data as Contact[];
    },
    enabled: !!profile?.tenant_id,
  });

  const createMutation = useMutation({
    mutationFn: async (contact: Partial<ContactInsert>) => {
      const { data, error } = await supabase
        .from("contacts")
        .insert({ ...contact, tenant_id: profile!.tenant_id } as any)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contacts"] });
      toast({ title: "Contato criado com sucesso" });
    },
    onError: (error: Error) => {
      toast({ title: "Erro ao criar contato", description: error.message, variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Contact> & { id: string }) => {
      const { data, error } = await supabase
        .from("contacts")
        .update(updates)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contacts"] });
      toast({ title: "Contato atualizado" });
    },
    onError: (error: Error) => {
      toast({ title: "Erro ao atualizar contato", description: error.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("contacts").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contacts"] });
      toast({ title: "Contato removido" });
    },
    onError: (error: Error) => {
      toast({ title: "Erro ao remover contato", description: error.message, variant: "destructive" });
    },
  });

  return {
    contacts: query.data ?? [],
    isLoading: query.isLoading,
    createContact: createMutation.mutateAsync,
    updateContact: updateMutation.mutateAsync,
    deleteContact: deleteMutation.mutateAsync,
    isCreating: createMutation.isPending,
  };
};
