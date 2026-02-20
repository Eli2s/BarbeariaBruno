
import { useState, useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/db/database';
import { formatCurrency } from '@/lib/format';
import { sendCashbackReminder } from '@/lib/whatsappApi';
import { AppLayout } from '@/components/AppLayout';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Users, CreditCard, UserPlus, Scissors,
  RefreshCw, TrendingUp, Eye, EyeOff,
  Package, ShoppingBag
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip,
  CartesianGrid, Cell
} from 'recharts';
import {
  format, differenceInDays,
  startOfMonth, subDays
} from 'date-fns';
import { GlassCard } from '@/components/dashboard/GlassCard';
import { StatCard } from '@/components/dashboard/StatCard';

type BarberPeriod = 'semanal' | 'mensal' | '30dias';

const BARBER_COLORS = [
  { bar: '#6366f1', bg: 'bg-indigo-500/15', text: 'text-indigo-400', border: 'border-indigo-500/20' },
  { bar: '#a855f7', bg: 'bg-purple-500/15', text: 'text-purple-400', border: 'border-purple-500/20' },
  { bar: '#ec4899', bg: 'bg-pink-500/15', text: 'text-pink-400', border: 'border-pink-500/20' },
  { bar: '#f43f5e', bg: 'bg-rose-500/15', text: 'text-rose-400', border: 'border-rose-500/20' },
  { bar: '#14b8a6', bg: 'bg-teal-500/15', text: 'text-teal-400', border: 'border-teal-500/20' },
];

export default function DashboardPage() {
  const [barberPeriod, setBarberPeriod] = useState<BarberPeriod>('mensal');
  const [refreshKey, setRefreshKey] = useState(0);
  const [hideValues, setHideValues] = useState(false);

  // ── Expire cashbacks ──
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
        if ([15, 10, 5, 3, 1].includes(daysLeft)) {
          const todayStr = format(now, 'yyyy-MM-dd');
          if (cb.lastReminderSent !== todayStr) {
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

  // ── Live queries ──
  const clients  = useLiveQuery(() => db.clients.toArray(), [refreshKey]) ?? [];
  const plans    = useLiveQuery(() => db.plans.where('status').equals('ativo').toArray(), [refreshKey]) ?? [];
  const orders   = useLiveQuery(() => db.orders.toArray(), [refreshKey]) ?? [];
  const barbers  = useLiveQuery(() => db.barbers.toArray().then(bs => bs.filter(b => b.isActive)), [refreshKey]) ?? [];
  const allServices = useLiveQuery(() => db.services.toArray(), [refreshKey]) ?? [];

  const now = new Date();
  const thisMonth = format(now, 'yyyy-MM');
  const cutoffThisMonth = format(startOfMonth(now), 'yyyy-MM-dd');

  // ── Metrics ──
  const newClientsThisMonth = clients.filter(c => c.createdAt.startsWith(thisMonth)).length;
  const servicesThisMonth   = allServices.filter(s => s.date.slice(0, 10) >= cutoffThisMonth);
  const totalAtendimentos   = servicesThisMonth.length;
  const ticketMedio = totalAtendimentos > 0
    ? servicesThisMonth.reduce((s, sv) => s + sv.totalValue, 0) / totalAtendimentos
    : 0;

  // ── Format helper (respects hide toggle) ──
  const fmtVal = (val: number) => hideValues ? '•••••' : formatCurrency(val);

  // ── Barber period filter ──
  const getBarberCutoff = (period: BarberPeriod) => {
    if (period === 'mensal')  return format(startOfMonth(now), 'yyyy-MM-dd');
    if (period === '30dias')  return format(subDays(now, 30),  'yyyy-MM-dd');
    return format(subDays(now, 7), 'yyyy-MM-dd');
  };

  const barberCutoff          = getBarberCutoff(barberPeriod);
  const servicesInBarberPeriod = allServices.filter(s => s.date.slice(0, 10) >= barberCutoff);

  // ── Barber data: Atendimentos + Valor a Receber (comissão) ──
  const barberDataMap = new Map<number, {
    name: string;
    count: number;
    commission: number;
    revenue: number;
  }>();

  barbers.forEach(b => barberDataMap.set(b.id!, {
    name: b.nickname || b.name,
    count: 0,
    commission: 0,
    revenue: 0,
  }));

  servicesInBarberPeriod.forEach((s) => {
    const bid = s.barberId;
    if (bid && barberDataMap.has(bid)) {
      const entry = barberDataMap.get(bid)!;
      entry.count    += 1;
      entry.commission += s.barberCommission ?? 0;
      entry.revenue  += s.totalValue ?? 0;
    }
  });

  const barberDataArray = Array.from(barberDataMap.entries())
    .map(([id, data]) => ({ id, ...data }))
    .sort((a, b) => b.revenue - a.revenue);

  // Chart data for barber revenue chart
  const barberChartData  = barberDataArray.map(b => ({ name: b.name, revenue: b.revenue, count: b.count }));
  const barberChartTotal = barberDataArray.reduce((s, d) => s + d.revenue, 0);

  // ── Product sales this month ──
  const productSalesMap = new Map<string, { name: string; qty: number; total: number }>();
  servicesThisMonth.forEach(s => {
    s.products?.forEach(p => {
      const existing = productSalesMap.get(p.name) ?? { name: p.name, qty: 0, total: 0 };
      existing.qty   += p.quantity;
      existing.total += p.unitPrice * p.quantity;
      productSalesMap.set(p.name, existing);
    });
  });
  orders.filter(o => o.status === 'pago' && o.createdAt.startsWith(thisMonth)).forEach(o => {
    o.items?.forEach(item => {
      const existing = productSalesMap.get(item.name) ?? { name: item.name, qty: 0, total: 0 };
      existing.qty   += item.quantity;
      existing.total += item.unitPrice * item.quantity;
      productSalesMap.set(item.name, existing);
    });
  });

  const topProducts        = Array.from(productSalesMap.values()).sort((a, b) => b.total - a.total).slice(0, 4);
  const productTotalRevenue = topProducts.reduce((s, p) => s + p.total, 0);

  // ── Tooltip ──
  const ChartTooltip = ({ active, payload }: any) => {
    if (!active || !payload?.length) return null;
    const d = payload[0].payload;
    return (
      <div className="bg-black/90 backdrop-blur-xl border border-white/10 rounded-xl p-3 shadow-2xl">
        <p className="text-sm font-bold text-white">{d.name}</p>
        <p className="text-xs text-gray-400 mt-1">
          <span className="text-white font-semibold">{hideValues ? '•••••' : formatCurrency(d.revenue)}</span> • {d.count} atendimentos
        </p>
      </div>
    );
  };

  return (
    <AppLayout>
      <div className="min-h-screen bg-[hsl(240,15%,4%)] text-white p-4 md:p-6 space-y-5">

        {/* ════ Header ════ */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white via-gray-200 to-gray-400">
              Bruno Barbearia
            </h1>
            <p className="text-xs text-gray-500 mt-0.5">Painel de controle</p>
          </div>
          <div className="flex gap-2 items-center">
            <Button
              size="sm"
              variant="ghost"
              className="h-8 w-8 text-gray-400 hover:text-white hover:bg-white/10"
              onClick={() => setHideValues(v => !v)}
              title={hideValues ? 'Mostrar valores' : 'Ocultar valores'}
            >
              {hideValues ? <EyeOff size={14} /> : <Eye size={14} />}
            </Button>
            <Button size="sm" variant="ghost" className="h-8 w-8 text-gray-400 hover:text-white hover:bg-white/10" onClick={() => setRefreshKey(k => k + 1)}>
              <RefreshCw size={14} />
            </Button>
          </div>
        </div>

        {/* ════ Stat Cards ════ */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <StatCard title="Ticket Médio"   value={fmtVal(ticketMedio)}       icon={TrendingUp} glowColor="rgba(250,204,21,0.4)"   iconBg="bg-yellow-500/20" />
          <StatCard title="Atendimentos"   value={totalAtendimentos}          icon={Scissors}   glowColor="rgba(16,185,129,0.4)"   iconBg="bg-emerald-500/20" subtitle="MÊS" />
          <StatCard title="Planos Ativos"  value={plans.length}               icon={CreditCard} glowColor="rgba(139,92,246,0.4)"   iconBg="bg-violet-500/20" />
          <StatCard title="Total Clientes" value={clients.length}             icon={Users}      glowColor="rgba(59,130,246,0.4)"   iconBg="bg-blue-500/20" />
          <StatCard title="Novos este mês" value={newClientsThisMonth}        icon={UserPlus}   glowColor="rgba(251,146,60,0.4)"   iconBg="bg-orange-500/20" />
        </div>

        {/* ════ Revenue by Barber Chart ════ */}
        <GlassCard className="p-5" glowColor="rgba(99,102,241,0.4)">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-indigo-500/20">
                <Scissors size={18} className="text-indigo-400" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Faturamento por Barbeiro</h3>
                <p className="text-[10px] text-gray-500">Receita bruta gerada no período</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {!hideValues && barberChartTotal > 0 && (
                <div className="flex items-center gap-1.5 bg-emerald-500/10 border border-emerald-500/20 rounded-full px-3 py-1">
                  <TrendingUp size={12} className="text-emerald-400" />
                  <span className="text-xs font-bold text-emerald-400">{formatCurrency(barberChartTotal)}</span>
                </div>
              )}
              <Select value={barberPeriod} onValueChange={(v: BarberPeriod) => setBarberPeriod(v)}>
                <SelectTrigger className="h-7 text-[10px] w-24 bg-white/5 border-white/10 text-gray-300">
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

          {barberChartData.length === 0 || barberChartData.every(d => d.revenue === 0) ? (
            <div className="flex flex-col items-center justify-center text-gray-500 gap-2 py-12">
              <Scissors size={40} className="opacity-20" />
              <p className="text-sm">Nenhum atendimento com barbeiro neste período</p>
              <p className="text-xs text-gray-600">Registre atendimentos com barbeiro para ver os dados aqui</p>
            </div>
          ) : (
            <div className="h-52 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={barberChartData} layout="vertical" margin={{ top: 0, right: 10, left: 0, bottom: 0 }}>
                  <defs>
                    {barberChartData.map((_, index) => (
                      <linearGradient id={`bGrad-${index}`} x1="0" y1="0" x2="1" y2="0" key={`grad-${index}`}>
                        <stop offset="0%"   stopColor={BARBER_COLORS[index % BARBER_COLORS.length].bar} stopOpacity={0.15} />
                        <stop offset="100%" stopColor={BARBER_COLORS[index % BARBER_COLORS.length].bar} stopOpacity={0.9} />
                      </linearGradient>
                    ))}
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="rgba(255,255,255,0.04)" />
                  <XAxis type="number" hide />
                  <YAxis
                    dataKey="name"
                    type="category"
                    tick={{ fill: '#9ca3af', fontSize: 12, fontWeight: 600 }}
                    width={85}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip content={<ChartTooltip />} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
                  <Bar dataKey="revenue" radius={[0, 8, 8, 0]} barSize={28} animationDuration={1200}>
                    {barberChartData.map((_, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={`url(#bGrad-${index})`}
                        stroke={BARBER_COLORS[index % BARBER_COLORS.length].bar}
                        strokeWidth={1}
                        strokeOpacity={0.4}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </GlassCard>

        {/* ════ Performance por Barbeiro ════ */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Scissors size={16} className="text-indigo-400" />
            <h3 className="text-sm font-bold text-white">Performance por Barbeiro</h3>
            <span className="text-[10px] text-gray-600 ml-auto">
              {{ semanal: 'Últimos 7 dias', mensal: 'Este mês', '30dias': 'Últimos 30 dias' }[barberPeriod]}
            </span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {barberDataArray.map((barber, idx) => {
              const color = BARBER_COLORS[idx % BARBER_COLORS.length];
              return (
                <GlassCard key={barber.id} className="p-4" glowColor={`${color.bar}40`}>
                  <div className="flex items-center gap-3 mb-3">
                    <div className={`w-10 h-10 rounded-full ${color.bg} border ${color.border} flex items-center justify-center text-xs font-bold ${color.text}`}>
                      {barber.name.substring(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <p className="text-sm font-bold text-white">{barber.name}</p>
                      <p className="text-[10px] text-gray-500">{barber.count} atendimentos</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="bg-white/[0.03] rounded-lg p-2.5 border border-white/[0.04]">
                      <p className="text-[10px] text-gray-500 uppercase tracking-wider">Faturamento</p>
                      <p className="text-sm font-bold text-white mt-0.5">{fmtVal(barber.revenue)}</p>
                    </div>
                    <div className="bg-white/[0.03] rounded-lg p-2.5 border border-white/[0.04]">
                      <p className="text-[10px] text-gray-500 uppercase tracking-wider">A Receber</p>
                      <p className={`text-sm font-bold mt-0.5 ${color.text}`}>
                        {fmtVal(barber.commission)}
                      </p>
                    </div>
                  </div>
                </GlassCard>
              );
            })}
            {barberDataArray.length === 0 && (
              <p className="col-span-full text-center text-gray-600 py-6 text-xs">Nenhum barbeiro ativo cadastrado</p>
            )}
          </div>
        </div>

        {/* ════ Vendas de Produtos ════ */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <ShoppingBag size={16} className="text-rose-400" />
            <h3 className="text-sm font-bold text-white">Vendas de Produtos</h3>
            <span className="text-[10px] text-gray-600 ml-1">este mês</span>
            {!hideValues && productTotalRevenue > 0 && (
              <span className="text-xs font-bold text-emerald-400 ml-auto">
                {formatCurrency(productTotalRevenue)}
              </span>
            )}
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {topProducts.length > 0 ? topProducts.map((prod, i) => (
              <GlassCard key={prod.name} className="p-4" glowColor="rgba(244,63,94,0.2)">
                <div className="flex items-center justify-between mb-2">
                  <div className="p-2 rounded-lg bg-rose-500/15">
                    <Package size={14} className="text-rose-400" />
                  </div>
                  <span className="text-[10px] text-gray-500 font-bold">#{i + 1}</span>
                </div>
                <p className="text-xs font-semibold text-white truncate" title={prod.name}>{prod.name}</p>
                <div className="flex justify-between items-end mt-2">
                  <span className="text-[10px] text-gray-500">{prod.qty} vendidos</span>
                  <span className="text-sm font-bold text-white">{fmtVal(prod.total)}</span>
                </div>
              </GlassCard>
            )) : (
              <p className="col-span-full text-center text-gray-600 py-6 text-xs">Nenhuma venda de produto este mês</p>
            )}
          </div>
        </div>

      </div>
    </AppLayout>
  );
}
