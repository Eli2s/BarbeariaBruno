import { useState } from 'react';
import { AppLayout } from '@/components/AppLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ShoppingBag, Package, TrendingUp, TrendingDown, AlertTriangle, ShoppingCart, CreditCard, CheckCircle, XCircle, Clock } from 'lucide-react';
import { toast } from 'sonner';
import { formatCurrency } from '@/lib/format';
import { format, parseISO, startOfMonth, subDays, subMonths } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';

import { useOrders, useUpdateOrder } from '@/hooks/useOrders';
import { useProducts } from '@/hooks/useProducts';

const STATUS_TABS = ['todos', 'pendente', 'pago', 'cancelado'] as const;
type StatusTab = typeof STATUS_TABS[number];

const statusConfig: Record<string, { icon: React.ElementType; label: string; gradient: string; badge: string }> = {
  pendente: { icon: Clock, label: 'Pendente', gradient: 'from-amber-500 to-orange-500', badge: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30' },
  pago: { icon: CheckCircle, label: 'Pago', gradient: 'from-emerald-500 to-green-500', badge: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30' },
  cancelado: { icon: XCircle, label: 'Cancelado', gradient: 'from-red-500 to-rose-500', badge: 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/30' },
};

const paymentLabel = (m: string) => {
  if (m === 'cartao') return '💳 Cartão';
  if (m === 'pix') return '📱 Pix';
  return '📲 WhatsApp';
};

export default function OrdersPage() {
  const [ordersPeriod, setOrdersPeriod] = useState<'semanal' | 'mensal' | '30dias'>('mensal');
  const [statusTab, setStatusTab] = useState<StatusTab>('todos');

  const { data: allOrders = [] } = useOrders();
  const { data: products = [] } = useProducts();
  const updateOrderMutation = useUpdateOrder();

  const orders = [...allOrders].reverse();

  const updateStatus = async (id: number, status: 'pago' | 'cancelado') => {
    try {
      await updateOrderMutation.mutateAsync({ id, status });
      toast.success(`Pedido ${status === 'pago' ? 'confirmado' : 'cancelado'}!`);
    } catch {
      toast.error('Erro ao atualizar pedido');
    }
  };

  // ── Métricas ──
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
  const revenueVariation = prevProductRevenue > 0 ? ((productRevenue - prevProductRevenue) / prevProductRevenue) * 100 : null;

  const productSales = new Map<string, { qty: number; total: number }>();
  periodOrders.forEach(o => {
    (o.items ?? []).forEach((item: any) => {
      const cur = productSales.get(item.name) ?? { qty: 0, total: 0 };
      productSales.set(item.name, { qty: cur.qty + (item.quantity ?? 1), total: cur.total + (item.price * (item.quantity ?? 1)) });
    });
  });
  const top5 = Array.from(productSales.entries()).sort((a, b) => b[1].total - a[1].total).slice(0, 5);
  const lowStock = products.filter(p => (p.stock ?? 0) < 5);
  const totalItemsSold = periodOrders.flatMap(o => o.items ?? []).reduce((s: number, item: any) => s + (item.quantity ?? 1), 0);
  const avgOrderValue = periodOrders.length > 0 ? productRevenue / periodOrders.length : 0;

  const filteredOrders = statusTab === 'todos' ? orders : orders.filter(o => o.status === statusTab);

  const metrics = [
    { label: 'Faturamento', value: formatCurrency(productRevenue), sub: `${periodOrders.length} pedido${periodOrders.length !== 1 ? 's' : ''}`, icon: Package, gradient: 'from-teal-500 to-cyan-600' },
    { label: 'Variação', value: revenueVariation !== null ? `${revenueVariation >= 0 ? '+' : ''}${revenueVariation.toFixed(1)}%` : '—', sub: 'vs anterior', icon: revenueVariation !== null && revenueVariation >= 0 ? TrendingUp : TrendingDown, gradient: revenueVariation !== null && revenueVariation >= 0 ? 'from-emerald-500 to-green-500' : 'from-red-500 to-rose-500', valueClass: revenueVariation !== null ? (revenueVariation >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500 dark:text-red-400') : 'text-muted-foreground' },
    { label: 'Itens Vendidos', value: String(totalItemsSold), sub: 'no período', icon: ShoppingCart, gradient: 'from-indigo-500 to-blue-600' },
    { label: 'Ticket Médio', value: formatCurrency(avgOrderValue), sub: 'por pedido', icon: CreditCard, gradient: 'from-amber-500 to-orange-500' },
  ];

  return (
    <AppLayout>
      <div className="p-4 max-w-lg md:max-w-4xl mx-auto space-y-5">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between pt-2">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-teal-500 to-cyan-600 flex items-center justify-center">
              <ShoppingBag size={16} className="text-white" />
            </div>
            <h1 className="text-xl font-bold">Pedidos</h1>
          </div>
          <Select value={ordersPeriod} onValueChange={(v: any) => setOrdersPeriod(v)}>
            <SelectTrigger className="h-8 text-xs w-28"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="semanal">Semanal</SelectItem>
              <SelectItem value="mensal">Este mês</SelectItem>
              <SelectItem value="30dias">30 dias</SelectItem>
            </SelectContent>
          </Select>
        </motion.div>

        {/* Metrics Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {metrics.map((m, i) => (
            <motion.div key={m.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}>
              <Card className="overflow-hidden border-0 shadow-md">
                <CardContent className="p-3 relative">
                  <div className={`absolute inset-0 bg-gradient-to-br ${m.gradient} opacity-[0.07]`} />
                  <div className="relative">
                    <div className={`w-7 h-7 rounded-lg bg-gradient-to-br ${m.gradient} flex items-center justify-center mb-2`}>
                      <m.icon size={14} className="text-white" />
                    </div>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{m.label}</p>
                    <p className={`text-lg font-bold mt-0.5 ${m.valueClass || ''}`}>{m.value}</p>
                    <p className="text-[10px] text-muted-foreground">{m.sub}</p>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        {/* Top Products & Low Stock */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 }}>
            <Card className="h-full">
              <CardContent className="p-4 space-y-3">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">🏆 Top Produtos</p>
                {top5.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-2">Sem vendas no período</p>
                ) : (
                  <div className="space-y-2">
                    {top5.map(([name, data], i) => (
                      <motion.div key={name} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.4 + i * 0.06 }} className="flex items-center gap-2">
                        <span className="text-xs font-bold text-muted-foreground w-5 shrink-0">#{i + 1}</span>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <span className="text-xs truncate">{name}</span>
                            <span className="text-xs font-bold text-primary shrink-0 ml-2">{formatCurrency(data.total)}</span>
                          </div>
                          <div className="w-full bg-muted rounded-full h-1 mt-1">
                            <motion.div
                              className="h-1 rounded-full bg-gradient-to-r from-primary to-accent"
                              initial={{ width: 0 }}
                              animate={{ width: `${(data.total / (top5[0]?.[1]?.total || 1)) * 100}%` }}
                              transition={{ delay: 0.5 + i * 0.1, duration: 0.6 }}
                            />
                          </div>
                        </div>
                        <span className="text-[10px] text-muted-foreground shrink-0">{data.qty}x</span>
                      </motion.div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>

          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.35 }}>
            <Card className={`h-full ${lowStock.length > 0 ? 'border-destructive/30' : ''}`}>
              <CardContent className="p-4 space-y-3">
                <div className="flex items-center gap-2">
                  {lowStock.length > 0 && <AlertTriangle size={14} className="text-destructive" />}
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">Estoque Baixo</p>
                  {lowStock.length > 0 && (
                    <span className="ml-auto text-[10px] bg-destructive/10 text-destructive rounded-full px-2 py-0.5 font-bold">{lowStock.length}</span>
                  )}
                </div>
                {lowStock.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-2">✓ Tudo OK</p>
                ) : (
                  <div className="space-y-2">
                    {lowStock.slice(0, 5).map(p => (
                      <div key={p.id} className="flex items-center justify-between">
                        <span className="text-xs truncate flex-1">{p.name}</span>
                        <Badge variant="outline" className={`text-[9px] ${(p.stock ?? 0) === 0 ? 'border-destructive/50 text-destructive' : 'border-amber-500/50 text-amber-600 dark:text-amber-400'}`}>
                          {p.stock ?? 0} un.
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Orders List */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }}>
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Pedidos</p>
            <Badge variant="secondary" className="text-[10px]">{filteredOrders.length}</Badge>
          </div>

          <Tabs value={statusTab} onValueChange={v => setStatusTab(v as StatusTab)} className="mb-4">
            <TabsList className="grid grid-cols-4 w-full">
              <TabsTrigger value="todos" className="text-xs">Todos</TabsTrigger>
              <TabsTrigger value="pendente" className="text-xs">Pendentes</TabsTrigger>
              <TabsTrigger value="pago" className="text-xs">Pagos</TabsTrigger>
              <TabsTrigger value="cancelado" className="text-xs">Cancelados</TabsTrigger>
            </TabsList>
          </Tabs>

          {filteredOrders.length === 0 && (
            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="text-center py-12">
              <Package size={48} className="mx-auto text-muted-foreground/20 mb-3" />
              <p className="text-sm text-muted-foreground">Nenhum pedido encontrado</p>
            </motion.div>
          )}

          <AnimatePresence mode="popLayout">
            <div className="space-y-2 md:grid md:grid-cols-2 md:gap-3 md:space-y-0">
              {filteredOrders.map((o, i) => {
                const cfg = statusConfig[o.status] || statusConfig.pendente;
                const Icon = cfg.icon;
                return (
                  <motion.div
                    key={o.id}
                    layout
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ delay: i * 0.04, type: 'spring', stiffness: 300, damping: 30 }}
                  >
                    <Card className="overflow-hidden hover:shadow-lg transition-shadow duration-300 group">
                      <CardContent className="p-0">
                        {/* Status bar */}
                        <div className={`h-1 bg-gradient-to-r ${cfg.gradient}`} />
                        <div className="p-3 space-y-2">
                          <div className="flex items-start justify-between">
                            <div className="flex items-center gap-2 min-w-0">
                              <div className={`w-8 h-8 rounded-full bg-gradient-to-br ${cfg.gradient} flex items-center justify-center shrink-0 opacity-80`}>
                                <Icon size={14} className="text-white" />
                              </div>
                              <div className="min-w-0">
                                <p className="font-semibold text-sm truncate">{o.customerName}</p>
                                <p className="text-[10px] text-muted-foreground">{o.customerWhatsapp}</p>
                              </div>
                            </div>
                            <div className="text-right shrink-0">
                              <p className="font-bold text-primary">{formatCurrency(o.totalValue)}</p>
                              <Badge variant="outline" className={`text-[9px] ${cfg.badge}`}>{cfg.label}</Badge>
                            </div>
                          </div>

                          <div className="flex flex-wrap gap-1">
                            {o.items.map((item, idx) => (
                              <span key={idx} className="text-[10px] bg-muted px-1.5 py-0.5 rounded-md">{item.quantity}x {item.name}</span>
                            ))}
                          </div>

                          <div className="flex items-center justify-between text-[10px]">
                            <span className="text-muted-foreground">
                              {paymentLabel(o.paymentMethod)} · {format(parseISO(o.createdAt), 'dd/MM/yy HH:mm')}
                            </span>
                            {o.status === 'pendente' && (
                              <div className="flex gap-1">
                                <Button size="sm" className="h-6 px-2 text-[10px] gap-1 bg-gradient-to-r from-emerald-500 to-green-500 hover:from-emerald-600 hover:to-green-600 text-white border-0" onClick={() => updateStatus(o.id!, 'pago')}>
                                  <CheckCircle size={10} /> Confirmar
                                </Button>
                                <Button size="sm" variant="ghost" className="h-6 px-2 text-[10px] text-destructive hover:text-destructive" onClick={() => updateStatus(o.id!, 'cancelado')}>
                                  <XCircle size={10} />
                                </Button>
                              </div>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                );
              })}
            </div>
          </AnimatePresence>
        </motion.div>
      </div>
    </AppLayout>
  );
}
