
## Correção dos Gráficos do Dashboard

### Causa raiz identificada

O console mostra dois erros:
- `Warning: Function components cannot be given refs. Check the render method of DashboardPage at CustomTooltip`
- `Warning: Function components cannot be given refs. Check the render method of DashboardPage at CartesianGrid`

O `CustomTooltip` está declarado **dentro** da função `DashboardPage` (linha 216), o que faz o React recriá-lo em cada render. O Recharts tenta passar uma `ref` para ele e falha — isso faz os gráficos simplesmente não aparecerem.

### Solução

#### `src/pages/DashboardPage.tsx`

**1. Mover `CustomTooltip` para fora do componente** (antes de `export default function DashboardPage`), recebendo `formatCurrency` como prop ou usando import direto:

```tsx
// FORA do componente — corrige o erro de ref
function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload) return null;
  return (
    <div className="bg-card border border-border rounded-lg p-3 shadow-lg">
      <p className="text-xs font-semibold mb-1.5">{label}</p>
      {payload.map((entry: any, i: number) => (
        <div key={i} className="flex items-center gap-2 text-xs">
          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }}></span>
          <span className="text-muted-foreground">{entry.name}:</span>
          <span className="font-semibold">{formatCurrency(entry.value)}</span>
        </div>
      ))}
      <div className="border-t border-border mt-1.5 pt-1.5">
        <div className="flex items-center gap-2 text-xs">
          <span className="font-semibold">Total:</span>
          <span className="font-bold text-primary">
            {formatCurrency(payload.reduce((s: number, p: any) => s + p.value, 0))}
          </span>
        </div>
      </div>
    </div>
  );
}
```

**2. Os tooltips inline nos gráficos de barbeiro** (dentro do `<Tooltip content={...}>`) também precisam ser convertidos para funções nomeadas externas ao componente para evitar o mesmo problema.

Criar também:
```tsx
function BarberTooltip({ active, payload, label }: any) { ... }
function LineTooltip({ active, payload, label }: any) { ... }
```

### Technical summary

- Mudança cirúrgica: apenas move 3 funções de dentro para fora do componente
- Zero mudanças de layout, lógica ou dados
- Corrige os dois avisos do console que impedem a renderização dos gráficos
- Nenhuma dependência nova
