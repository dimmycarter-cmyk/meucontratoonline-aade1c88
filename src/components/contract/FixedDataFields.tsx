import { useMemo, useRef, useState } from "react";
import { ChevronDown, ChevronRight, AlertTriangle, Paperclip, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { formatBRL, valorPorExtenso } from "@/lib/contract-formatters";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { ManualParticipantData } from "./manual-participant";

const MAX_MATRICULA_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_MATRICULA_TYPES = ["application/pdf", "image/jpeg", "image/png"];

const fileToBase64 = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const base64 = result.split(",")[1] || "";
      resolve(base64);
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });

type Dados = Record<string, string>;

interface FixedDataFieldsProps {
  dados: Dados;
  onChange: (next: Dados) => void;
  manualParticipants: ManualParticipantData[];
}

const setField = (
  dados: Dados,
  onChange: (d: Dados) => void,
  key: string,
  value: string
) => onChange({ ...dados, [key]: value });

interface FieldProps {
  label: string;
  k: string;
  dados: Dados;
  onChange: (d: Dados) => void;
  type?: string;
  placeholder?: string;
  textarea?: boolean;
  onBlur?: () => void;
}

const Field = ({ label, k, dados, onChange, type, placeholder, textarea, onBlur }: FieldProps) => (
  <div>
    <Label className="mb-1 text-xs text-muted-foreground">{label}</Label>
    {textarea ? (
      <Textarea
        value={dados[k] || ""}
        onChange={(e) => setField(dados, onChange, k, e.target.value)}
        onBlur={onBlur}
        placeholder={placeholder || label}
        rows={2}
      />
    ) : (
      <Input
        type={type}
        value={dados[k] || ""}
        onChange={(e) => setField(dados, onChange, k, e.target.value)}
        onBlur={onBlur}
        placeholder={placeholder || label}
      />
    )}
  </div>
);

const parseBRL = (s: string): number => {
  if (!s) return 0;
  const cleaned = String(s).replace(/[^\d,.-]/g, "").replace(/\./g, "").replace(",", ".");
  const n = Number(cleaned);
  return isFinite(n) ? n : 0;
};

const Section = ({
  title,
  children,
  defaultOpen = true,
}: {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) => {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <Card className="shadow-card">
      <CardHeader className="pb-3 cursor-pointer" onClick={() => setOpen(!open)}>
        <CardTitle className="text-sm font-semibold text-foreground flex items-center gap-2">
          {open ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          {title}
        </CardTitle>
      </CardHeader>
      {open && <CardContent>{children}</CardContent>}
    </Card>
  );
};

const FixedDataFields = ({ dados, onChange, manualParticipants }: FixedDataFieldsProps) => {
  const matriculaInputRef = useRef<HTMLInputElement>(null);
  const [isExtractingMatricula, setIsExtractingMatricula] = useState(false);

  const handleMatriculaFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!ALLOWED_MATRICULA_TYPES.includes(file.type)) {
      toast.error("Formato inválido. Envie PDF, JPG ou PNG.");
      if (matriculaInputRef.current) matriculaInputRef.current.value = "";
      return;
    }
    if (file.size > MAX_MATRICULA_SIZE) {
      toast.error("Arquivo muito grande. Máximo 10MB.");
      if (matriculaInputRef.current) matriculaInputRef.current.value = "";
      return;
    }

    setIsExtractingMatricula(true);
    try {
      const fileBase64 = await fileToBase64(file);
      const { data, error } = await supabase.functions.invoke("extract-matricula", {
        body: { fileBase64, mimeType: file.type },
      });

      if (error || !data?.success || !data?.descricao) {
        throw new Error(data?.error || error?.message || "extraction_failed");
      }

      onChange({ ...dados, imovel_descricao: data.descricao });
      toast.success("Descrição extraída da matrícula");
    } catch (err) {
      console.error("extract-matricula failed:", err);
      toast.error("Não foi possível extrair. Preencha manualmente.");
    } finally {
      setIsExtractingMatricula(false);
      if (matriculaInputRef.current) matriculaInputRef.current.value = "";
    }
  };

  // Format BRL on blur
  const formatBRLBlur = (key: string) => () => {
    const raw = dados[key];
    if (!raw) return;
    const num = parseBRL(raw);
    if (!num) return;
    onChange({
      ...dados,
      [key]: formatBRL(num),
      [`${key}_extenso`]: valorPorExtenso(num),
    });
  };

  const vendedores = useMemo(
    () => manualParticipants.filter((p) => p.role === "vendedor"),
    [manualParticipants]
  );

  // Soft validation: sum of vendor signal values vs total signal
  const sinalDivisaoWarning = useMemo(() => {
    if (vendedores.length < 2) return null;
    const total = parseBRL(dados.valor_sinal || "");
    if (!total) return null;
    const soma = vendedores.reduce((acc, _, idx) => {
      const k = idx === 0 ? "valor_vendedor_sinal" : `valor_vendedor${idx + 1}_sinal`;
      return acc + parseBRL(dados[k] || "");
    }, 0);
    if (Math.abs(soma - total) < 0.01) return null;
    return `Soma das divisões (${formatBRL(soma)}) difere do valor do sinal (${formatBRL(total)})`;
  }, [dados, vendedores]);

  return (
    <div className="space-y-6">
      {/* ===== Imóvel ===== */}
      <Section title="Imóvel">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Field label="Endereço do Imóvel" k="imovel_endereco" dados={dados} onChange={onChange} />
          </div>
          <div className="sm:col-span-2">
            <Label className="mb-1 text-xs text-muted-foreground">Descrição do Imóvel</Label>
            <Textarea
              value={dados.imovel_descricao || ""}
              onChange={(e) => setField(dados, onChange, "imovel_descricao", e.target.value)}
              placeholder="Descrição do Imóvel"
              rows={4}
              className="min-h-[160px]"
            />
          </div>
          <div className="sm:col-span-2">
            <input
              ref={matriculaInputRef}
              type="file"
              accept="application/pdf,image/jpeg,image/png"
              hidden
              onChange={handleMatriculaFile}
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={isExtractingMatricula}
              onClick={() => matriculaInputRef.current?.click()}
            >
              {isExtractingMatricula ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Extraindo dados da matrícula...
                </>
              ) : (
                <>
                  <Paperclip className="h-4 w-4 mr-2" />
                  Anexar Matrícula
                </>
              )}
            </Button>
          </div>
        </div>
      </Section>

      {/* ===== Contrato ===== */}
      <Section title="Contrato">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Data do Contrato" k="data_contrato" dados={dados} onChange={onChange} type="date" />
          <Field label="Cidade do Contrato" k="cidade_contrato" dados={dados} onChange={onChange} />
          <Field label="Cidade/UF" k="cidade_uf" dados={dados} onChange={onChange} placeholder="Ex: São Paulo/SP" />
          <Field label="Foro" k="foro" dados={dados} onChange={onChange} />
          <Field label="Prazo para Escritura" k="prazo_escritura" dados={dados} onChange={onChange} placeholder="Ex: 90 dias" />
          <Field label="Multa por Rescisão" k="multa_rescisao" dados={dados} onChange={onChange} placeholder="Ex: 20% do valor pago" />
          <Field label="Prazo de Posse (dias)" k="prazo_posse_dias" dados={dados} onChange={onChange} />
          <Field label="Multa Diária por Atraso" k="multa_atraso_diaria" dados={dados} onChange={onChange} />
        </div>
      </Section>

      {/* ===== Valores ===== */}
      <Section title="Valores">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Valor Total" k="valor_total" dados={dados} onChange={onChange} placeholder="R$ 0,00" onBlur={formatBRLBlur("valor_total")} />
          <Field label="Valor do Sinal" k="valor_sinal" dados={dados} onChange={onChange} placeholder="R$ 0,00" onBlur={formatBRLBlur("valor_sinal")} />
          <Field label="Valor Remanescente" k="valor_remanescente" dados={dados} onChange={onChange} placeholder="R$ 0,00" onBlur={formatBRLBlur("valor_remanescente")} />
          <Field label="Valor do Financiamento" k="valor_financiamento" dados={dados} onChange={onChange} placeholder="R$ 0,00" onBlur={formatBRLBlur("valor_financiamento")} />
          <Field label="Banco do Financiamento" k="banco_financiamento" dados={dados} onChange={onChange} />
          <Field label="Valor da Corretagem" k="valor_corretagem" dados={dados} onChange={onChange} placeholder="R$ 0,00" onBlur={formatBRLBlur("valor_corretagem")} />
          <div className="sm:col-span-2">
            <Field label="Forma de Pagamento" k="forma_pagamento" dados={dados} onChange={onChange} textarea />
          </div>
        </div>

        {/* Divisão do sinal por vendedor */}
        {vendedores.length >= 2 && (
          <div className="mt-6 space-y-3 rounded-md border border-border bg-muted/20 p-3">
            <div className="flex items-center justify-between gap-3">
              <h4 className="text-sm font-semibold text-foreground">
                Divisão do Sinal por Vendedor
              </h4>
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="h-7 text-xs"
                onClick={() => {
                  const total = parseBRL(dados.valor_sinal || "");
                  if (!total) return;
                  const part = total / vendedores.length;
                  const next = { ...dados };
                  vendedores.forEach((_, idx) => {
                    const k = idx === 0 ? "valor_vendedor_sinal" : `valor_vendedor${idx + 1}_sinal`;
                    next[k] = formatBRL(part);
                  });
                  onChange(next);
                }}
              >
                Dividir igualmente
              </Button>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {vendedores.map((v, idx) => {
                const k = idx === 0 ? "valor_vendedor_sinal" : `valor_vendedor${idx + 1}_sinal`;
                return (
                  <Field
                    key={k}
                    label={`Vendedor ${idx + 1}${v.nome ? ` — ${v.nome}` : ""}`}
                    k={k}
                    dados={dados}
                    onChange={onChange}
                    placeholder="R$ 0,00"
                    onBlur={formatBRLBlur(k)}
                  />
                );
              })}
            </div>
            {sinalDivisaoWarning && (
              <div className="flex items-start gap-2 rounded-md bg-warning/10 p-2 text-xs text-warning-foreground">
                <AlertTriangle className="h-3.5 w-3.5 mt-0.5 shrink-0 text-warning" />
                <span>{sinalDivisaoWarning}</span>
              </div>
            )}
          </div>
        )}
      </Section>

      {/* ===== Intermediadoras ===== */}
      <Section title="Intermediadoras (opcional)" defaultOpen={false}>
        <div className="space-y-6">
          {[1, 2].map((n) => (
            <div key={n} className="space-y-3">
              <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Intermediadora {n}
              </h4>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Nome" k={`intermediadora${n}_nome`} dados={dados} onChange={onChange} />
                <Field label="CNPJ/CPF" k={`intermediadora${n}_cnpj`} dados={dados} onChange={onChange} />
                <Field label="Banco" k={`intermediadora${n}_banco`} dados={dados} onChange={onChange} />
                <Field label="Agência" k={`intermediadora${n}_agencia`} dados={dados} onChange={onChange} />
                <Field label="Conta" k={`intermediadora${n}_conta`} dados={dados} onChange={onChange} />
                <Field label="PIX" k={`intermediadora${n}_pix`} dados={dados} onChange={onChange} />
                <Field
                  label="Valor Corretagem"
                  k={`intermediadora${n}_valor`}
                  dados={dados}
                  onChange={onChange}
                  placeholder="R$ 0,00"
                  onBlur={formatBRLBlur(`intermediadora${n}_valor`)}
                />
                <Field
                  label="Valor recebido do Sinal"
                  k={`intermediadora${n}_valor_sinal`}
                  dados={dados}
                  onChange={onChange}
                  placeholder="R$ 0,00"
                  onBlur={formatBRLBlur(`intermediadora${n}_valor_sinal`)}
                />
              </div>
            </div>
          ))}
        </div>
      </Section>
    </div>
  );
};

export default FixedDataFields;
