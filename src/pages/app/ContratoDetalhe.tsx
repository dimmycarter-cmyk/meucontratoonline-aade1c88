import { useState, useRef, useEffect, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Printer, Edit3, Save, FileText, File, Download, Pencil, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useContracts } from "@/hooks/useContracts";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import RichTextEditor from "@/components/RichTextEditor";
import ContractPrintView from "@/components/ContractPrintView";
import ContractDataDisplay from "@/components/contract/ContractDataDisplay";
import UnresolvedPlaceholdersDialog, { parseUnresolvedStrings } from "@/components/contract/UnresolvedPlaceholdersDialog";
import { getUnresolvedPlaceholders } from "@/lib/placeholder";
import { format } from "date-fns";
import { useQuery } from "@tanstack/react-query";

const statusOptions = ["rascunho", "em preenchimento", "aguardando revisão", "pronto", "exportado", "cancelado"];
const statusColors: Record<string, string> = {
  rascunho: "bg-muted text-muted-foreground",
  "em preenchimento": "bg-info/10 text-info",
  "aguardando revisão": "bg-warning/10 text-warning",
  pronto: "bg-success/10 text-success",
  exportado: "bg-primary/10 text-primary",
  cancelado: "bg-destructive/10 text-destructive",
};

const ContratoDetalhe = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { profile } = useAuth();
  const { updateContract, isSaving } = useContracts();
  const printRef = useRef<HTMLDivElement>(null);
  const [editing, setEditing] = useState(false);
  const [editContent, setEditContent] = useState("");
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleValue, setTitleValue] = useState("");
  const [unresolvedDialogOpen, setUnresolvedDialogOpen] = useState(false);

  // Fetch single contract
  const { data: contract, isLoading, refetch } = useQuery({
    queryKey: ["contract", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("contracts").select("*").eq("id", id!).single();
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  // Fetch documents
  const { data: documents = [] } = useQuery({
    queryKey: ["contract-documents", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("contract_documents").select("*").eq("contract_id", id!);
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  // Fetch related contacts
  const { data: comprador } = useQuery({
    queryKey: ["contact", contract?.comprador_id],
    queryFn: async () => {
      const { data } = await supabase.from("contacts").select("nome, cpf").eq("id", contract!.comprador_id!).single();
      return data;
    },
    enabled: !!contract?.comprador_id,
  });

  const { data: vendedor } = useQuery({
    queryKey: ["contact", contract?.vendedor_id],
    queryFn: async () => {
      const { data } = await supabase.from("contacts").select("nome, cpf").eq("id", contract!.vendedor_id!).single();
      return data;
    },
    enabled: !!contract?.vendedor_id,
  });

  // Fetch participants (for AI flow contracts without comprador_id/vendedor_id)
  const { data: contractParticipants = [] } = useQuery({
    queryKey: ["contract-participants", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("contract_participants").select("*").eq("contract_id", id!);
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  const participantComprador = contractParticipants.find((p: any) => p.role === "comprador");
  const participantVendedor = contractParticipants.find((p: any) => p.role === "vendedor");

  useEffect(() => {
    if (contract) {
      setEditContent(contract.conteudo_final);
      setTitleValue(contract.nome);
    }
  }, [contract]);

  const handleSaveTitle = async () => {
    if (!id || titleValue.trim() === contract?.nome) {
      setEditingTitle(false);
      return;
    }
    await updateContract({ id, nome: titleValue.trim() } as any);
    setEditingTitle(false);
    refetch();
  };

  const handleSave = async () => {
    if (!id) return;
    await updateContract({ id, conteudo_final: editContent });
    setEditing(false);
    refetch();
  };

  const handleStatusChange = async (status: string) => {
    if (!id) return;
    await updateContract({ id, status } as any);
    refetch();
  };

  const handleDownloadDoc = async (filePath: string, fileName: string) => {
    const { data } = await supabase.storage.from("contract-documents").download(filePath);
    if (data) {
      const url = URL.createObjectURL(data);
      const a = document.createElement("a");
      a.href = url;
      a.download = fileName;
      a.click();
      URL.revokeObjectURL(url);
    }
  };

  const formatCurrency = (value: number | null) => {
    if (!value) return "—";
    return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
  };

  // Lote D: live unresolved placeholders no contrato salvo
  const liveUnresolved = useMemo(() => {
    const text = editing ? editContent : (contract?.conteudo_final ?? "");
    const dados = (contract?.dados ?? {}) as Record<string, string>;
    if (!text) return [];
    return parseUnresolvedStrings(getUnresolvedPlaceholders(text, dados));
  }, [editing, editContent, contract?.conteudo_final, contract?.dados]);

  const handlePrintClick = () => {
    if (liveUnresolved.length > 0) {
      setUnresolvedDialogOpen(true);
      return;
    }
    window.print();
  };

  if (isLoading) return <div className="p-8 text-center text-sm text-muted-foreground">Carregando...</div>;
  if (!contract) return <div className="p-8 text-center text-sm text-muted-foreground">Contrato não encontrado.</div>;

  return (
    <div className="p-6 lg:p-8">
      <div className="mb-6 flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate("/app/contratos")}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          {editingTitle ? (
            <Input
              value={titleValue}
              onChange={(e) => setTitleValue(e.target.value)}
              onBlur={handleSaveTitle}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSaveTitle();
                if (e.key === "Escape") { setTitleValue(contract.nome); setEditingTitle(false); }
              }}
              autoFocus
              className="font-display text-2xl font-bold h-auto py-0 px-1"
            />
          ) : (
            <h1
              className="font-display text-2xl font-bold text-foreground cursor-pointer group flex items-center gap-2"
              onClick={() => setEditingTitle(true)}
            >
              {contract.nome || "Sem nome"}
              <Pencil className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
            </h1>
          )}
          <p className="text-sm text-muted-foreground">Criado em {format(new Date(contract.created_at), "dd/MM/yyyy HH:mm")}</p>
        </div>
        <div className="flex gap-2">
          {editing ? (
            <Button onClick={handleSave} disabled={isSaving} className="gap-2">
              <Save className="h-4 w-4" /> Salvar
            </Button>
          ) : (
            <Button variant="outline" onClick={() => setEditing(true)} className="gap-2">
              <Edit3 className="h-4 w-4" /> Editar
            </Button>
          )}
          <Button variant="outline" onClick={() => window.print()} className="gap-2">
            <Printer className="h-4 w-4" /> Imprimir
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Sidebar info */}
        <div className="space-y-4">
          <Card className="shadow-card">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Informações</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div>
                <span className="text-muted-foreground">Status</span>
                <Select value={contract.status} onValueChange={handleStatusChange}>
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {statusOptions.map((s) => (
                      <SelectItem key={s} value={s}>{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <span className="text-muted-foreground">Comprador</span>
                <p className="font-medium text-foreground">{comprador?.nome || participantComprador?.full_name || "—"}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Vendedor</span>
                <p className="font-medium text-foreground">{vendedor?.nome || participantVendedor?.full_name || "—"}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Valor Total</span>
                <p className="font-medium text-foreground">{formatCurrency(contract.valor_total)}</p>
              </div>
            </CardContent>
          </Card>

          {/* Participant & contract data display */}
          <ContractDataDisplay dados={contract.dados as Record<string, any>} participants={contractParticipants} />

          {/* Documents */}
          <Card className="shadow-card">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-sm"><File className="h-4 w-4" /> Documentos</CardTitle>
            </CardHeader>
            <CardContent>
              {documents.length === 0 ? (
                <p className="text-xs text-muted-foreground">Nenhum documento anexado.</p>
              ) : (
                <div className="space-y-2">
                  {documents.map((doc: any) => (
                    <button
                      key={doc.id}
                      onClick={() => handleDownloadDoc(doc.file_path, doc.file_name)}
                      className="flex w-full items-center gap-2 rounded-lg border border-border p-2 text-left text-sm transition-colors hover:bg-muted"
                    >
                      <Download className="h-3.5 w-3.5 text-primary" />
                      <span className="flex-1 truncate text-foreground">{doc.file_name}</span>
                    </button>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Content */}
        <div className="lg:col-span-2">
          <Card className="shadow-card">
            <CardContent className="pt-6">
              {editing ? (
                <RichTextEditor content={editContent} onChange={setEditContent} />
              ) : (
                <div className="prose prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: contract.conteudo_final || "<p>Sem conteúdo</p>" }} />
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Print view */}
      <div className="hidden print:block">
        <ContractPrintView ref={printRef} conteudo={contract.conteudo_final} nome={contract.nome} clausulas={[]} />
      </div>
    </div>
  );
};

export default ContratoDetalhe;
