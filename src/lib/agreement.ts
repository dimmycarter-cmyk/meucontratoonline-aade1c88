/**
 * Camada de concordancia PT-BR — Sub-tarefa 2.B do Passo 2.
 *
 * Resolve tokens que variam com genero/numero, em dois niveis, e fornece
 * funcoes de enriquecimento prontas pra plugar antes do motor de placeholders.
 *
 *  Nivel 1 (por participante): c_nacionalidade, c_portador, c_inscrito, c_domiciliado.
 *    Prefixo `c_` para evitar colisao com campos crus do participante
 *    (ex.: `nacionalidade` ja existe como texto livre default "Brasileiro(a)").
 *
 *  Nivel 2 (por grupo/papel): <papel>_titulo, <papel>_artigo, <papel>_denominado.
 *    Sufixos com underscore (nao ponto) por compatibilidade com o regex atual
 *    do motor: /\{\{\s*([\w]+)\s*\}\}/g.
 *
 * Funcao PURA e DETERMINISTICA. Mesma entrada => mesma saida.
 *
 * Regra PT-BR canonica: grupo misto (M + F) => masculino plural.
 *
 * Fallback de genero ausente:
 *   undefined => tratado como Masculino. Nao quebra geracao.
 *   Telemetria deve ser plugada por quem chama (fora desta camada pura).
 *
 * Estrategia arquitetural:
 *   Esta camada NAO toca em placeholder.ts. Em vez disso, expoe duas
 *   funcoes de enriquecimento (enrichParticipantsWithAgreementL1 e
 *   buildAgreementVarsL2) que sao chamadas ANTES de expandEachBlocks /
 *   replacePlaceholders. O motor existente consome o resultado como se
 *   fossem dados normais. Zero refactor do motor.
 */

import type { Genero } from './genero';
import { normalizeGenero } from './genero';

// Re-export para não quebrar importadores históricos de agreement.ts.
// Fonte única real: ./genero.
export type { Genero };
export { normalizeGenero };

export type RoleKey =
  | 'vendedores'
  | 'compradores'
  | 'conjuges'
  | 'anuentes'
  | 'fiadores'
  | 'testemunhas'
  | 'procuradores'
  | 'intervenientes';

export type AgreementLevel1 = {
  nacionalidade: string;  // brasileiro / brasileira
  portador: string;       // portador  / portadora
  inscrito: string;       // inscrito  / inscrita
  domiciliado: string;    // domiciliado / domiciliada
};

export type AgreementLevel2 = {
  titulo: string;       // PROMITENTE VENDEDOR / VENDEDORA / VENDEDORES / VENDEDORAS
  artigo: string;       // o / a / os / as
  denominado: string;   // denominado / -a / -os / -as
};

type RoleConfig = {
  singularM: string;
  singularF: string;
  pluralM: string;
  pluralF: string;
};

/**
 * Catalogo central de papeis. Adicionar novo papel = adicionar entrada aqui.
 * Motor e regras nao mudam. Escala 100+ por design.
 *
 * Removido nesta versao: `intermediadoras` (e entidade do imovel, nao participant role).
 * Adicionados: `conjuges`, `procuradores`, `intervenientes` (alinhamento com ROLE_LABELS).
 */
const ROLE_CATALOG: Record<RoleKey, RoleConfig> = {
  vendedores: {
    singularM: 'PROMITENTE VENDEDOR',
    singularF: 'PROMITENTE VENDEDORA',
    pluralM:   'PROMITENTES VENDEDORES',
    pluralF:   'PROMITENTES VENDEDORAS',
  },
  compradores: {
    singularM: 'PROMISSARIO COMPRADOR',
    singularF: 'PROMISSARIA COMPRADORA',
    pluralM:   'PROMISSARIOS COMPRADORES',
    pluralF:   'PROMISSARIAS COMPRADORAS',
  },
  conjuges: {
    singularM: 'CONJUGE',
    singularF: 'CONJUGE',
    pluralM:   'CONJUGES',
    pluralF:   'CONJUGES',
  },
  anuentes: {
    singularM: 'ANUENTE',
    singularF: 'ANUENTE',
    pluralM:   'ANUENTES',
    pluralF:   'ANUENTES',
  },
  fiadores: {
    singularM: 'FIADOR',
    singularF: 'FIADORA',
    pluralM:   'FIADORES',
    pluralF:   'FIADORAS',
  },
  testemunhas: {
    singularM: 'TESTEMUNHA',
    singularF: 'TESTEMUNHA',
    pluralM:   'TESTEMUNHAS',
    pluralF:   'TESTEMUNHAS',
  },
  procuradores: {
    singularM: 'PROCURADOR',
    singularF: 'PROCURADORA',
    pluralM:   'PROCURADORES',
    pluralF:   'PROCURADORAS',
  },
  intervenientes: {
    singularM: 'INTERVENIENTE',
    singularF: 'INTERVENIENTE',
    pluralM:   'INTERVENIENTES',
    pluralF:   'INTERVENIENTES',
  },
};

// =============================================================================
// CORE — funcoes puras de resolucao (Nivel 1 e Nivel 2)
// =============================================================================

/**
 * Nivel 1 — concordancia por participante (genero individual).
 *
 * @param genero 'M' | 'F' | undefined. undefined => fallback masculino.
 */
export function resolveLevel1(genero: Genero | undefined): AgreementLevel1 {
  const isF = genero === 'F';
  return {
    nacionalidade: isF ? 'brasileira'  : 'brasileiro',
    portador:      isF ? 'portadora'   : 'portador',
    inscrito:      isF ? 'inscrita'    : 'inscrito',
    domiciliado:   isF ? 'domiciliada' : 'domiciliado',
  };
}

/**
 * Nivel 2 — concordancia por grupo/papel (contagem + composicao de genero).
 *
 * Matriz de selecao (SPEC §4):
 *   - 1 participante  M           => singularM / "o"  / "denominado"
 *   - 1 participante  F           => singularF / "a"  / "denominada"
 *   - 2+ todos M ou misto         => pluralM   / "os" / "denominados"   (regra PT do misto)
 *   - 2+ todas F                  => pluralF   / "as" / "denominadas"
 *
 * Edge cases:
 *   - Array vazio       => tokens vazios.
 *   - roleKey invalido  => lanca Error.
 *   - genero undefined em algum membro => conta como Masculino (fallback).
 */
export function resolveLevel2(
  participants: ReadonlyArray<{ genero?: Genero }>,
  roleKey: RoleKey,
): AgreementLevel2 {
  const config = ROLE_CATALOG[roleKey];
  if (!config) {
    throw new Error(`[agreement] roleKey desconhecido: "${roleKey}"`);
  }

  const n = participants.length;
  if (n === 0) {
    return { titulo: '', artigo: '', denominado: '' };
  }

  const generos = participants.map(p => p.genero ?? 'M');
  const todasF = generos.every(g => g === 'F');

  if (n === 1) {
    const isF = generos[0] === 'F';
    return isF
      ? { titulo: config.singularF, artigo: 'a', denominado: 'denominada' }
      : { titulo: config.singularM, artigo: 'o', denominado: 'denominado' };
  }

  // n >= 2
  return todasF
    ? { titulo: config.pluralF, artigo: 'as', denominado: 'denominadas' }
    : { titulo: config.pluralM, artigo: 'os', denominado: 'denominados' };
}

// =============================================================================
// ADAPTERS — ponte entre o tipo bruto do participante e o tipo estrito da camada
// (normalizeGenero foi hoistado para ./genero; reusado/re-exportado acima)
// =============================================================================

// =============================================================================
// ENRICHMENT — funcoes prontas pra plugar antes do motor
// =============================================================================

/**
 * Enriquece cada participante com tokens N1 (c_nacionalidade, c_portador,
 * c_inscrito, c_domiciliado), derivados do genero individual.
 *
 * O prefixo `c_` (de "concordancia") evita colisao com campos crus do
 * participante. Exemplo: o item ja tem `nacionalidade` como texto livre com
 * default "Brasileiro(a)". O token concordado fica em `c_nacionalidade`.
 *
 * Decisao arquitetural (Achado A, opcao C):
 *   - Tokens da camada vivem em namespace dedicado (c_*).
 *   - Campos crus do participante permanecem intocados.
 *   - O autor do template escolhe: {{nacionalidade}} (raw) ou {{c_nacionalidade}} (concordado).
 *
 * @param participantsByRole map de papel (plural) -> array de participantes brutos
 * @returns mesmo formato, mas cada item recebe c_* injetados
 */
export function enrichParticipantsWithAgreementL1(
  participantsByRole: Record<string, Array<Record<string, string>>>,
): Record<string, Array<Record<string, string>>> {
  const out: Record<string, Array<Record<string, string>>> = {};
  for (const [role, items] of Object.entries(participantsByRole)) {
    out[role] = items.map((item) => {
      const generoNormalizado = normalizeGenero(item.genero);
      const tokensN1 = resolveLevel1(generoNormalizado);
      return {
        ...item,
        c_nacionalidade: tokensN1.nacionalidade,
        c_portador:      tokensN1.portador,
        c_inscrito:      tokensN1.inscrito,
        c_domiciliado:   tokensN1.domiciliado,
      };
    });
  }
  return out;
}

/**
 * Gera tokens N2 (titulo, artigo, denominado) para TODOS os papeis do
 * catalogo, baseado em contagem + composicao de genero do grupo.
 *
 * Saida: vars planas com chave `<papel>_<token>`, prontas pra mesclar com o
 * objeto `vars` que vai pro replacePlaceholders. Exemplo:
 *
 *   {
 *     vendedores_titulo:     "PROMITENTES VENDEDORES",
 *     vendedores_artigo:     "os",
 *     vendedores_denominado: "denominados",
 *     compradores_titulo:    "PROMISSARIO COMPRADOR",
 *     // ... para todos os papeis do catalogo
 *   }
 *
 * Por que SEMPRE emite todos os papeis (mesmo ausentes no input)?
 *   - Evita que {{vendedores_titulo}} fique literal no contrato quando o
 *     papel nao foi preenchido. Papeis ausentes => tokens vazios.
 *   - O texto ao redor (rotulos, secoes) deve usar {{#if}} ou {{#each}} pra
 *     desaparecer quando o grupo esta vazio (responsabilidade do template).
 *
 * @param participantsByRole map de papel (plural) -> array de participantes
 *   (genero pode estar no campo `genero` como texto livre).
 * @returns Record<string, string> pronto pra mesclar com vars globais.
 */
export function buildAgreementVarsL2(
  participantsByRole: Record<string, Array<Record<string, string>>>,
): Record<string, string> {
  const vars: Record<string, string> = {};
  const allRoles: RoleKey[] = Object.keys(ROLE_CATALOG) as RoleKey[];
  for (const role of allRoles) {
    const items = participantsByRole[role] ?? [];
    const normalized: Array<{ genero?: Genero }> = items.map((item) => ({
      genero: normalizeGenero(item.genero),
    }));
    const tokens = resolveLevel2(normalized, role);
    vars[`${role}_titulo`]     = tokens.titulo;
    vars[`${role}_artigo`]     = tokens.artigo;
    vars[`${role}_denominado`] = tokens.denominado;
  }
  return vars;
}
