import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import type { Database } from "@/integrations/supabase/types";

type AppRole = Database["public"]["Enums"]["app_role"];

interface RoleRouteProps {
  children: React.ReactNode;
  allowedRoles: AppRole[];
}

const RoleRoute = ({ children, allowedRoles }: RoleRouteProps) => {
  const { loading, roles } = useAuth();

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  const hasAccess = allowedRoles.some((r) => roles.includes(r));

  if (!hasAccess) {
    return <Navigate to="/app" replace />;
  }

  return <>{children}</>;
};

export default RoleRoute;
