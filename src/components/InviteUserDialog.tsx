import { useState } from "react";
import { UserPlus, Copy, Check, Link } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useInvitations } from "@/hooks/useInvitations";

const roleLabels: Record<string, string> = {
  admin_empresa: "Admin",
  corretor: "Corretor",
  assistente: "Assistente",
  operacional: "Operacional",
};

export const InviteUserDialog = () => {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("corretor");
  const [inviteLink, setInviteLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const { sendInvite, isSending } = useInvitations();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const result = await sendInvite({ email, role });
    if (result?.invitation?.token) {
      const link = `${window.location.origin}/cadastro?token=${result.invitation.token}`;
      setInviteLink(link);
    }
  };

  const handleCopy = async () => {
    if (!inviteLink) return;
    await navigator.clipboard.writeText(inviteLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleClose = (isOpen: boolean) => {
    setOpen(isOpen);
    if (!isOpen) {
      setEmail("");
      setRole("corretor");
      setInviteLink(null);
      setCopied(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <UserPlus className="mr-2 h-4 w-4" /> Convidar Usuário
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{inviteLink ? "Convite criado!" : "Convidar novo usuário"}</DialogTitle>
          {inviteLink && (
            <DialogDescription>
              Copie o link abaixo e envie para <strong>{email}</strong>
            </DialogDescription>
          )}
        </DialogHeader>

        {inviteLink ? (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <div className="flex-1 rounded-md border border-border bg-muted/50 p-3">
                <p className="break-all text-xs text-foreground">{inviteLink}</p>
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => handleClose(false)}>
                Fechar
              </Button>
              <Button onClick={handleCopy}>
                {copied ? (
                  <><Check className="mr-2 h-4 w-4" /> Copiado!</>
                ) : (
                  <><Copy className="mr-2 h-4 w-4" /> Copiar Link</>
                )}
              </Button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="invite-email">E-mail</Label>
              <Input
                id="invite-email"
                type="email"
                placeholder="usuario@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Função</Label>
              <Select value={role} onValueChange={setRole}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(roleLabels).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => handleClose(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isSending}>
                {isSending ? "Enviando..." : "Enviar Convite"}
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
};
