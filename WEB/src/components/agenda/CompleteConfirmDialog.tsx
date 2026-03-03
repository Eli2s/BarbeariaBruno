import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import type { Appointment } from '@/api/appointments';

interface Props {
  open: boolean;
  appointment: Appointment | null;
  loading: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function CompleteConfirmDialog({ open, appointment, loading, onConfirm, onCancel }: Props) {
  if (!appointment) return null;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onCancel()}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Finalizar Atendimento</DialogTitle>
          <DialogDescription>
            Deseja marcar o atendimento de <strong>{appointment.clientName}</strong> ({appointment.serviceItem}) como finalizado?
          </DialogDescription>
        </DialogHeader>
        <div className="py-4">
          <p className="text-sm text-muted-foreground">
            Isto mudará o status no sistema e enviará uma mensagem de agradecimento no WhatsApp do cliente.
          </p>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onCancel} disabled={loading}>
            Cancelar
          </Button>
          <Button onClick={onConfirm} disabled={loading} className="bg-primary text-primary-foreground hover:bg-primary/90">
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Finalizando...
              </>
            ) : (
              'Sim, Finalizar'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
