import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { CalendarIcon, Trash2, Plus } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { createBlockedPeriod, deleteBlockedPeriod } from '@/api/appointments';
import type { BlockedPeriod } from '@/types';
import type { Barber } from '@/types';

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  barbers: Barber[];
  blockedPeriods: BlockedPeriod[];
  onRefresh: () => void;
}

export function BlockedPeriodManager({ open, onOpenChange, barbers, blockedPeriods, onRefresh }: Props) {
  const [barberId, setBarberId] = useState<string>('all');
  const [startDate, setStartDate] = useState<Date>();
  const [endDate, setEndDate] = useState<Date>();
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);

  const handleAdd = async () => {
    if (!startDate) { toast.error('Selecione a data inicial'); return; }
    const end = endDate || startDate;
    setSaving(true);
    try {
      await createBlockedPeriod({
        barberId: barberId === 'all' ? undefined : Number(barberId),
        startDate: format(startDate, 'yyyy-MM-dd'),
        endDate: format(end, 'yyyy-MM-dd'),
        reason: reason || undefined,
      });
      toast.success('Período bloqueado com sucesso!');
      setStartDate(undefined);
      setEndDate(undefined);
      setReason('');
      onRefresh();
    } catch (err: any) {
      toast.error(err.message || 'Erro ao bloquear período');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await deleteBlockedPeriod(id);
      toast.success('Bloqueio removido');
      onRefresh();
    } catch {
      toast.error('Erro ao remover bloqueio');
    }
  };

  const filtered = barberId === 'all'
    ? blockedPeriods
    : blockedPeriods.filter(bp => bp.barberId === Number(barberId) || !bp.barberId);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            🚫 Gerenciar Indisponibilidade
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Barber select */}
          <div className="space-y-1.5">
            <Label className="text-xs">Barbeiro</Label>
            <Select value={barberId} onValueChange={setBarberId}>
              <SelectTrigger className="h-9 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os barbeiros</SelectItem>
                {barbers.filter(b => b.isActive).map(b => (
                  <SelectItem key={b.id} value={String(b.id)}>{b.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Date pickers */}
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1.5">
              <Label className="text-xs">Data início</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className={cn("w-full justify-start text-left text-xs h-9", !startDate && "text-muted-foreground")}>
                    <CalendarIcon className="mr-1.5 h-3.5 w-3.5" />
                    {startDate ? format(startDate, 'dd/MM/yyyy') : 'Selecionar'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar mode="single" selected={startDate} onSelect={setStartDate} initialFocus className="p-3 pointer-events-auto" locale={ptBR} />
                </PopoverContent>
              </Popover>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Data fim (opcional)</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className={cn("w-full justify-start text-left text-xs h-9", !endDate && "text-muted-foreground")}>
                    <CalendarIcon className="mr-1.5 h-3.5 w-3.5" />
                    {endDate ? format(endDate, 'dd/MM/yyyy') : 'Mesma data'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar mode="single" selected={endDate} onSelect={setEndDate} initialFocus className="p-3 pointer-events-auto" locale={ptBR} disabled={d => startDate ? d < startDate : false} />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          {/* Reason */}
          <div className="space-y-1.5">
            <Label className="text-xs">Motivo (opcional)</Label>
            <Input value={reason} onChange={e => setReason(e.target.value)} placeholder="Ex: Férias, folga..." className="h-9 text-xs" />
          </div>

          <Button onClick={handleAdd} disabled={saving || !startDate} className="w-full gap-1.5 text-xs" size="sm">
            <Plus size={14} /> Bloquear período
          </Button>

          {/* Active blocks */}
          {filtered.length > 0 && (
            <div className="space-y-2 pt-2 border-t border-border/50">
              <Label className="text-xs text-muted-foreground">Bloqueios ativos</Label>
              {filtered.map(bp => (
                <div key={bp.id} className="flex items-center justify-between gap-2 p-2 rounded-md bg-red-500/5 border border-red-500/20 text-xs">
                  <div>
                    <div className="font-medium">
                      {format(parseISO(bp.startDate), 'dd/MM')}
                      {bp.startDate !== bp.endDate && ` → ${format(parseISO(bp.endDate), 'dd/MM')}`}
                    </div>
                    {bp.reason && <div className="text-muted-foreground">{bp.reason}</div>}
                    {bp.barberName && <Badge variant="outline" className="text-[9px] mt-0.5">{bp.barberName}</Badge>}
                  </div>
                  <Button size="icon" variant="ghost" className="h-7 w-7 text-red-400 hover:text-red-300" onClick={() => bp.id && handleDelete(bp.id)}>
                    <Trash2 size={13} />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
