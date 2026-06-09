/**
 * Fonte ÚNICA do tipo de gênero e da sua normalização.
 *
 * Antes vivia em agreement.ts (acoplado à camada de concordância). Hoistado para
 * cá para ser reusado por toda a captura (wizard, contato), persistência e
 * resolução — sem duplicar a regra de normalização. agreement.ts re-exporta
 * `Genero` e `normalizeGenero` daqui para não quebrar importadores existentes.
 *
 * Regra: só M/F são gênero válido (contrato jurídico não adivinha). Qualquer
 * outra entrada (vazio, "Outro", texto livre não reconhecido) => undefined.
 */
export type Genero = 'M' | 'F';

/**
 * Normaliza texto livre/legado para o enum `Genero`.
 *
 * Aceita: 'M','m','Masculino','MASC' / 'F','f','Feminino','FEM' (case-insensitive,
 * com trim). Qualquer outra coisa (incl. '', null, undefined, 'Outro', 'homem')
 * => undefined. NÃO adivinha a partir de nome/heurística.
 */
export function normalizeGenero(input: string | undefined | null): Genero | undefined {
  if (!input) return undefined;
  const v = input.trim().toUpperCase();
  if (v === '') return undefined;
  if (v === 'M' || v === 'MASC' || v === 'MASCULINO') return 'M';
  if (v === 'F' || v === 'FEM' || v === 'FEMININO') return 'F';
  return undefined;
}
