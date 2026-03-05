import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Loader2, Trash2 } from 'lucide-react';
import type { Appointment } from '@/api/appointments';

interface Props {
  open: boolean;
  appointment: Appointment | null;
  loading: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function DeleteConfirmDialog({ open, appointment, loading, onConfirm, onCancel }: Props) {
  if (!appointment) return null;

  const time = new Date(appointment.dateTime).toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'America/Sao_Paulo',
  });

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onCancel()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Trash2 className="text-destructive h-5 w-5" /> Excluir Agendamento
          </DialogTitle>
          <DialogDescription className="space-y-4 pt-4">
            <p>
              Tem certeza que deseja apagar permanentemente este agendamento da agenda?{' '}
              <strong className="text-foreground">Esta ação não pode ser desfeita.</strong>
            </p>
            <div className="bg-muted p-3 rounded-md border text-sm">
              <p>
                <strong>Cliente:</strong> {appointment.clientName}
              </p>
              <p>
                <strong>Horário:</strong> {time}
              </p>
              <p>
                <strong>Serviço:</strong> {appointment.serviceItem}
              </p>
            </div>
            {appointment.status !== 'finalizado' && (
              <p className="text-xs text-muted-foreground">
                Um WhatsApp será enviado para avisar o cliente da remoção.
              </p>
            )}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="gap-2 sm:gap-0 mt-2">
          <Button variant="outline" onClick={onCancel} disabled={loading}>
            Cancelar
          </Button>
          <Button variant="destructive" onClick={onConfirm} disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Excluindo...
              </>
            ) : (
              'Sim, excluir'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
