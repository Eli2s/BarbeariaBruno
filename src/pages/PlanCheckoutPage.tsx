import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { usePlan, useUpdatePlan } from '@/hooks/usePlans';
import { useClient } from '@/hooks/useClients';
import { useCreatePlanPayment } from '@/hooks/usePlanPayments';
import { AppLayout } from '@/components/AppLayout';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ArrowLeft, CheckCircle, Banknote, CreditCard, QrCode } from 'lucide-react';
import { toast } from 'sonner';
import { format, addDays } from 'date-fns';
import { formatCurrency } from '@/lib/format';
import { sendPaymentConfirmation } from '@/lib/whatsappApi';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const PAYMENT_METHODS = [
  { value: 'pix', label: 'Pix', icon: QrCode },
  { value: 'dinheiro', label: 'Dinheiro', icon: Banknote },
  { value: 'debito', label: 'Débito', icon: CreditCard },
  { value: 'credito', label: 'Crédito', icon: CreditCard },
];

export default function PlanCheckoutPage() {
  const { planId } = useParams();
  const navigate = useNavigate();
  const { data: plan } = usePlan(planId ? Number(planId) : undefined);
  const { data: client } = useClient(plan?.clientId);
  const createPlanPayment = useCreatePlanPayment();
  const updatePlan = useUpdatePlan();

  const [step, setStep] = useState<'form' | 'done'>('form');
  const [paymentMethod, setPaymentMethod] = useState('pix');
  const [processing, setProcessing] = useState(false);

  if (!plan || !client) return null;

  const days = plan.periodicity === 'quinzenal' ? 15 : plan.periodicity === 'mensal' ? 30 : (plan.customDays || 30);

  const handleConfirm = async () => {
    setProcessing(true);
    const today = format(new Date(), 'yyyy-MM-dd');
    const nextCharge = format(addDays(new Date(), days), 'yyyy-MM-dd');

    try {
      await createPlanPayment.mutateAsync({
        planId: plan.id!,
        expectedDate: today,
        paidDate: today,
        status: 'pago',
        value: plan.value,
      });
      await updatePlan.mutateAsync({ id: plan.id!, nextCharge, status: 'ativo' });

      setStep('done');

      if (client?.whatsapp) {
        sendPaymentConfirmation(client, { ...plan, nextCharge })
          .then(result => {
            if (result.success) {
              toast.success('Confirmação enviada via WhatsApp!');
            }
          })
          .catch(() => {});
      }
    } catch {
      toast.error('Erro ao registrar pagamento');
    } finally {
      setProcessing(false);
    }
  };

  if (step === 'done') {
    return (
      <AppLayout>
        <div className="p-4 max-w-md mx-auto flex flex-col items-center justify-center min-h-[70vh] text-center space-y-4">
          <div className="w-20 h-20 rounded-full gradient-primary flex items-center justify-center gradient-glow">
            <CheckCircle className="text-white" size={40} />
          </div>
          <h2 className="text-xl font-bold">Pagamento registrado!</h2>
          <p className="text-sm text-muted-foreground">
            O pagamento do plano <strong>{plan.name}</strong> de{' '}
            <strong>{client.nickname || client.name}</strong> foi confirmado.
          </p>
          <div className="gradient-subtle rounded-lg p-4 w-full text-left">
            <p className="text-xs text-muted-foreground">Próxima cobrança</p>
            <p className="text-sm font-semibold">
              em {days} dias — {formatCurrency(plan.value)}
            </p>
          </div>
          <Button onClick={() => navigate(`/clientes/${plan.clientId}`)} className="gap-1">
            Ver Perfil do Cliente
          </Button>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="p-4 max-w-md mx-auto space-y-4">
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="gap-1">
          <ArrowLeft size={14} /> Voltar
        </Button>

        <h2 className="text-xl font-bold">Registrar Pagamento</h2>
        <p className="text-xs text-muted-foreground">
          Use esta tela para registrar pagamentos recebidos presencialmente. Para assinaturas online, use o link de checkout do Stripe.
        </p>

        {/* Plan Summary */}
        <Card className="gradient-subtle">
          <CardContent className="p-4 space-y-1">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-semibold">{plan.name}</p>
                <p className="text-xs text-muted-foreground">
                  {client.nickname || client.name}
                </p>
              </div>
              <p className="text-xl font-bold gradient-text">{formatCurrency(plan.value)}</p>
            </div>
            <p className="text-xs text-muted-foreground">{plan.description}</p>
            <p className="text-xs text-primary">
              {plan.periodicity === 'quinzenal'
                ? 'Quinzenal (15 dias)'
                : plan.periodicity === 'mensal'
                ? 'Mensal (30 dias)'
                : `A cada ${plan.customDays} dias`}
            </p>
          </CardContent>
        </Card>

        {/* Payment Method */}
        <Card>
          <CardContent className="p-4 space-y-3">
            <Label>Forma de pagamento recebida</Label>
            <Select value={paymentMethod} onValueChange={setPaymentMethod}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PAYMENT_METHODS.map(m => (
                  <SelectItem key={m.value} value={m.value}>
                    {m.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        <Button
          className="w-full h-12 font-semibold"
          onClick={handleConfirm}
          disabled={processing}
        >
          {processing ? (
            <span className="flex items-center gap-2">
              <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
              Registrando...
            </span>
          ) : (
            `Confirmar Recebimento — ${formatCurrency(plan.value)}`
          )}
        </Button>
      </div>
    </AppLayout>
  );
}
