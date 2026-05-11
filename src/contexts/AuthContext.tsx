import { createContext, useContext, useEffect, useMemo, useState, ReactNode, useCallback } from "react";
import { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

type AppRole = Database["public"]["Enums"]["app_role"];

interface Tenant {
  id: string;
  nome: string;
  onboarding_completed: boolean;
  status: string;
}

interface Profile {
  id: string;
  tenant_id: string;
  nome: string;
  email: string;
  avatar_url: string | null;
  status: string;
  whatsapp: string | null;
  cargo: string | null;
}

interface AuthContextType {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  tenant: Tenant | null;
  roles: AppRole[];
  isSuperAdmin: boolean;
  hasRole: (role: AppRole) => boolean;
  loading: boolean;
  onboardingCompleted: boolean;
  // Impersonation
  impersonatedTenantId: string | null;
  impersonatedTenantName: string | null;
  setImpersonatedTenant: (tenantId: string | null, tenantName?: string | null) => void;
  effectiveTenantId: string | null;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  session: null,
  user: null,
  profile: null,
  tenant: null,
  roles: [],
  isSuperAdmin: false,
  hasRole: () => false,
  loading: true,
  onboardingCompleted: false,
  impersonatedTenantId: null,
  impersonatedTenantName: null,
  setImpersonatedTenant: () => {},
  effectiveTenantId: null,
  signOut: async () => {},
  refreshProfile: async () => {},
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Impersonation state
  const [impersonatedTenantId, setImpersonatedTenantId] = useState<string | null>(null);
  const [impersonatedTenantName, setImpersonatedTenantName] = useState<string | null>(null);

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

  const fetchTenant = async (tenantId: string) => {
    const { data, error } = await supabase
      .from("tenants")
      .select("id, nome, onboarding_completed, status")
      .eq("id", tenantId)
      .maybeSingle();

    if (error) {
      console.error("fetchTenant error:", error);
      setTenant(null);
      return null;
    }

    setTenant((data as Tenant) ?? null);
    return data as Tenant | null;
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
    const [profileData] = await Promise.all([fetchProfile(userId), fetchRoles(userId)]);
    if (profileData?.tenant_id) {
      await fetchTenant(profileData.tenant_id);
    }
  };

  const refreshProfile = useCallback(async () => {
    if (!user?.id) return;
    await loadUserData(user.id);
  }, [user?.id]);

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
        setTenant(null);
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

  const onboardingCompleted = useMemo(() => {
    // Super admins skip onboarding check
    if (isSuperAdmin) return true;
    return tenant?.onboarding_completed ?? false;
  }, [tenant?.onboarding_completed, isSuperAdmin]);

  const setImpersonatedTenant = useCallback((tenantId: string | null, tenantName?: string | null) => {
    setImpersonatedTenantId(tenantId);
    setImpersonatedTenantName(tenantName ?? null);
  }, []);

  // Effective tenant ID for data queries (impersonated or real)
  const effectiveTenantId = useMemo(() => {
    if (isSuperAdmin && impersonatedTenantId) {
      return impersonatedTenantId;
    }
    return profile?.tenant_id ?? null;
  }, [isSuperAdmin, impersonatedTenantId, profile?.tenant_id]);

  const signOut = async () => {
    await supabase.auth.signOut();
    setSession(null);
    setUser(null);
    setProfile(null);
    setTenant(null);
    setRoles([]);
    setImpersonatedTenantId(null);
    setImpersonatedTenantName(null);
  };

  return (
    <AuthContext.Provider
      value={{
        session,
        user,
        profile,
        tenant,
        roles,
        isSuperAdmin,
        hasRole,
        loading,
        onboardingCompleted,
        impersonatedTenantId,
        impersonatedTenantName,
        setImpersonatedTenant,
        effectiveTenantId,
        signOut,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
