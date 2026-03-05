
import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { formatCurrency } from '@/lib/format';
import { sendCashbackReminder } from '@/lib/whatsappApi';
import { AppLayout } from '@/components/AppLayout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  Users, CreditCard, UserPlus, Scissors,
  RefreshCw, TrendingUp, Eye, EyeOff,
  Package, ShoppingBag, Clock, Star
} from 'lucide-react';
import { motion } from 'framer-motion';
import {
  format, differenceInDays,
  startOfMonth, subDays, isToday
} from 'date-fns';
import { GlassCard } from '@/components/dashboard/GlassCard';

import { useClients } from '@/hooks/useClients';
import { usePlans } from '@/hooks/usePlans';
import { useOrders } from '@/hooks/useOrders';
import { useBarbers } from '@/hooks/useBarbers';
import { useServices } from '@/hooks/useServices';
import { useCashbacks, useUpdateCashback } from '@/hooks/useCashbacks';
import { fetchAppointments } from '@/api/appointments';
import { apiGet } from '@/api/apiClient';
import type { Client } from '@/types';

type BarberPeriod = 'semanal' | 'mensal' | '30dias';

const BARBER_COLORS = [
  { bar: '#6366f1', bg: 'bg-indigo-500/15', text: 'text-indigo-400', border: 'border-indigo-500/20' },
  { bar: '#a855f7', bg: 'bg-purple-500/15', text: 'text-purple-400', border: 'border-purple-500/20' },
  { bar: '#ec4899', bg: 'bg-pink-500/15', text: 'text-pink-400', border: 'border-pink-500/20' },
  { bar: '#f43f5e', bg: 'bg-rose-500/15', text: 'text-rose-400', border: 'border-rose-500/20' },
  { bar: '#14b8a6', bg: 'bg-teal-500/15', text: 'text-teal-400', border: 'border-teal-500/20' },
];

export default function DashboardPage() {
  const navigate = useNavigate();
  const [barberPeriod, setBarberPeriod] = useState<BarberPeriod>('mensal');
  const [hideValues, setHideValues] = useState(false);

  // React Query hooks
  const { data: clients = [], refetch: refetchClients } = useClients();
  const { data: allPlans = [], refetch: refetchPlans } = usePlans();
  const { data: orders = [], refetch: refetchOrders } = useOrders();
  const { data: allBarbers = [], refetch: refetchBarbers } = useBarbers();
  const { data: allServices = [], refetch: refetchServices } = useServices();
  const { data: allCashbacks = [], refetch: refetchCashbacks } = useCashbacks();
  const updateCashbackMutation = useUpdateCashback();

  // Appointments
  const { data: appointments = [] } = useQuery({
    queryKey: ['appointments'],
    queryFn: () => fetchAppointments(),
  });

  // Filter active plans and barbers on the client side
  const plans = allPlans.filter(p => p.status === 'ativo');
  const barbers = allBarbers.filter(b => b.isActive);

  // ── Expire cashbacks ──
  useEffect(() => {
    const checkCashbacks = async () => {
      const activeCashbacks = allCashbacks.filter(cb => cb.status === 'ativo');
      const now = new Date();
      for (const cb of activeCashbacks) {
        const expDate = new Date(cb.expirationDate);
        if (expDate < now) {
          await updateCashbackMutation.mutateAsync({ id: cb.id!, status: 'expirado' });
          continue;
        }
        const daysLeft = differenceInDays(expDate, now);
        if ([15, 10, 5, 3, 1].includes(daysLeft)) {
          const todayStr = format(now, 'yyyy-MM-dd');
          if (cb.lastReminderSent !== todayStr) {
            try {
              const client = await apiGet<Client>(`/clients/${cb.clientId}`);
              if (client?.whatsapp) {
                sendCashbackReminder(client.name, cb.percentage, daysLeft, client.whatsapp).catch(() => {});
                await updateCashbackMutation.mutateAsync({ id: cb.id!, lastReminderSent: todayStr });
              }
            } catch { /* ignore */ }
          }
        }
      }
    };
    if (allCashbacks.length > 0) {
      checkCashbacks();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allCashbacks.length]);

  const handleRefresh = useCallback(() => {
    refetchClients();
    refetchPlans();
    refetchOrders();
    refetchBarbers();
    refetchServices();
    refetchCashbacks();
  }, [refetchClients, refetchPlans, refetchOrders, refetchBarbers, refetchServices, refetchCashbacks]);

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

  // ── Barber data ──
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

  const barberChartTotal = barberDataArray.reduce((s, d) => s + d.revenue, 0);
  const maxRevenue = Math.max(...barberDataArray.map(b => b.revenue), 1);

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

  // ── Appointments for today ──
  const todayAppointments = appointments
    .filter(a => {
      try {
        return isToday(new Date(a.dateTime)) && a.status !== 'cancelado';
      } catch { return false; }
    })
    .slice(0, 6);

  return (
    <AppLayout>
      <div className="min-h-screen bg-background text-foreground p-4 md:p-6 space-y-6">

        {/* ════ Header ════ */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="flex items-center justify-between"
        >
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight text-foreground">
              Dashboard
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Bem-vindo à <span className="text-primary font-semibold">Bruno Barbearia</span> — Monitoramento Geral
            </p>
          </div>
          <div className="flex gap-2 items-center">
            <Button
              size="sm"
              variant="ghost"
              className="h-8 w-8 text-muted-foreground hover:text-foreground"
              onClick={() => setHideValues(v => !v)}
              title={hideValues ? 'Mostrar valores' : 'Ocultar valores'}
            >
              {hideValues ? <EyeOff size={14} /> : <Eye size={14} />}
            </Button>
            <Button size="sm" variant="ghost" className="h-8 w-8 text-muted-foreground hover:text-foreground" onClick={handleRefresh}>
              <RefreshCw size={14} />
            </Button>
          </div>
        </motion.div>

        {/* ════ KPI Cards ════ */}
        <motion.div
          initial="hidden"
          animate="visible"
          variants={{
            hidden: {},
            visible: { transition: { staggerChildren: 0.06 } },
          }}
          className="grid grid-cols-2 md:grid-cols-5 gap-3"
        >
          {[
            { title: "TICKET MÉDIO", value: fmtVal(ticketMedio), icon: TrendingUp, change: "+12%", iconBg: "bg-primary/10" },
            { title: "ATENDIMENTOS", value: totalAtendimentos, icon: Scissors, change: "+8%", iconBg: "bg-primary/10" },
            { title: "PLANOS ATIVOS", value: plans.length, icon: CreditCard, change: "+5%", iconBg: "bg-primary/10" },
            { title: "TOTAL CLIENTES", value: clients.length, icon: Users, change: "+15%", iconBg: "bg-primary/10" },
            { title: "NOVOS ESTE MÊS", value: newClientsThisMonth, icon: UserPlus, change: "+20%", iconBg: "bg-primary/10" },
          ].map((stat) => (
            <motion.div
              key={stat.title}
              variants={{
                hidden: { opacity: 0, y: 20 },
                visible: { opacity: 1, y: 0 },
              }}
              transition={{ duration: 0.35 }}
              className="bg-card border border-border rounded-xl p-4 flex flex-col justify-between min-h-[120px]"
            >
              <div className="flex items-start justify-between">
                <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
                  {stat.title}
                </span>
                <div className={`p-2 rounded-lg ${stat.iconBg}`}>
                  <stat.icon size={16} className="text-primary" />
                </div>
              </div>
              <div className="mt-auto">
                <p className="text-2xl font-extrabold tracking-tight text-foreground">{stat.value}</p>
                <div className="flex items-center gap-1 mt-1">
                  <TrendingUp size={12} className="text-emerald-500" />
                  <span className="text-[11px] font-semibold text-emerald-500">{stat.change}</span>
                </div>
              </div>
            </motion.div>
          ))}
        </motion.div>

        {/* ════ Two Column: Revenue + Performance ════ */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

          {/* ── Faturamento por Barbeiro ── */}
          <div className="bg-card border border-border rounded-xl p-5">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-base font-bold text-foreground">Faturamento por Barbeiro</h3>
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="text-[10px] uppercase tracking-wider">
                  {{ semanal: 'Esta Semana', mensal: 'Este Mês', '30dias': '30 Dias' }[barberPeriod]}
                </Badge>
                <Select value={barberPeriod} onValueChange={(v: BarberPeriod) => setBarberPeriod(v)}>
                  <SelectTrigger className="h-7 text-[10px] w-24 bg-muted/50 border-border text-muted-foreground">
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

            {barberDataArray.length === 0 || barberDataArray.every(d => d.revenue === 0) ? (
              <div className="flex flex-col items-center justify-center text-muted-foreground gap-2 py-12">
                <Scissors size={40} className="opacity-20" />
                <p className="text-sm">Nenhum atendimento neste período</p>
              </div>
            ) : (
              <div className="space-y-4">
                {barberDataArray.map((barber) => (
                  <div key={barber.id}>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-sm font-medium text-foreground">{barber.name}</span>
                      <span className="text-sm font-bold text-foreground">{fmtVal(barber.revenue)}</span>
                    </div>
                    <div className="w-full h-2.5 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-primary to-purple-500 transition-all duration-700"
                        style={{ width: `${(barber.revenue / maxRevenue) * 100}%` }}
                      />
                    </div>
                  </div>
                ))}
                {!hideValues && barberChartTotal > 0 && (
                  <div className="pt-3 border-t border-border flex items-center justify-between">
                    <span className="text-xs text-muted-foreground font-medium">Total</span>
                    <span className="text-sm font-bold text-primary">{formatCurrency(barberChartTotal)}</span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* ── Performance por Barbeiro (Table) ── */}
          <div className="bg-card border border-border rounded-xl p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-foreground">Performance por Barbeiro</h3>
              <span className="text-[10px] text-muted-foreground uppercase tracking-wider">
                {{ semanal: 'Últimos 7 dias', mensal: 'Este mês', '30dias': 'Últimos 30 dias' }[barberPeriod]}
              </span>
            </div>

            {barberDataArray.length === 0 ? (
              <p className="text-center text-muted-foreground py-8 text-xs">Nenhum barbeiro ativo</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">Barbeiro</TableHead>
                    <TableHead className="text-xs text-center">Serviços</TableHead>
                    <TableHead className="text-xs text-right">Comissão</TableHead>
                    <TableHead className="text-xs text-center">Avaliação</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {barberDataArray.map((barber, idx) => {
                    const color = BARBER_COLORS[idx % BARBER_COLORS.length];
                    return (
                      <TableRow key={barber.id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Avatar className="h-8 w-8">
                              <AvatarFallback className={`${color.bg} ${color.text} text-xs font-bold`}>
                                {barber.name.substring(0, 2).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <span className="text-sm font-medium text-foreground">{barber.name}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-center text-sm text-foreground">{barber.count}</TableCell>
                        <TableCell className="text-right text-sm font-semibold text-primary">{fmtVal(barber.commission)}</TableCell>
                        <TableCell className="text-center">
                          <div className="flex items-center justify-center gap-0.5">
                            <Star size={14} className="text-yellow-500 fill-yellow-500" />
                            <span className="text-xs text-muted-foreground">4.8</span>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}

            <button
              onClick={() => navigate('/barbeiros')}
              className="mt-3 text-xs text-primary hover:underline font-medium w-full text-center block"
            >
              Ver Relatório Completo →
            </button>
          </div>
        </div>

        {/* ════ Últimos Agendamentos ════ */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-base font-bold text-foreground">Últimos Agendamentos</h3>
            <button
              onClick={() => navigate('/agendamentos')}
              className="text-xs text-primary hover:underline font-medium"
            >
              Ver todos →
            </button>
          </div>
          {todayAppointments.length === 0 ? (
            <div className="bg-card border border-border rounded-xl p-8 text-center">
              <Clock size={32} className="mx-auto text-muted-foreground/30 mb-2" />
              <p className="text-sm text-muted-foreground">Nenhum agendamento para hoje</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {todayAppointments.map((appt) => (
                <div
                  key={appt.id}
                  className="bg-card border border-border rounded-xl p-4 flex items-start gap-3"
                >
                  <div className="p-2 rounded-lg bg-primary/10 mt-0.5">
                    <Clock size={16} className="text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-foreground truncate">{appt.clientName}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {appt.serviceItem} • {format(new Date(appt.dateTime), 'HH:mm')}
                    </p>
                  </div>
                  <Badge variant="secondary" className="text-[9px] uppercase tracking-wider shrink-0">
                    Hoje
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ════ Vendas de Produtos ════ */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <ShoppingBag size={16} className="text-primary" />
            <h3 className="text-sm font-bold text-foreground">Vendas de Produtos</h3>
            <span className="text-[10px] text-muted-foreground ml-1">este mês</span>
            {!hideValues && productTotalRevenue > 0 && (
              <span className="text-xs font-bold text-emerald-500 ml-auto">
                {formatCurrency(productTotalRevenue)}
              </span>
            )}
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {topProducts.length > 0 ? topProducts.map((prod, i) => (
              <div key={prod.name} className="bg-card border border-border rounded-xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <Package size={14} className="text-primary" />
                  </div>
                  <span className="text-[10px] text-muted-foreground font-bold">#{i + 1}</span>
                </div>
                <p className="text-xs font-semibold text-foreground truncate" title={prod.name}>{prod.name}</p>
                <div className="flex justify-between items-end mt-2">
                  <span className="text-[10px] text-muted-foreground">{prod.qty} vendidos</span>
                  <span className="text-sm font-bold text-foreground">{fmtVal(prod.total)}</span>
                </div>
              </div>
            )) : (
              <p className="col-span-full text-center text-muted-foreground py-6 text-xs">Nenhuma venda de produto este mês</p>
            )}
          </div>
        </div>

      </div>
    </AppLayout>
  );
}
