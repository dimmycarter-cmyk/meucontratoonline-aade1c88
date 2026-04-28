import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Save } from "lucide-react";

interface SaveDraftModalProps {
  open: boolean;
  initialName?: string;
  isSaving?: boolean;
  onSaveDraft: (contractName: string) => void | Promise<void>;
  onDiscard: () => void;
}

export function SaveDraftModal({
  open,
  initialName = "",
  isSaving = false,
  onSaveDraft,
  onDiscard,
}: SaveDraftModalProps) {
  const [contractName, setContractName] = useState(initialName);

  // Pre-fill name whenever the modal opens
  useEffect(() => {
    if (open) setContractName(initialName);
  }, [open, initialName]);

  const handleSave = async () => {
    const name = contractName.trim();
    if (!name || isSaving) return;
    await onSaveDraft(name);
  };

  return (
    <Dialog open={open}>
      <DialogContent
        className="sm:max-w-md"
        onInteractOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Save className="h-5 w-5 text-primary" />
            Salvar como Rascunho?
          </DialogTitle>
          <DialogDescription>
            Você começou a preencher este contrato. Deseja salvá-lo como
            rascunho para continuar depois?
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2 py-2">
          <Label htmlFor="contract-draft-name">
            Nome do contrato <span className="text-destructive">*</span>
          </Label>
          <Input
            id="contract-draft-name"
            placeholder="Ex: Contrato de Locação — Apto 204"
            value={contractName}
            onChange={(e) => setContractName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                void handleSave();
              }
            }}
            autoFocus
            disabled={isSaving}
          />
        </div>

        <div className="flex flex-col-reverse sm:flex-row gap-2 pt-2">
          <Button
            variant="outline"
            className="flex-1"
            onClick={onDiscard}
            disabled={isSaving}
          >
            Descartar e Sair
          </Button>
          <Button
            className="flex-1"
            onClick={handleSave}
            disabled={!contractName.trim() || isSaving}
          >
            {isSaving ? "Salvando..." : "Salvar Rascunho"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default SaveDraftModal;
