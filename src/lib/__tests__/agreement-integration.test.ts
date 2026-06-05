/**
 * Testes de integracao da camada de concordancia (Sub-tarefa 2.B) com o motor
 * existente em placeholder.ts. Demonstra o fluxo completo:
 *
 *   1. enrichParticipantsWithAgreementL1(participantsByRole)
 *        -> injeta c_nacionalidade, c_portador, c_inscrito, c_domiciliado em cada item
 *   2. buildAgreementVarsL2(participantsByRole)
 *        -> gera <papel>_titulo, <papel>_artigo, <papel>_denominado
 *   3. expandEachBlocks(template, enriched)
 *        -> expande {{#each vendedores}}...{{/each}} usando os itens enriquecidos
 *   4. preprocessTemplate(text, varsCombined)
 *        -> strip de condicionais + prefixos redundantes
 *   5. replacePlaceholders(text, varsCombined)
 *        -> substitui placeholders globais (incluindo os tokens N2)
 *
 * Esses testes provam que a 2.B funciona ponta-a-ponta SEM tocar no motor.
 */

import { describe, it, expect } from 'vitest';
import {
  enrichParticipantsWithAgreementL1,
  buildAgreementVarsL2,
} from '../agreement';
import {
  expandEachBlocks,
  preprocessTemplate,
  replacePlaceholders,
} from '../placeholder';

/**
 * Helper: simula o pipeline completo de geracao de contrato.
 */
function renderContract(
  template: string,
  participantsByRole: Record<string, Array<Record<string, string>>>,
  extraVars: Record<string, string> = {},
): string {
  const enriched = enrichParticipantsWithAgreementL1(participantsByRole);
  const varsL2 = buildAgreementVarsL2(participantsByRole);
  const allVars = { ...extraVars, ...varsL2 };

  const step1 = expandEachBlocks(template, enriched);
  const step2 = preprocessTemplate(step1, allVars);
  const step3 = replacePlaceholders(step2, allVars);
  return step3;
}

describe('integration — fluxo completo N1 + N2 com motor real', () => {
  it('1 vendedor M: tokens N1 dentro do bloco + N2 fora', () => {
    const template =
      'Como {{vendedores_titulo}}: {{#each vendedores}}{{nome}}, {{c_nacionalidade}}, {{c_portador}} do CPF {{cpf}}{{/each}}, doravante {{vendedores_denominado}}.';

    const out = renderContract(template, {
      vendedores: [
        { id: '1', nome: 'Joao Silva', cpf: '111.111.111-11', genero: 'M' },
      ],
    });

    expect(out).toContain('Como PROMITENTE VENDEDOR:');
    expect(out).toContain('Joao Silva, brasileiro, portador do CPF 111.111.111-11');
    expect(out).toContain('doravante denominado');
  });

  it('1 vendedora F: tokens femininos', () => {
    const template =
      'Como {{vendedores_titulo}}: {{#each vendedores}}{{nome}}, {{c_nacionalidade}}, {{c_portador}} do CPF {{cpf}}{{/each}}, doravante {{vendedores_denominado}}.';

    const out = renderContract(template, {
      vendedores: [
        { id: '1', nome: 'Maria Souza', cpf: '222.222.222-22', genero: 'F' },
      ],
    });

    expect(out).toContain('Como PROMITENTE VENDEDORA:');
    expect(out).toContain('Maria Souza, brasileira, portadora do CPF 222.222.222-22');
    expect(out).toContain('doravante denominada');
  });

  it('2 vendedores misto M+F: lista PT-BR + masculino plural', () => {
    const template =
      'Como {{vendedores_titulo}}: {{#each vendedores}}{{nome}}, {{c_nacionalidade}}, {{c_portador}} do CPF {{cpf}}{{/each}}, doravante {{vendedores_denominado}}.';

    const out = renderContract(template, {
      vendedores: [
        { id: '1', nome: 'Dimmy Carter', cpf: '111.111.111-11', genero: 'M' },
        { id: '2', nome: 'Andreia Souza', cpf: '222.222.222-22', genero: 'F' },
      ],
    });

    // N2 (titulo) — plural masculino por regra do misto
    expect(out).toContain('Como PROMITENTES VENDEDORES:');
    // N1 individual (cada um concorda com proprio genero)
    expect(out).toContain('Dimmy Carter, brasileiro, portador do CPF 111.111.111-11');
    expect(out).toContain('Andreia Souza, brasileira, portadora do CPF 222.222.222-22');
    // Lista PT-BR (separador " e " entre os dois)
    expect(out).toMatch(/Dimmy Carter.*?\se\sAndreia Souza/);
    // N2 (denominado) — plural masculino
    expect(out).toContain('doravante denominados');
  });

  it('2 vendedoras ambas F: tudo plural feminino', () => {
    const template =
      'Como {{vendedores_titulo}}: {{#each vendedores}}{{nome}}, {{c_nacionalidade}}, {{c_portador}}{{/each}}, doravante {{vendedores_denominado}}.';

    const out = renderContract(template, {
      vendedores: [
        { id: '1', nome: 'Ana', genero: 'F' },
        { id: '2', nome: 'Beatriz', genero: 'F' },
      ],
    });

    expect(out).toContain('Como PROMITENTES VENDEDORAS:');
    expect(out).toContain('Ana, brasileira, portadora');
    expect(out).toContain('Beatriz, brasileira, portadora');
    expect(out).toContain('doravante denominadas');
  });

  it('0 vendedores: tokens N2 vazios, bloco {{#each}} some', () => {
    const template =
      'Como {{vendedores_titulo}}: {{#each vendedores}}{{nome}}{{/each}}, fim.';

    const out = renderContract(template, {
      vendedores: [],
    });

    // Token N2 vazio (campo sem dado)
    expect(out).not.toContain('PROMITENTE');
    // Bloco {{#each}} expande para string vazia
    expect(out).not.toContain('{{nome}}');
    expect(out).not.toContain('{{#each');
  });

  it('multiplos papeis simultaneos (vendedor + comprador + anuente)', () => {
    const template =
      'Vendedor: {{#each vendedores}}{{nome}} ({{c_nacionalidade}}){{/each}} — {{vendedores_titulo}}. ' +
      'Comprador: {{#each compradores}}{{nome}} ({{c_nacionalidade}}){{/each}} — {{compradores_titulo}}. ' +
      'Anuente: {{#each anuentes}}{{nome}}{{/each}} — {{anuentes_titulo}}.';

    const out = renderContract(template, {
      vendedores:  [{ id: 'v1', nome: 'Dimmy', genero: 'M' }],
      compradores: [{ id: 'c1', nome: 'Maria', genero: 'F' }],
      anuentes:    [{ id: 'a1', nome: 'Jose', genero: 'M' }],
    });

    expect(out).toContain('Dimmy (brasileiro) — PROMITENTE VENDEDOR');
    expect(out).toContain('Maria (brasileira) — PROMISSARIA COMPRADORA');
    expect(out).toContain('Jose — ANUENTE');
  });

  it('campo cru `nacionalidade` preservado, token c_nacionalidade concorda', () => {
    // O usuario pode preencher nacionalidade=Italiano. O token raw deve preservar.
    // Mas o token concordado (c_nacionalidade) sempre segue o genero.
    const template =
      '{{#each vendedores}}{{nome}}: raw={{nacionalidade}} | concord={{c_nacionalidade}}{{/each}}';

    const out = renderContract(template, {
      vendedores: [
        { id: '1', nome: 'Marco', nacionalidade: 'Italiano', genero: 'M' },
      ],
    });

    expect(out).toContain('raw=Italiano');
    expect(out).toContain('concord=brasileiro');
  });

  it('genero vazio (texto livre "") => fallback masculino', () => {
    const template =
      '{{#each vendedores}}{{nome}}, {{c_portador}}{{/each}}, {{vendedores_titulo}}';

    const out = renderContract(template, {
      vendedores: [{ id: '1', nome: 'Sem Genero', genero: '' }],
    });

    // Fallback: undefined => M
    expect(out).toContain('Sem Genero, portador');
    expect(out).toContain('PROMITENTE VENDEDOR');
  });

  it('genero texto livre "Feminino" => normalizado para F', () => {
    const template =
      '{{#each vendedores}}{{nome}}, {{c_portador}}{{/each}}, {{vendedores_titulo}}';

    const out = renderContract(template, {
      vendedores: [{ id: '1', nome: 'Andreia', genero: 'Feminino' }],
    });

    expect(out).toContain('Andreia, portadora');
    expect(out).toContain('PROMITENTE VENDEDORA');
  });
});
