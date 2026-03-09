import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

interface ProtectedRouteProps {
  children: React.ReactNode;
  skipOnboardingCheck?: boolean;
}

const ProtectedRoute = ({ children, skipOnboardingCheck = false }: ProtectedRouteProps) => {
  const { session, loading, onboardingCompleted, isSuperAdmin } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!session) {
    return <Navigate to="/login" replace />;
  }

  // Super admins skip onboarding check
  // Also skip if we're already on the onboarding page or if flag is set
  const isOnboardingPage = location.pathname === "/onboarding";
  
  if (!skipOnboardingCheck && !isSuperAdmin && !onboardingCompleted && !isOnboardingPage) {
    return <Navigate to="/onboarding" replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
