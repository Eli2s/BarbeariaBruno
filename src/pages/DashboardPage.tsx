import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/db/database';
import { seedDatabase } from '@/db/seed';
import { formatCurrency } from '@/lib/format';
import { sendCashbackReminder } from '@/lib/whatsappApi';
import { AppLayout } from '@/components/AppLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Users, CreditCard, DollarSign, UserPlus, TrendingUp, ShoppingBag, BarChart3 } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, CartesianGrid, Area, AreaChart } from 'recharts';
import { format, subMonths, isBefore, parseISO, differenceInDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function DashboardPage() {
  const navigate = useNavigate();

  useEffect(() => { seedDatabase(); }, []);

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

  const clients = useLiveQuery(() => db.clients.toArray()) ?? [];
  const plans = useLiveQuery(() => db.plans.where('status').equals('ativo').toArray()) ?? [];
  const allPlans = useLiveQuery(() => db.plans.toArray()) ?? [];
  const orders = useLiveQuery(() => db.orders.toArray()) ?? [];

  const now = new Date();
  const thisMonth = format(now, 'yyyy-MM');
  const newClientsThisMonth = clients.filter(c => c.createdAt.startsWith(thisMonth)).length;
  const recurringRevenue = plans.reduce((s, p) => s + p.value, 0);

  // Orders revenue this month
  const orderRevenueThisMonth = orders
    .filter(o => o.status === 'pago' && o.createdAt.startsWith(thisMonth))
    .reduce((s, o) => s + o.totalValue, 0);

  // Revenue chart (last 6 months) - Plans + Orders combined
  const chartData = Array.from({ length: 6 }, (_, i) => {
    const m = subMonths(now, 5 - i);
    const key = format(m, 'yyyy-MM');
    const monthLabel = format(m, 'MMM', { locale: ptBR });

    // Plans revenue
    const activePlansInMonth = allPlans.filter(p => {
      const start = parseISO(p.startDate);
      return isBefore(start, m) && p.status !== 'cancelado';
    });
    const plansValue = activePlansInMonth.reduce((s, p) => s + p.value, 0);

    // Orders revenue
    const ordersValue = orders
      .filter(o => o.status === 'pago' && o.createdAt.startsWith(key))
      .reduce((s, o) => s + o.totalValue, 0);

    return {
      month: monthLabel.charAt(0).toUpperCase() + monthLabel.slice(1),
      planos: plansValue,
      vendas: ordersValue,
      total: plansValue + ordersValue,
    };
  });

  const totalRevenue = recurringRevenue + orderRevenueThisMonth;

  const metrics = [
    { label: 'Total Clientes', value: clients.length, icon: Users, path: '/clientes', color: 'from-blue-500 to-blue-600' },
    { label: 'Planos Ativos', value: plans.length, icon: CreditCard, path: '/planos', color: 'from-violet-500 to-purple-600' },
    { label: 'Receita Mensal', value: formatCurrency(totalRevenue), icon: DollarSign, path: '/planos', color: 'from-emerald-500 to-green-600' },
    { label: 'Novos este mês', value: newClientsThisMonth, icon: UserPlus, path: '/clientes', color: 'from-orange-500 to-red-500' },
  ];

  // Custom tooltip for chart
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

  return (
    <AppLayout>
      <div className="p-4 max-w-lg md:max-w-full mx-auto space-y-5">
        {/* Header - mobile only since desktop has DesktopHeader */}
        <div className="flex items-center justify-between pt-2 md:hidden">
          <div>
            <h1 className="text-xl font-bold gradient-text">Bruno Barbearia</h1>
            <p className="text-xs text-muted-foreground">Painel de controle</p>
          </div>
          <Button size="sm" onClick={() => navigate('/atendimento')} className="font-semibold">
            + Atendimento
          </Button>
        </div>

        {/* Metric Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {metrics.map(m => (
            <Card
              key={m.label}
              className="cursor-pointer hover:shadow-md hover:shadow-primary/10 transition-all border-0 overflow-hidden"
              onClick={() => navigate(m.path)}
            >
              <CardContent className="p-4 relative">
                <div className={`absolute inset-0 bg-gradient-to-br ${m.color} opacity-[0.08]`}></div>
                <div className="relative">
                  <div className="flex items-center gap-2 mb-2">
                    <div className={`w-7 h-7 rounded-lg bg-gradient-to-br ${m.color} flex items-center justify-center`}>
                      <m.icon size={14} className="text-white" />
                    </div>
                  </div>
                  <p className="text-2xl font-bold">{m.value}</p>
                  <span className="text-[10px] text-muted-foreground uppercase tracking-wider">{m.label}</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Revenue Chart — Improved */}
        <Card className="overflow-hidden">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg gradient-primary flex items-center justify-center">
                  <BarChart3 size={16} className="text-white" />
                </div>
                <div>
                  <span className="text-sm font-semibold">Faturamento</span>
                  <p className="text-[10px] text-muted-foreground">Últimos 6 meses</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-lg font-bold gradient-text">{formatCurrency(totalRevenue)}</p>
                <p className="text-[10px] text-muted-foreground">este mês</p>
              </div>
            </div>

            {/* Legend */}
            <div className="flex items-center gap-4 mb-3">
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-[hsl(225,85%,55%)]"></span>
                <span className="text-[10px] text-muted-foreground">Planos</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-[hsl(350,80%,55%)]"></span>
                <span className="text-[10px] text-muted-foreground">Vendas Loja</span>
              </div>
            </div>

            <div className="h-48 md:h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} barCategoryGap="20%">
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                  <XAxis
                    dataKey="month"
                    tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                    stroke="hsl(var(--border))"
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                    stroke="hsl(var(--border))"
                    width={55}
                    tickFormatter={v => `R$${v}`}
                    tickLine={false}
                    axisLine={false}
                  />
                  <Tooltip content={<CustomTooltip />} cursor={{ fill: 'hsl(var(--primary) / 0.05)' }} />
                  <Bar
                    dataKey="planos"
                    name="Planos"
                    fill="hsl(225, 85%, 55%)"
                    radius={[4, 4, 0, 0]}
                    stackId="revenue"
                  />
                  <Bar
                    dataKey="vendas"
                    name="Vendas"
                    fill="hsl(350, 80%, 55%)"
                    radius={[4, 4, 0, 0]}
                    stackId="revenue"
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Quick Orders Summary */}
        {orders.length > 0 && (
          <Card className="cursor-pointer hover:shadow-md transition-all" onClick={() => navigate('/pedidos')}>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg gradient-subtle flex items-center justify-center">
                <ShoppingBag size={18} className="text-primary" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold">Pedidos da Loja</p>
                <p className="text-xs text-muted-foreground">
                  {orders.filter(o => o.status === 'pendente').length} pendentes · {orders.filter(o => o.status === 'pago').length} pagos
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm font-bold text-primary">{formatCurrency(orderRevenueThisMonth)}</p>
                <p className="text-[10px] text-muted-foreground">este mês</p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </AppLayout>
  );
}
