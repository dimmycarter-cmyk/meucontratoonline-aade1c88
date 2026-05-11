/**
 * Formatadores universais para contratos imobiliários.
 * Funções puras — sem side effects.
 */

const onlyDigits = (s: string) => (s || "").replace(/\D/g, "");

export function formatBRL(value: number | string | null | undefined): string {
  if (value === null || value === undefined || value === "") return "";
  const num = typeof value === "number" ? value : Number(String(value).replace(/\./g, "").replace(",", "."));
  if (!isFinite(num)) return String(value);
  return num.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function formatCPF(value: string | null | undefined): string {
  const d = onlyDigits(value || "");
  if (d.length !== 11) return value || "";
  return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`;
}

export function formatCNPJ(value: string | null | undefined): string {
  const d = onlyDigits(value || "");
  if (d.length !== 14) return value || "";
  return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8, 12)}-${d.slice(12)}`;
}

export function formatCEP(value: string | null | undefined): string {
  const d = onlyDigits(value || "");
  if (d.length !== 8) return value || "";
  return `${d.slice(0, 5)}-${d.slice(5)}`;
}

/**
 * Retorna true se `value` é truthy e contém exatamente 8 dígitos numéricos
 * (com ou sem hífen). Útil para decidir se um aviso de "CEP malformado"
 * deve ser emitido pelo caller — `formatCEP` em si é silencioso por design
 * (retorna o valor cru quando não consegue formatar).
 */
export function isValidCep(value: string | null | undefined): boolean {
  if (!value) return false;
  return onlyDigits(value).length === 8;
}

export function formatTelefone(value: string | null | undefined): string {
  const d = onlyDigits(value || "");
  if (d.length === 11) return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
  if (d.length === 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return value || "";
}

const MESES = [
  "janeiro", "fevereiro", "março", "abril", "maio", "junho",
  "julho", "agosto", "setembro", "outubro", "novembro", "dezembro",
];

function parseDate(value: string | Date | null | undefined): Date | null {
  if (!value) return null;
  if (value instanceof Date) return isNaN(value.getTime()) ? null : value;
  const s = String(value).trim();
  // ISO yyyy-mm-dd
  const iso = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return new Date(Number(iso[1]), Number(iso[2]) - 1, Number(iso[3]));
  // dd/mm/yyyy
  const br = s.match(/^(\d{2})\/(\d{2})\/(\d{4})/);
  if (br) return new Date(Number(br[3]), Number(br[2]) - 1, Number(br[1]));
  const d = new Date(s);
  return isNaN(d.getTime()) ? null : d;
}

export function formatDataCurta(value: string | Date | null | undefined): string {
  const d = parseDate(value);
  if (!d) return typeof value === "string" ? value : "";
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
}

export function formatDataExtenso(value: string | Date | null | undefined, cidade?: string): string {
  const d = parseDate(value);
  if (!d) return typeof value === "string" ? value : "";
  const dia = d.getDate();
  const mes = MESES[d.getMonth()];
  const ano = d.getFullYear();
  const prefix = cidade ? `${cidade}, ` : "";
  return `${prefix}${dia} de ${mes} de ${ano}`;
}

// ===== Valor por extenso =====
const UNIDADES = ["", "um", "dois", "três", "quatro", "cinco", "seis", "sete", "oito", "nove"];
const DEZ_A_DEZENOVE = ["dez", "onze", "doze", "treze", "quatorze", "quinze", "dezesseis", "dezessete", "dezoito", "dezenove"];
const DEZENAS = ["", "", "vinte", "trinta", "quarenta", "cinquenta", "sessenta", "setenta", "oitenta", "noventa"];
const CENTENAS = ["", "cento", "duzentos", "trezentos", "quatrocentos", "quinhentos", "seiscentos", "setecentos", "oitocentos", "novecentos"];

function grupoExtenso(n: number): string {
  if (n === 0) return "";
  if (n === 100) return "cem";
  const c = Math.floor(n / 100);
  const resto = n % 100;
  const partes: string[] = [];
  if (c > 0) partes.push(CENTENAS[c]);
  if (resto > 0) {
    if (resto < 10) partes.push(UNIDADES[resto]);
    else if (resto < 20) partes.push(DEZ_A_DEZENOVE[resto - 10]);
    else {
      const d = Math.floor(resto / 10);
      const u = resto % 10;
      partes.push(u === 0 ? DEZENAS[d] : `${DEZENAS[d]} e ${UNIDADES[u]}`);
    }
  }
  return partes.join(" e ");
}

function inteiroExtenso(n: number): string {
  if (n === 0) return "zero";
  if (n < 0) return `menos ${inteiroExtenso(-n)}`;
  const milhoes = Math.floor(n / 1_000_000);
  const milhares = Math.floor((n % 1_000_000) / 1000);
  const resto = n % 1000;
  const partes: string[] = [];
  if (milhoes > 0) {
    partes.push(milhoes === 1 ? "um milhão" : `${grupoExtenso(milhoes)} milhões`);
  }
  if (milhares > 0) {
    partes.push(milhares === 1 ? "mil" : `${grupoExtenso(milhares)} mil`);
  }
  if (resto > 0) {
    // separador "e" antes da centena se resto < 100 ou múltiplo de 100
    if (partes.length > 0 && (resto < 100 || resto % 100 === 0)) partes.push("e");
    partes.push(grupoExtenso(resto));
  }
  return partes.join(" ").replace(/\s+/g, " ").trim();
}

export interface ValorExtensoOptions {
  /** Se true, omite o prefixo "no valor de"/"de" — útil quando o template já tem essas palavras. */
  semDe?: boolean;
}

/**
 * Converte valor numérico em texto por extenso em português brasileiro.
 * Ex: 250000 -> "duzentos e cinquenta mil reais"
 *     1234.56 -> "mil duzentos e trinta e quatro reais e cinquenta e seis centavos"
 */
export function valorPorExtenso(value: number | string | null | undefined, options: ValorExtensoOptions = {}): string {
  if (value === null || value === undefined || value === "") return "";
  let num: number;
  if (typeof value === "number") num = value;
  else {
    const cleaned = String(value).replace(/[^\d,.-]/g, "").replace(/\./g, "").replace(",", ".");
    num = Number(cleaned);
  }
  if (!isFinite(num)) return "";

  const inteiro = Math.floor(Math.abs(num));
  const centavos = Math.round((Math.abs(num) - inteiro) * 100);

  const partes: string[] = [];
  if (inteiro > 0) {
    const palavraReal = inteiro === 1 ? "real" : "reais";
    partes.push(`${inteiroExtenso(inteiro)} ${palavraReal}`);
  }
  if (centavos > 0) {
    const palavraCent = centavos === 1 ? "centavo" : "centavos";
    const sep = inteiro > 0 ? " e " : "";
    partes.push(`${sep}${inteiroExtenso(centavos)} ${palavraCent}`);
  }
  if (partes.length === 0) return "zero reais";

  const texto = partes.join("");
  return options.semDe ? texto : texto;
}

/**
 * Partes brutas de um endereço (formato compartilhado por participantes
 * e empresa). Todos os campos são opcionais — a função compositora
 * omite trechos ausentes elegantemente.
 */
export interface EnderecoParts {
  rua?: string | null;
  numero?: string | null;
  complemento?: string | null;
  bairro?: string | null;
  cidade?: string | null;
  /** Sigla da UF; será normalizada para letras maiúsculas. */
  estado?: string | null;
  cep?: string | null;
}

/** Trim + colapso de espaços internos múltiplos. */
function squish(value: string | null | undefined): string {
  if (value == null) return "";
  return String(value).trim().replace(/\s+/g, " ");
}

/**
 * Compõe a string canônica do endereço usada nos contratos.
 *
 *   "{logradouro}, nº {número} [s/n], {complemento}, Bairro {bairro},
 *    {cidade}/{UF}, CEP {cep_formatado}"
 *
 * Regras:
 *  - Cada trecho ausente é omitido sem deixar pontuação órfã.
 *  - Número: prefixado com "nº "; vira "s/n" SE houver rua mas faltar número.
 *  - Complemento e logradouro entram nus — o usuário já digita com o tipo
 *    ("Avenida Brasil", "Estrada do Sertão", "Apto 302", "Sala 12").
 *  - Bairro recebe prefixo "Bairro ".
 *  - Cidade e UF se unem por "/", UF normalizada para maiúsculas.
 *  - CEP usa `formatCEP` (`30130000` → `30130-000`); CEPs malformados
 *    são emitidos como vieram, sem warning aqui (função é pura — quem
 *    quiser warning consulta `isValidCep` antes de chamar).
 *
 * Função pura — não lê nem escreve fora de seus argumentos.
 */
export function composeEnderecoCanonico(parts: EnderecoParts): string {
  const rua = squish(parts.rua);
  const numero = squish(parts.numero);
  const complemento = squish(parts.complemento);
  const bairro = squish(parts.bairro);
  const cidade = squish(parts.cidade);
  const uf = squish(parts.estado).toUpperCase();
  const cep = squish(parts.cep);

  const segments: string[] = [];

  if (rua) segments.push(rua);
  if (numero) segments.push(`nº ${numero}`);
  else if (rua) segments.push("s/n");
  if (complemento) segments.push(complemento);
  if (bairro) segments.push(`Bairro ${bairro}`);
  if (cidade && uf) segments.push(`${cidade}/${uf}`);
  else if (cidade) segments.push(cidade);
  else if (uf) segments.push(uf);
  if (cep) segments.push(`CEP ${formatCEP(cep)}`);

  return segments.join(", ");
}
