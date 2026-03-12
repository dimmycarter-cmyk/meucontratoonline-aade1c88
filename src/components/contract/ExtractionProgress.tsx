import { Loader2, CheckCircle2, AlertCircle, FileText, Sparkles } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import type { Participant } from "./ParticipantCard";
import { ROLE_LABELS } from "./ParticipantCard";

interface ExtractionProgressProps {
  participants: Participant[];
  isProcessing: boolean;
  progress: number;
  currentMessage: string;
}

const ExtractionProgress = ({ participants, isProcessing, progress, currentMessage }: ExtractionProgressProps) => {
  const totalDocs = participants.reduce((sum, p) => sum + p.documents.length, 0);
  const completedDocs = participants.reduce(
    (sum, p) => sum + p.documents.filter((d) => ["completed", "low_confidence"].includes(d.processing_status)).length,
    0
  );
  const failedDocs = participants.reduce(
    (sum, p) => sum + p.documents.filter((d) => d.processing_status === "failed").length,
    0
  );

  return (
    <div className="space-y-6">
      <div className="text-center space-y-4">
        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-primary/10">
          {isProcessing ? (
            <Sparkles className="h-10 w-10 text-primary animate-pulse" />
          ) : (
            <CheckCircle2 className="h-10 w-10 text-success" />
          )}
        </div>
        <div>
          <h2 className="font-display text-lg font-semibold text-foreground">
            {isProcessing ? "Processando documentos..." : "Extração concluída!"}
          </h2>
          <p className="text-sm text-muted-foreground mt-1">{currentMessage}</p>
        </div>
        <Progress value={progress} className="max-w-md mx-auto h-2" />
        <p className="text-xs text-muted-foreground">
          {completedDocs} de {totalDocs} documentos processados
          {failedDocs > 0 && <span className="text-destructive"> • {failedDocs} com falha</span>}
        </p>
      </div>

      {/* Per-participant status */}
      <div className="grid gap-3 sm:grid-cols-2">
        {participants.map((p) => (
          <Card key={p.id} className="shadow-card">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs font-semibold text-primary">{ROLE_LABELS[p.role]}</span>
                <span className="text-sm font-medium text-foreground">{p.full_name || "—"}</span>
              </div>
              <div className="space-y-1.5">
                {p.documents.map((doc, i) => (
                  <div key={i} className="flex items-center gap-2 text-xs">
                    {doc.processing_status === "processing" && <Loader2 className="h-3 w-3 animate-spin text-primary" />}
                    {doc.processing_status === "completed" && <CheckCircle2 className="h-3 w-3 text-success" />}
                    {doc.processing_status === "low_confidence" && <AlertCircle className="h-3 w-3 text-warning" />}
                    {doc.processing_status === "failed" && <AlertCircle className="h-3 w-3 text-destructive" />}
                    {doc.processing_status === "pending" && <FileText className="h-3 w-3 text-muted-foreground" />}
                    <span className="text-foreground truncate">{doc.name}</span>
                  </div>
                ))}
                {p.documents.length === 0 && (
                  <span className="text-xs text-muted-foreground">Sem documentos</span>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default ExtractionProgress;
