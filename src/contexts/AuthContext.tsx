import { createContext, useContext, useEffect, useMemo, useState, ReactNode } from "react";
import { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

type AppRole = Database["public"]["Enums"]["app_role"];

interface Profile {
  id: string;
  tenant_id: string;
  nome: string;
  email: string;
  avatar_url: string | null;
  status: string;
}

interface AuthContextType {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  roles: AppRole[];
  isSuperAdmin: boolean;
  hasRole: (role: AppRole) => boolean;
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  session: null,
  user: null,
  profile: null,
  roles: [],
  isSuperAdmin: false,
  hasRole: () => false,
  loading: true,
  signOut: async () => {},
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchProfile = async (userId: string) => {
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .maybeSingle();

    if (error) {
      console.error("fetchProfile error:", error);
      setProfile(null);
      return null;
    }

    setProfile((data as Profile) ?? null);
    return data as Profile | null;
  };

  const fetchRoles = async (userId: string) => {
    const { data, error } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId);

    if (error) {
      console.error("fetchRoles error:", error);
      setRoles([]);
      return [] as AppRole[];
    }

    const nextRoles = (data ?? []).map((r) => r.role as AppRole);
    setRoles(nextRoles);
    return nextRoles;
  };

  const loadUserData = async (userId: string) => {
    await Promise.all([fetchProfile(userId), fetchRoles(userId)]);
  };

  useEffect(() => {
    // Set up listener BEFORE getSession
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);

      if (session?.user) {
        setLoading(true);
        // Use setTimeout to avoid Supabase deadlock
        setTimeout(() => {
          loadUserData(session.user.id).finally(() => setLoading(false));
        }, 0);
      } else {
        setProfile(null);
        setRoles([]);
        setLoading(false);
      }
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);

      if (session?.user) {
        setLoading(true);
        loadUserData(session.user.id).finally(() => setLoading(false));
      } else {
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const hasRole = useMemo(() => {
    return (role: AppRole) => roles.includes(role);
  }, [roles]);

  const isSuperAdmin = useMemo(() => hasRole("super_admin"), [hasRole]);

  const signOut = async () => {
    await supabase.auth.signOut();
    setSession(null);
    setUser(null);
    setProfile(null);
    setRoles([]);
  };

  return (
    <AuthContext.Provider value={{ session, user, profile, roles, isSuperAdmin, hasRole, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};
