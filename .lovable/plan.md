
## Modernização do Dashboard e Lista de Clientes — BrunoFlow

### Contexto do estado atual

**DashboardPage.tsx (396 linhas):**
- Já possui cards métricos, gráfico de barras (Recharts, 6 meses), seção de pedidos resumida e seção "Desempenho por Barbeiro" com tabela desktop + cards mobile
- Usa labels "Faturado", "Comissão", "Barbearia" — palavras proibidas pelo novo requisito
- Filtro de período atual: `'mes' | '30dias' | 'tudo'` — precisa mudar para `'semanal' | 'mensal' | '30dias'`
- Seção de pedidos é só um card de link, sem cards detalhados
- Sem gráfico individual por barbeiro

**ClientsListPage.tsx (82 linhas):**
- Última visita exibida como texto simples `"Última: dd/MM/yyyy"`
- Sem badge colorido e sem cálculo de dias desde a visita

**authStore.ts:**
- Só tem `isAuthenticated` (sem `isAdmin`, `barberId`)
- Não tem como identificar o barbeiro logado atualmente

---

### O que será modificado

#### Arquivo 1: `src/pages/DashboardPage.tsx` — reescrita total das seções

**Novos estados e filtros:**
- `chartPeriod: 'semanal' | 'mensal' | 'anual'` para o gráfico principal
- `barberPeriod: 'semanal' | 'mensal' | '30dias'` para seção de barbeiros (substituindo `'tudo'`)
- `selectedBarber: number | null` para gráfico individual de barbeiro

**Cards métricos — mais modernos:**
- Manter os 4 cards existentes mas com `shadow-lg`, `rounded-xl`, `hover:scale-[1.02]`, gradiente mais rico
- Adicionar card "Ticket Médio" e "Top Barbeiro" em linha secundária (2 cards)
- Ticket médio = totalRevenue / total de atendimentos do período

**Gráfico principal de faturamento:**
- Adicionar dropdown de período: Semanal (7 dias) / Mensal (mês a mês, 6 meses) / Anual (12 meses)
- "Semanal": dados dia a dia dos últimos 7 dias (serviços + pedidos)
- "Mensal": mês a mês dos últimos 6 meses (comportamento atual)
- "Anual": mês a mês dos últimos 12 meses
- Manter Recharts BarChart já existente

**Gráfico individual por barbeiro (NOVO):**
- Card com dropdown "Selecionar Barbeiro" + período (reusa `barberPeriod`)
- LineChart (Recharts `LineChart + Line`) mostrando "Valor a receber" dia a dia no período
- Se nenhum barbeiro selecionado: estado vazio com placeholder

**Seção "Vendas de Produtos" (NOVO, 4 cards):**
- Query: `db.orders.toArray()` já existe. Filtrar pelo período do filtro principal
- Card 1: Faturamento total de produtos no período
- Card 2: Top 5 produtos vendidos (agrupa `items` de todos os pedidos pagos)
- Card 3: Produtos com estoque baixo `< 5` (query `db.products.toArray()`)
- Card 4: Variação % vs período anterior (compara total atual vs total do período anterior de mesmo tamanho)
- Layout: `grid grid-cols-1 md:grid-cols-2 gap-4`

**Seção "Desempenho por Barbeiro" — labels corrigidas:**
- Remover "Comissão", "Faturado", "Barbearia" completamente
- Manter apenas: `Atendimentos` + `Valor a receber` (= `barberCommission` no banco)
- Adicionar foto do barbeiro (avatar pequeno 32px) ao lado do nome
- Cards mobile: nome + foto + atendimentos + valor a receber
- Tabela desktop: Barbeiro | Atendimentos | Valor a receber
- Filtro: `'semanal' | 'mensal' | '30dias'`
- Destaque do barbeiro logado: como o authStore não tem `barberId`, preparar a estrutura com `highlightedBarberId: number | null` (por ora `null`, pronto para quando autenticação evoluir)

**Imports novos necessários:**
- `LineChart, Line` do recharts (já instalado)
- `subWeeks`, `eachDayOfInterval`, `startOfWeek` do date-fns (já instalado)
- `TrendingUp, TrendingDown, Award, Package, AlertTriangle` do lucide-react (já instalado)

---

#### Arquivo 2: `src/pages/ClientsListPage.tsx` — badge de última visita

**Lógica nova na função `lastVisit`:**
- Retornar objeto `{ date: Date | null, daysAgo: number | null, label: string }` ao invés de string
- `daysAgo = null` se nunca visitou

**Função `getVisitBadgeClass(daysAgo: number | null)`:**
- `null` ou nunca → `bg-red-600/20 text-red-800 dark:text-red-300` + texto "Nunca"
- `< 7` → `bg-green-600/20 text-green-800 dark:text-green-300` + texto "Há X dias" (bold)
- `7–30` → `bg-yellow-600/20 text-yellow-800 dark:text-yellow-300` + texto "Há X dias"
- `> 30` → `bg-red-600/20 text-red-800 dark:text-red-300` + texto "Há X dias"

**Substituição do texto simples:**
```
Antes: "Última: dd/MM/yyyy"
Depois: badge colorido inline "Há 3 dias" | "Há 15 dias" | "Nunca"
```
O badge ficará na segunda linha do card, ao lado do nickname.

---

### Ordem de implementação

1. `DashboardPage.tsx` — cards modernos + gráfico com filtro de período + gráfico individual por barbeiro + seção "Vendas de Produtos" + seção barbeiros com labels corrigidas
2. `ClientsListPage.tsx` — badge colorido de última visita

---

### Detalhes técnicos

- Todos os dados via `useLiveQuery` (sem queries novas, reutilizando `allServices`, `orders`, `barbers`)
- `LineChart` é do pacote `recharts` já instalado — sem nova dependência
- `eachDayOfInterval`, `startOfDay`, `subWeeks` são do `date-fns` já instalado
- `differenceInDays` já está importado no arquivo atual
- Para o gráfico semanal: gerar array dos últimos 7 dias com `eachDayOfInterval({ start: subDays(now, 6), end: now })`
- Seção de Vendas: agrupa `order.items` de todos os pedidos com `status === 'pago'` no período, somando `quantity` por `name` do produto
- Estoque baixo: `db.products.toArray()` já existe como live query nos outros componentes — adicionar no Dashboard
