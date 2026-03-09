import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

const SuperAdminRoute = ({ children }: { children: React.ReactNode }) => {
  const { loading, isSuperAdmin } = useAuth();

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!isSuperAdmin) {
    return <Navigate to="/app" replace />;
  }

  return <>{children}</>;
};

export default SuperAdminRoute;
