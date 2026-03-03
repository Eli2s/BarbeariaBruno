import { useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  format, startOfMonth, endOfMonth, startOfWeek, endOfWeek,
  addDays, isSameDay, isSameMonth, parseISO, isToday, isWithinInterval,
} from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { Appointment } from '@/api/appointments';
import type { BlockedPeriod } from '@/types';

interface Props {
  date: Date;
  appointments: Appointment[];
  blockedPeriods: BlockedPeriod[];
  onDayClick: (d: Date) => void;
}

export function AgendaMonthView({ date, appointments, blockedPeriods, onDayClick }: Props) {
  const monthStart = startOfMonth(date);
  const monthEnd = endOfMonth(date);
  const calStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const calEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });

  const days: Date[] = [];
  let cur = calStart;
  while (cur <= calEnd) {
    days.push(cur);
    cur = addDays(cur, 1);
  }

  const countByDay = useMemo(() => {
    const map = new Map<string, { total: number; pendente: number; confirmado: number }>();
    appointments.forEach(a => {
      try {
        const key = format(parseISO(a.dateTime), 'yyyy-MM-dd');
        const entry = map.get(key) || { total: 0, pendente: 0, confirmado: 0 };
        entry.total++;
        if (a.status === 'pendente') entry.pendente++;
        if (a.status === 'confirmado') entry.confirmado++;
        map.set(key, entry);
      } catch {}
    });
    return map;
  }, [appointments]);

  const isDayBlocked = (d: Date) =>
    blockedPeriods.some(bp => isWithinInterval(d, { start: parseISO(bp.startDate), end: parseISO(bp.endDate) }));

  const weekDays = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.98 }}
    >
      {/* Header */}
      <div className="grid grid-cols-7 mb-1">
        {weekDays.map(d => (
          <div key={d} className="text-center text-[10px] font-medium text-muted-foreground py-1 uppercase">{d}</div>
        ))}
      </div>

      {/* Grid */}
      <div className="grid grid-cols-7 gap-px bg-border/30 rounded-lg overflow-hidden">
        {days.map(day => {
          const key = format(day, 'yyyy-MM-dd');
          const counts = countByDay.get(key);
          const blocked = isDayBlocked(day);
          const inMonth = isSameMonth(day, date);
          const today = isToday(day);

          return (
            <div
              key={key}
              onClick={() => onDayClick(day)}
              className={`min-h-[70px] p-1.5 cursor-pointer transition-all hover:bg-primary/5 ${
                inMonth ? 'bg-background' : 'bg-muted/30'
              } ${blocked ? 'bg-red-500/5' : ''} ${today ? 'ring-1 ring-primary/50 ring-inset' : ''}`}
            >
              <div className={`text-xs mb-1 ${
                today ? 'text-primary font-bold' : inMonth ? 'text-foreground' : 'text-muted-foreground/50'
              }`}>
                {format(day, 'd')}
              </div>

              {blocked && <div className="text-[9px] text-red-400">🚫</div>}

              {counts && (
                <div className="flex gap-0.5 flex-wrap">
                  {counts.confirmado > 0 && (
                    <div className="w-4 h-1 rounded-full bg-emerald-500/70" title={`${counts.confirmado} confirmados`} />
                  )}
                  {counts.pendente > 0 && (
                    <div className="w-4 h-1 rounded-full bg-amber-500/70" title={`${counts.pendente} pendentes`} />
                  )}
                  <span className="text-[9px] text-muted-foreground ml-auto">{counts.total}</span>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </motion.div>
  );
}
