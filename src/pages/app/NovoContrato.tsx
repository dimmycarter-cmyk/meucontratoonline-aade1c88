import { useState, useRef, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { FileText, ChevronRight, ChevronLeft, CheckCircle2, Search, User, Building2, ClipboardList, Database, BookOpen, Edit3, Check, Printer, Upload, X, File } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { useTemplates, ContractTemplate } from "@/hooks/useTemplates";
import { useContacts, Contact } from "@/hooks/useContacts";
import { useCompanies, Company } from "@/hooks/useCompanies";
import { useClauses, Clause } from "@/hooks/useClauses";
import { useContracts } from "@/hooks/useContracts";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { TEMPLATE_VARIABLES, getVariablesByCategory } from "@/lib/template-variables";
import RichTextEditor from "@/components/RichTextEditor";
import ContractPrintView from "@/components/ContractPrintView";
import { useToast } from "@/hooks/use-toast";

type UploadedFile = {
  name: string;
  path: string;
  size: number;
  mime_type: string;
};

const steps = [
  { id: 1, label: "Modelo", icon: FileText },
  { id: 2, label: "Partes", icon: User },
  { id: 3, label: "Documentos", icon: ClipboardList },
  { id: 4, label: "Dados", icon: Database },
  { id: 5, label: "Cláusulas", icon: BookOpen },
  { id: 6, label: "Editor", icon: Edit3 },
  { id: 7, label: "Finalizar", icon: Check },
];

const documentChecklist = [
  "RG e CPF do Comprador",
  "RG e CPF do Vendedor",
  "Certidão de Matrícula Atualizada",
  "Certidão Negativa de Débitos (IPTU)",
  "Certidão de Ônus Reais",
  "Comprovante de Estado Civil",
  "Comprovante de Residência",
  "Certidão Negativa de Protestos",
];

const NovoContrato = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { templates, isLoading: loadingTemplates } = useTemplates();
  const { contacts, isLoading: loadingContacts } = useContacts();
  const { companies, isLoading: loadingCompanies } = useCompanies();
  const { clauses, isLoading: loadingClauses } = useClauses();
  const { createContract, isCreating } = useContracts();
  const printRef = useRef<HTMLDivElement>(null);

  const [currentStep, setCurrentStep] = useState(1);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
  const [compradorId, setCompradorId] = useState<string | null>(null);
  const [vendedorId, setVendedorId] = useState<string | null>(null);
  const [empresaId, setEmpresaId] = useState<string | null>(null);
  const [dados, setDados] = useState<Record<string, string>>({});
  const [selectedClauseIds, setSelectedClauseIds] = useState<string[]>([]);
  const [conteudoFinal, setConteudoFinal] = useState("");
  const [nomeContrato, setNomeContrato] = useState("");
  const [searchContacts, setSearchContacts] = useState("");
  const [searchCompanies, setSearchCompanies] = useState("");
  const [checkedDocs, setCheckedDocs] = useState<string[]>([]);

  const selectedTemplate = templates.find((t) => t.id === selectedTemplateId);
  const comprador = contacts.find((c) => c.id === compradorId);
  const vendedor = contacts.find((c) => c.id === vendedorId);
  const empresa = companies.find((c) => c.id === empresaId);
  const selectedClauses = clauses.filter((c) => selectedClauseIds.includes(c.id));

  const activeTemplates = templates.filter((t) => t.status === "publicado");

  const filteredContacts = contacts.filter((c) =>
    c.nome.toLowerCase().includes(searchContacts.toLowerCase())
  );
  const filteredCompanies = companies.filter((c) =>
    c.nome_fantasia.toLowerCase().includes(searchCompanies.toLowerCase())
  );

  // Auto-fill dados from selected contacts/company
  const autoFillDados = useCallback(() => {
    const filled: Record<string, string> = { ...dados };
    if (comprador) {
      if (comprador.nome) filled.comprador_nome = comprador.nome;
      if (comprador.cpf) filled.comprador_cpf = comprador.cpf;
      if (comprador.rg) filled.comprador_rg = comprador.rg;
      if (comprador.orgao_expedidor) filled.comprador_orgao_expedidor = comprador.orgao_expedidor;
      if (comprador.profissao) filled.comprador_profissao = comprador.profissao;
      if (comprador.nacionalidade) filled.comprador_nacionalidade = comprador.nacionalidade;
      if (comprador.estado_civil) filled.comprador_estado_civil = comprador.estado_civil;
      if (comprador.email) filled.comprador_email = comprador.email;
      if (comprador.whatsapp) filled.comprador_whatsapp = comprador.whatsapp;
      const endComprador = [comprador.rua, comprador.numero, comprador.complemento, comprador.bairro, comprador.cidade, comprador.estado, comprador.cep].filter(Boolean).join(", ");
      if (endComprador) filled.comprador_endereco = endComprador;
    }
    if (vendedor) {
      if (vendedor.nome) filled.vendedor_nome = vendedor.nome;
      if (vendedor.cpf) filled.vendedor_cpf = vendedor.cpf;
      if (vendedor.rg) filled.vendedor_rg = vendedor.rg;
      if (vendedor.orgao_expedidor) filled.vendedor_orgao_expedidor = vendedor.orgao_expedidor;
      if (vendedor.profissao) filled.vendedor_profissao = vendedor.profissao;
      if (vendedor.nacionalidade) filled.vendedor_nacionalidade = vendedor.nacionalidade;
      if (vendedor.estado_civil) filled.vendedor_estado_civil = vendedor.estado_civil;
      if (vendedor.email) filled.vendedor_email = vendedor.email;
      if (vendedor.whatsapp) filled.vendedor_whatsapp = vendedor.whatsapp;
      const endVendedor = [vendedor.rua, vendedor.numero, vendedor.complemento, vendedor.bairro, vendedor.cidade, vendedor.estado, vendedor.cep].filter(Boolean).join(", ");
      if (endVendedor) filled.vendedor_endereco = endVendedor;
    }
    if (empresa) {
      if (empresa.nome_fantasia) filled.empresa_nome = empresa.nome_fantasia;
      if (empresa.cnpj) filled.empresa_cnpj = empresa.cnpj;
      const endEmpresa = [empresa.rua, empresa.numero, empresa.complemento, empresa.bairro, empresa.cidade, empresa.estado, empresa.cep].filter(Boolean).join(", ");
      if (endEmpresa) filled.empresa_endereco = endEmpresa;
    }
    setDados(filled);
  }, [comprador, vendedor, empresa]);

  // Build final content from template + variables + clauses
  const buildFinalContent = useCallback(() => {
    let content = selectedTemplate?.conteudo || "";
    // Replace variables
    Object.entries(dados).forEach(([key, value]) => {
      const regex = new RegExp(`\\{\\{${key}\\}\\}`, "g");
      content = content.replace(regex, value || `{{${key}}}`);
    });
    // Also replace any HTML-encoded variable spans
    TEMPLATE_VARIABLES.forEach((v) => {
      const regex = new RegExp(`\\{\\{${v.key}\\}\\}`, "g");
      if (!dados[v.key]) {
        content = content.replace(regex, `{{${v.key}}}`);
      }
    });
    setConteudoFinal(content);
  }, [selectedTemplate, dados]);

  const handleNext = () => {
    if (currentStep === 2) {
      autoFillDados();
    }
    if (currentStep === 5) {
      buildFinalContent();
    }
    setCurrentStep((s) => Math.min(s + 1, 7));
  };

  const handleBack = () => setCurrentStep((s) => Math.max(s - 1, 1));

  const canProceed = () => {
    switch (currentStep) {
      case 1: return !!selectedTemplateId;
      case 2: return !!compradorId && !!vendedorId;
      case 3: return true;
      case 4: return true;
      case 5: return true;
      case 6: return true;
      default: return true;
    }
  };

  const handleSave = async () => {
    try {
      // Build clause content for final doc
      let fullContent = conteudoFinal;
      if (selectedClauses.length > 0) {
        fullContent += "\n\n<h2>CLÁUSULAS</h2>\n";
        selectedClauses.forEach((c, i) => {
          fullContent += `\n<h3>CLÁUSULA ${i + 1}ª — ${c.titulo.toUpperCase()}</h3>\n${c.conteudo}\n`;
        });
      }

      await createContract({
        nome: nomeContrato || `Contrato - ${comprador?.nome || ""}`,
        template_id: selectedTemplateId,
        comprador_id: compradorId,
        vendedor_id: vendedorId,
        empresa_id: empresaId,
        dados: dados as any,
        conteudo_final: fullContent,
        clausulas_ids: selectedClauseIds as any,
        status: "pronto",
        valor_total: dados.valor_total ? parseFloat(dados.valor_total.replace(/[^\d.,]/g, "").replace(",", ".")) : null,
        valor_sinal: dados.valor_sinal ? parseFloat(dados.valor_sinal.replace(/[^\d.,]/g, "").replace(",", ".")) : null,
        valor_financiamento: dados.valor_financiamento ? parseFloat(dados.valor_financiamento.replace(/[^\d.,]/g, "").replace(",", ".")) : null,
      });
      navigate("/app/contratos");
    } catch (e) {
      // error handled by hook
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const grouped = getVariablesByCategory();

  // Template variables from selected template
  const templateVars = useMemo(() => {
    if (!selectedTemplate?.variaveis) return TEMPLATE_VARIABLES;
    const varKeys = selectedTemplate.variaveis as string[];
    if (!varKeys.length) return TEMPLATE_VARIABLES;
    return TEMPLATE_VARIABLES.filter((v) => varKeys.includes(v.key));
  }, [selectedTemplate]);

  const templateVarsGrouped = useMemo(() => {
    const g: Record<string, typeof TEMPLATE_VARIABLES> = {};
    templateVars.forEach((v) => {
      if (!g[v.category]) g[v.category] = [];
      g[v.category].push(v);
    });
    return g;
  }, [templateVars]);

  return (
    <div className="p-6 lg:p-8">
      <div className="mb-8">
        <h1 className="font-display text-2xl font-bold text-foreground">Novo Contrato</h1>
        <p className="text-sm text-muted-foreground">Siga as etapas para gerar seu contrato</p>
      </div>

      {/* Steps */}
      <div className="mb-8 flex items-center gap-2 overflow-x-auto pb-2">
        {steps.map((step, i) => (
          <div key={step.id} className="flex items-center">
            <div
              className={`flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                currentStep === step.id
                  ? "bg-primary text-primary-foreground"
                  : currentStep > step.id
                  ? "bg-success/10 text-success"
                  : "bg-muted text-muted-foreground"
              }`}
            >
              {currentStep > step.id ? (
                <CheckCircle2 className="h-3.5 w-3.5" />
              ) : (
                <step.icon className="h-3.5 w-3.5" />
              )}
              <span className="hidden sm:inline">{step.label}</span>
            </div>
            {i < steps.length - 1 && <ChevronRight className="mx-1 h-4 w-4 text-muted-foreground" />}
          </div>
        ))}
      </div>

      {/* Step 1: Template Selection */}
      {currentStep === 1 && (
        <div className="space-y-4">
          <h2 className="font-display text-lg font-semibold text-foreground">Escolha o modelo de contrato</h2>
          {loadingTemplates ? (
            <p className="text-sm text-muted-foreground">Carregando modelos...</p>
          ) : activeTemplates.length === 0 ? (
            <Card className="shadow-card">
              <CardContent className="py-12 text-center">
                <p className="text-sm text-muted-foreground">Nenhum modelo publicado. Crie e publique um modelo primeiro.</p>
                <Button variant="outline" className="mt-4" onClick={() => navigate("/app/modelos")}>
                  Ir para Modelos
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {activeTemplates.map((t) => (
                <Card
                  key={t.id}
                  className={`cursor-pointer shadow-card transition-all hover:shadow-elevated ${
                    selectedTemplateId === t.id ? "ring-2 ring-primary" : ""
                  }`}
                  onClick={() => setSelectedTemplateId(t.id)}
                >
                  <CardHeader>
                    <div className="flex items-start gap-3">
                      <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                        <FileText className="h-5 w-5" />
                      </div>
                      <div>
                        <CardTitle className="text-base">{t.nome}</CardTitle>
                        <CardDescription className="mt-1">{t.descricao || t.tipo}</CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="flex gap-3">
                    <Badge variant="secondary" className="text-xs">{t.tipo}</Badge>
                    <Badge variant="secondary" className="text-xs">
                      {(t.variaveis as string[])?.length || 0} variáveis
                    </Badge>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Step 2: Parties */}
      {currentStep === 2 && (
        <div className="space-y-6">
          <h2 className="font-display text-lg font-semibold text-foreground">Selecione as partes</h2>
          
          {/* Comprador */}
          <div>
            <Label className="mb-2 block text-sm font-medium">Comprador *</Label>
            <div className="relative mb-2">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar contato..."
                className="pl-10"
                value={searchContacts}
                onChange={(e) => setSearchContacts(e.target.value)}
              />
            </div>
            <div className="grid gap-2 max-h-48 overflow-y-auto sm:grid-cols-2">
              {filteredContacts.map((c) => (
                <Card
                  key={c.id}
                  className={`cursor-pointer p-3 transition-all hover:shadow-card ${
                    compradorId === c.id ? "ring-2 ring-primary bg-primary/5" : ""
                  }`}
                  onClick={() => setCompradorId(c.id)}
                >
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-primary" />
                    <div>
                      <p className="text-sm font-medium text-foreground">{c.nome}</p>
                      <p className="text-xs text-muted-foreground">{c.cpf || c.email || "—"}</p>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
            {contacts.length === 0 && !loadingContacts && (
              <p className="text-xs text-muted-foreground mt-2">Nenhum contato cadastrado. <Button variant="link" className="p-0 h-auto text-xs" onClick={() => navigate("/app/contatos")}>Criar contato</Button></p>
            )}
          </div>

          {/* Vendedor */}
          <div>
            <Label className="mb-2 block text-sm font-medium">Vendedor *</Label>
            <div className="grid gap-2 max-h-48 overflow-y-auto sm:grid-cols-2">
              {contacts.filter((c) => c.id !== compradorId).map((c) => (
                <Card
                  key={c.id}
                  className={`cursor-pointer p-3 transition-all hover:shadow-card ${
                    vendedorId === c.id ? "ring-2 ring-primary bg-primary/5" : ""
                  }`}
                  onClick={() => setVendedorId(c.id)}
                >
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium text-foreground">{c.nome}</p>
                      <p className="text-xs text-muted-foreground">{c.cpf || c.email || "—"}</p>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>

          {/* Empresa */}
          <div>
            <Label className="mb-2 block text-sm font-medium">Empresa Intermediadora (opcional)</Label>
            <div className="relative mb-2">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar empresa..."
                className="pl-10"
                value={searchCompanies}
                onChange={(e) => setSearchCompanies(e.target.value)}
              />
            </div>
            <div className="grid gap-2 max-h-48 overflow-y-auto sm:grid-cols-2">
              {filteredCompanies.map((c) => (
                <Card
                  key={c.id}
                  className={`cursor-pointer p-3 transition-all hover:shadow-card ${
                    empresaId === c.id ? "ring-2 ring-primary bg-primary/5" : ""
                  }`}
                  onClick={() => setEmpresaId(empresaId === c.id ? null : c.id)}
                >
                  <div className="flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium text-foreground">{c.nome_fantasia}</p>
                      <p className="text-xs text-muted-foreground">{c.cnpj || "—"}</p>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Step 3: Documents Checklist */}
      {currentStep === 3 && (
        <div className="space-y-4">
          <h2 className="font-display text-lg font-semibold text-foreground">Documentos Necessários</h2>
          <p className="text-sm text-muted-foreground">Confirme que todos os documentos foram verificados antes de prosseguir.</p>
          <Card className="shadow-card">
            <CardContent className="pt-6">
              <div className="space-y-3">
                {documentChecklist.map((doc) => (
                  <label key={doc} className="flex items-center gap-3 cursor-pointer">
                    <Checkbox
                      checked={checkedDocs.includes(doc)}
                      onCheckedChange={(checked) => {
                        setCheckedDocs((prev) =>
                          checked ? [...prev, doc] : prev.filter((d) => d !== doc)
                        );
                      }}
                    />
                    <span className="text-sm text-foreground">{doc}</span>
                  </label>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Step 4: Dynamic Data */}
      {currentStep === 4 && (
        <div className="space-y-6">
          <h2 className="font-display text-lg font-semibold text-foreground">Preencha os Dados</h2>
          <p className="text-sm text-muted-foreground">Campos preenchidos automaticamente com dados das partes selecionadas. Ajuste conforme necessário.</p>
          
          <div>
            <Label className="mb-1 text-sm font-medium">Nome do Contrato</Label>
            <Input
              value={nomeContrato}
              onChange={(e) => setNomeContrato(e.target.value)}
              placeholder="Ex: Compra e Venda - Apt 302"
            />
          </div>

          {Object.entries(templateVarsGrouped).map(([category, vars]) => (
            <Card key={category} className="shadow-card">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold text-foreground">{category}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 sm:grid-cols-2">
                  {vars.map((v) => (
                    <div key={v.key}>
                      <Label className="mb-1 text-xs text-muted-foreground">{v.label}</Label>
                      <Input
                        value={dados[v.key] || ""}
                        onChange={(e) => setDados((prev) => ({ ...prev, [v.key]: e.target.value }))}
                        placeholder={v.label}
                      />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Step 5: Clauses */}
      {currentStep === 5 && (
        <div className="space-y-4">
          <h2 className="font-display text-lg font-semibold text-foreground">Selecione as Cláusulas</h2>
          <p className="text-sm text-muted-foreground">Escolha as cláusulas que farão parte deste contrato.</p>
          {loadingClauses ? (
            <p className="text-sm text-muted-foreground">Carregando cláusulas...</p>
          ) : clauses.filter((c) => c.ativa).length === 0 ? (
            <Card className="shadow-card">
              <CardContent className="py-12 text-center">
                <p className="text-sm text-muted-foreground">Nenhuma cláusula ativa. Crie cláusulas primeiro.</p>
                <Button variant="outline" className="mt-4" onClick={() => navigate("/app/clausulas")}>
                  Ir para Cláusulas
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {clauses.filter((c) => c.ativa).map((clause) => (
                <Card key={clause.id} className={`shadow-card transition-all ${selectedClauseIds.includes(clause.id) ? "ring-2 ring-primary" : ""}`}>
                  <CardContent className="p-4">
                    <label className="flex items-start gap-3 cursor-pointer">
                      <Checkbox
                        className="mt-0.5"
                        checked={selectedClauseIds.includes(clause.id)}
                        onCheckedChange={(checked) => {
                          setSelectedClauseIds((prev) =>
                            checked ? [...prev, clause.id] : prev.filter((id) => id !== clause.id)
                          );
                        }}
                      />
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium text-foreground">{clause.titulo}</p>
                          <Badge variant="secondary" className="text-xs">{clause.categoria}</Badge>
                        </div>
                        <p className="mt-1 text-xs text-muted-foreground line-clamp-2">{clause.conteudo.replace(/<[^>]*>/g, "").slice(0, 150)}...</p>
                      </div>
                    </label>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Step 6: Editor */}
      {currentStep === 6 && (
        <div className="space-y-4">
          <h2 className="font-display text-lg font-semibold text-foreground">Editor do Contrato</h2>
          <p className="text-sm text-muted-foreground">Revise e ajuste o conteúdo final do contrato.</p>
          <RichTextEditor
            content={conteudoFinal}
            onChange={setConteudoFinal}
            placeholder="Conteúdo do contrato..."
          />
          {selectedClauses.length > 0 && (
            <Card className="shadow-card">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Cláusulas selecionadas ({selectedClauses.length})</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {selectedClauses.map((c, i) => (
                    <div key={c.id} className="rounded-md border border-border p-3">
                      <p className="text-xs font-semibold text-foreground">Cláusula {i + 1}ª — {c.titulo}</p>
                      <div className="mt-1 text-xs text-muted-foreground" dangerouslySetInnerHTML={{ __html: c.conteudo }} />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Step 7: Finalize */}
      {currentStep === 7 && (
        <div className="space-y-4">
          <h2 className="font-display text-lg font-semibold text-foreground">Finalizar Contrato</h2>
          <div className="grid gap-4 sm:grid-cols-3">
            <Card className="shadow-card">
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground">Modelo</p>
                <p className="text-sm font-medium text-foreground">{selectedTemplate?.nome || "—"}</p>
              </CardContent>
            </Card>
            <Card className="shadow-card">
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground">Comprador</p>
                <p className="text-sm font-medium text-foreground">{comprador?.nome || "—"}</p>
              </CardContent>
            </Card>
            <Card className="shadow-card">
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground">Vendedor</p>
                <p className="text-sm font-medium text-foreground">{vendedor?.nome || "—"}</p>
              </CardContent>
            </Card>
          </div>

          {empresa && (
            <Card className="shadow-card">
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground">Empresa</p>
                <p className="text-sm font-medium text-foreground">{empresa.nome_fantasia}</p>
              </CardContent>
            </Card>
          )}

          <Card className="shadow-card">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Preview do Contrato</CardTitle>
            </CardHeader>
            <CardContent>
              <div
                className="prose prose-sm max-w-none rounded-md border border-border p-4 text-foreground"
                dangerouslySetInnerHTML={{ __html: conteudoFinal }}
              />
              {selectedClauses.length > 0 && (
                <div className="mt-4 space-y-3">
                  <h3 className="text-sm font-semibold text-foreground">Cláusulas ({selectedClauses.length})</h3>
                  {selectedClauses.map((c, i) => (
                    <div key={c.id} className="rounded-md border border-border p-3">
                      <p className="text-xs font-semibold">Cláusula {i + 1}ª — {c.titulo}</p>
                      <div className="mt-1 text-xs text-muted-foreground" dangerouslySetInnerHTML={{ __html: c.conteudo }} />
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <div className="flex gap-3">
            <Button onClick={handleSave} disabled={isCreating} className="gap-2">
              <Check className="h-4 w-4" />
              {isCreating ? "Salvando..." : "Salvar Contrato"}
            </Button>
            <Button variant="outline" onClick={handlePrint} className="gap-2">
              <Printer className="h-4 w-4" />
              Exportar PDF
            </Button>
          </div>
        </div>
      )}

      {/* Navigation */}
      {currentStep < 7 && (
        <div className="mt-6 flex justify-between">
          {currentStep > 1 ? (
            <Button variant="outline" onClick={handleBack}>
              <ChevronLeft className="mr-1 h-4 w-4" /> Voltar
            </Button>
          ) : (
            <div />
          )}
          <Button disabled={!canProceed()} onClick={handleNext}>
            Próximo <ChevronRight className="ml-1 h-4 w-4" />
          </Button>
        </div>
      )}

      {/* Print View */}
      <ContractPrintView
        ref={printRef}
        nome={nomeContrato || `Contrato - ${comprador?.nome || ""}`}
        conteudo={conteudoFinal}
        clausulas={selectedClauses.map((c) => ({ titulo: c.titulo, conteudo: c.conteudo }))}
      />
    </div>
  );
};

export default NovoContrato;
