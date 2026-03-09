

## Melhorias nos formularios: mascaras, campos obrigatorios, busca CEP e email automatico

### Resumo

3 grandes melhorias que afetam o onboarding e todos os formularios do sistema:

1. **Criar utilitario de mascaras** (`src/lib/masks.ts`) -- funcoes para formatar telefone `(31) 99999-5858`, CNPJ `00.000.000/0001-00`, CPF `000.000.000-00`, CEP `00000-000`
2. **Criar hook de busca CEP** (`src/hooks/useCepLookup.ts`) -- consulta a API gratuita ViaCEP (`https://viacep.com.br/ws/{cep}/json/`) e preenche automaticamente rua, bairro, cidade e UF
3. **Atualizar onboarding, Empresas e Usuarios** com mascaras, campos obrigatorios e auto-preenchimento

### Detalhes tecnicos

#### 1. `src/lib/masks.ts`
Funcoes puras de formatacao:
- `maskPhone(value)` -- `(XX) XXXXX-XXXX`
- `maskCNPJ(value)` -- `XX.XXX.XXX/XXXX-XX`
- `maskCPF(value)` -- `XXX.XXX.XXX-XX`
- `maskCEP(value)` -- `XXXXX-XXX`

#### 2. `src/hooks/useCepLookup.ts`
- Recebe o valor do CEP (limpo, 8 digitos)
- Faz fetch em `https://viacep.com.br/ws/{cep}/json/`
- Retorna `{ logradouro, bairro, localidade, uf }` e um callback `onResult` para preencher os campos do formulario
- Debounce de 500ms para nao fazer chamadas excessivas

#### 3. Onboarding (`src/pages/Onboarding.tsx`)

**Step 1 -- todos campos obrigatorios:**
- Nome da Empresa, CNPJ (com mascara), WhatsApp (com mascara), Email (pre-preenchido com email do usuario via `profile.email`)

**Step 2 -- endereco completo obrigatorio com busca CEP:**
- Campos: CEP (mascara), Rua/Av, Numero, Complemento, Bairro, Cidade, UF
- Ao digitar CEP valido (8 digitos), busca automatica preenche rua, bairro, cidade, UF
- Atualizar schema zod para todos campos obrigatorios (exceto complemento)
- Atualizar a RPC `complete_onboarding` via migration para aceitar os novos campos (rua, numero, complemento, bairro)

#### 4. Empresas (`src/pages/app/Empresas.tsx`)
- Aplicar mascaras em CNPJ, WhatsApp, CEP
- Busca automatica por CEP
- Reorganizar campos de endereco: CEP, Rua/Av, Numero, Complemento, Bairro, Cidade, UF

#### 5. Usuarios/Contatos (`src/pages/app/Contatos.tsx`)
- Aplicar mascaras em CPF, WhatsApp, CEP
- Busca automatica por CEP
- Reorganizar campos de endereco igual

#### 6. Migration SQL
- Atualizar funcao `complete_onboarding` para aceitar `p_rua`, `p_numero`, `p_complemento`, `p_bairro` e salvar na tabela companies

### Arquivos

| Arquivo | Acao |
|---|---|
| `src/lib/masks.ts` | Criar |
| `src/hooks/useCepLookup.ts` | Criar |
| `src/pages/Onboarding.tsx` | Editar (mascaras, campos obrigatorios, email auto, busca CEP, campos endereco) |
| `src/pages/app/Empresas.tsx` | Editar (mascaras, busca CEP) |
| `src/pages/app/Contatos.tsx` | Editar (mascaras, busca CEP) |
| `supabase/migrations/...` | Criar (atualizar RPC complete_onboarding) |

