
## Refatoração Focada: Dashboard + Gráfico por Barbeiro + Pedidos Expandido

### O que existe hoje vs. o que o usuário quer

**Dashboard atual:**
- Tem gráfico de barras empilhadas (Serviços + Loja) com filtro Semanal/Mensal/Anual — **manter e melhorar**
- Tem seção "Desempenho por Barbeiro" com cards (foto + nome + atendimentos + valor a receber) — **está bem, mas falta gráfico individual**
- NÃO tem gráfico de linha por barbeiro individual — **adicionar**
- Seção de vendas de produtos foi removida do Dashboard anteriormente — **OK, não recolocar**

**Pedidos atual:**
- Tem 4 cards de vendas (Faturamento, Variação, Top 5, Estoque baixo)
- Falta: Card 5 (Total de produtos vendidos) e Card 6 (Ticket médio por pedido)
- Falta: filtro com opção "30 dias" (só tem Semanal/Mensal)

**O que muda:**

1. **DashboardPage.tsx** — adicionar gráfico de linha individual por barbeiro (com seletor de barbeiro + período)
2. **OrdersPage.tsx** — adicionar 2 cards extras + opção "30 dias" no filtro

---

### Arquivo 1: `src/pages/DashboardPage.tsx`

**Adicionar estado:** `selectedBarber: number | 'todos'` com valor inicial `'todos'`

**Nova seção "Gráfico por Barbeiro"** (inserida ENTRE a seção de cards de barbeiro e o gráfico de faturamento):

Card com:
- Header: título "Valor a Receber por Barbeiro" + dropdown "Selecionar Barbeiro" (opção "Todos os Barbeiros" + um item por barbeiro) + dropdown de período (reutiliza `barberPeriod`)
- Quando `selectedBarber === 'todos'`: BarChart com uma barra por barbeiro, mostrando "Valor a receber" no período — comparação visual lado a lado
- Quando barbeiro específico selecionado: LineChart dia a dia (últimos 7 dias para semanal, ou mês a mês para mensal/30dias)

**Função nova `getBarberChartData()`:**
```
Se selectedBarber === 'todos':
  → retorna array [{ name: 'João', valor: 320 }, ...] para BarChart
  
Se barbeiro específico (semanal):
  → eachDayOfInterval(subDays(now, 6), now)
  → filtra allServices por barberId + date
  → soma barberCommission por dia
  → retorna [{ label: 'Seg', valor: 120 }, ...]
  
Se barbeiro específico (mensal ou 30dias):
  → últimos 6 meses ou últimos 30 dias em semanas
  → retorna dados por semana ou mês
```

**Imports novos necessários:**
- `LineChart, Line` do recharts (já instalado, já importado no projeto)
- `eachDayOfInterval` já está importado

**Layout da nova seção:**
```
[Card rounded-xl shadow-md]
  [Header: título + Select Barbeiro + Select Período]
  [Se todos: BarChart horizontal com nome/valor]
  [Se um: LineChart com linha accent cor primária]
  [Estado vazio: "Nenhum atendimento no período"]
```

---

### Arquivo 2: `src/pages/OrdersPage.tsx`

**Mudanças pequenas e cirúrgicas:**

1. Alterar tipo de `ordersPeriod` para `'semanal' | 'mensal' | '30dias'`
2. Atualizar `getCutoff` para suportar `'30dias'` → `subDays(now, 30)`
3. Atualizar `prevCutoff`/`prevEnd` para suportar `'30dias'`
4. Adicionar opção `<SelectItem value="30dias">Últimos 30 dias</SelectItem>`

**Adicionar 2 novos cards (Card 5 e Card 6):**

Card 5 — Total produtos vendidos (quantidade de itens, não pedidos):
```
totalItemsSold = periodOrders.flatMap(o => o.items).reduce((s, item) => s + (item.quantity ?? 1), 0)
```
Card visual: número grande + "itens vendidos" + ícone ShoppingCart

Card 6 — Ticket médio por pedido:
```
avgOrderValue = periodOrders.length > 0 ? productRevenue / periodOrders.length : 0
```
Card visual: valor formatado + "por pedido" + ícone CreditCard

**Grid dos cards:** muda de `grid-cols-1 md:grid-cols-2` para manter 2 colunas mas agora com 6 cards total (3 linhas de 2 no desktop)

---

### Detalhes técnicos

**Imports adicionados ao Dashboard:**
- `LineChart, Line` do recharts

**Nenhum arquivo novo criado** — apenas edições em 2 arquivos existentes.

**Sem novas dependências** — tudo já instalado.

**Reatividade:** `useLiveQuery` já garante atualização automática. Criar atendimento → "Valor a receber" muda instantaneamente no card E no gráfico.

---

### Ordem de implementação

1. `src/pages/DashboardPage.tsx` — adicionar gráfico individual/comparativo de barbeiros
2. `src/pages/OrdersPage.tsx` — adicionar 2 cards + opção 30 dias no filtro

---

### Resultado visual esperado (Dashboard)

```text
┌─────────────────────────────────────────────────────┐
│  [Cards métricos 2x2]                               │
│  [Ticket Médio]  [Top Barbeiro]                     │
├─────────────────────────────────────────────────────┤
│  Desempenho por Barbeiro         [Semanal ▼] [↻]   │
│  [Card João] [Card Pedro] [Card André]              │
│  Total: 42 atend.  R$ 2.840,00                     │
├─────────────────────────────────────────────────────┤
│  Valor a Receber por Barbeiro                       │
│  [Todos ▼]  [Mensal ▼]                             │
│  BarChart: João=R$900 | Pedro=R$720 | André=R$640  │
│  ── ou ──                                           │
│  [João ▼] LineChart dia a dia                      │
├─────────────────────────────────────────────────────┤
│  Faturamento Geral    [Mensal (6m) ▼]              │
│  BarChart empilhado: Serviços + Vendas             │
└─────────────────────────────────────────────────────┘
```
