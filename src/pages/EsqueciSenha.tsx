import { useState } from "react";
import { Link } from "react-router-dom";
import { FileText, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const EsqueciSenha = () => {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setTimeout(() => { setLoading(false); setSent(true); }, 1000);
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-secondary/30 px-4">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <Link to="/" className="inline-flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary">
              <FileText className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="font-display text-xl font-bold text-foreground">Meu Contrato Online</span>
          </Link>
        </div>
        <Card className="shadow-elevated">
          <CardHeader className="text-center">
            <CardTitle className="font-display text-2xl">Recuperar senha</CardTitle>
            <CardDescription>
              {sent ? "E-mail enviado! Verifique sua caixa de entrada." : "Informe seu e-mail para receber o link de recuperação"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {!sent ? (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">E-mail</Label>
                  <Input id="email" type="email" placeholder="seu@email.com" value={email} onChange={(e) => setEmail(e.target.value)} required />
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? "Enviando..." : "Enviar link de recuperação"}
                </Button>
              </form>
            ) : (
              <div className="text-center">
                <p className="mb-4 text-sm text-muted-foreground">
                  Se o e-mail <strong>{email}</strong> estiver cadastrado, você receberá um link para redefinir sua senha.
                </p>
                <Button variant="outline" onClick={() => setSent(false)} className="w-full">Enviar novamente</Button>
              </div>
            )}
            <div className="mt-6 text-center">
              <Link to="/login" className="inline-flex items-center gap-1 text-sm text-primary hover:underline">
                <ArrowLeft className="h-4 w-4" /> Voltar para login
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default EsqueciSenha;
