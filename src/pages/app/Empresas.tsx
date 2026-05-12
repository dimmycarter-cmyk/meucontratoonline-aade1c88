import { useState } from "react";
import { EmptyState } from "@/components/ui/EmptyState";
import { Plus, Search, MoreHorizontal, Building2, Trash2, Pencil, LogIn } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useCompanies } from "@/hooks/useCompanies";
import { useAuth } from "@/contexts/AuthContext";
import { Skeleton } from "@/components/ui/skeleton";
import { CompanyEditForm, CompanyFormData, companyToFormData, emptyCompanyForm } from "@/components/empresa/CompanyEditForm";
import { useNavigate } from "react-router-dom";

const Empresas = () => {
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState<CompanyFormData>(emptyCompanyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const { companies, isLoading, createCompany, updateCompany, deleteCompany, isCreating } = useCompanies();
  const { isSuperAdmin, setImpersonatedTenant } = useAuth();
  const navigate = useNavigate();

  const filtered = companies.filter((e) =>
    e.nome_fantasia.toLowerCase().includes(search.toLowerCase()) ||
    (e.cnpj && e.cnpj.includes(search))
  );

  const handleSubmit = async (data: CompanyFormData) => {
    if (editingId) {
      await updateCompany({ id: editingId, ...data });
    } else {
      await createCompany(data);
    }
    setDialogOpen(false);
    setForm(emptyCompanyForm);
    setEditingId(null);
  };

  const handleEdit = (company: any) => {
    setForm(companyToFormData(company));
    setEditingId(company.id);
    setDialogOpen(true);
  };

  const handleNew = () => {
    setForm(emptyCompanyForm);
    setEditingId(null);
    setDialogOpen(true);
  };

  return (
    <div className="p-6 lg:p-8">
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">Empresas</h1>
          <p className="text-sm text-muted-foreground">{companies.length} empresas cadastradas</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={handleNew}><Plus className="mr-2 h-4 w-4" /> Nova Empresa</Button>
          </DialogTrigger>
          <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
            <DialogHeader>
              <DialogTitle>{editingId ? "Editar Empresa" : "Nova Empresa"}</DialogTitle>
            </DialogHeader>
            <CompanyEditForm
              value={form}
              onChange={setForm}
              onSubmit={handleSubmit}
              onCancel={() => setDialogOpen(false)}
              isSubmitting={isCreating}
              submitLabel={editingId ? "Salvar" : "Criar Empresa"}
            />
          </DialogContent>
        </Dialog>
      </div>

      <Card className="shadow-card">
        <CardHeader className="pb-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input placeholder="Buscar por nome ou CNPJ..." className="pl-10" value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {[1, 2, 3].map((i) => <Skeleton key={i} className="h-32 w-full rounded-lg" />)}
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {filtered.map((empresa) => (
                <div key={empresa.id} className="rounded-lg border border-border p-4 transition-colors hover:bg-muted/50">
                  <div className="mb-3 flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <Building2 className="h-5 w-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-foreground">{empresa.nome_fantasia}</p>
                      <p className="truncate text-xs text-muted-foreground">{empresa.razao_social || "—"}</p>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 flex-shrink-0"><MoreHorizontal className="h-4 w-4" /></Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleEdit(empresa)}>
                          <Pencil className="mr-2 h-4 w-4" /> Editar
                        </DropdownMenuItem>
                        {isSuperAdmin && (
                          <>
                            <DropdownMenuItem onClick={() => {
                              setImpersonatedTenant(empresa.tenant_id, empresa.nome_fantasia);
                              navigate("/app");
                            }}>
                              <LogIn className="mr-2 h-4 w-4" /> Acessar como
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                          </>
                        )}
                        <DropdownMenuItem className="text-destructive" onClick={() => deleteCompany(empresa.id)}>
                          <Trash2 className="mr-2 h-4 w-4" /> Excluir
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                  <div className="space-y-1 text-xs text-muted-foreground">
                    <p>CNPJ: {empresa.cnpj || "—"}</p>
                    <p>{empresa.cidade && empresa.estado ? `${empresa.cidade}/${empresa.estado}` : "—"}</p>
                    <p>{empresa.email || "—"}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
          {!isLoading && filtered.length === 0 && (
            <EmptyState title="Nenhuma empresa encontrada." />
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Empresas;
