import { useParams, useNavigate } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/db/database';
import { analyzeClient, getMonthlySpending } from '@/lib/analytics';
import { formatCurrency, formatPhone } from '@/lib/format';
import { openWhatsApp } from '@/lib/whatsapp';
import { AppLayout } from '@/components/AppLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { ArrowLeft, MessageCircle, User, Edit, TrendingUp, Brain, Calendar } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, Tooltip } from 'recharts';
import { format, parseISO } from 'date-fns';

export default function ClientProfilePage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const clientId = Number(id);

  const client = useLiveQuery(() => db.clients.get(clientId), [clientId]);
  const services = useLiveQuery(() => db.services.where('clientId').equals(clientId).toArray(), [clientId]) ?? [];
  const plans = useLiveQuery(() => db.plans.where('clientId').equals(clientId).toArray(), [clientId]) ?? [];

  if (!client) return null;

  const analysis = analyzeClient(services, plans);
  const monthlyData = getMonthlySpending(services);
  const activePlan = plans.find(p => p.status === 'ativo');
  const sortedServices = [...services].sort((a, b) => b.date.localeCompare(a.date));

  return (
    <AppLayout>
      <div className="p-4 max-w-lg md:max-w-4xl mx-auto space-y-4 pb-24">
        {/* Header */}
        <div className="flex items-center gap-3 pt-2">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}><ArrowLeft size={20} /></Button>
          <div className="flex-1" />
          <Button variant="ghost" size="icon" onClick={() => navigate(`/clientes/editar/${clientId}`)}><Edit size={18} /></Button>
        </div>

        <div className="flex flex-col items-center gap-3 text-center">
          <div className="w-20 h-20 rounded-full gradient-subtle gradient-glow flex items-center justify-center">
            {client.photo ? <img src={client.photo} alt="" className="w-20 h-20 rounded-full object-cover" /> : <User size={36} className="text-primary" />}
          </div>
          <div>
            <h1 className="text-xl font-bold">{client.name}</h1>
            <p className="text-sm text-muted-foreground">{client.nickname}</p>
            <div className="flex gap-1 justify-center mt-1">
              <Badge className="text-[10px]">{analysis.classification}</Badge>
              {client.tags.map(t => <Badge key={t} variant="secondary" className="text-[10px]">{t}</Badge>)}
            </div>
          </div>
          <Button size="sm" variant="outline" className="gap-1" onClick={() => openWhatsApp(client.whatsapp, `Olá ${client.nickname}! Aqui é o Bruno da barbearia 💈`)}>
            <MessageCircle size={14} /> {formatPhone(client.whatsapp)}
          </Button>
        </div>

        {/* Financial Summary + Frequency side by side on desktop */}
        <div className="flex flex-col md:flex-row md:gap-4">
        <Card className="flex-1">
          <CardContent className="p-4">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Resumo Financeiro</h3>
            <div className="grid grid-cols-3 gap-2 text-center">
              <div><p className="text-lg font-bold">{formatCurrency(analysis.totalSpent)}</p><p className="text-[10px] text-muted-foreground">Total gasto</p></div>
              <div><p className="text-lg font-bold">{formatCurrency(analysis.averageTicket)}</p><p className="text-[10px] text-muted-foreground">Ticket médio</p></div>
              <div><p className="text-lg font-bold">{analysis.totalVisits}</p><p className="text-[10px] text-muted-foreground">Visitas</p></div>
            </div>
          </CardContent>
        </Card>

        <Card className="flex-1 mt-3 md:mt-0">
          <CardContent className="p-4">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Frequência</h3>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div><span className="text-muted-foreground text-xs">Média entre visitas:</span><p className="font-semibold">{analysis.avgDaysBetweenVisits} dias</p></div>
              <div><span className="text-muted-foreground text-xs">Dia mais frequente:</span><p className="font-semibold">{analysis.mostFrequentDay}</p></div>
              <div><span className="text-muted-foreground text-xs">Período:</span><p className="font-semibold">{analysis.mostFrequentPeriod}</p></div>
              <div><span className="text-muted-foreground text-xs">Pagamento:</span><p className="font-semibold">{analysis.mostUsedPayment.method} ({analysis.mostUsedPayment.pct}%)</p></div>
            </div>
          </CardContent>
        </Card>
        </div>

        {/* Top Services & Products */}
        <div className="grid grid-cols-2 gap-3">
          <Card>
            <CardContent className="p-3">
              <h4 className="text-[10px] font-semibold text-muted-foreground uppercase mb-2">Top Serviços</h4>
              {analysis.topServices.map((s, i) => (
                <div key={s.name} className="flex justify-between items-center text-xs py-0.5">
                  <span className="truncate">{i + 1}. {s.name}</span>
                  <span className="text-muted-foreground ml-1">{s.pct}%</span>
                </div>
              ))}
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3">
              <h4 className="text-[10px] font-semibold text-muted-foreground uppercase mb-2">Top Produtos</h4>
              {analysis.topProducts.length > 0 ? analysis.topProducts.map((p, i) => (
                <div key={p.name} className="flex justify-between items-center text-xs py-0.5">
                  <span className="truncate">{i + 1}. {p.name}</span>
                  <span className="text-muted-foreground ml-1">x{p.count}</span>
                </div>
              )) : <p className="text-xs text-muted-foreground">Nenhum produto</p>}
            </CardContent>
          </Card>
        </div>

        {/* Monthly Spending Chart */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <TrendingUp size={14} className="text-primary" />
              <span className="text-xs font-semibold">Gastos Mensais (12 meses)</span>
            </div>
            <div className="h-32 md:h-56">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={monthlyData}>
                  <XAxis dataKey="month" tick={{ fontSize: 8 }} stroke="hsl(var(--muted-foreground))" />
                  <YAxis tick={{ fontSize: 8 }} stroke="hsl(var(--muted-foreground))" width={40} />
                  <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8, fontSize: 11 }} formatter={(v: number) => [formatCurrency(v), 'Gasto']} />
                  <Line type="monotone" dataKey="value" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Behavioral Analysis */}
        <Card className="border-primary/30 gradient-subtle">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Brain size={16} className="text-primary" />
              <span className="text-sm font-semibold">Análise Comportamental</span>
            </div>
            <Badge className="mb-2">{analysis.classification}</Badge>
            <p className="text-xs text-muted-foreground leading-relaxed">{analysis.suggestion}</p>
          </CardContent>
        </Card>

        {/* Service Timeline */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Calendar size={14} className="text-primary" />
            <span className="text-sm font-semibold">Histórico de Atendimentos</span>
          </div>
          <Accordion type="single" collapsible>
            {sortedServices.slice(0, 20).map((s, i) => (
              <AccordionItem key={s.id ?? i} value={String(s.id ?? i)}>
                <AccordionTrigger className="text-sm py-3">
                  <div className="flex items-center gap-2 text-left">
                    <span className="text-xs text-muted-foreground w-20">{format(parseISO(s.date), 'dd/MM/yy')}</span>
                    <span className="truncate">{s.services.join(', ')}</span>
                    <span className="text-primary font-semibold ml-auto">{formatCurrency(s.totalValue)}</span>
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="text-xs space-y-1 text-muted-foreground">
                    <p><strong>Serviços:</strong> {s.services.join(', ')}</p>
                    {s.products.length > 0 && <p><strong>Produtos:</strong> {s.products.map(p => `${p.name} x${p.quantity}`).join(', ')}</p>}
                    <p><strong>Pagamento:</strong> {s.paymentMethod}</p>
                    {s.usedPlanCredit && <Badge variant="secondary" className="text-[9px]">Crédito do plano</Badge>}
                    {s.observation && <p><strong>Obs:</strong> {s.observation}</p>}
                  </div>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>

        {/* Fixed Bottom Button — mobile: full-width above nav | desktop: bottom-right */}
        <div className="fixed bottom-20 left-4 right-4 z-50 md:bottom-6 md:left-auto md:right-6 md:w-auto">
          <Button
            className="w-full md:w-auto h-12 font-semibold shadow-lg rounded-xl px-6"
            onClick={() => activePlan ? navigate(`/planos/editar/${activePlan.id}`) : navigate(`/planos/novo?clientId=${clientId}`)}
          >
            {activePlan ? 'Editar Plano' : 'Criar Plano para este Cliente'}
          </Button>
        </div>
      </div>
    </AppLayout>
  );
}
