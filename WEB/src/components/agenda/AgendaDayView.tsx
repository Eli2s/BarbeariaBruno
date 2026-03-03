import { useMemo, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { isSameDay, parseISO, isWithinInterval } from 'date-fns';
import { AppointmentCard } from './AppointmentCard';
import type { Appointment } from '@/api/appointments';
import type { BlockedPeriod } from '@/types';

const HOURS = Array.from({ length: 28 }, (_, i) => {
  const h = Math.floor(i / 2) + 7;
  const m = i % 2 === 0 ? '00' : '30';
  return `${String(h).padStart(2, '0')}:${m}`;
}).filter((_, i) => i < 26); // 07:00 - 19:30

interface Props {
  date: Date;
  appointments: Appointment[];
  blockedPeriods: BlockedPeriod[];
  onSwapRequest?: (appointmentA: Appointment, appointmentB: Appointment) => void;
}

export function AgendaDayView({ date, appointments, blockedPeriods, onSwapRequest }: Props) {
  const [dragOverSlot, setDragOverSlot] = useState<string | null>(null);
  const [draggedId, setDraggedId] = useState<number | null>(null);

  const dayAppointments = useMemo(() =>
    appointments.filter(a => {
      try { return isSameDay(parseISO(a.dateTime), date); } catch { return false; }
    }), [appointments, date]);

  const isBlocked = useMemo(() =>
    blockedPeriods.some(bp => {
      const start = parseISO(bp.startDate);
      const end = parseISO(bp.endDate);
      return isWithinInterval(date, { start, end });
    }), [date, blockedPeriods]);

  const getAppointmentsForSlot = useCallback((slot: string) => {
    return dayAppointments.filter(a => {
      const time = new Date(a.dateTime).toLocaleTimeString('pt-BR', {
        hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo',
      });
      return time === slot;
    });
  }, [dayAppointments]);

  const handleDragStart = useCallback((_e: React.DragEvent, appointment: Appointment) => {
    setDraggedId(appointment.id);
  }, []);

  const handleDragEnd = useCallback(() => {
    setDraggedId(null);
    setDragOverSlot(null);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent, slot: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverSlot(slot);
  }, []);

  const handleDragLeave = useCallback(() => {
    setDragOverSlot(null);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent, slot: string) => {
    e.preventDefault();
    setDragOverSlot(null);

    const draggedIdStr = e.dataTransfer.getData('text/plain');
    if (!draggedIdStr) return;

    const sourceId = Number(draggedIdStr);
    const targetAppts = getAppointmentsForSlot(slot);

    if (targetAppts.length === 0) return; // only swap, no move to empty

    const targetAppt = targetAppts[0];
    if (targetAppt.id === sourceId) return; // dropped on self

    const sourceAppt = dayAppointments.find(a => a.id === sourceId);
    if (!sourceAppt) return;

    onSwapRequest?.(sourceAppt, targetAppt);
    setDraggedId(null);
  }, [dayAppointments, getAppointmentsForSlot, onSwapRequest]);

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      className="relative"
    >
      {isBlocked && (
        <div className="mb-3 p-2.5 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-xs flex items-center gap-2">
          🚫 Este dia está marcado como indisponível
        </div>
      )}

      <div className="space-y-0 border border-border/50 rounded-lg overflow-hidden">
        {HOURS.map((slot, i) => {
          const slotAppts = getAppointmentsForSlot(slot);
          const isDragOver = dragOverSlot === slot && slotAppts.length > 0;
          const hasTarget = slotAppts.length > 0 && slotAppts[0].id !== draggedId;
          return (
            <div
              key={slot}
              onDragOver={(e) => hasTarget ? handleDragOver(e, slot) : e.preventDefault()}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, slot)}
              className={`flex min-h-[48px] border-b border-border/30 last:border-0 transition-colors ${
                isDragOver
                  ? 'bg-primary/10 ring-1 ring-primary/30'
                  : isBlocked
                    ? 'bg-red-500/5'
                    : i % 2 === 0
                      ? 'bg-background'
                      : 'bg-muted/20'
              }`}
            >
              <div className="w-16 shrink-0 py-2 px-2 text-[11px] text-muted-foreground font-mono border-r border-border/30 flex items-start justify-end">
                {slot}
              </div>
              <div className="flex-1 p-1 space-y-1">
                {slotAppts.map(a => (
                  <AppointmentCard
                    key={a.id}
                    appointment={a}
                    draggable={a.status !== 'cancelado'}
                    onDragStart={handleDragStart}
                    onDragEnd={handleDragEnd}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </motion.div>
  );
}
