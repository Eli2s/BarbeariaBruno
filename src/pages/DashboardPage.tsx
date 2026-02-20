import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/db/database';
import { formatCurrency } from '@/lib/format';
import { sendCashbackReminder } from '@/lib/whatsappApi';
import { AppLayout } from '@/components/AppLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Users, CreditCard, DollarSign, UserPlus, ShoppingBag,
  BarChart3, Scissors, RefreshCw, TrendingUp, TrendingDown,
  Award, Package, AlertTriangle, User
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip,
  CartesianGrid, LineChart, Line
} from 'recharts';
import {
  format, subMonths, isBefore, parseISO, differenceInDays,
  startOfMonth, subDays, eachDayOfInterval, startOfDay, isAfter
} from 'date-fns';
import { ptBR } from 'date-fns/locale';

type ChartPeriod = 'semanal' | 'mensal' | 'anual';
type BarberPeriod = 'semanal' | 'mensal' | '30dias';

export default function DashboardPage() {
  const navigate = useNavigate();
  const [chartPeriod, setChartPeriod] = useState<ChartPeriod>('mensal');
  const [barberPeriod, setBarberPeriod] = useState<BarberPeriod>('mensal');
  const [selectedBarber, setSelectedBarber] = useState<string>('none');
  const [refreshKey, setRefreshKey] = useState(0);
  const [ordersPeriod, setOrdersPeriod] = useState<'semanal' | 'mensal'>('mensal');

  // Expire cashbacks and send reminders
  useEffect(() => {
    const checkCashbacks = async () => {
      const activeCashbacks = await db.cashbacks.where('status').equals('ativo').toArray();
      const now = new Date();
      for (const cb of activeCashbacks) {
        const expDate = new Date(cb.expirationDate);
        if (expDate < now) {
          await db.cashbacks.update(cb.id!, { status: 'expirado' });
          continue;
        }
        const daysLeft = differenceInDays(expDate, now);
        const reminderDays = [15, 10, 5, 3, 1];
        if (reminderDays.includes(daysLeft)) {
          const lastReminder = cb.lastReminderSent;
          const todayStr = format(now, 'yyyy-MM-dd');
          if (lastReminder !== todayStr) {
            const client = await db.clients.get(cb.clientId);
            if (client?.whatsapp) {
              sendCashbackReminder(client.name, cb.percentage, daysLeft, client.whatsapp).catch(() => {});
              await db.cashbacks.update(cb.id!, { lastReminderSent: todayStr });
            }
          }
        }
      }
    };
    checkCashbacks();
  }, []);

  const clients = useLiveQuery(() => db.clients.toArray(), [refreshKey]) ?? [];
  const plans = useLiveQuery(() => db.plans.where('status').equals('ativo').toArray(), [refreshKey]) ?? [];
  const allPlans = useLiveQuery(() => db.plans.toArray(), [refreshKey]) ?? [];
  const orders = useLiveQuery(() => db.orders.toArray(), [refreshKey]) ?? [];
  const barbers = useLiveQuery(() => db.barbers.where('isActive').equals(1).toArray(), [refreshKey]) ?? [];
  const allServices = useLiveQuery(() => db.services.toArray(), [refreshKey]) ?? [];
  const products = useLiveQuery(() => db.products.toArray(), [refreshKey]) ?? [];

  const now = new Date();
  const thisMonth = format(now, 'yyyy-MM');
  const newClientsThisMonth = clients.filter(c => c.createdAt.startsWith(thisMonth)).length;
  const recurringRevenue = plans.reduce((s, p) => s + p.value, 0);

  const orderRevenueThisMonth = orders
    .filter(o => o.status === 'pago' && o.createdAt.startsWith(thisMonth))
    .reduce((s, o) => s + o.totalValue, 0);

  const totalRevenue = recurringRevenue + orderRevenueThisMonth;

  // ─── Chart data helpers ──────────────────────────────────────
  const getChartData = () => {
    if (chartPeriod === 'semanal') {
      const days = eachDayOfInterval({ start: subDays(now, 6), end: now });
      return days.map(day => {
        const key = format(day, 'yyyy-MM-dd');
        const label = format(day, 'EEE', { locale: ptBR });
        const ordersVal = orders
          .filter(o => o.status === 'pago' && o.createdAt.startsWith(key))
          .reduce((s, o) => s + o.totalValue, 0);
        const plansVal = allServices
          .filter(s => s.date.startsWith(key))
          .reduce((s, sv) => s + (sv.totalValue ?? 0), 0);
        return { month: label.charAt(0).toUpperCase() + label.slice(1), planos: plansVal, vendas: ordersVal, total: plansVal + ordersVal };
      });
    }
    const months = chartPeriod === 'anual' ? 12 : 6;
    return Array.from({ length: months }, (_, i) => {
      const m = subMonths(now, months - 1 - i);
      const key = format(m, 'yyyy-MM');
      const label = format(m, 'MMM', { locale: ptBR });
      const activePlansInMonth = allPlans.filter(p => {
        const start = parseISO(p.startDate);
        return isBefore(start, m) && p.status !== 'cancelado';
      });
      const plansVal = activePlansInMonth.reduce((s, p) => s + p.value, 0);
      const ordersVal = orders
        .filter(o => o.status === 'pago' && o.createdAt.startsWith(key))
        .reduce((s, o) => s + o.totalValue, 0);
      return {
        month: label.charAt(0).toUpperCase() + label.slice(1),
        planos: plansVal,
        vendas: ordersVal,
        total: plansVal + ordersVal,
      };
    });
  };

  const chartData = getChartData();

  // ─── Barber period cutoff ────────────────────────────────────
  const getBarberCutoff = (period: BarberPeriod) => {
    if (period === 'mensal') return format(startOfMonth(now), 'yyyy-MM-dd');
    if (period === '30dias') return format(subDays(now, 30), 'yyyy-MM-dd');
    return format(subDays(now, 7), 'yyyy-MM-dd'); // semanal
  };

  const getBarberStats = (barberId: number, period: BarberPeriod = barberPeriod) => {
    const cutoff = getBarberCutoff(period);
    const filtered = allServices.filter(s => s.barberId === barberId && s.date.slice(0, 10) >= cutoff);
    return {
      commission: filtered.reduce((s, sv) => s + (sv.barberCommission ?? 0), 0),
      count: filtered.length,
    };
  };

  // ─── Barber line chart data ──────────────────────────────────
  const getBarberChartData = () => {
    if (selectedBarber === 'none') return [];
    const bid = parseInt(selectedBarber);
    const cutoff = getBarberCutoff(barberPeriod);
    const days = eachDayOfInterval({ start: startOfDay(parseISO(cutoff)), end: now });
    return days.map(day => {
      const key = format(day, 'yyyy-MM-dd');
      const val = allServices
        .filter(s => s.barberId === bid && s.date.startsWith(key))
        .reduce((s, sv) => s + (sv.barberCommission ?? 0), 0);
      return { day: format(day, 'dd/MM'), valor: val };
    });
  };

  const barberChartData = getBarberChartData();

  // ─── Top barbeiro ────────────────────────────────────────────
  const topBarber = barbers.reduce<{ name: string; commission: number } | null>((top, b) => {
    const stats = getBarberStats(b.id!, barberPeriod);
    if (!top || stats.commission > top.commission) return { name: b.nickname || b.name, commission: stats.commission };
    return top;
  }, null);

  // ─── Ticket médio ────────────────────────────────────────────
  const cutoffThisMonth = format(startOfMonth(now), 'yyyy-MM-dd');
  const servicesThisMonth = allServices.filter(s => s.date.slice(0, 10) >= cutoffThisMonth);
  const ticketMedio = servicesThisMonth.length > 0
    ? totalRevenue / servicesThisMonth.length
    : 0;

  // ─── Seção Vendas de Produtos ────────────────────────────────
  const getOrdersCutoff = (period: 'semanal' | 'mensal') => {
    if (period === 'semanal') return format(subDays(now, 7), 'yyyy-MM-dd');
    return format(startOfMonth(now), 'yyyy-MM-dd');
  };

  const ordersCutoff = getOrdersCutoff(ordersPeriod);
  const prevCutoff = ordersPeriod === 'semanal'
    ? format(subDays(now, 14), 'yyyy-MM-dd')
    : format(startOfMonth(subMonths(now, 1)), 'yyyy-MM-dd');
  const prevEnd = ordersPeriod === 'semanal'
    ? format(subDays(now, 7), 'yyyy-MM-dd')
    : format(subDays(startOfMonth(now), 1), 'yyyy-MM-dd');

  const paidOrders = orders.filter(o => o.status === 'pago');
  const periodOrders = paidOrders.filter(o => o.createdAt.slice(0, 10) >= ordersCutoff);
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

  // ─── Metrics cards ───────────────────────────────────────────
  const metrics = [
    { label: 'Total Clientes', value: clients.length, icon: Users, path: '/clientes', color: 'from-blue-500 to-blue-600' },
    { label: 'Planos Ativos', value: plans.length, icon: CreditCard, path: '/planos', color: 'from-violet-500 to-purple-600' },
    { label: 'Receita Mensal', value: formatCurrency(totalRevenue), icon: DollarSign, path: '/planos', color: 'from-emerald-500 to-green-600' },
    { label: 'Novos este mês', value: newClientsThisMonth, icon: UserPlus, path: '/clientes', color: 'from-orange-500 to-red-500' },
  ];

  const CustomTooltip = ({ active, payload, label }: any) => {
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
  };

  const BarberTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;
    return (
      <div className="bg-card border border-border rounded-lg p-3 shadow-lg">
        <p className="text-xs font-semibold mb-1">{label}</p>
        <p className="text-xs text-primary font-bold">{formatCurrency(payload[0].value)}</p>
      </div>
    );
  };

  return (
    <AppLayout>
      <div className="p-4 max-w-lg md:max-w-full mx-auto space-y-5">
        {/* Header mobile */}
        <div className="flex items-center justify-between pt-2 md:hidden">
          <div>
            <h1 className="text-xl font-bold gradient-text">Bruno Barbearia</h1>
            <p className="text-xs text-muted-foreground">Painel de controle</p>
          </div>
          <Button size="sm" onClick={() => navigate('/atendimento')} className="font-semibold">
            + Atendimento
          </Button>
        </div>

        {/* ── Metric Cards ── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {metrics.map(m => (
            <Card
              key={m.label}
              className="cursor-pointer hover:shadow-lg hover:shadow-primary/10 hover:scale-[1.02] transition-all border-0 overflow-hidden rounded-xl shadow-md"
              onClick={() => navigate(m.path)}
            >
              <CardContent className="p-4 relative">
                <div className={`absolute inset-0 bg-gradient-to-br ${m.color} opacity-[0.08]`}></div>
                <div className="relative">
                  <div className="flex items-center gap-2 mb-2">
                    <div className={`w-8 h-8 rounded-xl bg-gradient-to-br ${m.color} flex items-center justify-center shadow-sm`}>
                      <m.icon size={15} className="text-white" />
                    </div>
                  </div>
                  <p className="text-2xl font-bold">{m.value}</p>
                  <span className="text-[10px] text-muted-foreground uppercase tracking-wider">{m.label}</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* ── Cards secundários: Ticket Médio + Top Barbeiro ── */}
        <div className="grid grid-cols-2 gap-3">
          <Card className="rounded-xl shadow-md border-0 overflow-hidden">
            <CardContent className="p-4 relative">
              <div className="absolute inset-0 bg-gradient-to-br from-amber-400 to-yellow-500 opacity-[0.08]"></div>
              <div className="relative">
                <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-amber-400 to-yellow-500 flex items-center justify-center shadow-sm mb-2">
                  <TrendingUp size={15} className="text-white" />
                </div>
                <p className="text-xl font-bold">{formatCurrency(ticketMedio)}</p>
                <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Ticket Médio</span>
              </div>
            </CardContent>
          </Card>
          <Card className="rounded-xl shadow-md border-0 overflow-hidden">
            <CardContent className="p-4 relative">
              <div className="absolute inset-0 bg-gradient-to-br from-rose-500 to-pink-600 opacity-[0.08]"></div>
              <div className="relative">
                <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-rose-500 to-pink-600 flex items-center justify-center shadow-sm mb-2">
                  <Award size={15} className="text-white" />
                </div>
                <p className="text-base font-bold truncate">{topBarber?.name ?? '—'}</p>
                <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Top Barbeiro</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* ── Gráfico de Faturamento ── */}
        <Card className="overflow-hidden rounded-xl shadow-md">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl gradient-primary flex items-center justify-center">
                  <BarChart3 size={16} className="text-white" />
                </div>
                <div>
                  <span className="text-sm font-semibold">Faturamento</span>
                  <p className="text-[10px] text-muted-foreground">Receita total</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Select value={chartPeriod} onValueChange={(v: ChartPeriod) => setChartPeriod(v)}>
                  <SelectTrigger className="h-8 text-xs w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="semanal">Semanal</SelectItem>
                    <SelectItem value="mensal">Mensal (6m)</SelectItem>
                    <SelectItem value="anual">Anual (12m)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex items-center gap-4 mb-3">
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-[hsl(225,85%,55%)]"></span>
                <span className="text-[10px] text-muted-foreground">Serviços</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-[hsl(350,80%,55%)]"></span>
                <span className="text-[10px] text-muted-foreground">Vendas Loja</span>
              </div>
            </div>

            <div className="h-48 md:h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} barCategoryGap="20%">
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                  <XAxis dataKey="month" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} stroke="hsl(var(--border))" tickLine={false} axisLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} width={55} tickFormatter={v => `R$${v}`} tickLine={false} axisLine={false} />
                  <Tooltip content={<CustomTooltip />} cursor={{ fill: 'hsl(var(--primary) / 0.05)' }} />
                  <Bar dataKey="planos" name="Serviços" fill="hsl(225, 85%, 55%)" radius={[4, 4, 0, 0]} stackId="revenue" />
                  <Bar dataKey="vendas" name="Vendas" fill="hsl(350, 80%, 55%)" radius={[4, 4, 0, 0]} stackId="revenue" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* ── Gráfico individual por barbeiro ── */}
        {barbers.length > 0 && (
          <Card className="overflow-hidden rounded-xl shadow-md">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl gradient-subtle flex items-center justify-center">
                    <Scissors size={16} className="text-primary" />
                  </div>
                  <div>
                    <span className="text-sm font-semibold">Por Barbeiro</span>
                    <p className="text-[10px] text-muted-foreground">Valor a receber</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Select value={barberPeriod} onValueChange={(v: BarberPeriod) => setBarberPeriod(v)}>
                    <SelectTrigger className="h-8 text-xs w-28">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="semanal">Semanal</SelectItem>
                      <SelectItem value="mensal">Este mês</SelectItem>
                      <SelectItem value="30dias">30 dias</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <Select value={selectedBarber} onValueChange={setSelectedBarber}>
                <SelectTrigger className="h-9 text-sm mb-4">
                  <SelectValue placeholder="Selecionar Barbeiro..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Selecionar Barbeiro...</SelectItem>
                  {barbers.map(b => (
                    <SelectItem key={b.id} value={String(b.id)}>{b.nickname || b.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {selectedBarber === 'none' ? (
                <div className="h-40 flex flex-col items-center justify-center text-muted-foreground gap-2">
                  <Scissors size={28} className="opacity-30" />
                  <p className="text-sm">Selecione um barbeiro para ver o gráfico</p>
                </div>
              ) : (
                <div className="h-48">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={barberChartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                      <XAxis dataKey="day" tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} tickLine={false} axisLine={false} interval="preserveStartEnd" />
                      <YAxis tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} width={55} tickFormatter={v => `R$${v}`} tickLine={false} axisLine={false} />
                      <Tooltip content={<BarberTooltip />} />
                      <Line type="monotone" dataKey="valor" name="Valor a receber" stroke="hsl(var(--primary))" strokeWidth={2.5} dot={false} activeDot={{ r: 5 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* ── Vendas de Produtos ── */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-teal-500 to-cyan-600 flex items-center justify-center shadow-sm">
                <ShoppingBag size={15} className="text-white" />
              </div>
              <div>
                <h2 className="text-sm font-semibold">Vendas de Produtos</h2>
                <p className="text-[10px] text-muted-foreground">Loja</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Select value={ordersPeriod} onValueChange={(v: 'semanal' | 'mensal') => setOrdersPeriod(v)}>
                <SelectTrigger className="h-8 text-xs w-28">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="semanal">Semanal</SelectItem>
                  <SelectItem value="mensal">Este mês</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => navigate('/pedidos')}>
                <ShoppingBag size={14} />
              </Button>
            </div>
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

            {/* Card 4: Variação */}
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

            {/* Card 2: Top 5 produtos */}
            <Card className="rounded-xl shadow-md md:col-span-1">
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

            {/* Card 3: Estoque baixo */}
            <Card className={`rounded-xl shadow-md md:col-span-1 ${lowStock.length > 0 ? 'border-destructive/40' : ''}`}>
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
          </div>
        </div>

        {/* ── Desempenho por Barbeiro ── */}
        {barbers.length > 0 && (
          <Card className="rounded-xl shadow-md">
            <CardContent className="p-4 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl gradient-subtle flex items-center justify-center">
                    <Scissors size={16} className="text-primary" />
                  </div>
                  <div>
                    <span className="text-sm font-semibold">Desempenho por Barbeiro</span>
                    <p className="text-[10px] text-muted-foreground">Atendimentos e valores</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Select value={barberPeriod} onValueChange={(v: BarberPeriod) => setBarberPeriod(v)}>
                    <SelectTrigger className="h-8 text-xs w-28">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="semanal">Semanal</SelectItem>
                      <SelectItem value="mensal">Este mês</SelectItem>
                      <SelectItem value="30dias">30 dias</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setRefreshKey(k => k + 1)}>
                    <RefreshCw size={14} />
                  </Button>
                </div>
              </div>

              {/* Mobile: cards */}
              <div className="md:hidden space-y-2">
                {barbers.map(barber => {
                  const stats = getBarberStats(barber.id!);
                  return (
                    <div
                      key={barber.id}
                      className="rounded-xl border border-border bg-card p-3 flex items-center gap-3"
                    >
                      <div className="w-9 h-9 rounded-full bg-muted flex items-center justify-center shrink-0 overflow-hidden">
                        {barber.photo
                          ? <img src={barber.photo} alt={barber.name} className="w-9 h-9 object-cover" />
                          : <User size={16} className="text-muted-foreground" />
                        }
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold truncate">{barber.nickname || barber.name}</p>
                        <p className="text-[10px] text-muted-foreground">{stats.count} atendimento{stats.count !== 1 ? 's' : ''}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-sm font-bold text-primary">{formatCurrency(stats.commission)}</p>
                        <p className="text-[10px] text-muted-foreground">a receber</p>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Desktop: tabela */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border text-[11px] text-muted-foreground uppercase tracking-wider">
                      <th className="text-left pb-2 font-medium">Barbeiro</th>
                      <th className="text-right pb-2 font-medium">Atendimentos</th>
                      <th className="text-right pb-2 font-medium">Valor a receber</th>
                    </tr>
                  </thead>
                  <tbody>
                    {barbers.map(barber => {
                      const stats = getBarberStats(barber.id!);
                      return (
                        <tr key={barber.id} className="border-b border-border/50 hover:bg-accent/10 transition-colors">
                          <td className="py-2.5">
                            <div className="flex items-center gap-2">
                              <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center overflow-hidden shrink-0">
                                {barber.photo
                                  ? <img src={barber.photo} alt={barber.name} className="w-8 h-8 object-cover" />
                                  : <User size={14} className="text-muted-foreground" />
                                }
                              </div>
                              <span className="font-medium">{barber.nickname || barber.name}</span>
                            </div>
                          </td>
                          <td className="py-2.5 text-right text-muted-foreground">{stats.count}</td>
                          <td className="py-2.5 text-right font-bold text-primary">{formatCurrency(stats.commission)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                  {barbers.length > 1 && (() => {
                    const totals = barbers.reduce((acc, b) => {
                      const s = getBarberStats(b.id!);
                      return { commission: acc.commission + s.commission, count: acc.count + s.count };
                    }, { commission: 0, count: 0 });
                    return (
                      <tfoot>
                        <tr className="border-t-2 border-border font-bold text-xs">
                          <td className="pt-2.5 text-muted-foreground uppercase tracking-wider">Total</td>
                          <td className="pt-2.5 text-right text-muted-foreground">{totals.count}</td>
                          <td className="pt-2.5 text-right text-primary">{formatCurrency(totals.commission)}</td>
                        </tr>
                      </tfoot>
                    );
                  })()}
                </table>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </AppLayout>
  );
}
