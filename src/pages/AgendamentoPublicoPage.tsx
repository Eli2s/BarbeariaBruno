import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, CalendarCheck, Scissors, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';
import { fetchBarbers } from '@/api/barbers';
import { fetchServiceItems } from '@/api/serviceItems';
import { fetchAvailability, createAppointment } from '@/api/appointments';
import type { Barber, ServiceItem } from '@/types';

function formatDateInput(date: Date): string {
  return date.toISOString().slice(0, 10);
}

const TODAY = formatDateInput(new Date());

export default function AgendamentoPublicoPage() {
  const [barbers, setBarbers]           = useState<Barber[]>([]);
  const [services, setServices] = useState<ServiceItem[]>([]);
  const [slots, setSlots]               = useState<string[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [submitting, setSubmitting]     = useState(false);
  const [success, setSuccess]           = useState(false);

  const [form, setForm] = useState({
    clientName:  '',
    clientPhone: '',
    barberId:    '',
    serviceItem: '',
    date:        TODAY,
    time:        '',
    notes:       '',
  });

  // Load barbers + services
  useEffect(() => {
    fetchBarbers().then(data => setBarbers(data.filter((b: any) => b.isActive)));
    fetchServiceItems().then(data => setServices(data));
  }, []);

  // Load available slots when date or barber changes
  useEffect(() => {
    if (!form.date) return;
    setLoadingSlots(true);
    setSlots([]);
    setForm(f => ({ ...f, time: '' }));
    const bId = form.barberId ? Number(form.barberId) : undefined;
    fetchAvailability(form.date, bId)
      .then(data => setSlots(data.freeSlots))
      .catch(() => toast.error('Erro ao buscar horários disponíveis.'))
      .finally(() => setLoadingSlots(false));
  }, [form.date, form.barberId]);

  const handleChange = (field: string, value: string) =>
    setForm(f => ({ ...f, [field]: value }));

  const handleSubmit = async () => {
    if (!form.clientName || !form.clientPhone || !form.serviceItem || !form.date || !form.time) {
      toast.error('Preencha todos os campos obrigatórios.');
      return;
    }

    setSubmitting(true);
    try {
      await createAppointment({
        clientName:  form.clientName,
        clientPhone: form.clientPhone,
        barberId:    form.barberId ? Number(form.barberId) : null,
        serviceItem: form.serviceItem,
        date:        form.date,
        time:        form.time,
        notes:       form.notes || undefined,
      });
      setSuccess(true);
    } catch (err: any) {
      toast.error(err.message || 'Erro ao agendar. Tente novamente.');
    } finally {
      setSubmitting(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-4">
        <Card className="bg-[#111] border-[#222] text-white max-w-sm w-full text-center">
          <CardContent className="py-10 flex flex-col items-center gap-4">
            <CheckCircle size={56} className="text-[#556B2F]" />
            <div>
              <h2 className="text-xl font-bold">Agendamento Enviado!</h2>
              <p className="text-sm text-gray-400 mt-2">
                Recebemos seu pedido para <strong>{form.date.split('-').reverse().join('/')}</strong> às <strong>{form.time}</strong>.<br />
                Você receberá uma confirmação via WhatsApp em breve.
              </p>
            </div>
            <Button
              className="mt-4 bg-[#556B2F] hover:bg-[#6b8a3a] text-white w-full"
              onClick={() => { setSuccess(false); setForm({ clientName:'', clientPhone:'', barberId:'', serviceItem:'', date:TODAY, time:'', notes:'' }); }}
            >
              Fazer outro agendamento
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white flex flex-col">
      {/* Header */}
      <header className="bg-[#111] border-b border-[#222] px-4 py-4 flex items-center gap-3">
        <Scissors size={24} className="text-[#556B2F]" />
        <div>
          <h1 className="text-lg font-bold leading-tight">Agendar Horário</h1>
          <p className="text-xs text-gray-400">Barbearia Online</p>
        </div>
      </header>

      <main className="flex-1 p-4 max-w-lg mx-auto w-full space-y-4 pb-8">
        <Card className="bg-[#111] border-[#222] text-white">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <CalendarCheck size={18} className="text-[#556B2F]" /> Seus Dados
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <Label className="text-gray-300 text-sm">Nome completo *</Label>
              <Input
                className="bg-[#1a1a1a] border-[#333] text-white mt-1"
                placeholder="Seu nome"
                value={form.clientName}
                onChange={e => handleChange('clientName', e.target.value)}
              />
            </div>
            <div>
              <Label className="text-gray-300 text-sm">WhatsApp *</Label>
              <Input
                className="bg-[#1a1a1a] border-[#333] text-white mt-1"
                placeholder="(11) 99999-9999"
                value={form.clientPhone}
                onChange={e => handleChange('clientPhone', e.target.value)}
              />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-[#111] border-[#222] text-white">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Scissors size={18} className="text-[#556B2F]" /> Serviço & Barbeiro
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <Label className="text-gray-300 text-sm">Serviço *</Label>
              <Select value={form.serviceItem} onValueChange={v => handleChange('serviceItem', v)}>
                <SelectTrigger className="bg-[#1a1a1a] border-[#333] text-white mt-1">
                  <SelectValue placeholder="Selecione um serviço..." />
                </SelectTrigger>
                <SelectContent>
                  {services.map(s => (
                    <SelectItem key={s.id} value={s.name}>{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-gray-300 text-sm">Barbeiro (opcional)</Label>
              <Select value={form.barberId} onValueChange={v => handleChange('barberId', v)}>
                <SelectTrigger className="bg-[#1a1a1a] border-[#333] text-white mt-1">
                  <SelectValue placeholder="Qualquer barbeiro" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="0">Qualquer barbeiro</SelectItem>
                  {barbers.map(b => (
                    <SelectItem key={b.id} value={String(b.id)}>{b.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-[#111] border-[#222] text-white">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <CalendarCheck size={18} className="text-[#556B2F]" /> Data & Horário
            </CardTitle>
            <CardDescription className="text-gray-500 text-xs">Escolha a data e veja os horários disponíveis</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <Label className="text-gray-300 text-sm">Data *</Label>
              <Input
                type="date"
                className="bg-[#1a1a1a] border-[#333] text-white mt-1"
                min={TODAY}
                value={form.date}
                onChange={e => handleChange('date', e.target.value)}
              />
            </div>

            {loadingSlots ? (
              <div className="flex items-center gap-2 text-gray-400 text-sm py-2">
                <Loader2 size={16} className="animate-spin" /> Verificando horários...
              </div>
            ) : slots.length === 0 ? (
              <p className="text-sm text-gray-500 italic">Nenhum horário disponível para essa data.</p>
            ) : (
              <div>
                <Label className="text-gray-300 text-sm">Horário *</Label>
                <div className="grid grid-cols-4 gap-2 mt-2">
                  {slots.map(slot => (
                    <button
                      key={slot}
                      type="button"
                      onClick={() => handleChange('time', slot)}
                      className={`rounded-md py-2 text-sm font-medium border transition-colors ${
                        form.time === slot
                          ? 'bg-[#556B2F] border-[#556B2F] text-white'
                          : 'bg-[#1a1a1a] border-[#333] text-gray-300 hover:border-[#556B2F]'
                      }`}
                    >
                      {slot}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div>
              <Label className="text-gray-300 text-sm">Observações (opcional)</Label>
              <Textarea
                className="bg-[#1a1a1a] border-[#333] text-white mt-1 text-sm"
                placeholder="Alguma observação ou serviço específico..."
                rows={3}
                value={form.notes}
                onChange={e => handleChange('notes', e.target.value)}
              />
            </div>
          </CardContent>
        </Card>

        <Button
          disabled={submitting}
          onClick={handleSubmit}
          className="w-full bg-[#556B2F] hover:bg-[#6b8a3a] text-white font-semibold py-3 text-base gap-2"
        >
          {submitting ? <Loader2 size={18} className="animate-spin" /> : <CalendarCheck size={18} />}
          {submitting ? 'Enviando...' : 'Confirmar Agendamento'}
        </Button>
      </main>
    </div>
  );
}
