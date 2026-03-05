import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, CalendarCheck, Lock } from 'lucide-react';
import { format, addDays, addWeeks, addMonths, subDays, subWeeks, subMonths, isToday } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export type ViewMode = 'dia' | 'semana' | 'mes';

interface Props {
  viewMode: ViewMode;
  setViewMode: (v: ViewMode) => void;
  currentDate: Date;
  setCurrentDate: (d: Date) => void;
  onManageBlocks: () => void;
}

export function AgendaHeader({ viewMode, setViewMode, currentDate, setCurrentDate, onManageBlocks }: Props) {
  const navigate = (dir: 'prev' | 'next') => {
    const fn = dir === 'next'
      ? viewMode === 'dia' ? addDays : viewMode === 'semana' ? addWeeks : addMonths
      : viewMode === 'dia' ? subDays : viewMode === 'semana' ? subWeeks : subMonths;
    setCurrentDate(fn(currentDate, 1));
  };

  const label = viewMode === 'dia'
    ? format(currentDate, "EEEE, dd 'de' MMMM", { locale: ptBR })
    : viewMode === 'semana'
    ? `Semana de ${format(currentDate, "dd/MM", { locale: ptBR })}`
    : format(currentDate, "MMMM 'de' yyyy", { locale: ptBR });

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2">
            <CalendarCheck size={20} className="text-primary" /> Agenda
          </h1>
          <p className="text-xs text-muted-foreground capitalize">{label}</p>
        </div>
        <Button size="sm" variant="outline" className="gap-1.5 text-xs" onClick={onManageBlocks}>
          <Lock size={13} /> Indisponibilidade
        </Button>
      </div>

      <div className="flex items-center justify-between gap-2">
        {/* View mode tabs */}
        <div className="flex bg-muted rounded-lg p-0.5 gap-0.5">
          {(['dia', 'semana', 'mes'] as ViewMode[]).map(mode => (
            <button
              key={mode}
              onClick={() => setViewMode(mode)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all capitalize ${
                viewMode === mode
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {mode}
            </button>
          ))}
        </div>

        {/* Navigation */}
        <div className="flex items-center gap-1">
          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => navigate('prev')}>
            <ChevronLeft size={15} />
          </Button>
          {!isToday(currentDate) && (
            <Button size="sm" variant="ghost" className="text-xs h-7 px-2" onClick={() => setCurrentDate(new Date())}>
              Hoje
            </Button>
          )}
          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => navigate('next')}>
            <ChevronRight size={15} />
          </Button>
        </div>
      </div>
    </div>
  );
}
