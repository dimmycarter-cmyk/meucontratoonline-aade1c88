import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface Plan {
  id: string;
  name: string;
  max_users: number;
  max_contracts_per_month: number;
  price: number;
  features: string[];
  created_at: string;
}

export const usePlans = () => {
  const query = useQuery({
    queryKey: ["plans"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("plans")
        .select("*")
        .order("price", { ascending: true });
      if (error) throw error;
      return data as Plan[];
    },
  });

  return {
    plans: query.data ?? [],
    isLoading: query.isLoading,
  };
};
