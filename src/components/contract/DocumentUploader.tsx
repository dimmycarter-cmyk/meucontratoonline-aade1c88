import { useState, useRef } from "react";
import { Upload, X, File, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export type DocType = "cnh" | "rg" | "cpf" | "comprovante_endereco" | "certidao_casamento" | "procuracao" | "contrato_social" | "cnpj" | "outro";
export type ProcessingStatus = "pending" | "processing" | "completed" | "failed" | "low_confidence";

export interface UploadedDoc {
  id?: string;
  file: File | null;
  name: string;
  path: string;
  size: number;
  mime_type: string;
  document_type: DocType;
  processing_status: ProcessingStatus;
}

const DOC_TYPE_LABELS: Record<DocType, string> = {
  cnh: "CNH",
  rg: "RG / Identidade",
  cpf: "CPF",
  comprovante_endereco: "Comprovante de Endereço",
  certidao_casamento: "Certidão de Casamento",
  procuracao: "Procuração",
  contrato_social: "Contrato Social",
  cnpj: "Cartão CNPJ",
  outro: "Outro",
};

const STATUS_CONFIG: Record<ProcessingStatus, { icon: React.ReactNode; label: string; className: string }> = {
  pending: { icon: <File className="h-3.5 w-3.5" />, label: "Aguardando", className: "text-muted-foreground" },
  processing: { icon: <Loader2 className="h-3.5 w-3.5 animate-spin" />, label: "Processando...", className: "text-primary" },
  completed: { icon: <CheckCircle2 className="h-3.5 w-3.5" />, label: "Extraído", className: "text-success" },
  failed: { icon: <AlertCircle className="h-3.5 w-3.5" />, label: "Falha", className: "text-destructive" },
  low_confidence: { icon: <AlertCircle className="h-3.5 w-3.5" />, label: "Baixa confiança", className: "text-warning" },
};

interface DocumentUploaderProps {
  documents: UploadedDoc[];
  onUpload: (files: File[], docType: DocType) => void;
  onRemove: (index: number) => void;
  onChangeType: (index: number, type: DocType) => void;
  isUploading?: boolean;
}

const DocumentUploader = ({ documents, onUpload, onRemove, onChangeType, isUploading }: DocumentUploaderProps) => {
  const [dragOver, setDragOver] = useState(false);
  const [selectedType, setSelectedType] = useState<DocType>("cnh");
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const files = Array.from(e.dataTransfer.files).filter((f) =>
      ["application/pdf", "image/jpeg", "image/png", "image/jpg"].includes(f.type)
    );
    if (files.length > 0) onUpload(files, selectedType);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      onUpload(Array.from(files), selectedType);
      e.target.value = "";
    }
  };

  return (
    <div className="space-y-3">
      {/* Type selector + Upload area */}
      <div className="flex items-end gap-3">
        <div className="flex-1">
          <label className="text-xs font-medium text-muted-foreground mb-1 block">Tipo do documento</label>
          <Select value={selectedType} onValueChange={(v) => setSelectedType(v as DocType)}>
            <SelectTrigger className="h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(DOC_TYPE_LABELS).map(([key, label]) => (
                <SelectItem key={key} value={key}>{label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div
        className={`relative flex cursor-pointer flex-col items-center gap-2 rounded-lg border-2 border-dashed p-4 transition-colors ${
          dragOver ? "border-primary bg-primary/5" : "border-border hover:border-primary hover:bg-muted/50"
        }`}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
      >
        <Upload className="h-6 w-6 text-muted-foreground" />
        <span className="text-xs text-muted-foreground">
          {isUploading ? "Enviando..." : "Arraste ou clique para enviar"}
        </span>
        <span className="text-[10px] text-muted-foreground">PDF, JPG, PNG (máx 10MB)</span>
        <input
          ref={inputRef}
          type="file"
          multiple
          accept=".pdf,.jpg,.jpeg,.png"
          className="hidden"
          onChange={handleInputChange}
          disabled={isUploading}
        />
      </div>

      {/* Uploaded files list */}
      {documents.length > 0 && (
        <div className="space-y-2">
          {documents.map((doc, i) => {
            const statusConf = STATUS_CONFIG[doc.processing_status];
            return (
              <div
                key={i}
                className="flex items-center gap-3 rounded-lg border border-border bg-card px-3 py-2"
              >
                <div className={`flex items-center gap-1.5 ${statusConf.className}`}>
                  {statusConf.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{doc.name}</p>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-muted-foreground">
                      {(doc.size / 1024).toFixed(0)} KB
                    </span>
                    <span className={`text-[10px] font-medium ${statusConf.className}`}>
                      {statusConf.label}
                    </span>
                  </div>
                </div>
                <Select
                  value={doc.document_type}
                  onValueChange={(v) => onChangeType(i, v as DocType)}
                >
                  <SelectTrigger className="h-7 w-[130px] text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(DOC_TYPE_LABELS).map(([key, label]) => (
                      <SelectItem key={key} value={key} className="text-xs">{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 shrink-0"
                  onClick={(e) => { e.stopPropagation(); onRemove(i); }}
                >
                  <X className="h-3.5 w-3.5" />
                </Button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default DocumentUploader;
