import { useState } from "react";
import { Plus, Search, ScrollText, Trash2, Pencil, MoreHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { useClauses } from "@/hooks/useClauses";
import RichTextEditor from "@/components/RichTextEditor";

const CATEGORIAS = ["Geral", "Financeiro", "Financiamento", "Regularização", "Documental", "Rescisão", "Obrigações"];

const emptyClause = { titulo: "", categoria: "Geral", conteudo: "" };

const Clausulas = () => {
  const { clauses, isLoading, createClause, updateClause, deleteClause, isCreating } = useClauses();
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyClause);

  const filtered = clauses.filter((c) => c.titulo.toLowerCase().includes(search.toLowerCase()));

  const handleNew = () => {
    setForm(emptyClause);
    setEditingId(null);
    setDialogOpen(true);
  };

  const handleEdit = (clause: any) => {
    setForm({ titulo: clause.titulo, categoria: clause.categoria, conteudo: clause.conteudo });
    setEditingId(clause.id);
    setDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editingId) {
      await updateClause({ id: editingId, ...form });
    } else {
      await createClause(form);
    }
    setDialogOpen(false);
    setForm(emptyClause);
    setEditingId(null);
  };

  const toggleClause = async (clause: any) => {
    await updateClause({ id: clause.id, ativa: !clause.ativa });
  };

  return (
    <div className="p-6 lg:p-8">
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">Cláusulas Específicas</h1>
          <p className="text-sm text-muted-foreground">{clauses.filter((c) => c.ativa).length} cláusulas ativas</p>
        </div>
        <Button onClick={handleNew}><Plus className="mr-2 h-4 w-4" /> Nova Cláusula</Button>
      </div>

      <div className="mb-6">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Buscar cláusulas..." className="pl-10" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-16 w-full rounded-lg" />)}
        </div>
      ) : filtered.length === 0 && clauses.length === 0 ? (
        <Card className="shadow-card">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-primary">
              <ScrollText className="h-8 w-8" />
            </div>
            <h3 className="mb-2 font-display text-lg font-semibold text-foreground">Nenhuma cláusula ainda</h3>
            <p className="mb-6 text-sm text-muted-foreground">Crie cláusulas reutilizáveis para seus modelos de contrato</p>
            <Button onClick={handleNew}><Plus className="mr-2 h-4 w-4" /> Criar Cláusula</Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filtered.map((clausula) => (
            <Card key={clausula.id} className="shadow-card">
              <CardContent className="flex items-center gap-4 p-4">
                <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <ScrollText className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-semibold text-foreground">{clausula.titulo}</h3>
                    <Badge variant="secondary" className="text-xs">{clausula.categoria}</Badge>
                  </div>
                  {clausula.conteudo && (
                    <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground" 
                       dangerouslySetInnerHTML={{ __html: clausula.conteudo.replace(/<[^>]*>/g, '').substring(0, 120) }} />
                  )}
                </div>
                <Switch checked={clausula.ativa} onCheckedChange={() => toggleClause(clausula)} />
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8"><MoreHorizontal className="h-4 w-4" /></Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => handleEdit(clausula)}>
                      <Pencil className="mr-2 h-4 w-4" /> Editar
                    </DropdownMenuItem>
                    <DropdownMenuItem className="text-destructive" onClick={() => deleteClause(clausula.id)}>
                      <Trash2 className="mr-2 h-4 w-4" /> Excluir
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </CardContent>
            </Card>
          ))}
          {filtered.length === 0 && (
            <EmptyState title="Nenhuma cláusula encontrada." />
          )}
        </div>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingId ? "Editar Cláusula" : "Nova Cláusula"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2 sm:col-span-2">
                <Label>Título *</Label>
                <Input value={form.titulo} onChange={(e) => setForm({ ...form, titulo: e.target.value })} required placeholder="Ex: Quitação e Liberação de Ônus" />
              </div>
              <div className="space-y-2">
                <Label>Categoria</Label>
                <Select value={form.categoria} onValueChange={(v) => setForm({ ...form, categoria: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CATEGORIAS.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Conteúdo da Cláusula</Label>
              <RichTextEditor
                content={form.conteudo}
                onChange={(html) => setForm({ ...form, conteudo: html })}
                placeholder="Escreva o texto da cláusula... Use variáveis como {{comprador_nome}} para campos dinâmicos."
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
              <Button type="submit" disabled={isCreating}>{editingId ? "Salvar" : "Criar Cláusula"}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Clausulas;
