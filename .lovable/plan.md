
## Correções e Melhorias no BrunoFlow

Serão feitas modificações cirúrgicas em 3 arquivos existentes. Nenhum arquivo novo será criado.

---

### 1. DashboardPage.tsx — Seção "Desempenho por Barbeiro"

**O que será adicionado** (abaixo dos cards métricos e do gráfico existentes):

- Dois novos `useLiveQuery`: um para `db.barbers.toArray()` e outro para `db.services.toArray()`
- Estado `useState<'mes' | '30dias' | 'tudo'>('mes')` para o filtro de período
- Função `getBarberStats(barberId)` que filtra atendimentos pelo período e calcula:
  - Total faturado (soma de `totalValue`)
  - Comissão total (soma de `barberCommission`)
  - Valor da barbearia (soma de `shopValue`)
  - Número de atendimentos
- O `authStore` atual só tem `isAuthenticated` (sem `barberId` ou `isAdmin`). O destaque de linha ficará preparado para quando isso existir — por ora a seção aparece igualmente para todos
- Layout: `<Select>` para filtro + cards em mobile / tabela em `md+`

**Classes Tailwind principais:**
- Container: `border-l-2 border-primary bg-accent/20` (card destacado)
- Grid mobile: `grid grid-cols-2 gap-2`
- Tabela desktop: `hidden md:table`

---

### 2. ClientProfilePage.tsx — Botão Fixo Corrigido

**Problema atual:** O botão está em `fixed bottom-20 left-0 right-0` com `p-4` e gradiente, causando sobreposição com o nav mobile e largura inconsistente no desktop.

**Correção:**

Substituir o `<div className="fixed bottom-20 left-0 right-0 ...">` por dois elementos separados com media query Tailwind:

```
Mobile (padrão):
  fixed bottom-20 left-4 right-4 z-50
  → botão w-full h-12

Desktop (md:):
  fixed bottom-6 right-6 z-50 md:left-auto md:w-auto
  → botão com largura automática, shadow-lg, rounded-xl
```

O `pb-24` no container principal será mantido (espaço para o botão não cobrir conteúdo).

---

### 3. ServiceFormPage.tsx — Cadastro Rápido com Validação

**Problema atual:** O `handleQuickAddClient` cadastra o cliente direto com apenas o nome da busca, sem WhatsApp e sem validação.

**O que será mudado:**

- Ao clicar em "Cadastrar `"nome"`" no dropdown, ao invés de salvar diretamente, abre um inline form expandido abaixo do campo de busca
- Estado novo: `showQuickForm: boolean`, `quickName: string`, `quickWhatsapp: string`, `quickErrors: { name?: string; whatsapp?: string }`
- Validação em tempo real:
  - Nome: mínimo 3 caracteres
  - WhatsApp: exatamente 11 dígitos numéricos (após remover máscara)
- Input de WhatsApp usa `phoneMask()` (já existente em `lib/format.ts`) no `onChange`
- Botão "Salvar e Continuar" fica `disabled` enquanto campos inválidos (+ `opacity-50 cursor-not-allowed`)
- `handleSaveQuickClient()`: valida novamente, chama `db.clients.add({name, whatsapp, nickname: '', tags: [], createdAt: ...})`, seleciona o ID retornado, fecha o form

**Mensagens de erro:** `<p className="text-xs text-destructive mt-1">` abaixo de cada campo

---

### Ordem de Implementação

1. `src/pages/DashboardPage.tsx` — adicionar seção de desempenho por barbeiro
2. `src/pages/ClientProfilePage.tsx` — corrigir posicionamento do botão
3. `src/pages/ServiceFormPage.tsx` — expandir cadastro rápido com validação

---

### Observações Técnicas

- **AuthStore:** O store atual só tem `isAuthenticated` (sem `isAdmin` ou `currentBarberId`). No Dashboard, a seção de desempenho será pública para todos (conforme solicitado). A lógica de destaque de linha está preparada via prop, mas inativa até o store ser expandido com ID do barbeiro logado
- **Sem novos arquivos ou dependências**
- **Todas as queries são `useLiveQuery`** — atualização automática. Botão "Atualizar" adicionado como segurança com key-state pattern
