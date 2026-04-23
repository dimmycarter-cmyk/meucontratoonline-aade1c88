import { useState } from "react";
import { extractVariables } from "@/lib/placeholder";
import { FileText, Plus, Trash2, Pencil, MoreHorizontal, Copy, Globe, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { useTemplates } from "@/hooks/useTemplates";
import { useAuth } from "@/contexts/AuthContext";
import RichTextEditor from "@/components/RichTextEditor";
import ImportDocxDialog from "@/components/templates/ImportDocxDialog";

const TIPOS = ["Compra e Venda", "Locação", "Proposta", "Intermediação", "Outro"];

const Modelos = () => {
  const { templates, isLoading, createTemplate, updateTemplate, deleteTemplate, isCreating, isSaving } = useTemplates();
  const { isSuperAdmin } = useAuth();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ nome: "", descricao: "", tipo: "Compra e Venda" });
  const [editorContent, setEditorContent] = useState("");
  const [editorTemplate, setEditorTemplate] = useState<any>(null);

  const handleNew = () => {
    setForm({ nome: "", descricao: "", tipo: "Compra e Venda" });
    setEditingId(null);
    setDialogOpen(true);
  };

  const handleCreateOrUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    const nome = form.nome.startsWith("Modelo - ") ? form.nome : `Modelo - ${form.nome}`;
    if (editingId) {
      await updateTemplate({ id: editingId, ...form, nome });
    } else {
      await createTemplate({ ...form, nome });
    }
    setDialogOpen(false);
  };

  const handleOpenEditor = (template: any) => {
    setEditorTemplate(template);
    setEditorContent(template.conteudo || "");
    setEditorOpen(true);
  };

  const handleSaveContent = async () => {
    if (!editorTemplate) return;
    const variaveis = extractVariables(editorContent);
    await updateTemplate({ id: editorTemplate.id, conteudo: editorContent, variaveis });
    setEditorOpen(false);
  };

  const handleEdit = (template: any) => {
    setForm({ nome: template.nome, descricao: template.descricao || "", tipo: template.tipo });
    setEditingId(template.id);
    setDialogOpen(true);
  };

  const handleDuplicate = async (template: any) => {
    await createTemplate({
      nome: `${template.nome} (Cópia)`,
      descricao: template.descricao,
      tipo: template.tipo,
      conteudo: template.conteudo,
      variaveis: template.variaveis,
    });
  };

  const handlePublish = async (template: any) => {
    await updateTemplate({ id: template.id, status: template.status === "ativo" ? "rascunho" : "ativo" });
  };

  const canEditTemplate = (template: any) => {
    if (template.is_global && !isSuperAdmin) return false;
    return true;
  };

  if (editorOpen && editorTemplate) {
    return (
      <div className="flex h-full flex-col">
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <div>
            <h1 className="font-display text-lg font-bold text-foreground">{editorTemplate.nome}</h1>
            <p className="text-xs text-muted-foreground">Editor de modelo — use o botão "Inserir Variável" para adicionar campos dinâmicos</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setEditorOpen(false)}>Voltar</Button>
            <Button onClick={handleSaveContent} disabled={isSaving || !canEditTemplate(editorTemplate)}>
              {isSaving ? "Salvando..." : "Salvar Modelo"}
            </Button>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-6">
          <RichTextEditor content={editorContent} onChange={setEditorContent} />
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8">
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">Modelos de Contrato</h1>
          <p className="text-sm text-muted-foreground">{templates.length} modelos cadastrados</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setImportDialogOpen(true)}>
            <Upload className="mr-2 h-4 w-4" /> Importar .docx
          </Button>
          <Button onClick={handleNew}><Plus className="mr-2 h-4 w-4" /> Novo Modelo</Button>
        </div>
      </div>

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-48 w-full rounded-lg" />)}
        </div>
      ) : templates.length === 0 ? (
        <Card className="shadow-card">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-primary">
              <FileText className="h-8 w-8" />
            </div>
            <h3 className="mb-2 font-display text-lg font-semibold text-foreground">Nenhum modelo ainda</h3>
            <p className="mb-6 text-sm text-muted-foreground">Crie seu primeiro modelo de contrato com variáveis dinâmicas</p>
            <Button onClick={handleNew}><Plus className="mr-2 h-4 w-4" /> Criar Modelo</Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {templates.map((template) => {
            const varCount = Array.isArray(template.variaveis) ? template.variaveis.length : 0;
            const isGlobal = (template as any).is_global;
            const editable = canEditTemplate(template);
            return (
              <Card key={template.id} className="shadow-card transition-all hover:shadow-elevated">
                <CardContent className="p-5">
                  <div className="mb-3 flex items-start justify-between">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <FileText className="h-5 w-5" />
                    </div>
                    <div className="flex items-center gap-2">
                      {isGlobal && (
                        <Badge variant="outline" className="gap-1 text-xs">
                          <Globe className="h-3 w-3" /> Global
                        </Badge>
                      )}
                      <Badge variant={template.status === "ativo" ? "default" : "secondary"} className="text-xs">
                        {template.status === "ativo" ? "Ativo" : "Rascunho"}
                      </Badge>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8"><MoreHorizontal className="h-4 w-4" /></Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {editable && (
                            <DropdownMenuItem onClick={() => handleEdit(template)}>
                              <Pencil className="mr-2 h-4 w-4" /> Editar Info
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem onClick={() => handleDuplicate(template)}>
                            <Copy className="mr-2 h-4 w-4" /> Duplicar
                          </DropdownMenuItem>
                          {editable && (
                            <DropdownMenuItem onClick={() => handlePublish(template)}>
                              <FileText className="mr-2 h-4 w-4" /> {template.status === "ativo" ? "Despublicar" : "Publicar"}
                            </DropdownMenuItem>
                          )}
                          {editable && (
                            <DropdownMenuItem className="text-destructive" onClick={() => deleteTemplate(template.id)}>
                              <Trash2 className="mr-2 h-4 w-4" /> Excluir
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                  <h3 className="mb-1 font-display text-sm font-semibold text-foreground">{template.nome}</h3>
                  <p className="mb-3 text-xs text-muted-foreground">{template.tipo}</p>
                  {template.descricao && (
                    <p className="mb-3 line-clamp-2 text-xs text-muted-foreground">{template.descricao}</p>
                  )}
                  <div className="mb-4 flex gap-2">
                    <Badge variant="secondary" className="text-xs">{varCount} variáveis</Badge>
                  </div>
                  <Button variant="outline" size="sm" className="w-full" onClick={() => handleOpenEditor(template)} disabled={!editable}>
                    <Pencil className="mr-1 h-3 w-3" /> {editable ? "Editar Conteúdo" : "Visualizar"}
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingId ? "Editar Modelo" : "Novo Modelo"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreateOrUpdate} className="space-y-4">
            <div className="space-y-2">
              <Label>Nome do Modelo *</Label>
              <Input value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} required placeholder="Ex: Contrato Compra e Venda" />
              <p className="text-xs text-muted-foreground">O prefixo "Modelo - " será adicionado automaticamente</p>
            </div>
            <div className="space-y-2">
              <Label>Tipo</Label>
              <Select value={form.tipo} onValueChange={(v) => setForm({ ...form, tipo: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {TIPOS.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Descrição</Label>
              <Textarea value={form.descricao} onChange={(e) => setForm({ ...form, descricao: e.target.value })} placeholder="Breve descrição do modelo..." rows={3} />
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
              <Button type="submit" disabled={isCreating}>{editingId ? "Salvar" : "Criar Modelo"}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <ImportDocxDialog open={importDialogOpen} onOpenChange={setImportDialogOpen} />
    </div>
  );
};

export default Modelos;
