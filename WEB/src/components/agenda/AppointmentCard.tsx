import { motion } from 'framer-motion';
import { Badge } from '@/components/ui/badge';
import { User, Scissors, Clock, GripVertical } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import type { Appointment } from '@/api/appointments';

const STATUS_STYLES: Record<string, { bg: string; text: string; label: string }> = {
  pendente:   { bg: 'bg-amber-500/20 border-amber-500/40', text: 'text-amber-400', label: 'Pendente' },
  confirmado: { bg: 'bg-emerald-500/20 border-emerald-500/40', text: 'text-emerald-400', label: 'Confirmado' },
  cancelado:  { bg: 'bg-red-500/20 border-red-500/40', text: 'text-red-400', label: 'Cancelado' },
};

interface Props {
  appointment: Appointment;
  compact?: boolean;
  onClick?: () => void;
  draggable?: boolean;
  onDragStart?: (e: React.DragEvent, appointment: Appointment) => void;
  onDragEnd?: (e: React.DragEvent) => void;
}

export function AppointmentCard({ appointment, compact, onClick, draggable, onDragStart, onDragEnd }: Props) {
  const style = STATUS_STYLES[appointment.status] || STATUS_STYLES.pendente;
  const time = new Date(appointment.dateTime).toLocaleTimeString('pt-BR', {
    hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo',
  });

  const dragHandlers = draggable
    ? {
        draggable: true,
        onDragStart: (e: React.DragEvent) => {
          e.dataTransfer.effectAllowed = 'move';
          e.dataTransfer.setData('text/plain', String(appointment.id));
          onDragStart?.(e, appointment);
        },
        onDragEnd: (e: React.DragEvent) => onDragEnd?.(e),
      }
    : {};

  if (compact) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <motion.div
            whileHover={{ scale: 1.02 }}
            onClick={onClick}
            className={`px-2 py-1 rounded-md border text-xs cursor-pointer truncate ${style.bg}`}
          >
            <span className="font-medium">{time}</span>{' '}
            <span className="text-muted-foreground">{appointment.clientName}</span>
          </motion.div>
        </TooltipTrigger>
        <TooltipContent side="right" className="text-xs">
          <p className="font-semibold">{appointment.clientName}</p>
          <p>{appointment.serviceItem}</p>
          {appointment.barber && <p>Barbeiro: {appointment.barber.name}</p>}
        </TooltipContent>
      </Tooltip>
    );
  }

  return (
    <div
      {...dragHandlers}
      className={draggable ? 'cursor-grab active:cursor-grabbing' : ''}
    >
      <motion.div
        layout
        initial={{ opacity: 0, y: 4 }}
        animate={{ opacity: 1, y: 0 }}
        whileHover={{ scale: 1.01 }}
        onClick={onClick}
        className={`p-3 rounded-lg border cursor-pointer glass ${style.bg}`}
      >
        <div className="flex items-center justify-between mb-1.5">
          <div className="flex items-center gap-1.5 text-sm font-semibold">
            {draggable && <GripVertical size={14} className="text-muted-foreground" />}
            <Clock size={13} className="text-muted-foreground" />
          {time}
        </div>
        <Badge variant="outline" className={`text-[10px] border ${style.bg} ${style.text}`}>
          {style.label}
        </Badge>
      </div>
      <div className="space-y-1 text-xs">
        <div className="flex items-center gap-1.5">
          <User size={12} className="text-muted-foreground" />
          <span className="font-medium">{appointment.clientName}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Scissors size={12} className="text-muted-foreground" />
          <span>{appointment.serviceItem}</span>
        </div>
        {appointment.barber && (
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <User size={12} />
            <span>{appointment.barber.name}</span>
          </div>
        )}
      </div>
      </motion.div>
    </div>
  );
}
