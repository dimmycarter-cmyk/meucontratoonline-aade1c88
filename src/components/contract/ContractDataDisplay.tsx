import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { User, MapPin, Briefcase, FileText } from "lucide-react";

interface ContractDataDisplayProps {
  dados: Record<string, any>;
  participants: any[];
}

const LABEL_MAP: Record<string, string> = {
  comprador_nome: "Nome",
  comprador_cpf: "CPF",
  comprador_rg: "RG",
  comprador_orgao_expedidor: "Órgão Expedidor",
  comprador_profissao: "Profissão",
  comprador_nacionalidade: "Nacionalidade",
  comprador_estado_civil: "Estado Civil",
  comprador_email: "E-mail",
  comprador_whatsapp: "WhatsApp",
  comprador_endereco: "Endereço",
  vendedor_nome: "Nome",
  vendedor_cpf: "CPF",
  vendedor_rg: "RG",
  vendedor_orgao_expedidor: "Órgão Expedidor",
  vendedor_profissao: "Profissão",
  vendedor_nacionalidade: "Nacionalidade",
  vendedor_estado_civil: "Estado Civil",
  vendedor_email: "E-mail",
  vendedor_whatsapp: "WhatsApp",
  vendedor_endereco: "Endereço",
  imovel_endereco: "Endereço do Imóvel",
  imovel_matricula: "Matrícula",
  imovel_cartorio: "Cartório",
  imovel_area: "Área",
  valor_total: "Valor Total",
  valor_sinal: "Valor do Sinal",
  valor_financiamento: "Financiamento",
  empresa_nome: "Empresa",
  empresa_cnpj: "CNPJ",
  empresa_endereco: "Endereço da Empresa",
};

const PARTICIPANT_LABELS: Record<string, string> = {
  full_name: "Nome",
  cpf: "CPF",
  rg: "RG",
  issuing_agency: "Órgão Expedidor",
  profession: "Profissão",
  nationality: "Nacionalidade",
  marital_status: "Estado Civil",
  email: "E-mail",
  whatsapp: "WhatsApp",
  address_street: "Rua",
  address_number: "Número",
  address_complement: "Complemento",
  address_neighborhood: "Bairro",
  address_city: "Cidade",
  address_state: "Estado",
  address_zipcode: "CEP",
  company_name: "Empresa",
  cnpj: "CNPJ",
};

const ROLE_LABELS: Record<string, string> = {
  comprador: "Comprador",
  vendedor: "Vendedor",
  conjuge: "Cônjuge",
  fiador: "Fiador",
  testemunha: "Testemunha",
  procurador: "Procurador",
  interveniente: "Interveniente",
  outro: "Outro",
};

function renderFields(fields: Record<string, string>, labelMap: Record<string, string>) {
  const entries = Object.entries(fields).filter(([_, v]) => v && v.trim());
  if (entries.length === 0) return <p className="text-xs text-muted-foreground">Nenhum dado preenchido.</p>;
  return (
    <div className="space-y-1.5">
      {entries.map(([key, value]) => (
        <div key={key}>
          <span className="text-muted-foreground text-xs">{labelMap[key] || key}</span>
          <p className="text-sm font-medium text-foreground">{value}</p>
        </div>
      ))}
    </div>
  );
}

export default function ContractDataDisplay({ dados, participants }: ContractDataDisplayProps) {
  // Group dados by prefix
  const compradorDados: Record<string, string> = {};
  const vendedorDados: Record<string, string> = {};
  const imovelDados: Record<string, string> = {};
  const empresaDados: Record<string, string> = {};
  const financeiroDados: Record<string, string> = {};
  const outroDados: Record<string, string> = {};

  Object.entries(dados || {}).forEach(([key, value]) => {
    if (!value || typeof value !== "string") return;
    if (key.startsWith("comprador_")) compradorDados[key] = value;
    else if (key.startsWith("vendedor_")) vendedorDados[key] = value;
    else if (key.startsWith("imovel_")) imovelDados[key] = value;
    else if (key.startsWith("empresa_")) empresaDados[key] = value;
    else if (key.startsWith("valor_")) financeiroDados[key] = value;
    else outroDados[key] = value;
  });

  const hasAnyDados = Object.keys(dados || {}).some(k => dados[k] && String(dados[k]).trim());
  const hasParticipants = participants.length > 0;

  if (!hasAnyDados && !hasParticipants) return null;

  return (
    <div className="space-y-4">
      {/* Participants from contract_participants */}
      {participants.map((p: any) => (
        <Card key={p.id} className="shadow-card">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm">
              <User className="h-4 w-4" />
              {ROLE_LABELS[p.role] || p.role}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {renderFields(
              Object.fromEntries(
                Object.entries(PARTICIPANT_LABELS)
                  .map(([key]) => [key, p[key] || ""])
                  .filter(([_, v]) => v)
              ),
              PARTICIPANT_LABELS
            )}
          </CardContent>
        </Card>
      ))}

      {/* Dados JSON grouped */}
      {Object.keys(compradorDados).length > 0 && (
        <Card className="shadow-card">
          <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><User className="h-4 w-4" /> Comprador</CardTitle></CardHeader>
          <CardContent>{renderFields(compradorDados, LABEL_MAP)}</CardContent>
        </Card>
      )}
      {Object.keys(vendedorDados).length > 0 && (
        <Card className="shadow-card">
          <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><User className="h-4 w-4" /> Vendedor</CardTitle></CardHeader>
          <CardContent>{renderFields(vendedorDados, LABEL_MAP)}</CardContent>
        </Card>
      )}
      {Object.keys(imovelDados).length > 0 && (
        <Card className="shadow-card">
          <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><MapPin className="h-4 w-4" /> Imóvel</CardTitle></CardHeader>
          <CardContent>{renderFields(imovelDados, LABEL_MAP)}</CardContent>
        </Card>
      )}
      {Object.keys(financeiroDados).length > 0 && (
        <Card className="shadow-card">
          <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Briefcase className="h-4 w-4" /> Financeiro</CardTitle></CardHeader>
          <CardContent>{renderFields(financeiroDados, LABEL_MAP)}</CardContent>
        </Card>
      )}
      {Object.keys(empresaDados).length > 0 && (
        <Card className="shadow-card">
          <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><FileText className="h-4 w-4" /> Empresa</CardTitle></CardHeader>
          <CardContent>{renderFields(empresaDados, LABEL_MAP)}</CardContent>
        </Card>
      )}
      {Object.keys(outroDados).length > 0 && (
        <Card className="shadow-card">
          <CardHeader className="pb-2"><CardTitle className="text-sm">Outros Dados</CardTitle></CardHeader>
          <CardContent>{renderFields(outroDados, outroDados)}</CardContent>
        </Card>
      )}
    </div>
  );
}
