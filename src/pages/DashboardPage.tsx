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
  Users, CreditCard, DollarSign, UserPlus,
  BarChart3, Scissors, RefreshCw, TrendingUp,
  Award, User, GitBranch
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip,
  CartesianGrid, LineChart, Line
} from 'recharts';
import {
  format, subMonths, isBefore, parseISO, differenceInDays,
  startOfMonth, subDays, eachDayOfInterval, isAfter
} from 'date-fns';
import { ptBR } from 'date-fns/locale';

type ChartPeriod = 'semanal' | 'mensal' | 'anual';
type BarberPeriod = 'semanal' | 'mensal' | '30dias';

const highlightedBarberId: number | null = null; // ready for future auth integration

export default function DashboardPage() {
  const navigate = useNavigate();
  const [chartPeriod, setChartPeriod] = useState<ChartPeriod>('mensal');
  const [barberPeriod, setBarberPeriod] = useState<BarberPeriod>('mensal');
  const [selectedBarber, setSelectedBarber] = useState<number | 'todos'>('todos');
  const [refreshKey, setRefreshKey] = useState(0);

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

  const now = new Date();
  const thisMonth = format(now, 'yyyy-MM');
  const newClientsThisMonth = clients.filter(c => c.createdAt.startsWith(thisMonth)).length;
  const recurringRevenue = plans.reduce((s, p) => s + p.value, 0);

  const orderRevenueThisMonth = orders
    .filter(o => o.status === 'pago' && o.createdAt.startsWith(thisMonth))
    .reduce((s, o) => s + o.totalValue, 0);

  const totalRevenue = recurringRevenue + orderRevenueThisMonth;

  // ─── Chart data ──────────────────────────────────────────────
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
    return format(subDays(now, 7), 'yyyy-MM-dd');
  };

  const getBarberStats = (barberId: number, period: BarberPeriod = barberPeriod) => {
    const cutoff = getBarberCutoff(period);
    const filtered = allServices.filter(s => s.barberId === barberId && s.date.slice(0, 10) >= cutoff);
    return {
      commission: filtered.reduce((s, sv) => s + (sv.barberCommission ?? 0), 0),
      count: filtered.length,
    };
  };

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

  // ─── Totals across barbers ───────────────────────────────────
  const barberTotals = barbers.reduce(
    (acc, b) => {
      const s = getBarberStats(b.id!);
      return { commission: acc.commission + s.commission, count: acc.count + s.count };
    },
    { commission: 0, count: 0 }
  );

  // ─── Barber chart data ───────────────────────────────────────
  const getBarberChartData = () => {
    const cutoff = getBarberCutoff(barberPeriod);
    if (selectedBarber === 'todos') {
      return barbers.map(b => {
        const stats = getBarberStats(b.id!);
        return { name: b.nickname || b.name, valor: stats.commission };
      });
    }
    // individual barber
    if (barberPeriod === 'semanal') {
      const days = eachDayOfInterval({ start: subDays(now, 6), end: now });
      return days.map(day => {
        const key = format(day, 'yyyy-MM-dd');
        const label = format(day, 'EEE', { locale: ptBR });
        const valor = allServices
          .filter(s => s.barberId === selectedBarber && s.date.startsWith(key))
          .reduce((s, sv) => s + (sv.barberCommission ?? 0), 0);
        return { label: label.charAt(0).toUpperCase() + label.slice(1), valor };
      });
    }
    // mensal or 30dias — by week chunks
    const days = barberPeriod === '30dias' ? 30 : 180;
    const weeks: { label: string; valor: number }[] = [];
    const totalWeeks = Math.ceil(days / 7);
    for (let i = totalWeeks - 1; i >= 0; i--) {
      const weekEnd = subDays(now, i * 7);
      const weekStart = subDays(now, i * 7 + 6);
      const startKey = format(weekStart, 'yyyy-MM-dd');
      const endKey = format(weekEnd, 'yyyy-MM-dd');
      const label = format(weekEnd, 'dd/MM');
      const valor = allServices
        .filter(s => s.barberId === selectedBarber && s.date.slice(0, 10) >= startKey && s.date.slice(0, 10) <= endKey)
        .reduce((s, sv) => s + (sv.barberCommission ?? 0), 0);
      weeks.push({ label, valor });
    }
    return weeks;
  };

  const barberChartData = getBarberChartData();
  const selectedBarberName = selectedBarber === 'todos'
    ? 'Todos'
    : (barbers.find(b => b.id === selectedBarber)?.nickname || barbers.find(b => b.id === selectedBarber)?.name || '');
  const barberChartEmpty = barberChartData.every(d => d.valor === 0);

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

  const periodLabel = {
    semanal: 'Últimos 7 dias',
    mensal: 'Este mês',
    '30dias': 'Últimos 30 dias',
  }[barberPeriod];

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

        {/* ── Desempenho por Barbeiro ── */}
        {barbers.length > 0 && (
          <Card className="rounded-xl shadow-md">
            <CardContent className="p-4 space-y-4">
              {/* Header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl gradient-subtle flex items-center justify-center">
                    <Scissors size={16} className="text-primary" />
                  </div>
                  <div>
                    <span className="text-sm font-semibold">Desempenho por Barbeiro</span>
                    <p className="text-[10px] text-muted-foreground">{periodLabel}</p>
                  </div>
                </div>
                <div className="flex items-center gap-1">
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

              {/* Cards grid — mobile e desktop */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {barbers.map(barber => {
                  const stats = getBarberStats(barber.id!);
                  const isHighlighted = highlightedBarberId === barber.id;
                  return (
                    <div
                      key={barber.id}
                      className={`rounded-xl border p-4 flex items-center gap-4 transition-all ${
                        isHighlighted
                          ? 'border-primary bg-primary/5 shadow-md shadow-primary/10'
                          : 'border-border bg-card hover:border-primary/30 hover:shadow-sm'
                      }`}
                    >
                      {/* Avatar */}
                      <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center shrink-0 overflow-hidden border-2 border-border">
                        {barber.photo
                          ? <img src={barber.photo} alt={barber.name} className="w-12 h-12 object-cover" />
                          : <User size={20} className="text-muted-foreground" />
                        }
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm truncate">{barber.nickname || barber.name}</p>
                        <div className="flex items-center gap-3 mt-1.5">
                          <div>
                            <p className="text-xl font-bold leading-none">{stats.count}</p>
                            <p className="text-[10px] text-muted-foreground mt-0.5">Atendimentos</p>
                          </div>
                          <div className="w-px h-8 bg-border"></div>
                          <div>
                            <p className="text-xl font-bold leading-none text-primary">{formatCurrency(stats.commission)}</p>
                            <p className="text-[10px] text-muted-foreground mt-0.5">Valor a receber</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Linha de totais */}
              {barbers.length > 1 && (
                <div className="rounded-xl bg-muted/50 border border-border px-4 py-3 flex items-center justify-between">
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Total equipe</span>
                  <div className="flex items-center gap-6">
                    <div className="text-center">
                      <p className="text-base font-bold">{barberTotals.count}</p>
                      <p className="text-[10px] text-muted-foreground">Atendimentos</p>
                    </div>
                    <div className="text-center">
                      <p className="text-base font-bold text-primary">{formatCurrency(barberTotals.commission)}</p>
                      <p className="text-[10px] text-muted-foreground">A receber</p>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* ── Gráfico por Barbeiro ── */}
        {barbers.length > 0 && (
          <Card className="overflow-hidden rounded-xl shadow-md">
            <CardContent className="p-4 space-y-4">
              {/* Header */}
              <div className="flex flex-wrap items-center gap-2 justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
                    <GitBranch size={16} className="text-white" />
                  </div>
                  <span className="text-sm font-semibold">Valor a Receber por Barbeiro</span>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <Select value={String(selectedBarber)} onValueChange={v => setSelectedBarber(v === 'todos' ? 'todos' : Number(v))}>
                    <SelectTrigger className="h-8 text-xs w-36">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="todos">Todos os Barbeiros</SelectItem>
                      {barbers.map(b => (
                        <SelectItem key={b.id} value={String(b.id)}>{b.nickname || b.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
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

              {barberChartEmpty ? (
                <div className="h-40 flex items-center justify-center">
                  <p className="text-sm text-muted-foreground">Nenhum atendimento no período</p>
                </div>
              ) : selectedBarber === 'todos' ? (
                <div className="h-52">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={barberChartData} barCategoryGap="30%">
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                      <XAxis dataKey="name" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} tickLine={false} axisLine={false} />
                      <YAxis tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} width={60} tickFormatter={v => `R$${v}`} tickLine={false} axisLine={false} />
                      <Tooltip
                        content={({ active, payload, label }) => {
                          if (!active || !payload?.length) return null;
                          return (
                            <div className="bg-card border border-border rounded-lg p-3 shadow-lg">
                              <p className="text-xs font-semibold mb-1">{label}</p>
                              <p className="text-xs text-primary font-bold">{formatCurrency(payload[0].value as number)}</p>
                              <p className="text-[10px] text-muted-foreground">Valor a receber</p>
                            </div>
                          );
                        }}
                        cursor={{ fill: 'hsl(var(--primary) / 0.05)' }}
                      />
                      <Bar dataKey="valor" name="Valor a receber" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="h-52">
                  <p className="text-xs text-muted-foreground mb-2">{selectedBarberName} — {periodLabel}</p>
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={barberChartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                      <XAxis dataKey="label" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} tickLine={false} axisLine={false} />
                      <YAxis tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} width={60} tickFormatter={v => `R$${v}`} tickLine={false} axisLine={false} />
                      <Tooltip
                        content={({ active, payload, label }) => {
                          if (!active || !payload?.length) return null;
                          return (
                            <div className="bg-card border border-border rounded-lg p-3 shadow-lg">
                              <p className="text-xs font-semibold mb-1">{label}</p>
                              <p className="text-xs text-primary font-bold">{formatCurrency(payload[0].value as number)}</p>
                              <p className="text-[10px] text-muted-foreground">Valor a receber</p>
                            </div>
                          );
                        }}
                        cursor={{ stroke: 'hsl(var(--primary) / 0.2)' }}
                      />
                      <Line type="monotone" dataKey="valor" stroke="hsl(var(--primary))" strokeWidth={2.5} dot={{ r: 4, fill: 'hsl(var(--primary))' }} activeDot={{ r: 6 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )}
            </CardContent>
          </Card>
        )}

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

            <div className="flex items-center gap-4 mb-3">
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-[hsl(225,85%,55%)]"></span>
                <span className="text-[10px] text-muted-foreground">Serviços</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-[hsl(350,80%,55%)]"></span>
                <span className="text-[10px] text-muted-foreground">Vendas Loja</span>
              </div>
              <div className="ml-auto">
                <span className="text-xs font-bold text-primary">
                  {formatCurrency(chartData.reduce((s, d) => s + d.total, 0))}
                </span>
              </div>
            </div>

            <div className="h-48 md:h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} barCategoryGap="20%">
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                  <XAxis dataKey="month" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} stroke="hsl(var(--border))" tickLine={false} axisLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} width={55} tickFormatter={v => `R$${v}`} tickLine={false} axisLine={false} />
                  <Tooltip content={<CustomTooltip />} cursor={{ fill: 'hsl(var(--primary) / 0.05)' }} />
                  <Bar dataKey="planos" name="Serviços" fill="hsl(225, 85%, 55%)" radius={[0, 0, 0, 0]} stackId="revenue" />
                  <Bar dataKey="vendas" name="Vendas" fill="hsl(350, 80%, 55%)" radius={[4, 4, 0, 0]} stackId="revenue" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
