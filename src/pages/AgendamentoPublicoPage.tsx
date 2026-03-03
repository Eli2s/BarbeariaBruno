import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, CalendarCheck, Scissors, CheckCircle, Search, Trash2, CalendarDays } from 'lucide-react';
import { toast } from 'sonner';
import { fetchBarbers } from '@/api/barbers';
import { fetchServiceItems } from '@/api/serviceItems';
import {
  fetchAvailability,
  createAppointment,
  fetchAppointmentsByPhone,
  cancelAppointment,
  rescheduleAppointment,
  type Appointment
} from '@/api/appointments';
import type { Barber, ServiceItem } from '@/types';

function formatDateInput(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function formatDisplayDate(dateStr: string): string {
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
    timeZone: 'America/Sao_Paulo'
  }).format(new Date(dateStr));
}

const TODAY = formatDateInput(new Date());

export default function AgendamentoPublicoPage() {
  const [activeTab, setActiveTab] = useState<'novo' | 'meus'>('novo');

  // Arrays globais
  const [barbers, setBarbers] = useState<Barber[]>([]);
  const [services, setServices] = useState<ServiceItem[]>([]);

  // ---- ESTADO: NOVO AGENDAMENTO ----
  const [slots, setSlots] = useState<string[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  const [form, setForm] = useState({
    clientName:  '',
    clientPhone: '',
    barberId:    '',
    serviceItem: '',
    date:        TODAY,
    time:        '',
    notes:       '',
  });

  // ---- ESTADO: MEUS AGENDAMENTOS ----
  const [searchPhone, setSearchPhone] = useState('');
  const [myAppointments, setMyAppointments] = useState<Appointment[]>([]);
  const [searching, setSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  
  // Reagendar
  const [rescheduleData, setRescheduleData] = useState<{ id: number, date: string, time: string } | null>(null);
  const [rescheduleSlots, setRescheduleSlots] = useState<string[]>([]);
  const [loadingRescheduleSlots, setLoadingRescheduleSlots] = useState(false);
  const [reschedulingId, setReschedulingId] = useState<number | null>(null);

  // Load barbers + services initial
  useEffect(() => {
    fetchBarbers().then(data => setBarbers(data.filter((b: any) => b.isActive)));
    fetchServiceItems().then(data => setServices(data));
  }, []);

  // Novo Agendamento: Load available slots
  useEffect(() => {
    if (activeTab !== 'novo') return;
    if (!form.date) return;
    setLoadingSlots(true);
    setSlots([]);
    setForm(f => ({ ...f, time: '' }));
    const bId = form.barberId ? Number(form.barberId) : undefined;
    fetchAvailability(form.date, bId)
      .then(data => setSlots(data.freeSlots))
      .catch(() => toast.error('Erro ao buscar horários disponíveis.'))
      .finally(() => setLoadingSlots(false));
  }, [form.date, form.barberId, activeTab]);

  // Handle Form Change
  const handleChange = (field: string, value: string) => setForm(f => ({ ...f, [field]: value }));

  // Confirmar Novo Agendamento
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
      // Limpa a busca para forçar requery quando for para a outra aba
      setMyAppointments([]);
      setHasSearched(false);
    } catch (err: any) {
      toast.error(err.message || 'Erro ao agendar. Tente novamente.');
    } finally {
      setSubmitting(false);
    }
  };

  // Buscar meus agendamentos
  const handleSearch = async () => {
    if (!searchPhone) {
      toast.error('Digite seu número de WhatsApp.');
      return;
    }
    setSearching(true);
    try {
      const data = await fetchAppointmentsByPhone(searchPhone);
      setMyAppointments(data);
      setHasSearched(true);
      setRescheduleData(null); // Fecha qualquer modal de reagendar aberto
    } catch {
      toast.error('Erro ao buscar agendamentos.');
    } finally {
      setSearching(false);
    }
  };

  // Cancelar
  const handleCancel = async (id: number) => {
    if (!confirm('Tem certeza que deseja cancelar este agendamento?')) return;
    try {
      await cancelAppointment(id, searchPhone);
      toast.success('Agendamento cancelado com sucesso.');
      setMyAppointments(prev => prev.filter(a => a.id !== id));
    } catch (err: any) {
      toast.error(err.message || 'Erro ao cancelar.');
    }
  };

  // Reagendar: Load slots ao escolher nova data
  useEffect(() => {
    if (!rescheduleData || !rescheduleData.date) return;
    setLoadingRescheduleSlots(true);
    setRescheduleSlots([]);
    setRescheduleData(prev => prev ? { ...prev, time: '' } : null);
    
    const appt = myAppointments.find(a => a.id === rescheduleData.id);
    const bId = appt?.barberId || undefined;

    fetchAvailability(rescheduleData.date, bId)
      .then(data => setRescheduleSlots(data.freeSlots))
      .catch(() => toast.error('Erro ao buscar horários.'))
      .finally(() => setLoadingRescheduleSlots(false));
  }, [rescheduleData?.date]); // eslint-disable-line

  // Confirmar Reagendamento
  const handleConfirmReschedule = async () => {
    if (!rescheduleData || !rescheduleData.time) {
      toast.error('Selecione um horário.');
      return;
    }
    setReschedulingId(rescheduleData.id);
    try {
      await rescheduleAppointment(rescheduleData.id, searchPhone, rescheduleData.date, rescheduleData.time);
      toast.success('Agendamento remarcado com sucesso!');
      await handleSearch(); // Recarrega os dados
    } catch (err: any) {
      toast.error(err.message || 'Erro ao reagendar.');
    } finally {
      setReschedulingId(null);
    }
  };


  // TELA DE SUCESSO (Novo Agendamento)
  if (success && activeTab === 'novo') {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-4">
        <Card className="bg-[#111] border-[#222] text-white max-w-sm w-full text-center">
          <CardContent className="py-10 flex flex-col items-center gap-4">
            <CheckCircle size={56} className="text-[#556B2F]" />
            <div>
              <h2 className="text-xl font-bold">Agendamento Confirmado!</h2>
              <p className="text-sm text-gray-400 mt-2">
                Seu horário para <strong>{form.date.split('-').reverse().join('/')}</strong> às <strong>{form.time}</strong> está garantido.<br />
                Você receberá uma confirmação via WhatsApp.
              </p>
            </div>
            <div className="mt-4 flex flex-col gap-2 w-full">
              <Button
                className="bg-[#556B2F] hover:bg-[#6b8a3a] text-white w-full"
                onClick={() => { setSuccess(false); setForm({ ...form, date:TODAY, time:'', notes:'' }); }}
              >
                Fazer outro agendamento
              </Button>
              <Button
                variant="outline"
                className="w-full bg-transparent border-[#333] text-gray-300 hover:text-white"
                onClick={() => { 
                  setSuccess(false); 
                  setSearchPhone(form.clientPhone); 
                  setActiveTab('meus'); 
                  setTimeout(() => { document.getElementById('btn-search')?.click() }, 100);
                }}
              >
                Ver meus agendamentos
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white flex flex-col">
      {/* Header */}
      <header className="bg-[#111] border-b border-[#222] px-4 py-4">
        <div className="max-w-lg mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Scissors size={24} className="text-[#556B2F]" />
            <div>
              <h1 className="text-lg font-bold leading-tight">Barbearia Online</h1>
              <p className="text-xs text-gray-400">Agende e gerencie seus horários</p>
            </div>
          </div>
        </div>
      </header>

      {/* TABS */}
      <div className="bg-[#111] border-b border-[#222]">
        <div className="max-w-lg mx-auto flex">
          <button 
            className={`flex-1 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === 'novo' ? 'border-[#556B2F] text-[#556B2F]' : 'border-transparent text-gray-400 hover:text-gray-200'}`}
            onClick={() => setActiveTab('novo')}
          >
            Novo Agendamento
          </button>
          <button 
            className={`flex-1 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === 'meus' ? 'border-[#556B2F] text-[#556B2F]' : 'border-transparent text-gray-400 hover:text-gray-200'}`}
            onClick={() => setActiveTab('meus')}
          >
            Meus Horários
          </button>
        </div>
      </div>

      <main className="flex-1 p-4 max-w-lg mx-auto w-full space-y-4 pb-8 mt-2">
        
        {/* ABA: NOVO AGENDAMENTO */}
        {activeTab === 'novo' && (
          <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2">
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
                  <Label className="text-gray-300 text-sm">WhatsApp (apenas números) *</Label>
                  <Input
                    className="bg-[#1a1a1a] border-[#333] text-white mt-1"
                    placeholder="11999999999"
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
                        <SelectItem key={s.id} value={s.name}>{s.name} - R$ {s.price.toFixed(2)}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-gray-300 text-sm">Barbeiro (opcional)</Label>
                  <Select value={form.barberId} onValueChange={v => handleChange('barberId', v)}>
                    <SelectTrigger className="bg-[#1a1a1a] border-[#333] text-white mt-1">
                      <SelectValue placeholder="Qualquer barbeiro livre" />
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
                <CardDescription className="text-gray-500 text-xs">Vagas disponíveis baseadas na seleção acima</CardDescription>
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
                    <Loader2 size={16} className="animate-spin" /> Atualizando horários...
                  </div>
                ) : slots.length === 0 ? (
                  <p className="text-sm text-gray-500 italic mt-2">Nenhum horário disponível para essa data/barbeiro.</p>
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
                  <Label className="text-gray-300 text-sm mt-3">Observações (opcional)</Label>
                  <Textarea
                    className="bg-[#1a1a1a] border-[#333] text-white mt-1 text-sm"
                    placeholder="Alguma anotação sobre o corte?..."
                    rows={2}
                    value={form.notes}
                    onChange={e => handleChange('notes', e.target.value)}
                  />
                </div>
              </CardContent>
            </Card>

            <Button
              disabled={submitting || !form.time || !form.serviceItem || !form.clientName || !form.clientPhone}
              onClick={handleSubmit}
              className="w-full bg-[#556B2F] hover:bg-[#6b8a3a] text-white font-semibold py-3 text-base gap-2"
            >
              {submitting ? <Loader2 size={18} className="animate-spin" /> : <CalendarCheck size={18} />}
              {submitting ? 'Confirmando...' : 'Confirmar Agendamento'}
            </Button>
          </div>
        )}

        {/* ABA: MEUS AGENDAMENTOS */}
        {activeTab === 'meus' && (
          <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2">
            <Card className="bg-[#111] border-[#222] text-white">
              <CardContent className="p-4 space-y-3">
                <Label className="text-gray-300 text-sm">Qual seu WhatsApp?</Label>
                <div className="flex gap-2">
                  <Input
                    className="bg-[#1a1a1a] border-[#333] text-white flex-1"
                    placeholder="Ex: 11999999999"
                    value={searchPhone}
                    onChange={e => setSearchPhone(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleSearch()}
                  />
                  <Button id="btn-search" onClick={handleSearch} disabled={searching} className="bg-[#333] hover:bg-[#444]">
                    {searching ? <Loader2 size={18} className="animate-spin" /> : <Search size={18} />}
                  </Button>
                </div>
                <p className="text-xs text-gray-500">Pesquise para ver, cancelar ou reagendar seus horários.</p>
              </CardContent>
            </Card>

            {hasSearched && myAppointments.length === 0 && (
              <div className="text-center py-10 bg-[#111] border border-[#222] rounded-lg">
                <CalendarCheck size={40} className="mx-auto text-gray-600 mb-3" />
                <p className="text-gray-400">Nenhum agendamento futuro encontrado para este número.</p>
                <Button 
                  variant="link" 
                  className="text-[#556B2F] mt-2"
                  onClick={() => setActiveTab('novo')}
                >
                  Fazer um novo agendamento
                </Button>
              </div>
            )}

            {myAppointments.map(appt => (
              <Card key={appt.id} className="bg-[#1a1a1a] border-[#333] text-white overflow-hidden">
                <CardHeader className="py-3 px-4 bg-[#222]">
                  <CardTitle className="text-sm font-semibold flex items-center justify-between">
                     <span>{formatDisplayDate(appt.dateTime)}</span>
                     <span className="text-xs px-2 py-1 bg-green-500/20 text-green-400 rounded">Confirmado</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4 space-y-2">
                  <p className="text-sm"><strong className="text-gray-400">Serviço:</strong> {appt.serviceItem}</p>
                  <p className="text-sm"><strong className="text-gray-400">Barbeiro:</strong> {appt.barber?.name || 'Qualquer profissional'}</p>
                  {appt.notes && <p className="text-sm"><strong className="text-gray-400">Notas:</strong> {appt.notes}</p>}
                </CardContent>
                
                {/* Ações / Expandir reagendamento */}
                <CardFooter className="p-4 pt-0 flex flex-col gap-3">
                  {rescheduleData?.id === appt.id ? (
                    <div className="w-full bg-[#111] p-3 rounded-md border border-[#333] space-y-3">
                      <p className="text-xs font-semibold text-[#556B2F]">Nova data e hora</p>
                      <Input
                        type="date"
                        className="bg-[#222] border-[#444] text-white h-8 text-xs"
                        min={TODAY}
                        value={rescheduleData.date}
                        onChange={e => setRescheduleData({ ...rescheduleData, date: e.target.value })}
                      />
                      
                      {loadingRescheduleSlots ? (
                        <div className="text-xs text-gray-500 flex items-center gap-1"><Loader2 size={12} className="animate-spin" /> Buscando...</div>
                      ) : (
                        <div className="grid grid-cols-4 gap-1.5">
                          {rescheduleSlots.map(slot => (
                            <button
                              key={slot}
                              onClick={() => setRescheduleData({ ...rescheduleData, time: slot })}
                              className={`rounded py-1.5 text-xs border ${
                                rescheduleData.time === slot
                                  ? 'bg-[#556B2F] border-[#556B2F] text-white'
                                  : 'bg-[#222] border-[#444] text-gray-300'
                              }`}
                            >
                              {slot}
                            </button>
                          ))}
                        </div>
                      )}
                      
                      <div className="flex gap-2 pt-2">
                        <Button 
                          size="sm" 
                          variant="outline" 
                          className="flex-1 bg-transparent border-[#444] h-8 text-xs"
                          onClick={() => setRescheduleData(null)}
                        >
                          Cancelar
                        </Button>
                        <Button 
                          size="sm" 
                          className="flex-1 bg-[#556B2F] hover:bg-[#6b8a3a] h-8 text-xs"
                          disabled={!rescheduleData.time || reschedulingId === appt.id}
                          onClick={handleConfirmReschedule}
                        >
                          {reschedulingId === appt.id ? <Loader2 size={14} className="animate-spin" /> : 'Confirmar'}
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex gap-2 w-full">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="flex-1 bg-transparent border-[#333] hover:bg-[#222] text-white gap-2"
                        onClick={() => setRescheduleData({ id: appt.id, date: TODAY, time: '' })}
                      >
                        <CalendarDays size={14} /> Reagendar
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="flex-1 bg-transparent border-red-900/50 hover:bg-red-900/30 text-red-400 hover:text-red-300 gap-2"
                        onClick={() => handleCancel(appt.id)}
                      >
                        <Trash2 size={14} /> Cancelar
                      </Button>
                    </div>
                  )}
                </CardFooter>
              </Card>
            ))}
          </div>
        )}

      </main>
    </div>
  );
}
