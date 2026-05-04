import { useState, useCallback } from "react";
import { Plus, Search, MoreHorizontal, Building2, Trash2, Pencil, LogIn } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useCompanies } from "@/hooks/useCompanies";
import { useAuth } from "@/contexts/AuthContext";
import { Skeleton } from "@/components/ui/skeleton";
import { maskCNPJ, maskPhone, maskCEP } from "@/lib/masks";
import { cnpjSchema } from "@/lib/validators";
import { useCepLookup } from "@/hooks/useCepLookup";
import { useNavigate } from "react-router-dom";

const emptyCompany = {
  nome_fantasia: "", razao_social: "", cnpj: "", whatsapp: "", email: "",
  cep: "", rua: "", numero: "", complemento: "", bairro: "", cidade: "", estado: "",
};

const Empresas = () => {
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState(emptyCompany);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [cnpjError, setCnpjError] = useState("");
  const { companies, isLoading, createCompany, updateCompany, deleteCompany, isCreating } = useCompanies();
  const { isSuperAdmin, setImpersonatedTenant } = useAuth();
  const navigate = useNavigate();

  const filtered = companies.filter((e) =>
    e.nome_fantasia.toLowerCase().includes(search.toLowerCase()) ||
    (e.cnpj && e.cnpj.includes(search))
  );

  const updateField = (field: string, value: string) => setForm((prev) => ({ ...prev, [field]: value }));

  const onCepResult = useCallback(
    (data: { rua: string; bairro: string; cidade: string; estado: string }) => {
      setForm((prev) => ({ ...prev, rua: data.rua, bairro: data.bairro, cidade: data.cidade, estado: data.estado }));
    },
    []
  );
  const { lookup: lookupCep } = useCepLookup(onCepResult);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editingId) {
      await updateCompany({ id: editingId, ...form });
    } else {
      await createCompany(form);
    }
    setDialogOpen(false);
    setForm(emptyCompany);
    setEditingId(null);
  };

  const handleEdit = (company: any) => {
    setForm({
      nome_fantasia: company.nome_fantasia || "", razao_social: company.razao_social || "",
      cnpj: company.cnpj || "", whatsapp: company.whatsapp || "", email: company.email || "",
      cep: company.cep || "", rua: company.rua || "", numero: company.numero || "",
      complemento: company.complemento || "", bairro: company.bairro || "",
      cidade: company.cidade || "", estado: company.estado || "",
    });
    setEditingId(company.id);
    setCnpjError("");
    setDialogOpen(true);
  };

  const handleNew = () => {
    setForm(emptyCompany);
    setEditingId(null);
    setCnpjError("");
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
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2 sm:col-span-2">
                  <Label>Nome Fantasia *</Label>
                  <Input value={form.nome_fantasia} onChange={(e) => updateField("nome_fantasia", e.target.value)} required />
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label>Razão Social</Label>
                  <Input value={form.razao_social} onChange={(e) => updateField("razao_social", e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>CNPJ</Label>
                  <Input
                    value={form.cnpj}
                    onChange={(e) => updateField("cnpj", maskCNPJ(e.target.value))}
                    onBlur={(e) => {
                      if (!e.target.value) { setCnpjError(""); return; }
                      const result = cnpjSchema.safeParse(e.target.value);
                      setCnpjError(result.success ? "" : result.error.issues[0].message);
                    }}
                    placeholder="00.000.000/0001-00"
                  />
                  {cnpjError && <p className="text-xs text-destructive">{cnpjError}</p>}
                </div>
                <div className="space-y-2">
                  <Label>WhatsApp</Label>
                  <Input value={form.whatsapp} onChange={(e) => updateField("whatsapp", maskPhone(e.target.value))} placeholder="(31) 99999-5858" />
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label>E-mail</Label>
                  <Input type="email" value={form.email} onChange={(e) => updateField("email", e.target.value)} />
                </div>
              </div>
              <h3 className="pt-2 text-sm font-semibold text-foreground">Endereço</h3>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>CEP</Label>
                  <Input
                    value={form.cep}
                    onChange={(e) => {
                      const masked = maskCEP(e.target.value);
                      updateField("cep", masked);
                      lookupCep(masked);
                    }}
                    placeholder="00000-000"
                  />
                </div>
                <div />
                <div className="space-y-2 sm:col-span-2">
                  <Label>Rua / Avenida</Label>
                  <Input value={form.rua} onChange={(e) => updateField("rua", e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Número</Label>
                  <Input value={form.numero} onChange={(e) => updateField("numero", e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Complemento</Label>
                  <Input value={form.complemento} onChange={(e) => updateField("complemento", e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Bairro</Label>
                  <Input value={form.bairro} onChange={(e) => updateField("bairro", e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Cidade</Label>
                  <Input value={form.cidade} onChange={(e) => updateField("cidade", e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>UF</Label>
                  <Input value={form.estado} onChange={(e) => updateField("estado", e.target.value)} maxLength={2} />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
                <Button type="submit" disabled={isCreating}>{editingId ? "Salvar" : "Criar Empresa"}</Button>
              </div>
            </form>
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
