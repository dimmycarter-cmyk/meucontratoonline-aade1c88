import { useMemo, useState } from "react";
import { Search, Shield } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
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
import { useAdminTenants } from "@/hooks/useAdminTenants";
import { ADMIN_ROLE_OPTIONS, useAdminUsers } from "@/hooks/useAdminUsers";
import { useAuditLog } from "@/hooks/useAuditLog";
import { useAuth } from "@/contexts/AuthContext";
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

const statusVariant = (status: string) => {
  const s = (status ?? "").toLowerCase();
  if (s === "ativo") return "default";
  if (s === "inativo") return "secondary";
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
  const { user } = useAuth();
  const { tenants, isLoading: tenantsLoading, updateTenantStatus, isSaving: savingTenants } = useAdminTenants();
  const { users, isLoading: usersLoading, updateUserStatus, addRole, removeRole, isSaving: savingUsers } = useAdminUsers();
  const { logs, isLoading: logsLoading, logAction } = useAuditLog();

  // Filters
  const [tenantSearch, setTenantSearch] = useState("");
  const [tenantStatusFilter, setTenantStatusFilter] = useState("all");
  const [userSearch, setUserSearch] = useState("");
  const [userStatusFilter, setUserStatusFilter] = useState("all");
  const [userRoleFilter, setUserRoleFilter] = useState("all");
  const [userTenantFilter, setUserTenantFilter] = useState("all");

  // Pagination
  const [tenantPage, setTenantPage] = useState(1);
  const [userPage, setUserPage] = useState(1);
  const [logPage, setLogPage] = useState(1);

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

  // Reset tenant page when filters change
  const { useEffect: _ue1 } = { useEffect: undefined };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useState(() => { void _ue1; }); // placeholder removed below

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

  const handleToggleTenantStatus = (id: string, nome: string, nextStatus: string) => {
    if (nextStatus === "inativo") {
      setConfirmAction({
        title: `Inativar tenant "${nome}"?`,
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
        <Tabs defaultValue="tenants">
          <CardHeader className="pb-4">
            <TabsList>
              <TabsTrigger value="tenants">Tenants</TabsTrigger>
              <TabsTrigger value="users">Usuários</TabsTrigger>
              <TabsTrigger value="logs">Auditoria</TabsTrigger>
            </TabsList>

            {/* Tenant filters */}
            <TabsContent value="tenants">
              <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input placeholder="Buscar tenant..." className="pl-10" value={tenantSearch} onChange={(e) => setTenantSearch(e.target.value)} />
                </div>
                <Select value={tenantStatusFilter} onValueChange={setTenantStatusFilter}>
                  <SelectTrigger className="w-36"><SelectValue placeholder="Status" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="ativo">Ativo</SelectItem>
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
                  <SelectTrigger className="w-48"><SelectValue placeholder="Tenant" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos tenants</SelectItem>
                    {tenantOptions.map(([id, nome]) => (
                      <SelectItem key={id} value={id}>{nome}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </TabsContent>
          </CardHeader>

          <CardContent>
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
                          const nextStatus = (t.status ?? "ativo") === "ativo" ? "inativo" : "ativo";
                          return (
                            <TableRow key={t.id}>
                              <TableCell className="font-medium text-foreground">{t.nome}</TableCell>
                              <TableCell className="text-muted-foreground">{t.slug}</TableCell>
                              <TableCell><Badge variant={statusVariant(t.status) as any}>{t.status}</Badge></TableCell>
                              <TableCell className="text-muted-foreground">{formatDate(t.created_at)}</TableCell>
                              <TableCell className="text-right">
                                <Button variant="outline" size="sm" disabled={savingTenants} onClick={() => handleToggleTenantStatus(t.id, t.nome, nextStatus)}>
                                  Marcar como {nextStatus}
                                </Button>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                  {filteredTenants.length === 0 && (
                    <div className="py-12 text-center text-sm text-muted-foreground">Nenhum tenant encontrado.</div>
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
                          <TableHead>Tenant</TableHead>
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
