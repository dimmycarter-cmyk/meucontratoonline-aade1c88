import type { ParticipantRole } from "./ParticipantCard";
import type { Genero } from "@/lib/genero";

const ROLE_LABELS: Record<ParticipantRole, string> = {
  vendedor: "Vendedor",
  comprador: "Comprador",
  conjuge: "Cônjuge",
  anuente: "Anuente",
  fiador: "Fiador",
  testemunha: "Testemunha",
  procurador: "Procurador",
  interveniente: "Interveniente",
  outro: "Outro",
};

export { ROLE_LABELS as MANUAL_ROLE_LABELS };

export interface ManualParticipantData {
  id: string;
  role: ParticipantRole;
  nome: string;
  cpf: string;
  rg: string;
  orgao_expedidor: string;
  profissao: string;
  whatsapp: string;
  email: string;
  nacionalidade: string;
  estado_civil: string;
  cep: string;
  rua: string;
  numero: string;
  complemento: string;
  bairro: string;
  cidade: string;
  estado: string;
  contact_id: string | null;
  // Leva 2 — campos extras
  oab?: string;
  regime_bens?: string;
  /** Fonte única de gênero (enum forte). undefined = ainda não selecionado. */
  genero?: Genero;
  data_nascimento?: string;
  banco?: string;
  agencia?: string;
  conta?: string;
  pix?: string;
  /** Marca esse cônjuge para também aparecer como anuente_* (sem duplicar cadastro). */
  also_anuente?: boolean;
  /** Vínculo opcional ao participante "principal" (comprador/vendedor) — usado para cônjuges. */
  linked_to_id?: string | null;
}

export const emptyParticipant = (role: ParticipantRole): ManualParticipantData => ({
  id: crypto.randomUUID(),
  role,
  nome: "",
  cpf: "",
  rg: "",
  orgao_expedidor: "",
  profissao: "",
  whatsapp: "",
  email: "",
  nacionalidade: "Brasileiro(a)",
  estado_civil: "",
  cep: "",
  rua: "",
  numero: "",
  complemento: "",
  bairro: "",
  cidade: "",
  estado: "",
  contact_id: null,
  oab: "",
  regime_bens: "",
  genero: undefined,
  data_nascimento: "",
  banco: "",
  agencia: "",
  conta: "",
  pix: "",
  also_anuente: false,
  linked_to_id: null,
});
