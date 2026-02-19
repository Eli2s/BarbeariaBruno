import { useState, useEffect } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/db/database';
import { analyzeClient } from '@/lib/analytics';
import { AppLayout } from '@/components/AppLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';
import { addDays, format } from 'date-fns';

export default function PlanFormPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const isEdit = !!id;
  const presetClientId = searchParams.get('clientId');

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

  const clients = useLiveQuery(() => db.clients.toArray()) ?? [];
  const planPayments = useLiveQuery(() => id ? db.planPayments.where('planId').equals(Number(id)).toArray() : [], [id]) ?? [];

  useEffect(() => {
    if (isEdit) {
      db.plans.get(Number(id)).then(p => {
        if (p) {
          setClientId(p.clientId); setName(p.name); setDescription(p.description);
          setValue(p.value); setPeriodicity(p.periodicity); setCustomDays(p.customDays || 30);
          setStartDate(p.startDate); setStatus(p.status); setBenefits(p.benefits || '');
          setInternalNote(p.internalNote || '');
        }
      });
    }
  }, [id, isEdit]);

  // Auto-suggest on client selection
  useEffect(() => {
    if (clientId && !isEdit) {
      Promise.all([
        db.services.where('clientId').equals(clientId).toArray(),
        db.plans.where('clientId').equals(clientId).toArray(),
      ]).then(([svcs, plans]) => {
        const analysis = analyzeClient(svcs, plans);
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
      });
    }
  }, [clientId, isEdit]);

  const calcNextCharge = () => {
    const days = periodicity === 'quinzenal' ? 14 : periodicity === 'mensal' ? 30 : customDays;
    return format(addDays(new Date(startDate), days), 'yyyy-MM-dd');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientId || !name || !value) { toast.error('Preencha todos os campos obrigatórios'); return; }
    const data = {
      clientId, name, description, value, periodicity, customDays: periodicity === 'personalizado' ? customDays : undefined,
      startDate, nextCharge: calcNextCharge(), status, benefits, internalNote,
    };
    if (isEdit) {
      await db.plans.update(Number(id), data);
      toast.success('Plano atualizado!');
      navigate(-1);
    } else {
      const planId = await db.plans.add({ ...data, createdAt: format(new Date(), 'yyyy-MM-dd') });
      // Create first payment
      await db.planPayments.add({ planId: planId as number, expectedDate: calcNextCharge(), status: 'pendente', value });
      toast.success('Plano criado! Redirecionando para pagamento...');
      navigate(`/planos/checkout/${planId}`);
    }
  };

  const client = clients.find(c => c.id === clientId);

  return (
    <AppLayout>
      <div className="p-4 max-w-lg mx-auto space-y-4">
        <div className="flex items-center gap-3 pt-2">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}><ArrowLeft size={20} /></Button>
          <h1 className="text-xl font-bold">{isEdit ? 'Editar Plano' : 'Novo Plano'}</h1>
        </div>

        {client && (
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Cliente:</span>
            <Badge>{client.nickname || client.name}</Badge>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {!presetClientId && !isEdit && (
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

          <Button type="submit" className="w-full h-12 font-semibold">{isEdit ? 'Salvar Alterações' : 'Criar Plano'}</Button>
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
