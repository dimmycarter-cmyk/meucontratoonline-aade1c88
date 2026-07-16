// supabase/functions/parse-docx-template/index.ts
// Lote G.1 — Importador .docx (Leva 3)
//
// Recebe um .docx via multipart/form-data, extrai HTML + texto via mammoth,
// detecta placeholders em colchetes [LABEL], identifica labels ambíguos
// (genéricos como [CPF]), executa o detector de PII e retorna o payload
// que alimenta o ImportDocxDialog no client.

import { z } from "https://esm.sh/zod@3.23.8";
// @ts-ignore — mammoth roda em Deno via esm.sh
import mammoth from "https://esm.sh/mammoth@1.8.0?target=deno";
// Catálogo unificado (Fase 1/E1) — fonte única compartilhada com o client.
// Plano A da premissa eszip: import relativo fora da pasta da função, com
// extensão .ts (módulo dependency-free). Se o bundler recusar no deploy,
// plano B documentado no header do import-catalog.ts (cópia gerada + guard).
import { buildLegacyBracketMap } from "../../../src/lib/import-catalog.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// ============================================================================
// Classificação de labels — catálogo unificado (1.2, item 2)
// ============================================================================

// 171 grafias → chave canônica, a MESMA fonte do client. Aqui serve apenas
// para as estatísticas do Step 1 (knownPlaceholders): a classificação fina
// (fuzzy, contexto de papel, underscores) roda no client com
// detectTemplateFields (src/lib/import-detection.ts) sobre html+text brutos.
const LEGACY_BRACKET_MAP: Record<string, string> = buildLegacyBracketMap();

// PII patterns — espelho de src/lib/pii-detector.ts (versão server)
const PII_PATTERNS: Array<{ kind: string; regex: RegExp; hint: string }> = [
  { kind: "cpf", regex: /\b\d{3}\.\d{3}\.\d{3}-\d{2}\b/g, hint: "CPF formatado encontrado — substitua por {{vendedor_cpf}} ou {{comprador_cpf}}." },
  { kind: "cnpj", regex: /\b\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}\b/g, hint: "CNPJ formatado encontrado — substitua por {{empresa_cnpj}}." },
  { kind: "telefone", regex: /\(\d{2}\)\s*\d{4,5}-\d{4}/g, hint: "Telefone formatado — substitua por {{*_whatsapp}}." },
  { kind: "email", regex: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, hint: "E-mail real — substitua por {{*_email}}." },
  { kind: "endereco_cep", regex: /\b\d{5}-\d{3}\b/g, hint: "CEP encontrado — provável endereço real." },
  { kind: "valor_monetario_extenso", regex: /R\$\s*[\d.]+,\d{2}\s*\([^)]*(?:reais|centavos|mil|milh)[^)]*\)/gi, hint: "Valor monetário com extenso — substitua por {{valor_*}}." },
];

// ============================================================================
// Validação de input
// ============================================================================

const InputSchema = z.object({
  filename: z.string().min(1).max(255),
});

// ============================================================================
// Handler
// ============================================================================

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return jsonError(405, "Method not allowed");
  }

  try {
    const contentType = req.headers.get("content-type") || "";
    if (!contentType.includes("multipart/form-data")) {
      return jsonError(400, "Esperado multipart/form-data");
    }

    const form = await req.formData();
    const file = form.get("file");
    if (!(file instanceof File)) {
      return jsonError(400, "Campo 'file' ausente ou inválido");
    }
    if (!/\.docx$/i.test(file.name)) {
      return jsonError(400, "Arquivo deve ter extensão .docx");
    }
    if (file.size > 5 * 1024 * 1024) {
      return jsonError(413, "Arquivo excede 5MB");
    }

    const parsed = InputSchema.safeParse({ filename: file.name });
    if (!parsed.success) {
      return jsonError(400, JSON.stringify(parsed.error.flatten().fieldErrors));
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = new Uint8Array(arrayBuffer);

    // mammoth no Deno espera { buffer } (Uint8Array/Buffer-like), não { arrayBuffer }.
    const htmlResult = await mammoth.convertToHtml({ buffer });
    const textResult = await mammoth.extractRawText({ buffer });

    const html: string = htmlResult.value || "";
    const text: string = textResult.value || "";
    const mammothMessages: string[] = (htmlResult.messages || []).map(
      (m: { message: string; type?: string }) => `${m.type ?? "info"}: ${m.message}`
    );

    // ----------------------------------------------------------------
    // Detectar labels em colchetes
    // ----------------------------------------------------------------
    const labelOccurrencesByRaw = new Map<string, number>();
    const detectedLabels: Array<{
      raw: string;
      occurrenceIndex: number;
      context: string;
    }> = [];
    const ambiguousLabels: Array<{
      raw: string;
      occurrenceIndex: number;
      context: string;
    }> = [];
    const knownPlaceholders = new Set<string>();

    const bracketRe = /\[([^\]]+)\]/g;
    let m: RegExpExecArray | null;
    while ((m = bracketRe.exec(text)) !== null) {
      const raw = `[${m[1]}]`;
      const labelUpper = m[1].trim().toUpperCase();

      // Filtra falsos positivos: numerais, refs legais, [nº 123].
      // CÓPIA DECLARADA de isLegalReference (src/lib/placeholder.ts, fonte
      // única do filtro no render — 2.2b B3): Deno não importa de src/lib.
      // Quem alterar o padrão lá, altera aqui no mesmo commit.
      // "§" fora do grupo com \b (não é word char — fix 1.2 item 7).
      if (/^\d+([.,]\d+)?$/.test(m[1].trim())) continue;
      if (/^(art\.?|lei|inc(iso)?|par[áa]grafo)\b|^§/i.test(m[1].trim())) continue;
      if (/^n[ºo°]\.?\s*\d+$/i.test(m[1].trim())) continue;

      const startCtx = Math.max(0, m.index - 80);
      const endCtx = Math.min(text.length, m.index + m[0].length + 30);
      const context = text.slice(startCtx, endCtx);

      const prevCount = labelOccurrencesByRaw.get(raw) ?? 0;
      labelOccurrencesByRaw.set(raw, prevCount + 1);

      const entry = { raw, occurrenceIndex: prevCount, context };
      detectedLabels.push(entry);

      if (LEGACY_BRACKET_MAP[labelUpper]) {
        // Grafia exata do catálogo — estatística de "já reconhecidos".
        knownPlaceholders.add(raw);
      } else {
        // Todo o resto vai bruto para o client decidir (fuzzy/contexto/UI).
        ambiguousLabels.push(entry);
      }
    }

    // Detectar curly placeholders já presentes ({{key}})
    const curlyRe = /\{\{\s*([\w]+)\s*\}\}/g;
    while ((m = curlyRe.exec(text)) !== null) {
      knownPlaceholders.add(`{{${m[1]}}}`);
    }

    // ----------------------------------------------------------------
    // PII
    // ----------------------------------------------------------------
    const piiMatches: Array<{ kind: string; value: string; index: number; hint: string }> = [];
    for (const { kind, regex, hint } of PII_PATTERNS) {
      const re = new RegExp(regex.source, regex.flags);
      let pm: RegExpExecArray | null;
      while ((pm = re.exec(text)) !== null) {
        piiMatches.push({ kind, value: pm[0], index: pm.index, hint });
      }
    }

    // ----------------------------------------------------------------
    // Warnings (limitações do mammoth)
    // ----------------------------------------------------------------
    const warnings: string[] = [];
    if (/<table/i.test(html)) {
      warnings.push(
        "Tabelas detectadas — células mescladas podem não ser preservadas. Revise o preview antes de confirmar."
      );
    }
    if (/<img/i.test(html) || mammothMessages.some((m) => /image/i.test(m))) {
      warnings.push("Imagens detectadas — serão descartadas na importação.");
    }
    // Filtra ruído interno do mammoth — só repassa avisos que afetam o resultado.
    const IGNORED_PATTERNS: RegExp[] = [
      /unrecognised paragraph style/i,
      /unrecognised run style/i,
      /unrecognised numbering/i,
      /no style mapping/i,
      /default style/i,
    ];
    const RELEVANT_PATTERNS: RegExp[] = [
      /image/i,
      /merged cell/i,
      /table/i,
      /unsupported/i,
    ];
    for (const msg of mammothMessages) {
      if (IGNORED_PATTERNS.some((re) => re.test(msg))) continue;
      if (RELEVANT_PATTERNS.some((re) => re.test(msg))) {
        warnings.push(`mammoth: ${msg}`);
      }
    }

    return new Response(
      JSON.stringify({
        html,
        text,
        detectedLabels,
        knownPlaceholders: Array.from(knownPlaceholders),
        ambiguousLabels,
        piiMatches,
        warnings,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (err) {
    console.error("[parse-docx-template] erro:", err);
    const message = err instanceof Error ? err.message : "Erro desconhecido";
    return jsonError(500, message);
  }
});

function jsonError(status: number, message: string) {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
