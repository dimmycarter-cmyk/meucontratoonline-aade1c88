import { useState, useCallback } from "react";
import { Plus, Search, MoreHorizontal, Mail, Trash2, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useContacts } from "@/hooks/useContacts";
import { Skeleton } from "@/components/ui/skeleton";
import { maskCPF, maskPhone, maskCEP } from "@/lib/masks";
import { useCepLookup } from "@/hooks/useCepLookup";
import { InviteUserDialog } from "@/components/InviteUserDialog";
import { PendingInvites } from "@/components/PendingInvites";
import { useInvitations } from "@/hooks/useInvitations";

const emptyContact = {
  nome: "", cpf: "", rg: "", orgao_expedidor: "", profissao: "",
  whatsapp: "", email: "", genero: "", nacionalidade: "Brasileiro(a)",
  estado_civil: "", cep: "", rua: "", numero: "", complemento: "",
  bairro: "", cidade: "", estado: "",
};

const Contatos = () => {
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState(emptyContact);
  const [editingId, setEditingId] = useState<string | null>(null);
  const { contacts, isLoading, createContact, updateContact, deleteContact, isCreating } = useContacts();
  const { isAdmin } = useInvitations();

  const filtered = contacts.filter((c) =>
    c.nome.toLowerCase().includes(search.toLowerCase()) ||
    (c.cpf && c.cpf.includes(search)) ||
    (c.email && c.email.toLowerCase().includes(search.toLowerCase()))
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
      await updateContact({ id: editingId, ...form });
    } else {
      await createContact(form);
    }
    setDialogOpen(false);
    setForm(emptyContact);
    setEditingId(null);
  };

  const handleEdit = (contact: any) => {
    setForm({
      nome: contact.nome || "", cpf: contact.cpf || "", rg: contact.rg || "",
      orgao_expedidor: contact.orgao_expedidor || "", profissao: contact.profissao || "",
      whatsapp: contact.whatsapp || "", email: contact.email || "",
      genero: contact.genero || "", nacionalidade: contact.nacionalidade || "",
      estado_civil: contact.estado_civil || "", cep: contact.cep || "",
      rua: contact.rua || "", numero: contact.numero || "",
      complemento: contact.complemento || "", bairro: contact.bairro || "",
      cidade: contact.cidade || "", estado: contact.estado || "",
    });
    setEditingId(contact.id);
    setDialogOpen(true);
  };

  const handleNew = () => {
    setForm(emptyContact);
    setEditingId(null);
    setDialogOpen(true);
  };

  return (
    <div className="p-6 lg:p-8">
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">Usuários</h1>
          <p className="text-sm text-muted-foreground">{contacts.length} usuários cadastrados</p>
        </div>
        <div className="flex gap-2">
          {isAdmin && <InviteUserDialog />}
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={handleNew}><Plus className="mr-2 h-4 w-4" /> Novo Contato</Button>
            </DialogTrigger>
          <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
            <DialogHeader>
              <DialogTitle>{editingId ? "Editar Contato" : "Novo Contato"}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2 sm:col-span-2">
                  <Label>Nome completo *</Label>
                  <Input value={form.nome} onChange={(e) => updateField("nome", e.target.value)} required />
                </div>
                <div className="space-y-2">
                  <Label>CPF</Label>
                  <Input value={form.cpf} onChange={(e) => updateField("cpf", maskCPF(e.target.value))} placeholder="000.000.000-00" />
                </div>
                <div className="space-y-2">
                  <Label>RG</Label>
                  <Input value={form.rg} onChange={(e) => updateField("rg", e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Órgão Expedidor</Label>
                  <Input value={form.orgao_expedidor} onChange={(e) => updateField("orgao_expedidor", e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Profissão</Label>
                  <Input value={form.profissao} onChange={(e) => updateField("profissao", e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>WhatsApp</Label>
                  <Input value={form.whatsapp} onChange={(e) => updateField("whatsapp", maskPhone(e.target.value))} placeholder="(31) 99999-5858" />
                </div>
                <div className="space-y-2">
                  <Label>E-mail</Label>
                  <Input type="email" value={form.email} onChange={(e) => updateField("email", e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Gênero</Label>
                  <Input value={form.genero} onChange={(e) => updateField("genero", e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Nacionalidade</Label>
                  <Input value={form.nacionalidade} onChange={(e) => updateField("nacionalidade", e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Estado Civil</Label>
                  <Input value={form.estado_civil} onChange={(e) => updateField("estado_civil", e.target.value)} />
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
                <Button type="submit" disabled={isCreating}>{editingId ? "Salvar" : "Criar Contato"}</Button>
              </div>
            </form>
          </DialogContent>
          </Dialog>
        </div>
      </div>

      <Card className="shadow-card">
        <CardHeader className="pb-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input placeholder="Buscar por nome, CPF ou e-mail..." className="pl-10" value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => <Skeleton key={i} className="h-14 w-full" />)}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border text-left">
                    <th className="pb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Nome</th>
                    <th className="pb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">CPF</th>
                    <th className="hidden pb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground md:table-cell">Contato</th>
                    <th className="hidden pb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground lg:table-cell">Cidade</th>
                    <th className="pb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filtered.map((contato) => (
                    <tr key={contato.id} className="transition-colors hover:bg-muted/50">
                      <td className="py-3">
                        <p className="text-sm font-medium text-foreground">{contato.nome}</p>
                      </td>
                      <td className="py-3 text-sm text-muted-foreground">{contato.cpf || "—"}</td>
                      <td className="hidden py-3 md:table-cell">
                        <div className="flex items-center gap-3 text-xs text-muted-foreground">
                          {contato.email && <span className="flex items-center gap-1"><Mail className="h-3 w-3" />{contato.email}</span>}
                        </div>
                      </td>
                      <td className="hidden py-3 text-sm text-muted-foreground lg:table-cell">
                        {contato.cidade && contato.estado ? `${contato.cidade}/${contato.estado}` : "—"}
                      </td>
                      <td className="py-3 text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8"><MoreHorizontal className="h-4 w-4" /></Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleEdit(contato)}>
                              <Pencil className="mr-2 h-4 w-4" /> Editar
                            </DropdownMenuItem>
                            <DropdownMenuItem className="text-destructive" onClick={() => deleteContact(contato.id)}>
                              <Trash2 className="mr-2 h-4 w-4" /> Excluir
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {!isLoading && filtered.length === 0 && (
            <div className="py-12 text-center text-sm text-muted-foreground">Nenhum contato encontrado.</div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Contatos;
