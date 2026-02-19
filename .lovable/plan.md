

# Responsividade Desktop + Correcao de Relatorios

## Resumo

Transformar o BrunoFlow em um app responsivo: mobile mantem o layout atual com bottom nav, desktop ganha sidebar esquerda fixa + header superior. Alem disso, corrigir a atualizacao dos dados nos relatorios usando Dexie live queries (ja existentes) e adicionar refetch manual.

---

## Parte 1: Layout Responsivo (Prioridade)

### 1.1 Novo componente: DesktopSidebar

Criar `src/components/DesktopSidebar.tsx`:
- Sidebar fixa a esquerda (w-64), visivel apenas em `hidden md:flex`
- Itens de menu: Home, Clientes, Planos, Produtos, Barbeiros, Servicos, Pedidos, Mensagens, Menu/Config
- Cada item usa `NavLink` ou `useLocation` para destacar a rota ativa
- Icones do lucide-react para cada item
- Logo "Bruno Barbearia" no topo da sidebar
- Botao de logout no rodape

### 1.2 Novo componente: DesktopHeader

Criar `src/components/DesktopHeader.tsx`:
- Header fixo no topo, visivel apenas em `hidden md:flex`
- Titulo da pagina atual (derivado da rota)
- Toggle de tema (sol/lua)
- Botao de logout
- Botao "+ Atendimento" como acao rapida

### 1.3 Refatorar AppLayout

Modificar `src/components/AppLayout.tsx`:
- Mobile (< md): manter bottom nav atual (envolver em `md:hidden`)
- Desktop (>= md): renderizar DesktopSidebar + DesktopHeader + conteudo principal
- Estrutura desktop:

```
<div class="flex min-h-screen">
  <DesktopSidebar />            <!-- hidden md:flex -->
  <div class="flex-1 flex flex-col">
    <DesktopHeader />           <!-- hidden md:flex -->
    <main class="flex-1 p-6 max-w-7xl mx-auto w-full">
      {children}
    </main>
  </div>
</div>
<nav class="md:hidden ...">    <!-- bottom nav mobile -->
```

### 1.4 Ajustar paginas para desktop

**DashboardPage:**
- Cards de metricas: `grid-cols-2 md:grid-cols-4`
- Grafico de faturamento: altura maior em desktop (`h-48 md:h-72`)
- Remover `max-w-lg` e usar `max-w-lg md:max-w-full`

**ClientsListPage:**
- Em desktop, usar layout de tabela com mais colunas (nome, apelido, whatsapp, ultima visita)
- `max-w-lg md:max-w-full`

**ClientProfilePage:**
- Dados financeiros e grafico lado a lado: `flex flex-col md:flex-row md:gap-6`

**ServiceFormPage:**
- Formulario em duas colunas no desktop: `grid md:grid-cols-2 gap-6`
- `max-w-lg md:max-w-2xl`

**PlansListPage, ProductsPage, BarbersPage, OrdersPage, MenuPage, etc:**
- Substituir `max-w-lg` por `max-w-lg md:max-w-4xl`
- Listas em grid `md:grid-cols-2` quando fizer sentido

### 1.5 Esconder bottom nav no desktop

Na bottom nav existente no AppLayout, adicionar `md:hidden` para que nao apareca em telas >= 768px.

---

## Parte 2: Correcao de Relatorios

O sistema ja usa `useLiveQuery` do Dexie em todas as paginas (DashboardPage, ClientsListPage, PlansListPage, etc). O Dexie `useLiveQuery` **ja e reativo** -- qualquer mudanca no IndexedDB (add, update, delete) dispara re-render automatico.

### Diagnostico

Os dados ja deveriam atualizar automaticamente via `useLiveQuery`. Possiveis problemas:
- O `seedDatabase()` pode estar sobrescrevendo dados
- Calculos derivados (chartData, metricas) dependem de re-execucao correta

### Correcoes

1. **DashboardPage**: Verificar que `seedDatabase()` no useEffect so executa se DB estiver vazio (ja parece ser o caso, mas confirmar no seed.ts)

2. **Adicionar botao "Atualizar"**: Em DashboardPage, adicionar botao manual que forca re-render (util para PWA offline):
   - Um simples `key` state que incrementa ao clicar, forcando remount dos live queries

3. **Loading states**: Adicionar skeleton/spinner enquanto dados carregam (quando `useLiveQuery` retorna undefined)

---

## Arquivos a criar

- `src/components/DesktopSidebar.tsx` -- sidebar de navegacao desktop
- `src/components/DesktopHeader.tsx` -- header superior desktop

## Arquivos a modificar

- `src/components/AppLayout.tsx` -- integrar sidebar/header desktop + esconder bottom nav em md:
- `src/pages/DashboardPage.tsx` -- responsividade de grids/graficos + botao atualizar
- `src/pages/ClientsListPage.tsx` -- max-width + grid desktop
- `src/pages/ClientProfilePage.tsx` -- layout lado a lado desktop
- `src/pages/ServiceFormPage.tsx` -- form 2 colunas desktop
- `src/pages/PlansListPage.tsx` -- max-width desktop
- `src/pages/ProductsPage.tsx` -- max-width + grid desktop
- `src/pages/BarbersPage.tsx` -- max-width desktop
- `src/pages/OrdersPage.tsx` -- max-width desktop
- `src/pages/MenuPage.tsx` -- max-width desktop (menos itens, pois sidebar ja tem navegacao)
- `src/pages/MessageTemplatesPage.tsx` -- max-width desktop
- `src/pages/ClientFormPage.tsx` -- max-width desktop
- `src/pages/ServiceItemsPage.tsx` -- max-width desktop
- `src/db/seed.ts` -- verificar que nao sobrescreve dados existentes

## Abordagem tecnica

- Mobile-first com Tailwind: sem prefixo = mobile, `md:` = desktop
- `useIsMobile()` hook ja existe para logica condicional se necessario
- Nenhuma dependencia nova necessaria
- Dados continuam em Dexie (IndexedDB) com live queries reativas
- PWA ja configurado (vite-plugin-pwa)

