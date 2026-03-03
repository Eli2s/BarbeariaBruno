import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { ArrowLeftRight } from 'lucide-react';
import type { Appointment } from '@/api/appointments';

interface Props {
  open: boolean;
  appointmentA: Appointment | null;
  appointmentB: Appointment | null;
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

function formatTime(dateTime: string) {
  return new Date(dateTime).toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'America/Sao_Paulo',
  });
}

export function SwapConfirmDialog({ open, appointmentA, appointmentB, loading, onConfirm, onCancel }: Props) {
  if (!appointmentA || !appointmentB) return null;

  const timeA = formatTime(appointmentA.dateTime);
  const timeB = formatTime(appointmentB.dateTime);

  return (
    <AlertDialog open={open} onOpenChange={(o) => !o && onCancel()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <ArrowLeftRight size={18} />
            Trocar horários?
          </AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-3 pt-2">
              <div className="flex items-center gap-3 text-sm">
                <div className="flex-1 p-3 rounded-lg border bg-muted/30 text-center">
                  <p className="font-semibold text-foreground">{appointmentA.clientName}</p>
                  <p className="text-muted-foreground">{timeA}</p>
                </div>
                <ArrowLeftRight size={16} className="text-muted-foreground shrink-0" />
                <div className="flex-1 p-3 rounded-lg border bg-muted/30 text-center">
                  <p className="font-semibold text-foreground">{appointmentB.clientName}</p>
                  <p className="text-muted-foreground">{timeB}</p>
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                Os clientes serão notificados via WhatsApp após a confirmação.
              </p>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={loading}>Cancelar</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm} disabled={loading}>
            {loading ? 'Trocando...' : 'Confirmar Troca'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
