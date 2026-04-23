

# Leva 1 — Plano Final Aprovado

## Confirmações incorporadas
- `empresa_*` canônico + `imobiliaria_*` como alias
- Migration: `companies.creci` (logo_url já existe)
- **PDF export = HARD BLOCK** quando há pendências (botão desabilitado, sem bypass)
- **Salvar rascunho = SOFT** (permite com pendências)
- Mapeamento dos 6 templates apresentado para validação ANTES da migration data

## Ordem de execução

### 1. Migration schema
```sql
ALTER TABLE companies ADD COLUMN IF NOT EXISTS creci text;
```

### 2. `src/lib/contract-formatters.ts` (novo)
`formatBRL`, `formatCPF`, `formatCNPJ`, `formatCEP`, `formatTelefone`, `formatDataExtenso`, `formatDataCurta`, `valorPorExtenso(value, { semDe })`.

### 3. `src/lib/contract-enrichment.ts` (novo)
- `enrichDados(dados, { participants, company })`: resolve aliases bidirecionais (não sobrescreve), injeta `empresa_*` do tenant, aplica formatters em campos detectáveis, gera derivados (`valor_total_extenso`, `data_contrato_extenso`, endereço composto).
- `validateUnresolvedPlaceholders(html, dados)`: retorna lista de `{{...}}` e `[...]` não resolvidos.

### 4. `src/lib/placeholder.ts` — LEGACY_BRACKET_MAP expandido
- Aliases: `imobiliaria_* ↔ empresa_*`, `vendedor_rg_orgao ↔ vendedor_orgao_expedidor`, `vendedor_telefone ↔ vendedor_whatsapp`, `contrato_cidade ↔ cidade_contrato`, `contrato_foro ↔ foro`
- Labels detectados nos 6 templates (vendedor2..N, comprador2, conjuge, conjuge2, anuente, parcelaN_*, intermediadoraN_*)

### 5. `src/lib/template-variables.ts` expandido
Múltiplos vendedores/compradores/cônjuges, anuente, parcelas, intermediadoras, categoria "Imobiliária", `valor_total_extenso`, `data_contrato_extenso`.

### 6. Pipeline integrado
- `NovoContrato.tsx`: `autoFillDados` carrega `companies` do tenant e chama `enrichDados` no final
- `ContratoDetalhe.tsx`: re-aplica `enrichDados` ao renderizar/editar
- Status `rascunho` automático quando há pendências (soft)

### 7. Bloqueio HARD de exportação PDF
- Botão "Exportar PDF" `disabled` quando `validateUnresolvedPlaceholders().length > 0`
- Tooltip + lista de pendências visível
- **Sem opção de "exportar mesmo assim"**
- "Salvar como rascunho" permanece soft

### 8. Mapeamento dos 6 templates → SUA VALIDAÇÃO
Tabela com placeholders detectados por template (sem texto completo, sem PII), aguardar OK.

### 9. Migration data
Após sua aprovação do mapeamento: insert dos 6 templates como `is_global=true` via insert tool.

## Próximas levas (referência)
- **Leva 2**: UI múltiplos participantes + parcelas + UI de validação de pendências
- **Leva 3**: Importador .docx com detector de PII (alerta quando dados reais aparecem no lugar de labels)

