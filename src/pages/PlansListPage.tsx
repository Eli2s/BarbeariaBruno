import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePlans } from '@/hooks/usePlans';
import { useClients } from '@/hooks/useClients';
import { formatCurrency } from '@/lib/format';
import { openWhatsApp } from '@/lib/whatsapp';
import { AppLayout } from '@/components/AppLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { MessageCircle, Plus, Globe, User, Send, Crown, Clock, AlertTriangle, Link2 } from 'lucide-react';
import { format, parseISO, isBefore, addDays } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useCreateCheckout } from '@/hooks/usePlans';

type PlanScope = 'todos' | 'gerais' | 'clientes';
type StatusFilter = 'todos' | 'ativos' | 'vencer' | 'atrasados';

export default function PlansListPage() {
  const navigate = useNavigate();
  const [scope, setScope] = useState<PlanScope>('todos');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('todos');

  const { data: plans = [], isLoading } = usePlans();
  const { data: clients = [] } = useClients();
  const { mutateAsync: createCheckout } = useCreateCheckout();
  const clientMap = Object.fromEntries(clients.map(c => [c.id!, c]));

  // Controls for the general-plan Checkout Generation modal
  const [selectedPlanForCheckout, setSelectedPlanForCheckout] = useState<typeof plans[0] | null>(null);
  const [selectedClientId, setSelectedClientId] = useState<string>('');
  const [isGeneratingCheckout, setIsGeneratingCheckout] = useState(false);

  const now = new Date();

  // Scope filter
  const scopeFiltered = plans.filter(p => {
    if (scope === 'gerais') return p.isGeneral || !p.clientId;
    if (scope === 'clientes') return !p.isGeneral && !!p.clientId;
    return true;
  });

  // Status filter
  const filtered = scopeFiltered.filter(p => {
    if (statusFilter === 'ativos') return p.status === 'ativo';
    if (statusFilter === 'vencer') return p.status === 'ativo' && isBefore(parseISO(p.nextCharge), addDays(now, 7)) && !isBefore(parseISO(p.nextCharge), now);
    if (statusFilter === 'atrasados') return p.status === 'ativo' && isBefore(parseISO(p.nextCharge), now);
    return true;
  });

  const statusColor = (s: string) => {
    if (s === 'ativo') return 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30';
    if (s === 'pausado') return 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30';
    return 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/30';
  };

  const invokeShare = async (plan: typeof plans[0], client: typeof clients[0], checkoutUrl: string) => {
    const clientName = client.nickname || client.name;
    const periodicityLabel = plan.periodicity === 'quinzenal' ? 'quinzenal' : plan.periodicity === 'mensal' ? 'mensal' : `a cada ${plan.customDays} dias`;

    const message = `Olá ${clientName}! 👋\n\n` +
      `Aqui é o Bruno da Barbearia. Preparei um plano especial pra você:\n\n` +
      `✂️ *${plan.name}*\n` +
      `💰 *${formatCurrency(plan.value)}* (${periodicityLabel})\n` +
      (plan.benefits ? `🎁 Benefícios: ${plan.benefits}\n` : '') +
      `\n🔗 Assine aqui (Cartão ou Pix): ${checkoutUrl}\n\n` +
      `Qualquer dúvida, é só chamar! 💈`;

    if (client.whatsapp) {
      openWhatsApp(client.whatsapp, message);
    } else {
      navigator.clipboard.writeText(message);
      toast.success('Link do checkout copiado para a área de transferência!');
    }
  };

  const handleShareWhatsApp = async (plan: typeof plans[0], directClient?: typeof clients[0]) => {
    if (directClient) {
      // It's a specific plan attached to someone or we overriden it.
      try {
        setIsGeneratingCheckout(true);
        const { checkoutUrl } = await createCheckout({ planId: plan.id!, clientId: directClient.id! });
        await invokeShare(plan, directClient, checkoutUrl);
      } catch(err) {
        toast.error('Erro ao gerar checkout com a Stripe.');
      } finally {
        setIsGeneratingCheckout(false);
      }
    } else {
      // It's a general plan. Ask for which client to generate first.
      setSelectedPlanForCheckout(plan);
      setSelectedClientId('');
    }
  };

  const submitGeneralCheckout = async () => {
    if (!selectedPlanForCheckout || !selectedClientId) return;
    try {
      setIsGeneratingCheckout(true);
      const targetClient = clientMap[Number(selectedClientId)];
      const { checkoutUrl } = await createCheckout({ planId: selectedPlanForCheckout.id!, clientId: targetClient.id! });
      await invokeShare(selectedPlanForCheckout, targetClient, checkoutUrl);
      setSelectedPlanForCheckout(null);
    } catch(err) {
      toast.error('Erro ao gerar checkout geral.');
    } finally {
      setIsGeneratingCheckout(false);
    }
  };

  const handleCopyLink = async (plan: typeof plans[0], directClient?: typeof clients[0]) => {
    if (directClient) {
        try {
            const { checkoutUrl } = await createCheckout({ planId: plan.id!, clientId: directClient.id! });
            navigator.clipboard.writeText(checkoutUrl);
            toast.success('Link do checkout copiado!');
        } catch {
            toast.error('Erro ao gerar checkout');
        }
    } else {
        toast.error('Para planos gerais, clique primeiro em Enviar WhatsApp para escolher o cliente');
    }
  };

  // Stats
  const totalActive = plans.filter(p => p.status === 'ativo').length;
  const totalRevenue = plans.filter(p => p.status === 'ativo').reduce((s, p) => s + p.value, 0);
  const generalPlans = plans.filter(p => p.isGeneral || !p.clientId).length;

  return (
    <AppLayout>
      <div className="p-4 max-w-lg md:max-w-4xl mx-auto space-y-5">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between pt-2">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
              <Crown size={16} className="text-white" />
            </div>
            <h1 className="text-xl font-bold">Planos</h1>
          </div>
          <Button size="sm" onClick={() => navigate('/planos/novo')} className="gap-1.5">
            <Plus size={14} /> Novo Plano
          </Button>
        </motion.div>

        {/* Quick Stats */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'Ativos', value: String(totalActive), icon: Crown, gradient: 'from-emerald-500 to-green-500' },
            { label: 'Receita Mensal', value: formatCurrency(totalRevenue), icon: Clock, gradient: 'from-violet-500 to-purple-600' },
            { label: 'Gerais', value: String(generalPlans), icon: Globe, gradient: 'from-blue-500 to-cyan-500' },
          ].map((s, i) => (
            <motion.div key={s.label} initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}>
              <Card className="overflow-hidden border-0 shadow-md">
                <CardContent className="p-3 relative">
                  <div className={`absolute inset-0 bg-gradient-to-br ${s.gradient} opacity-[0.07]`} />
                  <div className="relative">
                    <div className={`w-6 h-6 rounded-md bg-gradient-to-br ${s.gradient} flex items-center justify-center mb-1.5`}>
                      <s.icon size={12} className="text-white" />
                    </div>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{s.label}</p>
                    <p className="text-sm font-bold mt-0.5">{s.value}</p>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        {/* Scope Tabs */}
        <Tabs value={scope} onValueChange={v => setScope(v as PlanScope)}>
          <TabsList className="grid grid-cols-3 w-full">
            <TabsTrigger value="todos" className="text-xs gap-1"><Crown size={12} /> Todos</TabsTrigger>
            <TabsTrigger value="gerais" className="text-xs gap-1"><Globe size={12} /> Gerais</TabsTrigger>
            <TabsTrigger value="clientes" className="text-xs gap-1"><User size={12} /> Por Cliente</TabsTrigger>
          </TabsList>
        </Tabs>

        {/* Status Filters */}
        <div className="flex gap-2 overflow-x-auto pb-1">
          {([
            { key: 'todos', label: 'Todos' },
            { key: 'ativos', label: 'Ativos' },
            { key: 'vencer', label: 'A vencer' },
            { key: 'atrasados', label: 'Atrasados' },
          ] as const).map(f => (
            <Button key={f.key} size="sm" variant={statusFilter === f.key ? 'default' : 'outline'} onClick={() => setStatusFilter(f.key)} className="text-xs whitespace-nowrap h-7">
              {f.key === 'atrasados' && <AlertTriangle size={10} className="mr-1" />}
              {f.label}
            </Button>
          ))}
        </div>

        {/* Plans List */}
        {isLoading ? (
          <div className="text-center py-12 text-muted-foreground text-sm">Carregando...</div>
        ) : (
          <AnimatePresence mode="popLayout">
            <div className="space-y-2 md:grid md:grid-cols-2 md:gap-3 md:space-y-0">
              {filtered.map((p, i) => {
                const isGeneral = p.isGeneral || !p.clientId;
                const client = p.clientId ? clientMap[p.clientId] : undefined;
                const isOverdue = p.status === 'ativo' && isBefore(parseISO(p.nextCharge), now);

                return (
                  <motion.div
                    key={p.id}
                    layout
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ delay: i * 0.04, type: 'spring', stiffness: 300, damping: 30 }}
                  >
                    <Card className={`overflow-hidden hover:shadow-lg transition-all duration-300 group ${isOverdue ? 'border-destructive/30' : 'hover:border-primary/30'}`}>
                      <CardContent className="p-0">
                        <div className={`h-1 bg-gradient-to-r ${isGeneral ? 'from-blue-500 to-cyan-500' : 'from-violet-500 to-purple-600'}`} />
                        <div className="p-3 space-y-2">
                          {/* Top Row */}
                          <div className="flex items-start justify-between">
                            <div className="flex items-center gap-2 min-w-0">
                              <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${isGeneral ? 'bg-gradient-to-br from-blue-500 to-cyan-500' : 'bg-gradient-to-br from-violet-500 to-purple-600'}`}>
                                {isGeneral ? <Globe size={14} className="text-white" /> : <User size={14} className="text-white" />}
                              </div>
                              <div className="min-w-0">
                                <p className="font-semibold text-sm truncate">{p.name}</p>
                                <p className="text-[10px] text-muted-foreground">
                                  {isGeneral ? 'Plano geral' : (client?.nickname || client?.name || 'Cliente')}
                                </p>
                              </div>
                            </div>
                            <Badge variant="outline" className={`text-[9px] shrink-0 ${statusColor(p.status)}`}>
                              {p.status}
                            </Badge>
                          </div>

                          {/* Description */}
                          {p.description && (
                            <p className="text-[11px] text-muted-foreground line-clamp-1">{p.description}</p>
                          )}

                          {/* Value & Next Charge */}
                          <div className="flex items-center justify-between">
                            <div>
                              <span className="text-sm font-bold text-primary">{formatCurrency(p.value)}</span>
                              <span className="text-[10px] text-muted-foreground">/{p.periodicity === 'quinzenal' ? 'quinzena' : p.periodicity === 'mensal' ? 'mês' : `${p.customDays}d`}</span>
                            </div>
                            <span className={`text-[10px] ${isOverdue ? 'text-destructive font-semibold' : 'text-muted-foreground'}`}>
                              {isOverdue ? '⚠ Atrasado' : `Próx: ${format(parseISO(p.nextCharge), 'dd/MM')}`}
                            </span>
                          </div>

                          {/* Actions */}
                          <div className="flex items-center gap-1 pt-1 border-t border-border/50">
                            <Button
                              size="sm" variant="ghost"
                              className="h-7 text-[10px] gap-1 flex-1"
                              onClick={(e) => { e.stopPropagation(); handleShareWhatsApp(p, client); }}
                            >
                              <Send size={10} /> Enviar WhatsApp
                            </Button>
                            <Button
                              size="sm" variant="ghost"
                              className="h-7 text-[10px] gap-1"
                              onClick={(e) => { e.stopPropagation(); handleCopyLink(p, client); }}
                              disabled={isGeneratingCheckout}
                            >
                              <Link2 size={10} /> Link
                            </Button>
                            <Button
                              size="sm" variant="outline"
                              className="h-7 text-[10px]"
                              onClick={() => navigate(`/planos/editar/${p.id}`)}
                            >
                              Editar
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                );
              })}
              {filtered.length === 0 && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="col-span-2 text-center py-12">
                  <Crown size={48} className="mx-auto text-muted-foreground/20 mb-3" />
                  <p className="text-sm text-muted-foreground">Nenhum plano encontrado</p>
                </motion.div>
              )}
            </div>
          </AnimatePresence>
        )}

        {/* Modal for Selecting Client when Plan is General */}
        <Dialog open={!!selectedPlanForCheckout} onOpenChange={(open) => !open && setSelectedPlanForCheckout(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Gerar Link de Assinatura</DialogTitle>
              <DialogDescription>
                Este é um plano geral. Qual cliente vai assinar este plano '{selectedPlanForCheckout?.name}'?
              </DialogDescription>
            </DialogHeader>
            
            <div className="py-4">
              <Select value={selectedClientId} onValueChange={setSelectedClientId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o cliente..." />
                </SelectTrigger>
                <SelectContent>
                  {clients.map(c => (
                    <SelectItem key={c.id} value={String(c.id)}>
                      {c.name} ({c.whatsapp})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <DialogFooter>
              <Button variant="ghost" onClick={() => setSelectedPlanForCheckout(null)}>Cancelar</Button>
              <Button onClick={submitGeneralCheckout} disabled={!selectedClientId || isGeneratingCheckout}>
                {isGeneratingCheckout ? 'Gerando Stripe...' : 'Gerar e Enviar Zap'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

      </div>
    </AppLayout>
  );
}
