import { useState, useEffect, useCallback } from 'react';
import { AppLayout } from '@/components/AppLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, CalendarCheck, Check, X, RefreshCw, User, Phone, Scissors, Clock } from 'lucide-react';
import { toast } from 'sonner';
import { fetchAppointments, updateAppointmentStatus, type Appointment } from '@/api/appointments';

const STATUS_COLORS: Record<string, string> = {
  pendente:   'bg-amber-500/20 text-amber-400 border-amber-500/30',
  confirmado: 'bg-green-500/20 text-green-400 border-green-500/30',
  cancelado:  'bg-red-500/20 text-red-400 border-red-500/30',
};

const STATUS_LABELS: Record<string, string> = {
  pendente:   'Pendente',
  confirmado: 'Confirmado',
  cancelado:  'Cancelado',
};

function formatDateTime(dt: string): string {
  return new Intl.DateTimeFormat('pt-BR', {
    day:    '2-digit',
    month:  '2-digit',
    year:   'numeric',
    hour:   '2-digit',
    minute: '2-digit',
    timeZone: 'America/Sao_Paulo',
  }).format(new Date(dt));
}

export default function AgendamentosAdminPage() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading]           = useState(true);
  const [filter, setFilter]             = useState('confirmado');
  const [updating, setUpdating]         = useState<number | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchAppointments(filter !== 'todos' ? filter : undefined);
      setAppointments(data);
    } catch {
      toast.error('Erro ao carregar agendamentos.');
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => { load(); }, [load]);

  const handleStatus = async (id: number, status: 'confirmado' | 'cancelado') => {
    setUpdating(id);
    try {
      await updateAppointmentStatus(id, status);
      toast.success(status === 'confirmado' ? 'Agendamento confirmado! ✅' : 'Agendamento cancelado.');
      setAppointments(prev => prev.map(a => a.id === id ? { ...a, status } : a));
    } catch (err: any) {
      toast.error(err.message || 'Erro ao atualizar agendamento.');
    } finally {
      setUpdating(null);
    }
  };

  return (
    <AppLayout>
      <div className="p-4 max-w-3xl mx-auto space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <h1 className="text-xl font-bold flex items-center gap-2">
              <CalendarCheck size={20} className="text-primary" /> Agendamentos
            </h1>
            <p className="text-xs text-muted-foreground">Gerencie os pedidos de horário dos clientes</p>
          </div>
          <div className="flex items-center gap-2">
            <Select value={filter} onValueChange={setFilter}>
              <SelectTrigger className="w-36 text-xs h-8">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pendente">Pendentes</SelectItem>
                <SelectItem value="confirmado">Confirmados</SelectItem>
                <SelectItem value="cancelado">Cancelados</SelectItem>
                <SelectItem value="todos">Todos</SelectItem>
              </SelectContent>
            </Select>
            <Button size="icon" variant="outline" className="h-8 w-8" onClick={load} disabled={loading}>
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            </Button>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 size={28} className="animate-spin text-muted-foreground" />
          </div>
        ) : appointments.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <CalendarCheck size={40} className="mx-auto text-muted-foreground mb-3" />
              <p className="text-sm text-muted-foreground">
                Nenhum agendamento {filter !== 'todos' ? STATUS_LABELS[filter]?.toLowerCase() : ''} encontrado.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {appointments.map(appt => (
              <Card key={appt.id} className="overflow-hidden">
                <CardHeader className="py-3 px-4 bg-secondary/20">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Clock size={14} className="text-muted-foreground shrink-0" />
                      <CardTitle className="text-sm font-semibold">
                        {formatDateTime(appt.dateTime)}
                      </CardTitle>
                    </div>
                    <Badge className={`text-[10px] border ${STATUS_COLORS[appt.status] || ''}`} variant="outline">
                      {STATUS_LABELS[appt.status] || appt.status}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="p-4 space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <User size={13} /> <span className="text-foreground font-medium">{appt.clientName}</span>
                    </div>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Phone size={13} /> <span className="text-foreground">{appt.clientPhone}</span>
                    </div>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Scissors size={13} /> <span className="text-foreground">{appt.serviceItem}</span>
                    </div>
                    {appt.barber && (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <User size={13} /> <span className="text-foreground">{appt.barber.name}</span>
                      </div>
                    )}
                  </div>
                  {appt.notes && (
                    <p className="text-xs text-muted-foreground bg-secondary/30 rounded-md p-2">
                      📝 {appt.notes}
                    </p>
                  )}

                  {appt.status === 'pendente' && (
                    <div className="flex gap-2 pt-1">
                      <Button
                        size="sm"
                        className="flex-1 gap-1.5 bg-green-600 hover:bg-green-700 text-white"
                        disabled={updating === appt.id}
                        onClick={() => handleStatus(appt.id, 'confirmado')}
                      >
                        {updating === appt.id ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                        Confirmar
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        className="flex-1 gap-1.5"
                        disabled={updating === appt.id}
                        onClick={() => handleStatus(appt.id, 'cancelado')}
                      >
                        {updating === appt.id ? <Loader2 size={14} className="animate-spin" /> : <X size={14} />}
                        Recusar
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
