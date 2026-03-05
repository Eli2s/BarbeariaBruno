import { useState, useEffect } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useClients } from '@/hooks/useClients';
import { usePlan, useCreatePlan, useUpdatePlan, usePlans } from '@/hooks/usePlans';
import { usePlanPayments, useCreatePlanPayment } from '@/hooks/usePlanPayments';
import { useServices } from '@/hooks/useServices';
import { analyzeClient } from '@/lib/analytics';
import { AppLayout } from '@/components/AppLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent } from '@/components/ui/card';
import { ArrowLeft, Globe, User } from 'lucide-react';
import { toast } from 'sonner';
import { addDays, format } from 'date-fns';

export default function PlanFormPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const isEdit = !!id;
  const presetClientId = searchParams.get('clientId');

  const [isGeneral, setIsGeneral] = useState(false);
  const [clientId, setClientId] = useState<number | null>(presetClientId ? Number(presetClientId) : null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [value, setValue] = useState(0);
  const [periodicity, setPeriodicity] = useState<'quinzenal' | 'mensal' | 'personalizado'>('mensal');
  const [customDays, setCustomDays] = useState(30);
  const [startDate, setStartDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [status, setStatus] = useState<'ativo' | 'pausado' | 'cancelado'>('ativo');
  const [benefits, setBenefits] = useState('');
  const [internalNote, setInternalNote] = useState('');

  const { data: clients = [] } = useClients();
  const { data: existingPlan } = usePlan(isEdit ? Number(id) : undefined);
  const { data: planPayments = [] } = usePlanPayments(isEdit ? Number(id) : undefined);
  const createPlan = useCreatePlan();
  const updatePlan = useUpdatePlan();
  const createPlanPayment = useCreatePlanPayment();

  const { data: clientServices = [] } = useServices(clientId && !isEdit && !isGeneral ? clientId : undefined);
  const { data: clientPlans = [] } = usePlans(clientId && !isEdit && !isGeneral ? clientId : undefined);

  useEffect(() => {
    if (existingPlan) {
      setIsGeneral(existingPlan.isGeneral || !existingPlan.clientId);
      setClientId(existingPlan.clientId || null);
      setName(existingPlan.name); setDescription(existingPlan.description);
      setValue(existingPlan.value); setPeriodicity(existingPlan.periodicity); setCustomDays(existingPlan.customDays || 30);
      setStartDate(existingPlan.startDate); setStatus(existingPlan.status); setBenefits(existingPlan.benefits || '');
      setInternalNote(existingPlan.internalNote || '');
    }
  }, [existingPlan]);

  useEffect(() => {
    if (clientId && !isEdit && !isGeneral && clientServices.length > 0) {
      const analysis = analyzeClient(clientServices, clientPlans);
      if (analysis.totalVisits > 3) {
        if (analysis.avgDaysBetweenVisits <= 16) {
          setName('Plano Quinzenal Premium');
          setDescription('Corte + Barba a cada 15 dias');
          setValue(Math.round(analysis.averageTicket * 1.7));
          setPeriodicity('quinzenal');
        } else {
          setName('Plano Mensal');
          setDescription('Corte mensal com desconto');
          setValue(Math.round(analysis.averageTicket * 0.9));
          setPeriodicity('mensal');
        }
      }
    }
  }, [clientId, isEdit, isGeneral, clientServices, clientPlans]);

  const calcNextCharge = () => {
    const days = periodicity === 'quinzenal' ? 14 : periodicity === 'mensal' ? 30 : customDays;
    return format(addDays(new Date(startDate), days), 'yyyy-MM-dd');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isGeneral && !clientId) { toast.error('Selecione um cliente ou marque como plano geral'); return; }
    if (!name || !value) { toast.error('Preencha nome e valor'); return; }

    const data = {
      clientId: isGeneral ? undefined : clientId!,
      isGeneral,
      name, description, value, periodicity,
      customDays: periodicity === 'personalizado' ? customDays : undefined,
      startDate, nextCharge: calcNextCharge(), status, benefits, internalNote,
    };

    try {
      if (isEdit) {
        await updatePlan.mutateAsync({ id: Number(id), ...data });
        toast.success('Plano atualizado!');
        navigate(-1);
      } else {
        const newPlan = await createPlan.mutateAsync({ ...data, createdAt: format(new Date(), 'yyyy-MM-dd') } as any);
        if (!isGeneral) {
          await createPlanPayment.mutateAsync({ planId: newPlan.id!, expectedDate: calcNextCharge(), status: 'pendente', value });
          toast.success('Plano criado! Redirecionando para checkout...');
          navigate(`/planos/checkout/${newPlan.id}`);
        } else {
          toast.success('Plano geral criado com sucesso!');
          navigate('/planos');
        }
      }
    } catch { toast.error('Erro ao salvar plano'); }
  };

  const client = clients.find(c => c.id === clientId);

  return (
    <AppLayout>
      <div className="p-4 max-w-lg mx-auto space-y-4">
        <div className="flex items-center gap-3 pt-2">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}><ArrowLeft size={20} /></Button>
          <h1 className="text-xl font-bold">{isEdit ? 'Editar Plano' : 'Novo Plano'}</h1>
        </div>

        {/* General/Specific toggle */}
        {!isEdit && (
          <Card className="overflow-hidden">
            <CardContent className="p-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {isGeneral ? <Globe size={16} className="text-blue-500" /> : <User size={16} className="text-violet-500" />}
                  <div>
                    <p className="text-sm font-medium">{isGeneral ? 'Plano Geral' : 'Plano por Cliente'}</p>
                    <p className="text-[10px] text-muted-foreground">
                      {isGeneral ? 'Disponível para todos os clientes' : 'Específico para um cliente'}
                    </p>
                  </div>
                </div>
                <Switch checked={isGeneral} onCheckedChange={setIsGeneral} />
              </div>
            </CardContent>
          </Card>
        )}

        {client && !isGeneral && (
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Cliente:</span>
            <Badge>{client.nickname || client.name}</Badge>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {!isGeneral && !presetClientId && !isEdit && (
            <div className="space-y-2">
              <Label>Cliente *</Label>
              <Select value={clientId ? String(clientId) : ''} onValueChange={v => setClientId(Number(v))}>
                <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                <SelectContent>{clients.map(c => <SelectItem key={c.id} value={String(c.id)}>{c.nickname || c.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-2">
            <Label>Nome do Plano *</Label>
            <Input value={name} onChange={e => setName(e.target.value)} placeholder="Ex: Plano Quinzenal Premium" />
          </div>
          <div className="space-y-2">
            <Label>Descrição / Serviços inclusos</Label>
            <Textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="O que está incluso..." rows={2} />
          </div>
          <div className="space-y-2">
            <Label>Valor (R$) *</Label>
            <Input type="number" step="0.01" value={value || ''} onChange={e => setValue(Number(e.target.value))} placeholder="0,00" />
          </div>
          <div className="space-y-2">
            <Label>Periodicidade</Label>
            <Select value={periodicity} onValueChange={(v: any) => setPeriodicity(v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="quinzenal">Quinzenal (14 dias)</SelectItem>
                <SelectItem value="mensal">Mensal (30 dias)</SelectItem>
                <SelectItem value="personalizado">Personalizado</SelectItem>
              </SelectContent>
            </Select>
            {periodicity === 'personalizado' && (
              <Input type="number" value={customDays} onChange={e => setCustomDays(Number(e.target.value))} placeholder="Dias" />
            )}
          </div>
          <div className="space-y-2">
            <Label>Data de Início</Label>
            <Input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Próxima Cobrança</Label>
            <Input value={calcNextCharge()} readOnly className="bg-secondary" />
          </div>
          <div className="space-y-2">
            <Label>Status</Label>
            <Select value={status} onValueChange={(v: any) => setStatus(v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ativo">Ativo</SelectItem>
                <SelectItem value="pausado">Pausado</SelectItem>
                <SelectItem value="cancelado">Cancelado</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Benefícios extras</Label>
            <Textarea value={benefits} onChange={e => setBenefits(e.target.value)} rows={2} placeholder="Descontos em produtos..." />
          </div>
          <div className="space-y-2">
            <Label>Observação interna</Label>
            <Textarea value={internalNote} onChange={e => setInternalNote(e.target.value)} rows={2} placeholder="Apenas visível para você..." />
          </div>

          <Button type="submit" className="w-full h-12 font-semibold" disabled={createPlan.isPending || updatePlan.isPending}>
            {isEdit ? 'Salvar Alterações' : 'Criar Plano'}
          </Button>
        </form>

        {/* Payment History */}
        {isEdit && planPayments.length > 0 && (
          <div>
            <h3 className="text-sm font-semibold mb-2">Histórico de Cobranças</h3>
            <div className="border rounded-lg overflow-hidden">
              <table className="w-full text-xs">
                <thead><tr className="bg-secondary"><th className="p-2 text-left">Data Esperada</th><th className="p-2">Paga em</th><th className="p-2">Status</th><th className="p-2">Valor</th></tr></thead>
                <tbody>
                  {planPayments.map(pp => (
                    <tr key={pp.id} className="border-t">
                      <td className="p-2">{pp.expectedDate}</td>
                      <td className="p-2 text-center">{pp.paidDate || '-'}</td>
                      <td className="p-2 text-center"><Badge variant={pp.status === 'pago' ? 'default' : 'secondary'} className="text-[9px]">{pp.status}</Badge></td>
                      <td className="p-2 text-right">R$ {pp.value.toFixed(2).replace('.', ',')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
