

## Ajustar visibilidade do menu por role

Concordo. O menu "Empresas" só faz sentido para `super_admin` que gerencia múltiplos tenants. Para o `admin_empresa`, a empresa dele já é configurada nas Configurações.

### Lógica de visibilidade

```text
Dashboard          -> todos
Novo Contrato      -> todos
Contratos          -> todos
Usuários           -> todos
Modelos            -> admin_empresa, super_admin
Cláusulas          -> admin_empresa, super_admin
Empresas           -> super_admin apenas
Agente IA          -> admin_empresa, super_admin
Configurações      -> todos (bottom)
Administração      -> super_admin apenas
```

### Arquivo a editar

**`src/components/AppSidebar.tsx`**

- Adicionar propriedade opcional `allowedRoles` a cada item do menu
- Itens sem `allowedRoles` ficam visíveis para todos
- Filtrar itens com base nas `roles` do `AuthContext`
- "Empresas" recebe `allowedRoles: ["super_admin"]`
- "Modelos", "Cláusulas", "Agente IA" recebem `allowedRoles: ["admin_empresa", "super_admin"]`

