import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  FileText,
  FilePlus,
  Users,
  Building2,
  FileStack,
  ScrollText,
  History,
  Brain,
  Settings,
  Shield,
  LogOut,
  ChevronLeft,
  ChevronRight,
  X,
  Eye,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useMemo, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import type { Database } from "@/integrations/supabase/types";

type AppRole = Database["public"]["Enums"]["app_role"];

interface MenuItem {
  label: string;
  icon: React.ElementType;
  path: string;
  allowedRoles?: AppRole[];
}

const menuItems: MenuItem[] = [
  { label: "Dashboard", icon: LayoutDashboard, path: "/app" },
  { label: "Novo Contrato", icon: FilePlus, path: "/app/novo-contrato" },
  { label: "Contratos", icon: History, path: "/app/contratos" },
  { label: "Modelos", icon: FileStack, path: "/app/modelos", allowedRoles: ["admin_empresa", "super_admin"] },
  { label: "Cláusulas", icon: ScrollText, path: "/app/clausulas", allowedRoles: ["admin_empresa", "super_admin"] },
  { label: "Usuários", icon: Users, path: "/app/usuarios" },
  { label: "Empresas", icon: Building2, path: "/app/empresas", allowedRoles: ["super_admin"] },
  { label: "Agente IA", icon: Brain, path: "/app/agente-ia", allowedRoles: ["admin_empresa", "super_admin"] },
  { label: "Administração", icon: Shield, path: "/app/admin", allowedRoles: ["super_admin"] },
];

const bottomItems: MenuItem[] = [{ label: "Configurações", icon: Settings, path: "/app/configuracoes" }];

const AppSidebar = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);
  const { signOut, profile, roles, isSuperAdmin, impersonatedTenantId, impersonatedTenantName, setImpersonatedTenant } = useAuth();
  const { toast } = useToast();

  const items = useMemo(() => {
    return menuItems.filter((item) => {
      if (!item.allowedRoles) return true;
      return item.allowedRoles.some((r) => roles.includes(r));
    });
  }, [roles]);

  const isActive = (path: string) => {
    if (path === "/app") return location.pathname === "/app";
    return location.pathname.startsWith(path);
  };

  const handleLogout = async () => {
    await signOut();
    toast({ title: "Você saiu da sua conta" });
    navigate("/login");
  };

  const handleExitImpersonation = () => {
    setImpersonatedTenant(null);
    toast({ title: "Voltando para sua conta de administrador" });
  };

  return (
    <aside
      className={cn(
        "relative flex h-screen flex-col border-r border-sidebar-border bg-sidebar transition-all duration-300",
        collapsed ? "w-16" : "w-64",
      )}
    >
      {/* Impersonation Banner */}
      {impersonatedTenantId && (
        <div className="bg-warning/20 border-b border-warning/30 px-3 py-2">
          <div className="flex items-center gap-2">
            <Eye className="h-4 w-4 text-warning flex-shrink-0" />
            {!collapsed && (
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-warning truncate">
                  Visualizando como:
                </p>
                <p className="text-xs text-warning/80 truncate">
                  {impersonatedTenantName || "Empresa"}
                </p>
              </div>
            )}
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 text-warning hover:bg-warning/20 flex-shrink-0"
              onClick={handleExitImpersonation}
              title="Sair da visualização"
            >
              <X className="h-3 w-3" />
            </Button>
          </div>
        </div>
      )}

      {/* Logo */}
      <div className="flex h-16 items-center gap-2 border-b border-sidebar-border px-4">
        <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-sidebar-primary">
          <FileText className="h-4 w-4 text-sidebar-primary-foreground" />
        </div>
        {!collapsed && (
          <span className="font-display text-sm font-bold text-sidebar-primary-foreground">Meu Contrato</span>
        )}
      </div>

      {/* Toggle */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="absolute -right-3 top-20 z-10 flex h-6 w-6 items-center justify-center rounded-full border border-sidebar-border bg-sidebar text-sidebar-foreground shadow-sm hover:bg-sidebar-accent"
      >
        {collapsed ? <ChevronRight className="h-3 w-3" /> : <ChevronLeft className="h-3 w-3" />}
      </button>

      {/* User info */}
      {!collapsed && profile && (
        <div className="border-b border-sidebar-border px-4 py-3">
          <p className="truncate text-xs font-medium text-sidebar-primary-foreground">{profile.nome}</p>
          <p className="truncate text-xs text-sidebar-foreground">{profile.email}</p>
        </div>
      )}

      {/* Menu */}
      <nav className="flex-1 space-y-1 overflow-y-auto px-2 py-4">
        {items.map((item) => (
          <Link
            key={item.path}
            to={item.path}
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
              isActive(item.path)
                ? "bg-sidebar-accent text-sidebar-primary"
                : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
            )}
            title={collapsed ? item.label : undefined}
          >
            <item.icon className="h-5 w-5 flex-shrink-0" />
            {!collapsed && <span>{item.label}</span>}
          </Link>
        ))}
      </nav>

      {/* Bottom */}
      <div className="space-y-1 border-t border-sidebar-border px-2 py-4">
        {bottomItems.map((item) => (
          <Link
            key={item.path}
            to={item.path}
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
              isActive(item.path)
                ? "bg-sidebar-accent text-sidebar-primary"
                : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
            )}
            title={collapsed ? item.label : undefined}
          >
            <item.icon className="h-5 w-5 flex-shrink-0" />
            {!collapsed && <span>{item.label}</span>}
          </Link>
        ))}
        <button
          onClick={handleLogout}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-sidebar-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
          title={collapsed ? "Sair" : undefined}
        >
          <LogOut className="h-5 w-5 flex-shrink-0" />
          {!collapsed && <span>Sair</span>}
        </button>
      </div>
    </aside>
  );
};

export default AppSidebar;
