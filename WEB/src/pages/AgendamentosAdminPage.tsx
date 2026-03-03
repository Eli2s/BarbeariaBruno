import { useState, useEffect, useCallback } from 'react';
import { AnimatePresence } from 'framer-motion';
import { AppLayout } from '@/components/AppLayout';
import { Calendar } from '@/components/ui/calendar';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { ptBR } from 'date-fns/locale';
import { fetchAppointments, fetchBlockedPeriods, swapAppointments, type Appointment } from '@/api/appointments';
import { useBarbers } from '@/hooks/useBarbers';
import { AgendaHeader, type ViewMode } from '@/components/agenda/AgendaHeader';
import { AgendaDayView } from '@/components/agenda/AgendaDayView';
import { AgendaWeekView } from '@/components/agenda/AgendaWeekView';
import { AgendaMonthView } from '@/components/agenda/AgendaMonthView';
import { BlockedPeriodManager } from '@/components/agenda/BlockedPeriodManager';
import { SwapConfirmDialog } from '@/components/agenda/SwapConfirmDialog';
import { sendWhatsAppMessage } from '@/lib/whatsappApi';
import type { BlockedPeriod } from '@/types';

export default function AgendamentosAdminPage() {
  const [viewMode, setViewMode] = useState<ViewMode>('dia');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [blockedPeriods, setBlockedPeriods] = useState<BlockedPeriod[]>([]);
  const [loading, setLoading] = useState(true);
  const [showBlockManager, setShowBlockManager] = useState(false);

  // Swap state
  const [swapA, setSwapA] = useState<Appointment | null>(null);
  const [swapB, setSwapB] = useState<Appointment | null>(null);
  const [swapLoading, setSwapLoading] = useState(false);

  const { data: barbers = [] } = useBarbers();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const appts = await fetchAppointments();
      setAppointments(appts);
    } catch {
      toast.error('Erro ao carregar agendamentos.');
    }
    try {
      const blocks = await fetchBlockedPeriods();
      setBlockedPeriods(blocks);
    } catch {
      setBlockedPeriods([]);
    }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleDayClick = (d: Date) => {
    setCurrentDate(d);
    setViewMode('dia');
  };

  const handleSwapRequest = useCallback((a: Appointment, b: Appointment) => {
    setSwapA(a);
    setSwapB(b);
  }, []);

  const handleSwapConfirm = useCallback(async () => {
    if (!swapA || !swapB) return;
    setSwapLoading(true);
    try {
      await swapAppointments(swapA.id, swapB.id);

      // Format new times for WhatsApp messages
      const timeA = new Date(swapA.dateTime).toLocaleTimeString('pt-BR', {
        hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo',
      });
      const timeB = new Date(swapB.dateTime).toLocaleTimeString('pt-BR', {
        hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo',
      });

      // Send WhatsApp notifications (swapA now has swapB's time and vice-versa)
      await Promise.allSettled([
        sendWhatsAppMessage(
          swapA.clientPhone,
          `Olá ${swapA.clientName}, seu agendamento foi alterado para ${timeB}. Qualquer dúvida, entre em contato.`
        ),
        sendWhatsAppMessage(
          swapB.clientPhone,
          `Olá ${swapB.clientName}, seu agendamento foi alterado para ${timeA}. Qualquer dúvida, entre em contato.`
        ),
      ]);

      toast.success('Horários trocados com sucesso!');
      await load();
    } catch {
      toast.error('Erro ao trocar horários.');
    } finally {
      setSwapLoading(false);
      setSwapA(null);
      setSwapB(null);
    }
  }, [swapA, swapB, load]);

  const handleSwapCancel = useCallback(() => {
    setSwapA(null);
    setSwapB(null);
  }, []);

  return (
    <AppLayout>
      <div className="p-4 max-w-6xl mx-auto space-y-4">
        <AgendaHeader
          viewMode={viewMode}
          setViewMode={setViewMode}
          currentDate={currentDate}
          setCurrentDate={setCurrentDate}
          onManageBlocks={() => setShowBlockManager(true)}
        />

        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 size={28} className="animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="flex gap-4">
            <div className="flex-1 min-w-0">
              <AnimatePresence mode="wait">
                {viewMode === 'dia' && (
                  <AgendaDayView
                    key="day"
                    date={currentDate}
                    appointments={appointments}
                    blockedPeriods={blockedPeriods}
                    onSwapRequest={handleSwapRequest}
                  />
                )}
                {viewMode === 'semana' && (
                  <AgendaWeekView
                    key="week"
                    date={currentDate}
                    appointments={appointments}
                    blockedPeriods={blockedPeriods}
                    onDayClick={handleDayClick}
                  />
                )}
                {viewMode === 'mes' && (
                  <AgendaMonthView
                    key="month"
                    date={currentDate}
                    appointments={appointments}
                    blockedPeriods={blockedPeriods}
                    onDayClick={handleDayClick}
                  />
                )}
              </AnimatePresence>
            </div>

            <div className="hidden lg:block shrink-0">
              <div className="glass rounded-lg p-2 sticky top-4">
                <Calendar
                  mode="single"
                  selected={currentDate}
                  onSelect={d => d && setCurrentDate(d)}
                  locale={ptBR}
                  className="p-2 pointer-events-auto"
                />
              </div>
            </div>
          </div>
        )}

        <BlockedPeriodManager
          open={showBlockManager}
          onOpenChange={setShowBlockManager}
          barbers={barbers}
          blockedPeriods={blockedPeriods}
          onRefresh={load}
        />

        <SwapConfirmDialog
          open={!!(swapA && swapB)}
          appointmentA={swapA}
          appointmentB={swapB}
          loading={swapLoading}
          onConfirm={handleSwapConfirm}
          onCancel={handleSwapCancel}
        />
      </div>
    </AppLayout>
  );
}
