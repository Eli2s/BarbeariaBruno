## Simplificação e Foco do Dashboard — BrunoFlow

### O que o usuário quer

O dashboard atual está sobrecarregado. A proposta é:

1. **Remover a seção "Vendas de Produtos"** do Dashboard — ela vai para a aba de Pedidos
2. **Simplificar o gráfico de faturamento** — alterar o grafito de barra para algo mais moderno por período, mas torná-lo mais limpo e referenciado na imagem enviada (barras empilhadas Serviços + Loja, mês/semana/ano)
3. **Focar o Dashboard em "Desempenho por Barbeiro"** — a seção principal passa a ser os cards de cada barbeiro com apenas: foto + nome + Atendimentos + Valor a receber
4. **Remover o gráfico de linha individual por barbeiro** (que é redundante com os cards)

---

### Mudanças por arquivo

#### `src/pages/DashboardPage.tsx`

**Remover completamente:**

- Toda a seção `{/* ── Vendas de Produtos ── */}` (linhas 434–558) com os 4 cards (faturamento produtos, variação, top 5, estoque baixo)
- O gráfico de linha individual por barbeiro (linhas 372–432)
- Estados e lógica não mais usados: `ordersPeriod`, `getOrdersCutoff`, `ordersCutoff`, `prevCutoff`, `prevEnd`, `paidOrders`, `periodOrders`, `prevOrders`, `productRevenue`, `prevProductRevenue`, `revenueVariation`, `productSales`, `top5`, `lowStock`, `barberChartData`, `getBarberChartData`, `selectedBarber`
- Imports não mais usados: `LineChart`, `Line`, `ShoppingBag`, `AlertTriangle`, `Package`, `TrendingDown`

**Manter e melhorar:**

- Cards métricos (4 cards + Ticket Médio + Top Barbeiro)
- Gráfico de barras de faturamento com filtro Semanal/Mensal/Anual (inspirado na imagem: barras empilhadas azul = Serviços, vermelho = Vendas Loja, com total no canto superior direito do card)

**Melhorar a seção "Desempenho por Barbeiro":**

- Mover para posição mais proeminente (logo após os cards métricos, antes do gráfico)
- Filtro de período próprio: Semanal / Mensal / Últimos 30 dias
- Cards responsivos com layout grid:
  - Mobile: `grid-cols-1` com card por barbeiro (linha completa)
  - Desktop: `grid-cols-2 lg:grid-cols-3` com cards maiores
- Cada card: foto/avatar (40px) + nome + badge período + número grande de atendimentos + valor a receber em destaque primário
- Linha de totais ao final (somando todos os barbeiros)
- O card "selecionado/logado" fica preparado com `highlightedBarberId: null` — border accent quando houver

**Layout final do Dashboard (de cima pra baixo):**

1. Header mobile (botão + título)
2. Cards métricos (4 cards em grid 2x2)
3. Cards secundários: Ticket Médio + Top Barbeiro
4. **Desempenho por Barbeiro** (grid de cards com filtro de período)
5. Gráfico de Faturamento (barras empilhadas, filtro Semanal/Mensal/Anual)

---

#### `src/pages/OrdersPage.tsx`

**Adicionar seção de Vendas de Produtos no topo** (4 cards que saem do Dashboard):

- Precisamos ver o arquivo atual para saber onde encaixar

**Verificação necessária:** Ler `OrdersPage.tsx` antes de implementar para saber o layout atual e onde adicionar os cards.

---

### Detalhes técnicos

**Estados que permanecem no DashboardPage:**

- `chartPeriod: 'semanal' | 'mensal' | 'anual'`
- `barberPeriod: 'semanal' | 'mensal' | '30dias'`
- `refreshKey`

**Estados removidos:**

- `selectedBarber`, `ordersPeriod` e todas as variáveis de vendas de produtos

**Queries que permanecem:**

- `clients`, `plans`, `allPlans`, `orders`, `allServices`, `barbers`

**Query removida:**

- `products` (não mais necessária no Dashboard)

**Funções que permanecem:**

- `getBarberStats(barberId, period)` — retorna `{ commission, count }`
- `getChartData()` — gera dados para o BarChart
- `getBarberCutoff(period)`

**Funções removidas:**

- `getBarberChartData()` (linha chart individual)
- `getOrdersCutoff(period)`

---

### Ordem de implementação

1. `src/pages/DashboardPage.tsx` — remover seções desnecessárias + reorganizar + melhorar cards de barbeiro
2. `src/pages/OrdersPage.tsx` — adicionar cards de vendas de produtos no topo da tela de pedidos