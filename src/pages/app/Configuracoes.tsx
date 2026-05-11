import { useEffect, useState } from "react";
import { User, Building2, Shield, CreditCard, ShieldCheck, ChevronRight, Lock } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useProfile } from "@/hooks/useProfile";
import { useCompanies } from "@/hooks/useCompanies";
import {
  CompanyEditForm,
  companyToFormData,
  emptyCompanyForm,
  type CompanyFormData,
} from "@/components/empresa/CompanyEditForm";
import { maskPhone } from "@/lib/masks";

const Configuracoes = () => {
  const navigate = useNavigate();
  const { roles, isSuperAdmin } = useAuth();
  const canViewAudit = isSuperAdmin || roles.includes("admin_empresa");

  const { profile, updateProfile, isUpdating: isUpdatingProfile } = useProfile();
  const { companies, isLoading: isLoadingCompanies, updateCompany } = useCompanies();

  // ---------- Seção Perfil ----------
  const [perfilForm, setPerfilForm] = useState({
    nome: "",
    whatsapp: "",
    cargo: "",
  });

  useEffect(() => {
    if (profile) {
      setPerfilForm({
        nome: profile.nome ?? "",
        whatsapp: profile.whatsapp ?? "",
        cargo: profile.cargo ?? "",
      });
    }
  }, [profile?.id, profile?.nome, profile?.whatsapp, profile?.cargo]);

  const handleSalvarPerfil = async (e: React.FormEvent) => {
    e.preventDefault();
    await updateProfile({
      nome: perfilForm.nome,
      whatsapp: perfilForm.whatsapp || null,
      cargo: perfilForm.cargo || null,
    });
  };

  // ---------- Seção Empresa ----------
  // Imobiliária comum tem 1 company por tenant. Se houver várias,
  // mostramos a primeira e avisamos no console (não é erro de UX).
  const companyToEdit = companies[0] ?? null;
  useEffect(() => {
    if (companies.length > 1) {
      // eslint-disable-next-line no-console
      console.warn(
        `[Configuracoes] Tenant tem ${companies.length} companies. ` +
          `Editando apenas a primeira (${companyToEdit?.nome_fantasia}). ` +
          `Use a tela Empresas para selecionar outra.`
      );
    }
  }, [companies.length, companyToEdit?.nome_fantasia]);

  const [empresaForm, setEmpresaForm] = useState<CompanyFormData>(emptyCompanyForm);

  useEffect(() => {
    setEmpresaForm(companyToFormData(companyToEdit as unknown as Record<string, unknown> | null));
  }, [companyToEdit?.id]);

  const handleSalvarEmpresa = async (data: CompanyFormData) => {
    if (!companyToEdit?.id) return;
    await updateCompany({ id: companyToEdit.id, ...data });
  };

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
            <CardTitle className="flex items-center gap-2 text-base">
              <User className="h-5 w-5 text-primary" /> Perfil
            </CardTitle>
            <CardDescription>Informações pessoais da sua conta</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSalvarPerfil} className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Nome completo</Label>
                  <Input
                    value={perfilForm.nome}
                    onChange={(e) => setPerfilForm((p) => ({ ...p, nome: e.target.value }))}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>E-mail</Label>
                  <Input value={profile?.email ?? ""} disabled />
                </div>
                <div className="space-y-2">
                  <Label>WhatsApp</Label>
                  <Input
                    value={perfilForm.whatsapp}
                    onChange={(e) =>
                      setPerfilForm((p) => ({ ...p, whatsapp: maskPhone(e.target.value) }))
                    }
                    placeholder="(31) 99999-5858"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Cargo</Label>
                  <Input
                    value={perfilForm.cargo}
                    onChange={(e) => setPerfilForm((p) => ({ ...p, cargo: e.target.value }))}
                    placeholder="Ex.: Diretora Comercial, Corretor Sênior"
                  />
                </div>
              </div>
              <Button type="submit" disabled={isUpdatingProfile || !profile}>
                {isUpdatingProfile ? "Salvando..." : "Salvar alterações"}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Empresa */}
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Building2 className="h-5 w-5 text-primary" /> Empresa
            </CardTitle>
            <CardDescription>
              Dados da sua imobiliária — usados nos contratos gerados (CRECI, dados bancários etc.)
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoadingCompanies ? (
              <Skeleton className="h-64 w-full rounded-lg" />
            ) : !companyToEdit ? (
              <p className="text-sm text-muted-foreground">
                Nenhuma empresa cadastrada para este tenant. Cadastre uma em{" "}
                <button
                  type="button"
                  className="text-primary underline"
                  onClick={() => navigate("/app/empresas")}
                >
                  Empresas
                </button>
                .
              </p>
            ) : (
              <CompanyEditForm
                value={empresaForm}
                onChange={setEmpresaForm}
                onSubmit={handleSalvarEmpresa}
                submitLabel="Salvar alterações"
              />
            )}
          </CardContent>
        </Card>

        {/* Segurança — placeholder. Fluxo de troca de senha exige UX
            dedicada (re-autenticação, verificação por e-mail) — sprint
            futura. */}
        <Card className="shadow-card opacity-70">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Shield className="h-5 w-5 text-primary" /> Segurança
              <span className="ml-2 rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                em breve
              </span>
            </CardTitle>
            <CardDescription>Altere sua senha — disponível em breve</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-start gap-3 rounded-lg border border-dashed border-border p-4 text-sm text-muted-foreground">
              <Lock className="mt-0.5 h-4 w-4 flex-shrink-0" />
              <p>
                A troca de senha pela Configurações ainda não está disponível. Use a opção{" "}
                <button
                  type="button"
                  className="text-primary underline"
                  onClick={() => navigate("/esqueci-senha")}
                >
                  "Esqueci minha senha"
                </button>{" "}
                na tela de login se precisar redefini-la agora.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Plano — placeholder. Integração com billing/Stripe é sprint
            dedicada. */}
        <Card className="shadow-card opacity-70">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <CreditCard className="h-5 w-5 text-primary" /> Plano
              <span className="ml-2 rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                em breve
              </span>
            </CardTitle>
            <CardDescription>Gerenciamento de plano e cobrança — disponível em breve</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Detalhes do plano e cobrança serão exibidos aqui assim que a integração com o sistema
              de pagamento for concluída.
            </p>
          </CardContent>
        </Card>

        {canViewAudit && (
          <Card className="shadow-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <ShieldCheck className="h-5 w-5 text-primary" /> Auditoria
              </CardTitle>
              <CardDescription>
                Registros imutáveis das ações dos usuários (LGPD)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                variant="outline"
                onClick={() => navigate("/app/configuracoes/auditoria")}
                className="w-full justify-between"
              >
                Ver registros de auditoria
                <ChevronRight className="h-4 w-4" />
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default Configuracoes;
