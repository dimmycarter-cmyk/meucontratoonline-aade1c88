import { describe, it, expect } from 'vitest';
import {
  resolveLevel1,
  resolveLevel2,
  normalizeGenero,
  enrichParticipantsWithAgreementL1,
  buildAgreementVarsL2,
} from '../agreement';

// ============================================================================
// CORE — resolveLevel1 / resolveLevel2 (herdado da 2.A)
// ============================================================================

describe('agreement — Nivel 1 (por participante)', () => {
  it('genero M => tokens masculinos', () => {
    expect(resolveLevel1('M')).toEqual({
      nacionalidade: 'brasileiro',
      portador: 'portador',
      inscrito: 'inscrito',
      domiciliado: 'domiciliado',
    });
  });

  it('genero F => tokens femininos', () => {
    expect(resolveLevel1('F')).toEqual({
      nacionalidade: 'brasileira',
      portador: 'portadora',
      inscrito: 'inscrita',
      domiciliado: 'domiciliada',
    });
  });

  it('genero undefined => fallback masculino (SPEC secao 2)', () => {
    expect(resolveLevel1(undefined)).toEqual({
      nacionalidade: 'brasileiro',
      portador: 'portador',
      inscrito: 'inscrito',
      domiciliado: 'domiciliado',
    });
  });
});

describe('agreement — Nivel 2 (por grupo)', () => {
  describe('vendedores', () => {
    it('1 vendedor M', () => {
      expect(resolveLevel2([{ genero: 'M' }], 'vendedores')).toEqual({
        titulo: 'PROMITENTE VENDEDOR',
        artigo: 'o',
        denominado: 'denominado',
      });
    });

    it('1 vendedor F', () => {
      expect(resolveLevel2([{ genero: 'F' }], 'vendedores')).toEqual({
        titulo: 'PROMITENTE VENDEDORA',
        artigo: 'a',
        denominado: 'denominada',
      });
    });

    it('2 vendedores ambos M', () => {
      expect(resolveLevel2([{ genero: 'M' }, { genero: 'M' }], 'vendedores')).toEqual({
        titulo: 'PROMITENTES VENDEDORES',
        artigo: 'os',
        denominado: 'denominados',
      });
    });

    it('2 vendedoras ambas F', () => {
      expect(resolveLevel2([{ genero: 'F' }, { genero: 'F' }], 'vendedores')).toEqual({
        titulo: 'PROMITENTES VENDEDORAS',
        artigo: 'as',
        denominado: 'denominadas',
      });
    });

    it('2 vendedores misto M+F => masculino plural (regra PT)', () => {
      expect(resolveLevel2([{ genero: 'M' }, { genero: 'F' }], 'vendedores')).toEqual({
        titulo: 'PROMITENTES VENDEDORES',
        artigo: 'os',
        denominado: 'denominados',
      });
    });

    it('3 vendedores 2F+1M => masculino plural', () => {
      const r = resolveLevel2(
        [{ genero: 'F' }, { genero: 'F' }, { genero: 'M' }],
        'vendedores',
      );
      expect(r.titulo).toBe('PROMITENTES VENDEDORES');
    });

    it('genero undefined em algum membro conta como M (fallback)', () => {
      const r = resolveLevel2([{}, { genero: 'F' }], 'vendedores');
      expect(r.titulo).toBe('PROMITENTES VENDEDORES');
    });
  });

  describe('compradores', () => {
    it('1 comprador M', () => {
      expect(resolveLevel2([{ genero: 'M' }], 'compradores').titulo)
        .toBe('PROMISSARIO COMPRADOR');
    });
    it('1 compradora F', () => {
      expect(resolveLevel2([{ genero: 'F' }], 'compradores').titulo)
        .toBe('PROMISSARIA COMPRADORA');
    });
    it('2 compradoras F', () => {
      expect(resolveLevel2([{ genero: 'F' }, { genero: 'F' }], 'compradores').titulo)
        .toBe('PROMISSARIAS COMPRADORAS');
    });
  });

  describe('anuentes (invariavel em singular)', () => {
    it('1 anuente M => ANUENTE', () => {
      expect(resolveLevel2([{ genero: 'M' }], 'anuentes').titulo).toBe('ANUENTE');
    });
    it('1 anuente F => ANUENTE (mesmo termo)', () => {
      expect(resolveLevel2([{ genero: 'F' }], 'anuentes').titulo).toBe('ANUENTE');
    });
    it('2 anuentes misto => ANUENTES', () => {
      expect(resolveLevel2([{ genero: 'M' }, { genero: 'F' }], 'anuentes').titulo)
        .toBe('ANUENTES');
    });
  });

  describe('fiadores', () => {
    it('1 fiador M', () => {
      expect(resolveLevel2([{ genero: 'M' }], 'fiadores').titulo).toBe('FIADOR');
    });
    it('1 fiadora F', () => {
      expect(resolveLevel2([{ genero: 'F' }], 'fiadores').titulo).toBe('FIADORA');
    });
    it('2 fiadoras F', () => {
      expect(resolveLevel2([{ genero: 'F' }, { genero: 'F' }], 'fiadores').titulo)
        .toBe('FIADORAS');
    });
  });

  // ---------------------------------------------------------------------------
  // Papeis NOVOS na 2.B
  // ---------------------------------------------------------------------------

  describe('conjuges (invariavel em singular)', () => {
    it('1 conjuge M => CONJUGE', () => {
      expect(resolveLevel2([{ genero: 'M' }], 'conjuges').titulo).toBe('CONJUGE');
    });
    it('1 conjuge F => CONJUGE (mesmo termo)', () => {
      expect(resolveLevel2([{ genero: 'F' }], 'conjuges').titulo).toBe('CONJUGE');
    });
    it('2 conjuges => CONJUGES', () => {
      expect(resolveLevel2([{ genero: 'M' }, { genero: 'F' }], 'conjuges').titulo)
        .toBe('CONJUGES');
    });
  });

  describe('procuradores', () => {
    it('1 procurador M', () => {
      expect(resolveLevel2([{ genero: 'M' }], 'procuradores').titulo).toBe('PROCURADOR');
    });
    it('1 procuradora F', () => {
      expect(resolveLevel2([{ genero: 'F' }], 'procuradores').titulo).toBe('PROCURADORA');
    });
    it('2 procuradores misto => masculino plural', () => {
      expect(resolveLevel2([{ genero: 'M' }, { genero: 'F' }], 'procuradores').titulo)
        .toBe('PROCURADORES');
    });
  });

  describe('intervenientes (invariavel)', () => {
    it('1 interveniente => INTERVENIENTE', () => {
      expect(resolveLevel2([{ genero: 'M' }], 'intervenientes').titulo).toBe('INTERVENIENTE');
    });
    it('2 intervenientes => INTERVENIENTES', () => {
      expect(resolveLevel2([{ genero: 'F' }, { genero: 'F' }], 'intervenientes').titulo)
        .toBe('INTERVENIENTES');
    });
  });

  describe('edge cases', () => {
    it('array vazio => tokens vazios (motor cobre via bloco condicional)', () => {
      expect(resolveLevel2([], 'vendedores')).toEqual({
        titulo: '',
        artigo: '',
        denominado: '',
      });
    });

    it('roleKey invalido => lanca Error', () => {
      expect(() => resolveLevel2([{ genero: 'M' }], 'inexistente' as any))
        .toThrow(/roleKey desconhecido/);
    });
  });
});

// ============================================================================
// ADAPTERS — normalizeGenero (novo na 2.B)
// ============================================================================

describe('agreement — normalizeGenero', () => {
  it('undefined => undefined', () => {
    expect(normalizeGenero(undefined)).toBeUndefined();
  });

  it('string vazia => undefined', () => {
    expect(normalizeGenero('')).toBeUndefined();
    expect(normalizeGenero('   ')).toBeUndefined();
  });

  it('case-insensitive: "M", "m", "Masculino", "masculino", "MASC" => M', () => {
    expect(normalizeGenero('M')).toBe('M');
    expect(normalizeGenero('m')).toBe('M');
    expect(normalizeGenero('Masculino')).toBe('M');
    expect(normalizeGenero('masculino')).toBe('M');
    expect(normalizeGenero('MASC')).toBe('M');
    expect(normalizeGenero('masc')).toBe('M');
  });

  it('case-insensitive: "F", "f", "Feminino", "feminino", "FEM" => F', () => {
    expect(normalizeGenero('F')).toBe('F');
    expect(normalizeGenero('f')).toBe('F');
    expect(normalizeGenero('Feminino')).toBe('F');
    expect(normalizeGenero('feminino')).toBe('F');
    expect(normalizeGenero('FEM')).toBe('F');
    expect(normalizeGenero('fem')).toBe('F');
  });

  it('trim aplicado antes do match', () => {
    expect(normalizeGenero('  Masculino  ')).toBe('M');
    expect(normalizeGenero('\tF\n')).toBe('F');
  });

  it('valores desconhecidos => undefined (sem chutar)', () => {
    expect(normalizeGenero('Outro')).toBeUndefined();
    expect(normalizeGenero('X')).toBeUndefined();
    expect(normalizeGenero('homem')).toBeUndefined();  // nao adivinha
    expect(normalizeGenero('mulher')).toBeUndefined(); // nao adivinha
    expect(normalizeGenero('123')).toBeUndefined();
  });
});

// ============================================================================
// ENRICHMENT — enrichParticipantsWithAgreementL1 (novo na 2.B)
// ============================================================================

describe('agreement — enrichParticipantsWithAgreementL1', () => {
  it('injeta c_* em cada participante, preserva campos originais', () => {
    const input = {
      vendedores: [
        { id: '1', nome: 'Joao', genero: 'M', nacionalidade: 'Brasileiro(a)' },
        { id: '2', nome: 'Maria', genero: 'F', nacionalidade: 'Brasileiro(a)' },
      ],
    };
    const out = enrichParticipantsWithAgreementL1(input);

    expect(out.vendedores).toHaveLength(2);

    // Campos originais preservados
    expect(out.vendedores[0].id).toBe('1');
    expect(out.vendedores[0].nome).toBe('Joao');
    expect(out.vendedores[0].nacionalidade).toBe('Brasileiro(a)'); // raw preservado

    // Tokens N1 injetados
    expect(out.vendedores[0].c_nacionalidade).toBe('brasileiro');
    expect(out.vendedores[0].c_portador).toBe('portador');
    expect(out.vendedores[0].c_inscrito).toBe('inscrito');
    expect(out.vendedores[0].c_domiciliado).toBe('domiciliado');

    expect(out.vendedores[1].c_nacionalidade).toBe('brasileira');
    expect(out.vendedores[1].c_portador).toBe('portadora');
    expect(out.vendedores[1].c_inscrito).toBe('inscrita');
    expect(out.vendedores[1].c_domiciliado).toBe('domiciliada');
  });

  it('genero vazio => fallback masculino nos c_*', () => {
    const input = {
      vendedores: [{ id: '1', nome: 'Sem Genero', genero: '' }],
    };
    const out = enrichParticipantsWithAgreementL1(input);
    expect(out.vendedores[0].c_nacionalidade).toBe('brasileiro');
    expect(out.vendedores[0].c_portador).toBe('portador');
  });

  it('genero ausente (undefined) => fallback masculino', () => {
    const input = {
      vendedores: [{ id: '1', nome: 'Sem Campo' }],
    };
    const out = enrichParticipantsWithAgreementL1(input);
    expect(out.vendedores[0].c_nacionalidade).toBe('brasileiro');
  });

  it('papel vazio (array []) => mantem papel com array vazio', () => {
    const input = { vendedores: [] };
    const out = enrichParticipantsWithAgreementL1(input);
    expect(out.vendedores).toEqual([]);
  });

  it('multiplos papeis processados independentemente', () => {
    const input = {
      vendedores: [{ id: 'v1', genero: 'M' }],
      compradores: [{ id: 'c1', genero: 'F' }],
      anuentes: [],
    };
    const out = enrichParticipantsWithAgreementL1(input);
    expect(out.vendedores[0].c_nacionalidade).toBe('brasileiro');
    expect(out.compradores[0].c_nacionalidade).toBe('brasileira');
    expect(out.anuentes).toEqual([]);
  });

  it('genero "Masculino" texto livre normalizado corretamente', () => {
    const input = {
      vendedores: [{ id: '1', genero: 'Masculino' }],
    };
    const out = enrichParticipantsWithAgreementL1(input);
    expect(out.vendedores[0].c_nacionalidade).toBe('brasileiro');
  });
});

// ============================================================================
// ENRICHMENT — buildAgreementVarsL2 (novo na 2.B)
// ============================================================================

describe('agreement — buildAgreementVarsL2', () => {
  it('emite tokens para TODOS os papeis do catalogo (mesmo ausentes)', () => {
    const out = buildAgreementVarsL2({});
    // Todos os 8 papeis x 3 tokens = 24 chaves
    expect(Object.keys(out)).toHaveLength(24);
    expect(out.vendedores_titulo).toBe('');
    expect(out.compradores_titulo).toBe('');
    expect(out.conjuges_titulo).toBe('');
    expect(out.anuentes_titulo).toBe('');
    expect(out.fiadores_titulo).toBe('');
    expect(out.testemunhas_titulo).toBe('');
    expect(out.procuradores_titulo).toBe('');
    expect(out.intervenientes_titulo).toBe('');
  });

  it('1 vendedor M => tokens singular masculino', () => {
    const out = buildAgreementVarsL2({
      vendedores: [{ id: '1', genero: 'M' }],
    });
    expect(out.vendedores_titulo).toBe('PROMITENTE VENDEDOR');
    expect(out.vendedores_artigo).toBe('o');
    expect(out.vendedores_denominado).toBe('denominado');
  });

  it('2 vendedores misto M+F => masculino plural', () => {
    const out = buildAgreementVarsL2({
      vendedores: [{ id: '1', genero: 'M' }, { id: '2', genero: 'F' }],
    });
    expect(out.vendedores_titulo).toBe('PROMITENTES VENDEDORES');
    expect(out.vendedores_artigo).toBe('os');
    expect(out.vendedores_denominado).toBe('denominados');
  });

  it('papeis nao-catalogados no input sao ignorados', () => {
    const out = buildAgreementVarsL2({
      vendedores: [{ id: '1', genero: 'F' }],
      papel_inexistente: [{ id: 'x' }],
    } as any);
    expect(out.vendedores_titulo).toBe('PROMITENTE VENDEDORA');
    expect((out as any).papel_inexistente_titulo).toBeUndefined();
  });

  it('genero texto livre normalizado corretamente', () => {
    const out = buildAgreementVarsL2({
      vendedores: [
        { id: '1', genero: 'Masculino' },
        { id: '2', genero: 'feminino' },
      ],
    });
    // M + F = misto => masculino plural
    expect(out.vendedores_titulo).toBe('PROMITENTES VENDEDORES');
  });

  it('multiplos papeis simultaneos', () => {
    const out = buildAgreementVarsL2({
      vendedores:  [{ id: 'v1', genero: 'F' }],
      compradores: [{ id: 'c1', genero: 'M' }, { id: 'c2', genero: 'M' }],
      anuentes:    [{ id: 'a1', genero: 'F' }],
    });
    expect(out.vendedores_titulo).toBe('PROMITENTE VENDEDORA');
    expect(out.compradores_titulo).toBe('PROMISSARIOS COMPRADORES');
    expect(out.anuentes_titulo).toBe('ANUENTE');
  });
});
