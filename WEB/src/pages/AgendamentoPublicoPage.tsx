import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Loader2, CalendarCheck, Scissors, CheckCircle, Search, Trash2, CalendarDays, ArrowLeft, ArrowRight, Check, User, Clock } from 'lucide-react';
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
import { PublicLayout } from '@/components/PublicLayout';

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
const STORAGE_KEY = 'agendamento_progress';

interface FormData {
  clientName: string;
  clientPhone: string;
  barberId: string;
  serviceItem: string;
  date: string;
  time: string;
  notes: string;
}

const defaultForm: FormData = {
  clientName: '',
  clientPhone: '',
  barberId: '',
  serviceItem: '',
  date: TODAY,
  time: '',
  notes: '',
};

function loadProgress(): { step: number; form: FormData } {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return { step: parsed.step || 1, form: { ...defaultForm, ...parsed.form } };
    }
  } catch { /* ignore */ }
  return { step: 1, form: { ...defaultForm } };
}

const STEP_LABELS = ['Dados', 'Serviço', 'Horário', 'Confirmação'];
const STEP_ICONS = [User, Scissors, Clock, CheckCircle];

function StepIndicator({ currentStep }: { currentStep: number }) {
  return (
    <div className="flex items-center justify-between w-full mb-6">
      {STEP_LABELS.map((label, i) => {
        const stepNum = i + 1;
        const Icon = STEP_ICONS[i];
        const isActive = stepNum === currentStep;
        const isDone = stepNum < currentStep;
        return (
          <div key={label} className="flex items-center flex-1 last:flex-none">
            <div className="flex flex-col items-center gap-1">
              <div
                className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold transition-colors ${
                  isDone
                    ? 'bg-primary text-primary-foreground'
                    : isActive
                    ? 'bg-primary text-primary-foreground ring-2 ring-primary/30 ring-offset-2 ring-offset-background'
                    : 'bg-muted text-muted-foreground'
                }`}
              >
                {isDone ? <Check size={16} /> : <Icon size={16} />}
              </div>
              <span className={`text-[10px] font-medium ${isActive || isDone ? 'text-primary' : 'text-muted-foreground'}`}>
                {label}
              </span>
            </div>
            {i < STEP_LABELS.length - 1 && (
              <div className={`flex-1 h-0.5 mx-2 mt-[-14px] ${isDone ? 'bg-primary' : 'bg-border'}`} />
            )}
          </div>
        );
      })}
    </div>
  );
}

export default function AgendamentoPublicoPage() {
  const [activeTab, setActiveTab] = useState<'novo' | 'meus'>('novo');

  // Arrays globais
  const [barbers, setBarbers] = useState<Barber[]>([]);
  const [services, setServices] = useState<ServiceItem[]>([]);

  // ---- WIZARD STATE ----
  const [step, setStep] = useState(() => loadProgress().step);
  const [form, setForm] = useState<FormData>(() => loadProgress().form);

  const [slots, setSlots] = useState<string[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

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

  // Persist progress to localStorage
  useEffect(() => {
    if (!success) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ step, form }));
    }
  }, [step, form, success]);

  // Load barbers + services initial
  useEffect(() => {
    fetchBarbers().then(data => setBarbers(data.filter((b: any) => b.isActive)));
    fetchServiceItems().then(data => setServices(data));
  }, []);

  // Load available slots when on step 3
  useEffect(() => {
    if (activeTab !== 'novo' || step !== 3) return;
    if (!form.date) return;
    setLoadingSlots(true);
    setSlots([]);
    setForm(f => ({ ...f, time: '' }));
    const bId = form.barberId ? Number(form.barberId) : undefined;
    fetchAvailability(form.date, bId)
      .then(data => setSlots(data.freeSlots))
      .catch(() => toast.error('Erro ao buscar horários disponíveis.'))
      .finally(() => setLoadingSlots(false));
  }, [form.date, form.barberId, activeTab, step]);

  const handleChange = (field: string, value: string) => setForm(f => ({ ...f, [field]: value }));

  // Step validation
  const canAdvance = useCallback(() => {
    switch (step) {
      case 1: return !!form.clientName.trim() && !!form.clientPhone.trim();
      case 2: return !!form.serviceItem;
      case 3: return !!form.date && !!form.time;
      default: return true;
    }
  }, [step, form]);

  const handleNext = () => {
    if (!canAdvance()) {
      toast.error('Preencha todos os campos obrigatórios.');
      return;
    }
    setStep(s => Math.min(s + 1, 4));
  };

  const handleBack = () => setStep(s => Math.max(s - 1, 1));

  // Confirmar Novo Agendamento
  const handleSubmit = async () => {
    if (!form.clientName || !form.clientPhone || !form.serviceItem || !form.date || !form.time) {
      toast.error('Preencha todos os campos obrigatórios.');
      return;
    }
    setSubmitting(true);
    try {
      await createAppointment({
        clientName: form.clientName,
        clientPhone: form.clientPhone,
        barberId: form.barberId ? Number(form.barberId) : null,
        serviceItem: form.serviceItem,
        date: form.date,
        time: form.time,
        notes: form.notes || undefined,
      });
      localStorage.removeItem(STORAGE_KEY);
      setSuccess(true);
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
      setRescheduleData(null);
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
      await handleSearch();
    } catch (err: any) {
      toast.error(err.message || 'Erro ao reagendar.');
    } finally {
      setReschedulingId(null);
    }
  };

  // Helper to get selected service/barber names for summary
  const selectedService = services.find(s => s.name === form.serviceItem);
  const selectedBarber = barbers.find(b => String(b.id) === form.barberId);

  // TELA DE SUCESSO (Novo Agendamento)
  if (success && activeTab === 'novo') {
    return (
      <PublicLayout>
        <div className="flex items-center justify-center p-4 py-16">
          <Card className="max-w-sm w-full text-center">
            <CardContent className="py-10 flex flex-col items-center gap-4">
              <CheckCircle size={56} className="text-primary" />
              <div>
                <h2 className="text-xl font-bold">Agendamento Confirmado!</h2>
                <p className="text-sm text-muted-foreground mt-2">
                  Seu horário para <strong>{form.date.split('-').reverse().join('/')}</strong> às <strong>{form.time}</strong> está garantido.<br />
                  Você receberá uma confirmação via WhatsApp.
                </p>
              </div>
              <div className="mt-4 flex flex-col gap-2 w-full">
                <Button
                  className="w-full"
                  onClick={() => {
                    setSuccess(false);
                    setForm({ ...defaultForm });
                    setStep(1);
                  }}
                >
                  Fazer outro agendamento
                </Button>
                <Button
                  variant="outline"
                  className="w-full"
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
      </PublicLayout>
    );
  }

  return (
    <PublicLayout>
      <div className="max-w-lg mx-auto w-full px-4 pb-8">
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'novo' | 'meus')} className="mt-4">
          <TabsList className="w-full">
            <TabsTrigger value="novo" className="flex-1">Novo Agendamento</TabsTrigger>
            <TabsTrigger value="meus" className="flex-1">Meus Horários</TabsTrigger>
          </TabsList>

          {/* ABA: NOVO AGENDAMENTO (WIZARD) */}
          <TabsContent value="novo" className="mt-4">
            <StepIndicator currentStep={step} />

            {/* STEP 1: Dados Pessoais */}
            {step === 1 && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    <User size={18} className="text-primary" /> Seus Dados
                  </CardTitle>
                  <CardDescription className="text-xs">Informe seu nome e WhatsApp para contato</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <Label className="text-muted-foreground text-sm">Nome completo *</Label>
                    <Input
                      className="mt-1"
                      placeholder="Seu nome"
                      value={form.clientName}
                      onChange={e => handleChange('clientName', e.target.value)}
                    />
                  </div>
                  <div>
                    <Label className="text-muted-foreground text-sm">WhatsApp (apenas números) *</Label>
                    <Input
                      className="mt-1"
                      placeholder="11999999999"
                      value={form.clientPhone}
                      onChange={e => handleChange('clientPhone', e.target.value)}
                    />
                  </div>
                </CardContent>
                <CardFooter className="justify-end">
                  <Button onClick={handleNext} className="gap-2">
                    Próximo <ArrowRight size={16} />
                  </Button>
                </CardFooter>
              </Card>
            )}

            {/* STEP 2: Serviço & Barbeiro */}
            {step === 2 && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Scissors size={18} className="text-primary" /> Serviço & Barbeiro
                  </CardTitle>
                  <CardDescription className="text-xs">Escolha o serviço desejado</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <Label className="text-muted-foreground text-sm">Serviço *</Label>
                    <Select value={form.serviceItem} onValueChange={v => handleChange('serviceItem', v)}>
                      <SelectTrigger className="mt-1">
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
                    <Label className="text-muted-foreground text-sm">Barbeiro (opcional)</Label>
                    <Select value={form.barberId} onValueChange={v => handleChange('barberId', v)}>
                      <SelectTrigger className="mt-1">
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
                <CardFooter className="justify-between">
                  <Button variant="outline" onClick={handleBack} className="gap-2">
                    <ArrowLeft size={16} /> Voltar
                  </Button>
                  <Button onClick={handleNext} className="gap-2">
                    Próximo <ArrowRight size={16} />
                  </Button>
                </CardFooter>
              </Card>
            )}

            {/* STEP 3: Data & Horário */}
            {step === 3 && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Clock size={18} className="text-primary" /> Data & Horário
                  </CardTitle>
                  <CardDescription className="text-xs">Vagas disponíveis baseadas na seleção anterior</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <Label className="text-muted-foreground text-sm">Data *</Label>
                    <Input
                      type="date"
                      className="mt-1"
                      min={TODAY}
                      value={form.date}
                      onChange={e => handleChange('date', e.target.value)}
                    />
                  </div>

                  {loadingSlots ? (
                    <div className="flex items-center gap-2 text-muted-foreground text-sm py-2">
                      <Loader2 size={16} className="animate-spin" /> Atualizando horários...
                    </div>
                  ) : slots.length === 0 ? (
                    <p className="text-sm text-muted-foreground italic mt-2">Nenhum horário disponível para essa data/barbeiro.</p>
                  ) : (
                    <div>
                      <Label className="text-muted-foreground text-sm">Horário *</Label>
                      <div className="grid grid-cols-4 gap-2 mt-2">
                        {slots.map(slot => (
                          <button
                            key={slot}
                            type="button"
                            onClick={() => handleChange('time', slot)}
                            className={`rounded-md py-2 text-sm font-medium border transition-colors ${
                              form.time === slot
                                ? 'bg-primary border-primary text-primary-foreground'
                                : 'bg-muted border-border text-muted-foreground hover:border-primary'
                            }`}
                          >
                            {slot}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  <div>
                    <Label className="text-muted-foreground text-sm mt-3">Observações (opcional)</Label>
                    <Textarea
                      className="mt-1 text-sm"
                      placeholder="Alguma anotação sobre o corte?..."
                      rows={2}
                      value={form.notes}
                      onChange={e => handleChange('notes', e.target.value)}
                    />
                  </div>
                </CardContent>
                <CardFooter className="justify-between">
                  <Button variant="outline" onClick={handleBack} className="gap-2">
                    <ArrowLeft size={16} /> Voltar
                  </Button>
                  <Button onClick={handleNext} className="gap-2">
                    Próximo <ArrowRight size={16} />
                  </Button>
                </CardFooter>
              </Card>
            )}

            {/* STEP 4: Confirmação / Resumo */}
            {step === 4 && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    <CheckCircle size={18} className="text-primary" /> Confirme seu Agendamento
                  </CardTitle>
                  <CardDescription className="text-xs">Revise os dados abaixo antes de confirmar</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="rounded-md bg-muted p-4 space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Nome</span>
                      <span className="font-medium">{form.clientName}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">WhatsApp</span>
                      <span className="font-medium">{form.clientPhone}</span>
                    </div>
                    <div className="border-t border-border my-1" />
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Serviço</span>
                      <span className="font-medium">{form.serviceItem}</span>
                    </div>
                    {selectedService && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Valor</span>
                        <span className="font-medium">R$ {selectedService.price.toFixed(2)}</span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Barbeiro</span>
                      <span className="font-medium">{selectedBarber?.name || 'Qualquer profissional'}</span>
                    </div>
                    <div className="border-t border-border my-1" />
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Data</span>
                      <span className="font-medium">{form.date.split('-').reverse().join('/')}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Horário</span>
                      <span className="font-medium">{form.time}</span>
                    </div>
                    {form.notes && (
                      <>
                        <div className="border-t border-border my-1" />
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Observações</span>
                          <span className="font-medium text-right max-w-[60%]">{form.notes}</span>
                        </div>
                      </>
                    )}
                  </div>
                </CardContent>
                <CardFooter className="justify-between">
                  <Button variant="outline" onClick={handleBack} className="gap-2">
                    <ArrowLeft size={16} /> Voltar
                  </Button>
                  <Button
                    disabled={submitting}
                    onClick={handleSubmit}
                    className="gap-2"
                  >
                    {submitting ? <Loader2 size={16} className="animate-spin" /> : <CalendarCheck size={16} />}
                    {submitting ? 'Confirmando...' : 'Confirmar Agendamento'}
                  </Button>
                </CardFooter>
              </Card>
            )}
          </TabsContent>

          {/* ABA: MEUS AGENDAMENTOS */}
          <TabsContent value="meus" className="space-y-4 mt-4">
            <Card>
              <CardContent className="p-4 space-y-3">
                <Label className="text-muted-foreground text-sm">Qual seu WhatsApp?</Label>
                <div className="flex gap-2">
                  <Input
                    className="flex-1"
                    placeholder="Ex: 11999999999"
                    value={searchPhone}
                    onChange={e => setSearchPhone(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleSearch()}
                  />
                  <Button id="btn-search" onClick={handleSearch} disabled={searching} variant="secondary">
                    {searching ? <Loader2 size={18} className="animate-spin" /> : <Search size={18} />}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">Pesquise para ver, cancelar ou reagendar seus horários.</p>
              </CardContent>
            </Card>

            {hasSearched && myAppointments.length === 0 && (
              <div className="text-center py-10 bg-card border border-border rounded-lg">
                <CalendarCheck size={40} className="mx-auto text-muted-foreground mb-3" />
                <p className="text-muted-foreground">Nenhum agendamento futuro encontrado para este número.</p>
                <Button
                  variant="link"
                  className="text-primary mt-2"
                  onClick={() => setActiveTab('novo')}
                >
                  Fazer um novo agendamento
                </Button>
              </div>
            )}

            {myAppointments.map(appt => (
              <Card key={appt.id} className="overflow-hidden">
                <CardHeader className="py-3 px-4 bg-muted">
                  <CardTitle className="text-sm font-semibold flex items-center justify-between">
                     <span>{formatDisplayDate(appt.dateTime)}</span>
                     <span className="text-xs px-2 py-1 bg-green-500/20 text-green-400 rounded">Confirmado</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4 space-y-2">
                  <p className="text-sm"><strong className="text-muted-foreground">Serviço:</strong> {appt.serviceItem}</p>
                  <p className="text-sm"><strong className="text-muted-foreground">Barbeiro:</strong> {appt.barber?.name || 'Qualquer profissional'}</p>
                  {appt.notes && <p className="text-sm"><strong className="text-muted-foreground">Notas:</strong> {appt.notes}</p>}
                </CardContent>

                <CardFooter className="p-4 pt-0 flex flex-col gap-3">
                  {rescheduleData?.id === appt.id ? (
                    <div className="w-full bg-muted p-3 rounded-md border border-border space-y-3">
                      <p className="text-xs font-semibold text-primary">Nova data e hora</p>
                      <Input
                        type="date"
                        className="h-8 text-xs"
                        min={TODAY}
                        value={rescheduleData.date}
                        onChange={e => setRescheduleData({ ...rescheduleData, date: e.target.value })}
                      />

                      {loadingRescheduleSlots ? (
                        <div className="text-xs text-muted-foreground flex items-center gap-1"><Loader2 size={12} className="animate-spin" /> Buscando...</div>
                      ) : (
                        <div className="grid grid-cols-4 gap-1.5">
                          {rescheduleSlots.map(slot => (
                            <button
                              key={slot}
                              onClick={() => setRescheduleData({ ...rescheduleData, time: slot })}
                              className={`rounded py-1.5 text-xs border ${
                                rescheduleData.time === slot
                                  ? 'bg-primary border-primary text-primary-foreground'
                                  : 'bg-muted border-border text-muted-foreground'
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
                          className="flex-1 h-8 text-xs"
                          onClick={() => setRescheduleData(null)}
                        >
                          Cancelar
                        </Button>
                        <Button
                          size="sm"
                          className="flex-1 h-8 text-xs"
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
                        className="flex-1 gap-2"
                        onClick={() => setRescheduleData({ id: appt.id, date: TODAY, time: '' })}
                      >
                        <CalendarDays size={14} /> Reagendar
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        className="flex-1 gap-2"
                        onClick={() => handleCancel(appt.id)}
                      >
                        <Trash2 size={14} /> Cancelar
                      </Button>
                    </div>
                  )}
                </CardFooter>
              </Card>
            ))}
          </TabsContent>
        </Tabs>
      </div>
    </PublicLayout>
  );
}
