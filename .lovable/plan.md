

## Aumentar fonte do titulo dos participantes

### Atual (linha 126)
```text
<h3 className="text-sm font-semibold text-foreground">
  Comprador (1)
```
`text-sm` = 14px — fonte pequena

### Proposta
```text
<h3 className="text-lg font-semibold text-foreground">
  Comprador (1)
```
`text-lg` = 18px — fonte visivelmente maior, compativel com o titulo "Participantes" acima

### Arquivo
- `src/components/contract/ManualParticipantManager.tsx` — linha 126: trocar `text-sm` por `text-lg`

