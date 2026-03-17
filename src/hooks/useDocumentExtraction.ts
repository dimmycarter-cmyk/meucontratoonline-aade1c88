import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import type { Participant } from "@/components/contract/ParticipantCard";
import type { DocType, UploadedDoc } from "@/components/contract/DocumentUploader";
import type { ParticipantExtractedData, ExtractedField } from "@/components/contract/ExtractedDataReview";

const EXTRACTION_MESSAGES = [
  "Lendo documentos...",
  "Identificando campos...",
  "Extraindo dados pessoais...",
  "Verificando informações...",
  "Organizando dados...",
  "Finalizando extração...",
];

export const useDocumentExtraction = (initialExtractedData?: ParticipantExtractedData[]) => {
  const { profile } = useAuth();
  const { toast } = useToast();
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentMessage, setCurrentMessage] = useState("");
  const [extractedData, setExtractedData] = useState<ParticipantExtractedData[]>(initialExtractedData ?? []);

  const uploadDocument = useCallback(
    async (participantId: string, file: File, docType: DocType): Promise<UploadedDoc | null> => {
      if (!profile?.tenant_id) return null;
      const safeName = file.name
        .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-zA-Z0-9._-]/g, "_");
      const filePath = `${profile.tenant_id}/participants/${participantId}/${Date.now()}-${safeName}`;

      const { error } = await supabase.storage.from("contract-documents").upload(filePath, file);
      if (error) {
        toast({ title: "Erro ao enviar arquivo", description: error.message, variant: "destructive" });
        return null;
      }

      return {
        file,
        name: file.name,
        path: filePath,
        size: file.size,
        mime_type: file.type,
        document_type: docType,
        processing_status: "pending",
      };
    },
    [profile?.tenant_id]
  );

  const extractAll = useCallback(
    async (participants: Participant[]) => {
      setIsProcessing(true);
      setProgress(0);
      setCurrentMessage(EXTRACTION_MESSAGES[0]);

      const allDocs: { participantId: string; doc: UploadedDoc; participantRole: string; participantName: string }[] = [];
      participants.forEach((p) => {
        p.documents.forEach((doc) => {
          if (doc.processing_status === "pending" || doc.processing_status === "failed") {
            allDocs.push({ participantId: p.id, doc, participantRole: p.role, participantName: p.full_name });
          }
        });
      });

      if (allDocs.length === 0) {
        setIsProcessing(false);
        setProgress(100);
        setCurrentMessage("Nenhum documento para processar");
        return;
      }

      const results: Record<string, any[]> = {};
      
      for (let i = 0; i < allDocs.length; i++) {
        const { participantId, doc } = allDocs[i];
        const msgIndex = Math.min(Math.floor((i / allDocs.length) * EXTRACTION_MESSAGES.length), EXTRACTION_MESSAGES.length - 1);
        setCurrentMessage(EXTRACTION_MESSAGES[msgIndex]);
        setProgress(Math.round(((i) / allDocs.length) * 90));

        try {
          const { data, error } = await supabase.functions.invoke("extract-document", {
            body: {
              document_id: doc.id || null,
              file_path: doc.path,
              document_type: doc.document_type,
            },
          });

          if (error) {
            console.error("Extraction error:", error);
            doc.processing_status = "failed";
            continue;
          }

          if (data?.success && data?.data) {
            doc.processing_status = (data.confidence >= 70) ? "completed" : "low_confidence";
            if (!results[participantId]) results[participantId] = [];
            results[participantId].push(data.data);
          } else {
            doc.processing_status = "failed";
          }
        } catch (err) {
          console.error("Extraction exception:", err);
          doc.processing_status = "failed";
        }
      }

      // Build extracted data per participant
      const participantResults: ParticipantExtractedData[] = participants.map((p) => {
        const extractions = results[p.id] || [];
        const mergedFields: Record<string, ExtractedField> = {};

        extractions.forEach((ext) => {
          const fieldConfidences = ext.field_confidences || {};
          const globalConf = ext.confidence || 50;

          const ignoredFields = ["birth_date", "father_name", "mother_name"];
          Object.entries(ext).forEach(([key, value]) => {
            if (key === "confidence" || key === "field_confidences" || ignoredFields.includes(key) || !value || typeof value !== "string") return;
            const conf = fieldConfidences[key] ?? globalConf;
            // Keep highest confidence version
            if (!mergedFields[key] || conf > mergedFields[key].confidence) {
              mergedFields[key] = {
                key,
                label: key,
                value: value as string,
                confidence: conf,
              };
            }
          });
        });

        // If name was extracted, update participant name
        if (mergedFields.full_name && !p.full_name) {
          p.full_name = mergedFields.full_name.value;
        }

        return {
          participantId: p.id,
          role: p.role,
          full_name: p.full_name || mergedFields.full_name?.value || "",
          fields: Object.values(mergedFields),
        };
      });

      setExtractedData(participantResults);
      setProgress(100);
      setCurrentMessage("Extração concluída!");
      setIsProcessing(false);
    },
    []
  );

  const updateField = useCallback((participantId: string, fieldKey: string, value: string) => {
    setExtractedData((prev) =>
      prev.map((pd) => {
        if (pd.participantId !== participantId) return pd;
        return {
          ...pd,
          fields: pd.fields.map((f) => (f.key === fieldKey ? { ...f, value } : f)),
        };
      })
    );
  }, []);

  // Map extracted data to template variables (dados Record<string, string>)
  const mapToDados = useCallback((): Record<string, string> => {
    const dados: Record<string, string> = {};
    const byRole: Record<string, ParticipantExtractedData[]> = {};

    extractedData.forEach((pd) => {
      if (!byRole[pd.role]) byRole[pd.role] = [];
      byRole[pd.role].push(pd);
    });

    const mapParticipant = (prefix: string, pd: ParticipantExtractedData) => {
      pd.fields.forEach((f) => {
        const keyMap: Record<string, string> = {
          full_name: `${prefix}_nome`,
          cpf: `${prefix}_cpf`,
          rg: `${prefix}_rg`,
          issuing_agency: `${prefix}_orgao_expedidor`,
          profession: `${prefix}_profissao`,
          nationality: `${prefix}_nacionalidade`,
          marital_status: `${prefix}_estado_civil`,
          email: `${prefix}_email`,
          whatsapp: `${prefix}_whatsapp`,
        };

        if (keyMap[f.key]) {
          dados[keyMap[f.key]] = f.value;
        }

        // Build address
        const addressFields = ["address_street", "address_number", "address_complement", "address_neighborhood", "address_city", "address_state", "address_zipcode"];
        if (addressFields.includes(f.key)) {
          // Accumulate address parts
          if (!dados[`${prefix}_endereco_parts`]) dados[`${prefix}_endereco_parts`] = "";
        }
      });

      // Build full address
      const parts = ["address_street", "address_number", "address_complement", "address_neighborhood", "address_city", "address_state", "address_zipcode"]
        .map((k) => pd.fields.find((f) => f.key === k)?.value)
        .filter(Boolean);
      if (parts.length > 0) {
        dados[`${prefix}_endereco`] = parts.join(", ");
      }
    };

    // Map first comprador/vendedor to standard template vars
    if (byRole.comprador?.[0]) mapParticipant("comprador", byRole.comprador[0]);
    if (byRole.vendedor?.[0]) mapParticipant("vendedor", byRole.vendedor[0]);

    // Clean up temp keys
    Object.keys(dados).forEach((k) => {
      if (k.endsWith("_endereco_parts")) delete dados[k];
    });

    return dados;
  }, [extractedData]);

  return {
    uploadDocument,
    extractAll,
    isProcessing,
    progress,
    currentMessage,
    extractedData,
    updateField,
    mapToDados,
  };
};
