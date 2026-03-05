import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { format, startOfWeek, addDays, isSameDay, parseISO, isToday, isWithinInterval } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { AppointmentCard } from './AppointmentCard';
import type { Appointment } from '@/api/appointments';
import type { BlockedPeriod } from '@/types';

interface Props {
  date: Date;
  appointments: Appointment[];
  blockedPeriods: BlockedPeriod[];
  onDayClick: (d: Date) => void;
  onDeleteRequest?: (appointment: Appointment) => void;
}

export function AgendaWeekView({ date, appointments, blockedPeriods, onDayClick, onDeleteRequest }: Props) {
  const weekStart = startOfWeek(date, { weekStartsOn: 1 });
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  const appointmentsByDay = useMemo(() => {
    const map = new Map<string, Appointment[]>();
    days.forEach(d => {
      const key = format(d, 'yyyy-MM-dd');
      map.set(key, appointments.filter(a => {
        try { return isSameDay(parseISO(a.dateTime), d); } catch { return false; }
      }));
    });
    return map;
  }, [appointments, days]);

  const isDayBlocked = (d: Date) =>
    blockedPeriods.some(bp => {
      const start = parseISO(bp.startDate);
      const end = parseISO(bp.endDate);
      return isWithinInterval(d, { start, end });
    });

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      className="grid grid-cols-7 gap-1 overflow-x-auto"
    >
      {days.map(day => {
        const key = format(day, 'yyyy-MM-dd');
        const dayAppts = appointmentsByDay.get(key) || [];
        const blocked = isDayBlocked(day);
        const today = isToday(day);

        return (
          <div
            key={key}
            onClick={() => onDayClick(day)}
            className={`min-h-[200px] rounded-lg border p-2 cursor-pointer transition-all hover:border-primary/50 ${
              today ? 'border-primary/60 bg-primary/5' : 'border-border/50'
            } ${blocked ? 'bg-red-500/5 border-red-500/30' : ''}`}
          >
            <div className={`text-center mb-2 ${today ? 'text-primary font-bold' : ''}`}>
              <div className="text-[10px] text-muted-foreground uppercase">
                {format(day, 'EEE', { locale: ptBR })}
              </div>
              <div className={`text-sm font-semibold ${
                today ? 'bg-primary text-primary-foreground w-7 h-7 rounded-full flex items-center justify-center mx-auto' : ''
              }`}>
                {format(day, 'd')}
              </div>
            </div>

            {blocked && (
              <div className="text-[10px] text-red-400 text-center mb-1">🚫 Indisponível</div>
            )}

            <div className="space-y-1">
              {dayAppts.slice(0, 5).map(appt => (
                <AppointmentCard
                  key={appt.id}
                  appointment={appt}
                  compact
                  onDelete={onDeleteRequest}
                />
              ))}
              {dayAppts.length > 5 && (
                <div className="text-[10px] text-muted-foreground text-center">
                  +{dayAppts.length - 5} mais
                </div>
              )}
            </div>
          </div>
        );
      })}
    </motion.div>
  );
}
