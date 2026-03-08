import { User, Building2, Shield, Bell, CreditCard } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const Configuracoes = () => {
  return (
    <div className="p-6 lg:p-8">
      <div className="mb-8">
        <h1 className="font-display text-2xl font-bold text-foreground">Configurações</h1>
        <p className="text-sm text-muted-foreground">Gerencie sua conta e preferências</p>
      </div>

      <div className="max-w-3xl space-y-6">
        {/* Perfil */}
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base"><User className="h-5 w-5 text-primary" /> Perfil</CardTitle>
            <CardDescription>Informações pessoais da sua conta</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Nome completo</Label>
                <Input defaultValue="João da Silva" />
              </div>
              <div className="space-y-2">
                <Label>E-mail</Label>
                <Input defaultValue="joao@email.com" disabled />
              </div>
              <div className="space-y-2">
                <Label>WhatsApp</Label>
                <Input defaultValue="(11) 99999-1234" />
              </div>
              <div className="space-y-2">
                <Label>Cargo</Label>
                <Input defaultValue="Corretor" />
              </div>
            </div>
            <Button>Salvar alterações</Button>
          </CardContent>
        </Card>

        {/* Empresa */}
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base"><Building2 className="h-5 w-5 text-primary" /> Empresa</CardTitle>
            <CardDescription>Dados da sua empresa/imobiliária</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Nome fantasia</Label>
                <Input defaultValue="Imobiliária Central" />
              </div>
              <div className="space-y-2">
                <Label>CNPJ</Label>
                <Input defaultValue="12.345.678/0001-90" />
              </div>
            </div>
            <Button>Salvar alterações</Button>
          </CardContent>
        </Card>

        {/* Segurança */}
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base"><Shield className="h-5 w-5 text-primary" /> Segurança</CardTitle>
            <CardDescription>Altere sua senha</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="max-w-sm space-y-4">
              <div className="space-y-2">
                <Label>Senha atual</Label>
                <Input type="password" />
              </div>
              <div className="space-y-2">
                <Label>Nova senha</Label>
                <Input type="password" />
              </div>
              <div className="space-y-2">
                <Label>Confirmar nova senha</Label>
                <Input type="password" />
              </div>
            </div>
            <Button>Alterar senha</Button>
          </CardContent>
        </Card>

        {/* Plano */}
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base"><CreditCard className="h-5 w-5 text-primary" /> Plano</CardTitle>
            <CardDescription>Seu plano atual e limites</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between rounded-lg border border-primary/20 bg-primary/5 p-4">
              <div>
                <p className="font-display text-lg font-bold text-foreground">Plano Pro</p>
                <p className="text-sm text-muted-foreground">5 usuários • 100 contratos/mês • 50 leituras IA</p>
              </div>
              <Button variant="outline">Gerenciar plano</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Configuracoes;
