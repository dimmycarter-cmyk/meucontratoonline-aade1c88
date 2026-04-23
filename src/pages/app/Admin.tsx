import { useEffect, useMemo, useState } from "react";
import { Search, Shield, Building2, Users, FileText, TrendingUp, Eye, CreditCard, Clock, Sprout, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from "recharts";
import { useAdminTenants } from "@/hooks/useAdminTenants";
import { ADMIN_ROLE_OPTIONS, useAdminUsers } from "@/hooks/useAdminUsers";
import { useAuditLog } from "@/hooks/useAuditLog";
import { useAdminDashboard } from "@/hooks/useAdminDashboard";
import { usePlans } from "@/hooks/usePlans";
import { useSubscriptions } from "@/hooks/useSubscriptions";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import type { Database } from "@/integrations/supabase/types";

type AppRole = Database["public"]["Enums"]["app_role"];

const PAGE_SIZE = 10;

const formatDate = (iso: string) => {
  try {
    return new Date(iso).toLocaleDateString("pt-BR");
  } catch {
    return "—";
  }
};

const formatDateTime = (iso: string) => {
  try {
    return new Date(iso).toLocaleString("pt-BR");
  } catch {
    return "—";
  }
};

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
};

const statusVariant = (status: string) => {
  const s = (status ?? "").toLowerCase();
  if (s === "ativo" || s === "active") return "default";
  if (s === "trial") return "secondary";
  if (s === "inativo" || s === "suspenso" || s === "suspended" || s === "expired") return "destructive";
  return "outline";
};

function paginate<T>(items: T[], page: number): T[] {
  const start = (page - 1) * PAGE_SIZE;
  return items.slice(start, start + PAGE_SIZE);
}

function PaginationControls({ total, page, setPage }: { total: number; page: number; setPage: (p: number) => void }) {
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  if (totalPages <= 1) return null;
  return (
    <Pagination className="mt-4">
      <PaginationContent>
        <PaginationItem>
          <PaginationPrevious
            onClick={() => setPage(Math.max(1, page - 1))}
            className={page <= 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
          />
        </PaginationItem>
        {Array.from({ length: totalPages }, (_, i) => i + 1)
          .filter((p) => p === 1 || p === totalPages || Math.abs(p - page) <= 1)
          .map((p, idx, arr) => {
            const prev = arr[idx - 1];
            const showEllipsis = prev != null && p - prev > 1;
            return (
              <span key={p} className="flex items-center">
                {showEllipsis && <span className="px-2 text-muted-foreground">…</span>}
                <PaginationItem>
                  <PaginationLink isActive={p === page} onClick={() => setPage(p)} className="cursor-pointer">
                    {p}
                  </PaginationLink>
                </PaginationItem>
              </span>
            );
          })}
        <PaginationItem>
          <PaginationNext
            onClick={() => setPage(Math.min(totalPages, page + 1))}
            className={page >= totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"}
          />
        </PaginationItem>
      </PaginationContent>
    </Pagination>
  );
}

const Admin = () => {
  const { user, setImpersonatedTenant } = useAuth();
  const { toast } = useToast();
  const { tenants, isLoading: tenantsLoading, updateTenantStatus, isSaving: savingTenants } = useAdminTenants();
  const { users, isLoading: usersLoading, updateUserStatus, addRole, removeRole, isSaving: savingUsers } = useAdminUsers();
  const { logs, isLoading: logsLoading, logAction } = useAuditLog();
  const { metrics, isLoading: metricsLoading } = useAdminDashboard();
  const { plans, isLoading: plansLoading } = usePlans();
  const { subscriptions, isLoading: subscriptionsLoading, updateSubscription, isSaving: savingSubscriptions } = useSubscriptions();

  // Filters
  const [tenantSearch, setTenantSearch] = useState("");
  const [tenantStatusFilter, setTenantStatusFilter] = useState("all");
  const [userSearch, setUserSearch] = useState("");
  const [userStatusFilter, setUserStatusFilter] = useState("all");
  const [userRoleFilter, setUserRoleFilter] = useState("all");
  const [userTenantFilter, setUserTenantFilter] = useState("all");
  const [subscriptionStatusFilter, setSubscriptionStatusFilter] = useState("all");

  // Pagination
  const [tenantPage, setTenantPage] = useState(1);
  const [userPage, setUserPage] = useState(1);
  const [logPage, setLogPage] = useState(1);
  const [subscriptionPage, setSubscriptionPage] = useState(1);

  // AlertDialog state
  const [confirmAction, setConfirmAction] = useState<{
    title: string;
    description: string;
    onConfirm: () => Promise<void>;
  } | null>(null);

  const [roleToAddByUser, setRoleToAddByUser] = useState<Record<string, AppRole>>({});

  // Unique tenants for user filter
  const tenantOptions = useMemo(() => {
    const map = new Map<string, string>();
    users.forEach((u) => {
      if (u.tenant_id && u.tenant_nome) map.set(u.tenant_id, u.tenant_nome);
    });
    return Array.from(map.entries());
  }, [users]);

  // Filtered tenants
  const filteredTenants = useMemo(() => {
    const q = tenantSearch.trim().toLowerCase();
    return tenants.filter((t) => {
      if (q && !t.nome.toLowerCase().includes(q) && !t.slug.toLowerCase().includes(q)) return false;
      if (tenantStatusFilter !== "all" && t.status !== tenantStatusFilter) return false;
      return true;
    });
  }, [tenants, tenantSearch, tenantStatusFilter]);

  // Reset pages when filters change
  useEffect(() => { setTenantPage(1); }, [tenantSearch, tenantStatusFilter]);
  useEffect(() => { setUserPage(1); }, [userSearch, userStatusFilter, userRoleFilter, userTenantFilter]);
  useEffect(() => { setSubscriptionPage(1); }, [subscriptionStatusFilter]);

  // Filtered users
  const filteredUsers = useMemo(() => {
    const q = userSearch.trim().toLowerCase();
    return users.filter((u) => {
      if (q && !u.nome.toLowerCase().includes(q) && !u.email.toLowerCase().includes(q) && !(u.tenant_nome ?? "").toLowerCase().includes(q)) return false;
      if (userStatusFilter !== "all" && u.status !== userStatusFilter) return false;
      if (userRoleFilter !== "all" && !u.roles.includes(userRoleFilter as AppRole)) return false;
      if (userTenantFilter !== "all" && u.tenant_id !== userTenantFilter) return false;
      return true;
    });
  }, [users, userSearch, userStatusFilter, userRoleFilter, userTenantFilter]);

  // Filtered subscriptions
  const filteredSubscriptions = useMemo(() => {
    if (subscriptionStatusFilter === "all") return subscriptions;
    return subscriptions.filter((s) => s.status === subscriptionStatusFilter);
  }, [subscriptions, subscriptionStatusFilter]);

  const handleToggleTenantStatus = (id: string, nome: string, nextStatus: string) => {
    if (nextStatus === "inativo" || nextStatus === "suspenso") {
      setConfirmAction({
        title: `${nextStatus === "suspenso" ? "Suspender" : "Inativar"} tenant "${nome}"?`,
        description: "Todos os usuários desse tenant perderão acesso ao sistema. Deseja continuar?",
        onConfirm: async () => {
          await updateTenantStatus({ id, status: nextStatus });
          await logAction({ user_id: user!.id, action: "update_tenant_status", target_type: "tenant", target_id: id, details: { status: nextStatus } });
        },
      });
    } else {
      updateTenantStatus({ id, status: nextStatus }).then(() =>
        logAction({ user_id: user!.id, action: "update_tenant_status", target_type: "tenant", target_id: id, details: { status: nextStatus } })
      );
    }
  };

  const handleToggleUserStatus = (id: string, nome: string, nextStatus: string) => {
    if (nextStatus === "inativo") {
      setConfirmAction({
        title: `Inativar usuário "${nome}"?`,
        description: "O usuário não poderá mais acessar o sistema. Deseja continuar?",
        onConfirm: async () => {
          await updateUserStatus({ id, status: nextStatus });
          await logAction({ user_id: user!.id, action: "update_user_status", target_type: "user", target_id: id, details: { status: nextStatus } });
        },
      });
    } else {
      updateUserStatus({ id, status: nextStatus }).then(() =>
        logAction({ user_id: user!.id, action: "update_user_status", target_type: "user", target_id: id, details: { status: nextStatus } })
      );
    }
  };

  const handleRemoveRole = (userId: string, email: string, role: AppRole) => {
    if (role === "super_admin") {
      setConfirmAction({
        title: `Remover role super_admin de "${email}"?`,
        description: "Essa é uma role crítica. O usuário perderá acesso de administração global. Deseja continuar?",
        onConfirm: async () => {
          await removeRole({ userId, role });
          await logAction({ user_id: user!.id, action: "remove_role", target_type: "user_role", target_id: userId, details: { role } });
        },
      });
    } else {
      removeRole({ userId, role }).then(() =>
        logAction({ user_id: user!.id, action: "remove_role", target_type: "user_role", target_id: userId, details: { role } })
      );
    }
  };

  const handleAddRole = async (userId: string, tenantId: string, role: AppRole) => {
    await addRole({ userId, tenantId, role });
    await logAction({ user_id: user!.id, action: "add_role", target_type: "user_role", target_id: userId, details: { role } });
  };

  const handleImpersonate = (tenantId: string, tenantName: string) => {
    setImpersonatedTenant(tenantId, tenantName);
    toast({ title: `Visualizando como: ${tenantName}` });
  };

  const handleUpdateSubscriptionStatus = async (id: string, status: string) => {
    await updateSubscription({ id, status });
    await logAction({ user_id: user!.id, action: "update_subscription", target_type: "subscription", target_id: id, details: { status } });
  };

  // Dashboard metrics cards
  const metricsCards = [
    { label: "Total de Empresas", value: metrics?.total_tenants ?? 0, icon: Building2, color: "text-primary" },
    { label: "Empresas Ativas", value: metrics?.active_tenants ?? 0, icon: TrendingUp, color: "text-success" },
    { label: "Em Trial", value: metrics?.trial_tenants ?? 0, icon: Clock, color: "text-warning" },
    { label: "Total de Usuários", value: metrics?.total_users ?? 0, icon: Users, color: "text-info" },
  ];

  return (
    <div className="p-6 lg:p-8">
      <div className="mb-8">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Shield className="h-5 w-5" />
          </div>
          <div>
            <h1 className="font-display text-2xl font-bold text-foreground">Administração</h1>
            <p className="text-sm text-muted-foreground">Gestão global de tenants e usuários (apenas super_admin)</p>
          </div>
        </div>
      </div>

      {/* Confirmation AlertDialog */}
      <AlertDialog open={!!confirmAction} onOpenChange={(open) => !open && setConfirmAction(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{confirmAction?.title}</AlertDialogTitle>
            <AlertDialogDescription>{confirmAction?.description}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                await confirmAction?.onConfirm();
                setConfirmAction(null);
              }}
            >
              Confirmar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Card className="shadow-card">
        <Tabs defaultValue="dashboard">
          <CardHeader className="pb-4">
            <TabsList className="flex flex-wrap">
              <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
              <TabsTrigger value="tenants">Empresas</TabsTrigger>
              <TabsTrigger value="users">Usuários</TabsTrigger>
              <TabsTrigger value="plans">Planos</TabsTrigger>
              <TabsTrigger value="subscriptions">Assinaturas</TabsTrigger>
              <TabsTrigger value="logs">Auditoria</TabsTrigger>
            </TabsList>

            {/* Tenant filters */}
            <TabsContent value="tenants">
              <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input placeholder="Buscar empresa..." className="pl-10" value={tenantSearch} onChange={(e) => setTenantSearch(e.target.value)} />
                </div>
                <Select value={tenantStatusFilter} onValueChange={setTenantStatusFilter}>
                  <SelectTrigger className="w-36"><SelectValue placeholder="Status" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="ativo">Ativo</SelectItem>
                    <SelectItem value="suspenso">Suspenso</SelectItem>
                    <SelectItem value="inativo">Inativo</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </TabsContent>

            {/* User filters */}
            <TabsContent value="users">
              <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center flex-wrap">
                <div className="relative flex-1 min-w-[200px]">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input placeholder="Buscar usuário..." className="pl-10" value={userSearch} onChange={(e) => setUserSearch(e.target.value)} />
                </div>
                <Select value={userStatusFilter} onValueChange={setUserStatusFilter}>
                  <SelectTrigger className="w-36"><SelectValue placeholder="Status" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="ativo">Ativo</SelectItem>
                    <SelectItem value="inativo">Inativo</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={userRoleFilter} onValueChange={setUserRoleFilter}>
                  <SelectTrigger className="w-44"><SelectValue placeholder="Role" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas roles</SelectItem>
                    {ADMIN_ROLE_OPTIONS.map((r) => (
                      <SelectItem key={r} value={r}>{r}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={userTenantFilter} onValueChange={setUserTenantFilter}>
                  <SelectTrigger className="w-48"><SelectValue placeholder="Empresa" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas empresas</SelectItem>
                    {tenantOptions.map(([id, nome]) => (
                      <SelectItem key={id} value={id}>{nome}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </TabsContent>

            {/* Subscription filters */}
            <TabsContent value="subscriptions">
              <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center">
                <Select value={subscriptionStatusFilter} onValueChange={setSubscriptionStatusFilter}>
                  <SelectTrigger className="w-40"><SelectValue placeholder="Status" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="trial">Trial</SelectItem>
                    <SelectItem value="active">Ativo</SelectItem>
                    <SelectItem value="expired">Expirado</SelectItem>
                    <SelectItem value="suspended">Suspenso</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </TabsContent>
          </CardHeader>

          <CardContent>
            {/* DASHBOARD TAB */}
            <TabsContent value="dashboard">
              {metricsLoading ? (
                <div className="space-y-6">
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-24" />)}
                  </div>
                  <Skeleton className="h-80" />
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Metric Cards */}
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    {metricsCards.map((card, i) => (
                      <Card key={i} className="shadow-sm">
                        <CardContent className="p-5">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-sm text-muted-foreground">{card.label}</p>
                              <p className="mt-1 font-display text-2xl font-bold text-foreground">{card.value}</p>
                            </div>
                            <div className={`flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 ${card.color}`}>
                              <card.icon className="h-6 w-6" />
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>

                  {/* Charts */}
                  <div className="grid gap-6 lg:grid-cols-2">
                    <Card className="shadow-sm">
                      <CardHeader className="pb-2">
                        <CardTitle className="font-display text-base font-semibold">Crescimento de Empresas</CardTitle>
                      </CardHeader>
                      <CardContent>
                        {metrics?.tenants_by_month && metrics.tenants_by_month.length > 0 ? (
                          <ResponsiveContainer width="100%" height={280}>
                            <BarChart data={metrics.tenants_by_month}>
                              <CartesianGrid strokeDasharray="3 3" stroke="hsl(215, 20%, 90%)" />
                              <XAxis dataKey="month" tick={{ fontSize: 12, fill: "hsl(215, 16%, 47%)" }} />
                              <YAxis tick={{ fontSize: 12, fill: "hsl(215, 16%, 47%)" }} allowDecimals={false} />
                              <Tooltip contentStyle={{ borderRadius: "8px", border: "1px solid hsl(215, 20%, 90%)", fontSize: "13px" }} />
                              <Bar dataKey="total" fill="hsl(217, 91%, 50%)" radius={[4, 4, 0, 0]} name="Empresas" />
                            </BarChart>
                          </ResponsiveContainer>
                        ) : (
                          <div className="flex h-[280px] items-center justify-center text-sm text-muted-foreground">
                            Sem dados suficientes
                          </div>
                        )}
                      </CardContent>
                    </Card>

                    <Card className="shadow-sm">
                      <CardHeader className="pb-2">
                        <CardTitle className="font-display text-base font-semibold">Contratos por Mês</CardTitle>
                      </CardHeader>
                      <CardContent>
                        {metrics?.contracts_by_month && metrics.contracts_by_month.length > 0 ? (
                          <ResponsiveContainer width="100%" height={280}>
                            <BarChart data={metrics.contracts_by_month}>
                              <CartesianGrid strokeDasharray="3 3" stroke="hsl(215, 20%, 90%)" />
                              <XAxis dataKey="month" tick={{ fontSize: 12, fill: "hsl(215, 16%, 47%)" }} />
                              <YAxis tick={{ fontSize: 12, fill: "hsl(215, 16%, 47%)" }} allowDecimals={false} />
                              <Tooltip contentStyle={{ borderRadius: "8px", border: "1px solid hsl(215, 20%, 90%)", fontSize: "13px" }} />
                              <Bar dataKey="total" fill="hsl(152, 69%, 40%)" radius={[4, 4, 0, 0]} name="Contratos" />
                            </BarChart>
                          </ResponsiveContainer>
                        ) : (
                          <div className="flex h-[280px] items-center justify-center text-sm text-muted-foreground">
                            Sem dados suficientes
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </div>

                  {/* Quick Stats */}
                  <div className="grid gap-4 sm:grid-cols-4">
                    <Card className="shadow-sm">
                      <CardContent className="p-5">
                        <p className="text-sm text-muted-foreground">Empresas Suspensas</p>
                        <p className="mt-1 font-display text-2xl font-bold text-destructive">{metrics?.suspended_tenants ?? 0}</p>
                      </CardContent>
                    </Card>
                    <Card className="shadow-sm">
                      <CardContent className="p-5">
                        <p className="text-sm text-muted-foreground">Total de Contratos</p>
                        <p className="mt-1 font-display text-2xl font-bold text-foreground">{metrics?.total_contracts ?? 0}</p>
                      </CardContent>
                    </Card>
                    <Card className="shadow-sm">
                      <CardContent className="p-5">
                        <p className="text-sm text-muted-foreground">Contratos no Mês</p>
                        <p className="mt-1 font-display text-2xl font-bold text-foreground">{metrics?.contracts_this_month ?? 0}</p>
                      </CardContent>
                    </Card>
                    <Card className="shadow-sm">
                      <CardContent className="p-5">
                        <p className="text-sm text-muted-foreground">Média Usuários/Empresa</p>
                        <p className="mt-1 font-display text-2xl font-bold text-foreground">
                          {metrics?.total_tenants ? Math.round((metrics.total_users / metrics.total_tenants) * 10) / 10 : 0}
                        </p>
                      </CardContent>
                    </Card>
                  </div>
                </div>
              )}
            </TabsContent>

            {/* TENANTS TAB */}
            <TabsContent value="tenants">
              {tenantsLoading ? (
                <div className="space-y-3">{[1,2,3].map((i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
              ) : (
                <>
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Nome</TableHead>
                          <TableHead>Slug</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Criado em</TableHead>
                          <TableHead className="text-right">Ações</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {paginate(filteredTenants, tenantPage).map((t) => {
                          const nextStatus = (t.status ?? "ativo") === "ativo" ? "suspenso" : "ativo";
                          return (
                            <TableRow key={t.id}>
                              <TableCell className="font-medium text-foreground">{t.nome}</TableCell>
                              <TableCell className="text-muted-foreground">{t.slug}</TableCell>
                              <TableCell><Badge variant={statusVariant(t.status) as any}>{t.status}</Badge></TableCell>
                              <TableCell className="text-muted-foreground">{formatDate(t.created_at)}</TableCell>
                              <TableCell className="text-right">
                                <div className="flex items-center justify-end gap-2">
                                  <Button 
                                    variant="outline" 
                                    size="sm" 
                                    onClick={() => handleImpersonate(t.id, t.nome)}
                                    title="Visualizar como esta empresa"
                                  >
                                    <Eye className="mr-1 h-3 w-3" /> Entrar
                                  </Button>
                                  <Button variant="outline" size="sm" disabled={savingTenants} onClick={() => handleToggleTenantStatus(t.id, t.nome, nextStatus)}>
                                    {nextStatus === "suspenso" ? "Suspender" : "Ativar"}
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                  {filteredTenants.length === 0 && (
                    <div className="py-12 text-center text-sm text-muted-foreground">Nenhuma empresa encontrada.</div>
                  )}
                  <PaginationControls total={filteredTenants.length} page={tenantPage} setPage={setTenantPage} />
                </>
              )}
            </TabsContent>

            {/* USERS TAB */}
            <TabsContent value="users">
              {usersLoading ? (
                <div className="space-y-3">{[1,2,3].map((i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
              ) : (
                <>
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Usuário</TableHead>
                          <TableHead>Empresa</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Roles</TableHead>
                          <TableHead className="text-right">Ações</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {paginate(filteredUsers, userPage).map((u) => {
                          const nextStatus = (u.status ?? "ativo") === "ativo" ? "inativo" : "ativo";
                          const selectedRole = roleToAddByUser[u.id] ?? "admin_empresa";
                          return (
                            <TableRow key={u.id}>
                              <TableCell>
                                <p className="text-sm font-medium text-foreground">{u.nome}</p>
                                <p className="text-xs text-muted-foreground">{u.email}</p>
                              </TableCell>
                              <TableCell className="text-muted-foreground">{u.tenant_nome ?? u.tenant_id}</TableCell>
                              <TableCell><Badge variant={statusVariant(u.status) as any}>{u.status}</Badge></TableCell>
                              <TableCell>
                                <div className="flex flex-wrap items-center gap-2">
                                  {u.roles.length === 0 ? (
                                    <span className="text-xs text-muted-foreground">—</span>
                                  ) : (
                                    u.roles.map((r) => (
                                      <Badge key={r} variant="secondary" className="gap-2">
                                        {r}
                                        <button
                                          type="button"
                                          className="text-muted-foreground hover:text-foreground"
                                          onClick={() => handleRemoveRole(u.id, u.email, r)}
                                          disabled={savingUsers}
                                        >
                                          ×
                                        </button>
                                      </Badge>
                                    ))
                                  )}
                                </div>
                                <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-center">
                                  <Select value={selectedRole} onValueChange={(v) => setRoleToAddByUser((prev) => ({ ...prev, [u.id]: v as AppRole }))}>
                                    <SelectTrigger className="h-9 w-full sm:w-56"><SelectValue placeholder="Selecionar role" /></SelectTrigger>
                                    <SelectContent>
                                      {ADMIN_ROLE_OPTIONS.map((role) => (
                                        <SelectItem key={role} value={role}>{role}</SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                  <Button variant="outline" size="sm" disabled={savingUsers} onClick={() => handleAddRole(u.id, u.tenant_id, selectedRole)}>
                                    Adicionar role
                                  </Button>
                                </div>
                              </TableCell>
                              <TableCell className="text-right">
                                <Button variant="outline" size="sm" disabled={savingUsers} onClick={() => handleToggleUserStatus(u.id, u.nome, nextStatus)}>
                                  Marcar como {nextStatus}
                                </Button>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                  {filteredUsers.length === 0 && (
                    <div className="py-12 text-center text-sm text-muted-foreground">Nenhum usuário encontrado.</div>
                  )}
                  <PaginationControls total={filteredUsers.length} page={userPage} setPage={setUserPage} />
                </>
              )}
            </TabsContent>

            {/* PLANS TAB */}
            <TabsContent value="plans">
              {plansLoading ? (
                <div className="space-y-3">{[1,2,3].map((i) => <Skeleton key={i} className="h-24 w-full" />)}</div>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {plans.map((plan) => (
                    <Card key={plan.id} className="shadow-sm">
                      <CardHeader className="pb-2">
                        <div className="flex items-center justify-between">
                          <CardTitle className="font-display text-lg">{plan.name}</CardTitle>
                          <CreditCard className="h-5 w-5 text-primary" />
                        </div>
                      </CardHeader>
                      <CardContent>
                        <p className="text-2xl font-bold text-foreground">{formatCurrency(plan.price)}<span className="text-sm font-normal text-muted-foreground">/mês</span></p>
                        <div className="mt-4 space-y-2">
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">Máx. usuários</span>
                            <span className="font-medium">{plan.max_users >= 999999 ? "Ilimitado" : plan.max_users}</span>
                          </div>
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">Contratos/mês</span>
                            <span className="font-medium">{plan.max_contracts_per_month >= 999999 ? "Ilimitado" : plan.max_contracts_per_month}</span>
                          </div>
                        </div>
                        {plan.features && plan.features.length > 0 && (
                          <ul className="mt-4 space-y-1">
                            {plan.features.map((f, i) => (
                              <li key={i} className="text-xs text-muted-foreground">• {f}</li>
                            ))}
                          </ul>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>

            {/* SUBSCRIPTIONS TAB */}
            <TabsContent value="subscriptions">
              {subscriptionsLoading ? (
                <div className="space-y-3">{[1,2,3].map((i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
              ) : (
                <>
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Empresa</TableHead>
                          <TableHead>Plano</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Fim do Trial</TableHead>
                          <TableHead>Criado em</TableHead>
                          <TableHead className="text-right">Ações</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {paginate(filteredSubscriptions, subscriptionPage).map((s) => (
                          <TableRow key={s.id}>
                            <TableCell className="font-medium text-foreground">{s.tenant_name}</TableCell>
                            <TableCell className="text-muted-foreground">{s.plan_name}</TableCell>
                            <TableCell><Badge variant={statusVariant(s.status) as any}>{s.status}</Badge></TableCell>
                            <TableCell className="text-muted-foreground">{s.trial_end ? formatDate(s.trial_end) : "—"}</TableCell>
                            <TableCell className="text-muted-foreground">{formatDate(s.created_at)}</TableCell>
                            <TableCell className="text-right">
                              <Select 
                                value={s.status} 
                                onValueChange={(v) => handleUpdateSubscriptionStatus(s.id, v)}
                                disabled={savingSubscriptions}
                              >
                                <SelectTrigger className="h-8 w-28"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="trial">Trial</SelectItem>
                                  <SelectItem value="active">Ativo</SelectItem>
                                  <SelectItem value="expired">Expirado</SelectItem>
                                  <SelectItem value="suspended">Suspenso</SelectItem>
                                </SelectContent>
                              </Select>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                  {filteredSubscriptions.length === 0 && (
                    <div className="py-12 text-center text-sm text-muted-foreground">Nenhuma assinatura encontrada.</div>
                  )}
                  <PaginationControls total={filteredSubscriptions.length} page={subscriptionPage} setPage={setSubscriptionPage} />
                </>
              )}
            </TabsContent>

            {/* AUDIT LOGS TAB */}
            <TabsContent value="logs">
              {logsLoading ? (
                <div className="space-y-3">{[1,2,3].map((i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
              ) : (
                <>
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Data/Hora</TableHead>
                          <TableHead>Ação</TableHead>
                          <TableHead>Tipo</TableHead>
                          <TableHead>Alvo</TableHead>
                          <TableHead>Detalhes</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {paginate(logs, logPage).map((log) => (
                          <TableRow key={log.id}>
                            <TableCell className="text-muted-foreground whitespace-nowrap">{formatDateTime(log.created_at)}</TableCell>
                            <TableCell className="font-medium text-foreground">{log.action}</TableCell>
                            <TableCell className="text-muted-foreground">{log.target_type}</TableCell>
                            <TableCell className="text-muted-foreground text-xs font-mono">{log.target_id.slice(0, 8)}…</TableCell>
                            <TableCell className="text-xs text-muted-foreground max-w-[200px] truncate">{JSON.stringify(log.details)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                  {logs.length === 0 && (
                    <div className="py-12 text-center text-sm text-muted-foreground">Nenhum log de auditoria encontrado.</div>
                  )}
                  <PaginationControls total={logs.length} page={logPage} setPage={setLogPage} />
                </>
              )}
            </TabsContent>
          </CardContent>
        </Tabs>
      </Card>
    </div>
  );
};

export default Admin;
