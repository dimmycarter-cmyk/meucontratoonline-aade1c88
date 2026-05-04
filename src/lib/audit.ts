import { supabase } from "@/integrations/supabase/client";

export type AuditAction =
  | "contract.created"
  | "contract.updated"
  | "contract.status_changed"
  | "contract.deleted"
  | "contract.viewed"
  | "participant.created"
  | "participant.updated"
  | "participant.deleted"
  | "document.uploaded"
  | "document.viewed"
  | "document.deleted"
  | "template.created"
  | "template.updated";

export type AuditEntityType = "contract" | "participant" | "document" | "template";

export const AUDIT_ACTION_LABELS: Record<AuditAction, string> = {
  "contract.created": "Contrato criado",
  "contract.updated": "Contrato editado",
  "contract.status_changed": "Status alterado",
  "contract.deleted": "Contrato excluído",
  "contract.viewed": "Contrato visualizado",
  "participant.created": "Participante adicionado",
  "participant.updated": "Participante editado",
  "participant.deleted": "Participante removido",
  "document.uploaded": "Documento enviado",
  "document.viewed": "Documento visualizado",
  "document.deleted": "Documento removido",
  "template.created": "Modelo criado",
  "template.updated": "Modelo editado",
};

interface LogActionParams {
  tenantId?: string | null;
  action: AuditAction;
  entityType: AuditEntityType;
  entityId?: string | null;
  metadata?: Record<string, unknown>;
}

export async function logAction(params: LogActionParams): Promise<void> {
  try {
    const { data: userData } = await supabase.auth.getUser();
    const userId = userData?.user?.id;
    if (!userId) return;

    let tenantId = params.tenantId;
    if (!tenantId) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("tenant_id")
        .eq("id", userId)
        .maybeSingle();
      tenantId = profile?.tenant_id ?? null;
    }
    if (!tenantId) return;

    await supabase.from("audit_logs" as any).insert({
      tenant_id: tenantId,
      user_id: userId,
      action: params.action,
      entity_type: params.entityType,
      entity_id: params.entityId ?? null,
      metadata: params.metadata ?? {},
    });
  } catch (error) {
    console.error("[audit] Falha ao registrar log:", error);
  }
}
