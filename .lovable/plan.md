

# Leva 1 — Plano Final Aprovado

## Confirmações incorporadas
- `empresa_*` canônico + `imobiliaria_*` como alias
- Migration: `companies.creci` (logo_url já existe)
- **PDF export = HARD BLOCK** quando há pendências
- **Salvar rascunho = SOFT** (permite com pendências)
- Mapeamento dos 6 templates apresentado para validação ANTES da migration data

## Status atual
- ✅ Schema migration (creci, contract_test_fixtures, pii-detector)
- ✅ contract-formatters.ts, contract-enrichment.ts
- ✅ LEGACY_BRACKET_MAP expandido (vendedor1-5, comprador, conjuge, anuente, intermediadoras)
- ✅ template-variables.ts: vendedor1-5, valor_vendedor1-5_sinal, intermediadoras com bancários e valor_sinal
- ✅ Heurística documentada como best-effort
- 🔜 Gerar HTML limpo de T1-T5 + preview estrutural + insert

## Débito técnico — Leva 2
- **T6 Procurador**: adiar para Leva 2. Inserir junto com:
  - Bloco `procurador_*` em template-variables.ts (categoria "Procuração")
  - Suporte nativo na UI de múltiplos participantes (role="procurador")
  - Labels explícitos no template canônico (sem depender de heurística)
  - Cláusula de validação de procuração (poderes específicos)
- **banco_financiamento (T2)**: virar select com lista FEBRABAN
- **resolveAmbiguousLabels()**: implementar na Leva 3 junto com importador .docx
  - Heurística de ordem de aparição
  - Sub-heurística de bloco (detectar agrupamento por proximidade)
  - Alerta na UI quando labels genéricos sem qualificação forem detectados

## Próximas levas (referência)
- **Leva 2**: UI múltiplos participantes + parcelas + UI de validação de pendências + T6 Procurador
- **Leva 3**: Importador .docx com detector de PII + resolveAmbiguousLabels()
