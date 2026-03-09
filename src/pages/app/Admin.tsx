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
import { Skeleton } from "@/components/ui/skeleton";
import { useAdminTenants } from "@/hooks/useAdminTenants";
import { ADMIN_ROLE_OPTIONS, useAdminUsers } from "@/hooks/useAdminUsers";
import type { Database } from "@/integrations/supabase/types";

type AppRole = Database["public"]["Enums"]["app_role"];

const formatDate = (iso: string) => {
  try {
    return new Date(iso).toLocaleDateString("pt-BR");
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

const Admin = () => {
  const { tenants, isLoading: tenantsLoading, updateTenantStatus, isSaving: savingTenants } = useAdminTenants();
  const { users, isLoading: usersLoading, updateUserStatus, addRole, removeRole, isSaving: savingUsers } = useAdminUsers();

  const [tenantSearch, setTenantSearch] = useState("");
  const [userSearch, setUserSearch] = useState("");
  const [roleToAddByUser, setRoleToAddByUser] = useState<Record<string, AppRole>>({});

  const filteredTenants = useMemo(() => {
    const q = tenantSearch.trim().toLowerCase();
    if (!q) return tenants;
    return tenants.filter((t) => t.nome.toLowerCase().includes(q) || t.slug.toLowerCase().includes(q));
  }, [tenants, tenantSearch]);

  const filteredUsers = useMemo(() => {
    const q = userSearch.trim().toLowerCase();
    if (!q) return users;
    return users.filter((u) =>
      u.nome.toLowerCase().includes(q) ||
      u.email.toLowerCase().includes(q) ||
      (u.tenant_nome ?? "").toLowerCase().includes(q)
    );
  }, [users, userSearch]);

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

      <Card className="shadow-card">
        <Tabs defaultValue="tenants">
          <CardHeader className="pb-4">
            <TabsList>
              <TabsTrigger value="tenants">Tenants</TabsTrigger>
              <TabsTrigger value="users">Usuários</TabsTrigger>
            </TabsList>

            <TabsContent value="tenants">
              <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Buscar tenant por nome ou slug..."
                    className="pl-10"
                    value={tenantSearch}
                    onChange={(e) => setTenantSearch(e.target.value)}
                  />
                </div>
              </div>
            </TabsContent>

            <TabsContent value="users">
              <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Buscar usuário por nome, e-mail ou tenant..."
                    className="pl-10"
                    value={userSearch}
                    onChange={(e) => setUserSearch(e.target.value)}
                  />
                </div>
              </div>
            </TabsContent>
          </CardHeader>

          <CardContent>
            <TabsContent value="tenants">
              {tenantsLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-12 w-full" />
                  ))}
                </div>
              ) : (
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
                      {filteredTenants.map((t) => {
                        const nextStatus = (t.status ?? "ativo") === "ativo" ? "inativo" : "ativo";
                        return (
                          <TableRow key={t.id}>
                            <TableCell className="font-medium text-foreground">{t.nome}</TableCell>
                            <TableCell className="text-muted-foreground">{t.slug}</TableCell>
                            <TableCell>
                              <Badge variant={statusVariant(t.status) as any}>{t.status}</Badge>
                            </TableCell>
                            <TableCell className="text-muted-foreground">{formatDate(t.created_at)}</TableCell>
                            <TableCell className="text-right">
                              <Button
                                variant="outline"
                                size="sm"
                                disabled={savingTenants}
                                onClick={() => updateTenantStatus({ id: t.id, status: nextStatus })}
                              >
                                Marcar como {nextStatus}
                              </Button>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}

              {!tenantsLoading && filteredTenants.length === 0 && (
                <div className="py-12 text-center text-sm text-muted-foreground">Nenhum tenant encontrado.</div>
              )}
            </TabsContent>

            <TabsContent value="users">
              {usersLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-12 w-full" />
                  ))}
                </div>
              ) : (
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
                      {filteredUsers.map((u) => {
                        const nextStatus = (u.status ?? "ativo") === "ativo" ? "inativo" : "ativo";
                        const selectedRole = roleToAddByUser[u.id] ?? "admin_empresa";

                        return (
                          <TableRow key={u.id}>
                            <TableCell>
                              <div>
                                <p className="text-sm font-medium text-foreground">{u.nome}</p>
                                <p className="text-xs text-muted-foreground">{u.email}</p>
                              </div>
                            </TableCell>
                            <TableCell className="text-muted-foreground">{u.tenant_nome ?? u.tenant_id}</TableCell>
                            <TableCell>
                              <Badge variant={statusVariant(u.status) as any}>{u.status}</Badge>
                            </TableCell>
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
                                        onClick={() => removeRole({ userId: u.id, role: r })}
                                        aria-label={`Remover role ${r} de ${u.email}`}
                                        disabled={savingUsers}
                                      >
                                        ×
                                      </button>
                                    </Badge>
                                  ))
                                )}
                              </div>

                              <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-center">
                                <Select
                                  value={selectedRole}
                                  onValueChange={(v) =>
                                    setRoleToAddByUser((prev) => ({ ...prev, [u.id]: v as AppRole }))
                                  }
                                >
                                  <SelectTrigger className="h-9 w-full sm:w-56">
                                    <SelectValue placeholder="Selecionar role" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {ADMIN_ROLE_OPTIONS.map((role) => (
                                      <SelectItem key={role} value={role}>
                                        {role}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>

                                <Button
                                  variant="outline"
                                  size="sm"
                                  disabled={savingUsers}
                                  onClick={() => addRole({ userId: u.id, tenantId: u.tenant_id, role: selectedRole })}
                                >
                                  Adicionar role
                                </Button>
                              </div>
                            </TableCell>
                            <TableCell className="text-right">
                              <Button
                                variant="outline"
                                size="sm"
                                disabled={savingUsers}
                                onClick={() => updateUserStatus({ id: u.id, status: nextStatus })}
                              >
                                Marcar como {nextStatus}
                              </Button>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}

              {!usersLoading && filteredUsers.length === 0 && (
                <div className="py-12 text-center text-sm text-muted-foreground">Nenhum usuário encontrado.</div>
              )}
            </TabsContent>
          </CardContent>
        </Tabs>
      </Card>
    </div>
  );
};

export default Admin;
