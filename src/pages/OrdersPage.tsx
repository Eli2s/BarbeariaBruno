import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/db/database';
import { AppLayout } from '@/components/AppLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ShoppingBag, Package, TrendingUp, TrendingDown, AlertTriangle, ShoppingCart, CreditCard } from 'lucide-react';
import { toast } from 'sonner';
import { formatCurrency } from '@/lib/format';
import { format, parseISO, startOfMonth, subDays, subMonths } from 'date-fns';

export default function OrdersPage() {
  const [ordersPeriod, setOrdersPeriod] = useState<'semanal' | 'mensal' | '30dias'>('mensal');

  const orders = useLiveQuery(() => db.orders.reverse().toArray()) ?? [];
  const products = useLiveQuery(() => db.products.toArray()) ?? [];

  const updateStatus = async (id: number, status: 'pago' | 'cancelado') => {
    await db.orders.update(id, { status });
    toast.success(`Pedido ${status === 'pago' ? 'marcado como pago' : 'cancelado'}!`);
  };

  const statusColor = (s: string) => {
    if (s === 'pago') return 'bg-green-500/10 text-green-500 border-green-500/30';
    if (s === 'cancelado') return 'bg-red-500/10 text-red-500 border-red-500/30';
    return 'bg-yellow-500/10 text-yellow-500 border-yellow-500/30';
  };

  const paymentLabel = (m: string) => {
    if (m === 'cartao') return 'Cartão';
    if (m === 'pix') return 'Pix';
    return 'Link WhatsApp';
  };

  // ── Métricas de vendas ──────────────────────────────────────
  const now = new Date();
  const getCutoff = (period: 'semanal' | 'mensal' | '30dias') => {
    if (period === 'semanal') return format(subDays(now, 7), 'yyyy-MM-dd');
    if (period === '30dias') return format(subDays(now, 30), 'yyyy-MM-dd');
    return format(startOfMonth(now), 'yyyy-MM-dd');
  };

  const prevCutoff = ordersPeriod === 'semanal'
    ? format(subDays(now, 14), 'yyyy-MM-dd')
    : ordersPeriod === '30dias'
    ? format(subDays(now, 60), 'yyyy-MM-dd')
    : format(startOfMonth(subMonths(now, 1)), 'yyyy-MM-dd');
  const prevEnd = ordersPeriod === 'semanal'
    ? format(subDays(now, 7), 'yyyy-MM-dd')
    : ordersPeriod === '30dias'
    ? format(subDays(now, 30), 'yyyy-MM-dd')
    : format(subDays(startOfMonth(now), 1), 'yyyy-MM-dd');

  const cutoff = getCutoff(ordersPeriod);
  const paidOrders = orders.filter(o => o.status === 'pago');
  const periodOrders = paidOrders.filter(o => o.createdAt.slice(0, 10) >= cutoff);
  const prevOrders = paidOrders.filter(o => o.createdAt.slice(0, 10) >= prevCutoff && o.createdAt.slice(0, 10) <= prevEnd);

  const productRevenue = periodOrders.reduce((s, o) => s + o.totalValue, 0);
  const prevProductRevenue = prevOrders.reduce((s, o) => s + o.totalValue, 0);
  const revenueVariation = prevProductRevenue > 0
    ? ((productRevenue - prevProductRevenue) / prevProductRevenue) * 100
    : null;

  // Top 5 produtos
  const productSales = new Map<string, { qty: number; total: number }>();
  periodOrders.forEach(o => {
    (o.items ?? []).forEach((item: any) => {
      const cur = productSales.get(item.name) ?? { qty: 0, total: 0 };
      productSales.set(item.name, { qty: cur.qty + (item.quantity ?? 1), total: cur.total + (item.price * (item.quantity ?? 1)) });
    });
  });
  const top5 = Array.from(productSales.entries())
    .sort((a, b) => b[1].total - a[1].total)
    .slice(0, 5);

  // Estoque baixo
  const lowStock = products.filter(p => (p.stock ?? 0) < 5);

  // Card 5: Total itens vendidos
  const totalItemsSold = periodOrders
    .flatMap(o => o.items ?? [])
    .reduce((s: number, item: any) => s + (item.quantity ?? 1), 0);

  // Card 6: Ticket médio por pedido
  const avgOrderValue = periodOrders.length > 0 ? productRevenue / periodOrders.length : 0;

  return (
    <AppLayout>
      <div className="p-4 max-w-lg md:max-w-4xl mx-auto space-y-4">
        <div className="flex items-center gap-2 pt-2">
          <ShoppingBag size={20} className="text-primary" />
          <h1 className="text-xl font-bold">Pedidos da Loja</h1>
        </div>

        {/* ── Cards de Vendas de Produtos ── */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Resumo de Vendas</p>
            <Select value={ordersPeriod} onValueChange={(v: 'semanal' | 'mensal' | '30dias') => setOrdersPeriod(v)}>
              <SelectTrigger className="h-7 text-xs w-28">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="semanal">Semanal</SelectItem>
                <SelectItem value="mensal">Este mês</SelectItem>
                <SelectItem value="30dias">30 dias</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {/* Card 1: Faturamento */}
            <Card className="rounded-xl shadow-md border-0 overflow-hidden">
              <CardContent className="p-4 relative">
                <div className="absolute inset-0 bg-gradient-to-br from-teal-500 to-cyan-600 opacity-[0.07]"></div>
                <div className="relative flex items-start justify-between">
                  <div>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Faturamento Produtos</p>
                    <p className="text-2xl font-bold">{formatCurrency(productRevenue)}</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">{periodOrders.length} pedido{periodOrders.length !== 1 ? 's' : ''} pagos</p>
                  </div>
                  <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-teal-500 to-cyan-600 flex items-center justify-center shrink-0">
                    <Package size={16} className="text-white" />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Card 2: Variação */}
            <Card className="rounded-xl shadow-md border-0 overflow-hidden">
              <CardContent className="p-4 relative">
                {revenueVariation !== null && (
                  <div className={`absolute inset-0 opacity-[0.07] ${revenueVariation >= 0 ? 'bg-gradient-to-br from-green-500 to-emerald-600' : 'bg-gradient-to-br from-red-500 to-rose-600'}`}></div>
                )}
                <div className="relative flex items-start justify-between">
                  <div>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Variação vs Anterior</p>
                    {revenueVariation !== null ? (
                      <p className={`text-2xl font-bold ${revenueVariation >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-500 dark:text-red-400'}`}>
                        {revenueVariation >= 0 ? '+' : ''}{revenueVariation.toFixed(1)}%
                      </p>
                    ) : (
                      <p className="text-2xl font-bold text-muted-foreground">—</p>
                    )}
                    <p className="text-[10px] text-muted-foreground mt-0.5">período anterior</p>
                  </div>
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${revenueVariation === null ? 'bg-muted' : revenueVariation >= 0 ? 'bg-gradient-to-br from-green-500 to-emerald-600' : 'bg-gradient-to-br from-red-500 to-rose-600'}`}>
                    {revenueVariation !== null && revenueVariation >= 0
                      ? <TrendingUp size={16} className="text-white" />
                      : <TrendingDown size={16} className="text-white" />
                    }
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Card 3: Top 5 produtos */}
            <Card className="rounded-xl shadow-md">
              <CardContent className="p-4 space-y-3">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Top Produtos Vendidos</p>
                {top5.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-2">Nenhuma venda no período</p>
                ) : (
                  <div className="space-y-2">
                    {top5.map(([name, data], i) => (
                      <div key={name} className="flex items-center gap-2">
                        <span className="text-[10px] font-bold text-muted-foreground w-4 shrink-0">#{i + 1}</span>
                        <span className="text-xs flex-1 truncate">{name}</span>
                        <span className="text-[10px] text-muted-foreground shrink-0">{data.qty}x</span>
                        <span className="text-xs font-bold text-primary shrink-0">{formatCurrency(data.total)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Card 4: Estoque baixo */}
            <Card className={`rounded-xl shadow-md ${lowStock.length > 0 ? 'border-destructive/40' : ''}`}>
              <CardContent className="p-4 space-y-3">
                <div className="flex items-center gap-2">
                  {lowStock.length > 0 && <AlertTriangle size={14} className="text-destructive shrink-0" />}
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Estoque Baixo (&lt;5)</p>
                  {lowStock.length > 0 && (
                    <span className="ml-auto text-[10px] bg-destructive/10 text-destructive rounded-full px-2 py-0.5 font-semibold">{lowStock.length}</span>
                  )}
                </div>
                {lowStock.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-2">✓ Estoque OK</p>
                ) : (
                  <div className="space-y-1.5">
                    {lowStock.slice(0, 5).map(p => (
                      <div key={p.id} className="flex items-center justify-between">
                        <span className="text-xs truncate flex-1">{p.name}</span>
                        <span className={`text-xs font-bold ml-2 shrink-0 ${(p.stock ?? 0) === 0 ? 'text-destructive' : 'text-orange-500'}`}>
                          {p.stock ?? 0} un.
                        </span>
                      </div>
                    ))}
                    {lowStock.length > 5 && (
                      <p className="text-[10px] text-muted-foreground">+ {lowStock.length - 5} outros</p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Card 5: Total itens vendidos */}
            <Card className="rounded-xl shadow-md border-0 overflow-hidden">
              <CardContent className="p-4 relative">
                <div className="absolute inset-0 bg-gradient-to-br from-indigo-500 to-blue-600 opacity-[0.07]"></div>
                <div className="relative flex items-start justify-between">
                  <div>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Total Itens Vendidos</p>
                    <p className="text-2xl font-bold">{totalItemsSold}</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">itens no período</p>
                  </div>
                  <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-blue-600 flex items-center justify-center shrink-0">
                    <ShoppingCart size={16} className="text-white" />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Card 6: Ticket médio por pedido */}
            <Card className="rounded-xl shadow-md border-0 overflow-hidden">
              <CardContent className="p-4 relative">
                <div className="absolute inset-0 bg-gradient-to-br from-amber-500 to-orange-500 opacity-[0.07]"></div>
                <div className="relative flex items-start justify-between">
                  <div>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Ticket Médio por Pedido</p>
                    <p className="text-2xl font-bold">{formatCurrency(avgOrderValue)}</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">por pedido</p>
                  </div>
                  <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center shrink-0">
                    <CreditCard size={16} className="text-white" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* ── Lista de Pedidos ── */}
        <div>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Todos os Pedidos</p>

          {orders.length === 0 && (
            <div className="text-center py-12">
              <Package size={48} className="mx-auto text-muted-foreground/30 mb-3" />
              <p className="text-sm text-muted-foreground">Nenhum pedido realizado ainda</p>
            </div>
          )}

          <div className="space-y-2 md:grid md:grid-cols-2 md:gap-3 md:space-y-0">
            {orders.map(o => (
              <Card key={o.id}>
                <CardContent className="p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-sm">{o.customerName}</p>
                      <p className="text-xs text-muted-foreground">{o.customerWhatsapp}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-primary">{formatCurrency(o.totalValue)}</p>
                      <Badge variant="outline" className={`text-[9px] ${statusColor(o.status)}`}>
                        {o.status.toUpperCase()}
                      </Badge>
                    </div>
                  </div>

                  <div className="text-xs text-muted-foreground">
                    {o.items.map((item, i) => (
                      <span key={i}>{item.quantity}x {item.name}{i < o.items.length - 1 ? ', ' : ''}</span>
                    ))}
                  </div>

                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">
                      {paymentLabel(o.paymentMethod)} · {format(parseISO(o.createdAt), 'dd/MM/yy HH:mm')}
                    </span>
                    {o.status === 'pendente' && (
                      <div className="flex gap-1">
                        <Button size="sm" variant="outline" className="text-[10px] h-7 px-2" onClick={() => updateStatus(o.id!, 'pago')}>
                          ✓ Confirmar
                        </Button>
                        <Button size="sm" variant="ghost" className="text-[10px] h-7 px-2 text-destructive" onClick={() => updateStatus(o.id!, 'cancelado')}>
                          ✕ Cancelar
                        </Button>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
