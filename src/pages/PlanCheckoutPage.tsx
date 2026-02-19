import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/db/database';
import { AppLayout } from '@/components/AppLayout';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ArrowLeft, CreditCard, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';
import { format, addDays } from 'date-fns';
import { formatCurrency } from '@/lib/format';

export default function PlanCheckoutPage() {
  const { planId } = useParams();
  const navigate = useNavigate();
  const plan = useLiveQuery(() => db.plans.get(Number(planId)), [planId]);
  const client = useLiveQuery(() => plan ? db.clients.get(plan.clientId) : undefined, [plan]);

  const [step, setStep] = useState<'card' | 'done'>('card');
  const [cardNumber, setCardNumber] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCvv, setCardCvv] = useState('');
  const [cardName, setCardName] = useState('');
  const [processing, setProcessing] = useState(false);

  if (!plan || !client) return null;

  const formatCardNumber = (value: string) => {
    const digits = value.replace(/\D/g, '').slice(0, 16);
    return digits.replace(/(\d{4})/g, '$1 ').trim();
  };

  const formatExpiry = (value: string) => {
    const digits = value.replace(/\D/g, '').slice(0, 4);
    if (digits.length >= 3) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
    return digits;
  };

  const handlePay = async () => {
    if (!cardNumber || cardNumber.replace(/\s/g, '').length < 16) { toast.error('Número do cartão inválido'); return; }
    if (!cardExpiry || cardExpiry.length < 5) { toast.error('Validade inválida'); return; }
    if (!cardCvv || cardCvv.length < 3) { toast.error('CVV inválido'); return; }
    if (!cardName.trim()) { toast.error('Nome no cartão obrigatório'); return; }

    setProcessing(true);
    await new Promise(r => setTimeout(r, 2000));

    // Register payment
    await db.planPayments.add({
      planId: plan.id!,
      expectedDate: format(new Date(), 'yyyy-MM-dd'),
      paidDate: format(new Date(), 'yyyy-MM-dd'),
      status: 'pago',
      value: plan.value,
    });

    // Update next charge
    const days = plan.periodicity === 'quinzenal' ? 15 : plan.periodicity === 'mensal' ? 30 : (plan.customDays || 30);
    await db.plans.update(plan.id!, { nextCharge: format(addDays(new Date(), days), 'yyyy-MM-dd') });

    setProcessing(false);
    setStep('done');
  };

  if (step === 'done') {
    return (
      <AppLayout>
        <div className="p-4 max-w-md mx-auto flex flex-col items-center justify-center min-h-[70vh] text-center space-y-4">
          <div className="w-20 h-20 rounded-full gradient-primary flex items-center justify-center gradient-glow">
            <CheckCircle className="text-white" size={40} />
          </div>
          <h2 className="text-xl font-bold">Pagamento confirmado!</h2>
          <p className="text-sm text-muted-foreground">
            O plano <strong>{plan.name}</strong> de {client.nickname || client.name} foi ativado com sucesso.
          </p>
          <div className="gradient-subtle rounded-lg p-4 w-full">
            <p className="text-sm font-medium">{plan.name}</p>
            <p className="text-lg font-bold gradient-text">{formatCurrency(plan.value)}/{plan.periodicity === 'quinzenal' ? 'quinzena' : 'mês'}</p>
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

        <h2 className="text-xl font-bold">Checkout do Plano</h2>

        {/* Plan Summary */}
        <Card className="gradient-subtle">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <div>
                <p className="font-semibold">{plan.name}</p>
                <p className="text-xs text-muted-foreground">Cliente: {client.nickname || client.name}</p>
              </div>
              <p className="text-xl font-bold gradient-text">{formatCurrency(plan.value)}</p>
            </div>
            <p className="text-xs text-muted-foreground">{plan.description}</p>
            <p className="text-xs text-primary mt-1">
              {plan.periodicity === 'quinzenal' ? 'Quinzenal' : plan.periodicity === 'mensal' ? 'Mensal' : `A cada ${plan.customDays} dias`}
            </p>
          </CardContent>
        </Card>

        {/* Card Form */}
        <Card>
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center gap-2 mb-2">
              <CreditCard size={18} className="text-primary" />
              <h3 className="font-semibold text-sm">Dados do Cartão</h3>
            </div>
            <div className="space-y-1">
              <Label>Número do Cartão</Label>
              <Input
                value={cardNumber}
                onChange={e => setCardNumber(formatCardNumber(e.target.value))}
                placeholder="0000 0000 0000 0000"
                maxLength={19}
                inputMode="numeric"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Validade</Label>
                <Input
                  value={cardExpiry}
                  onChange={e => setCardExpiry(formatExpiry(e.target.value))}
                  placeholder="MM/AA"
                  maxLength={5}
                  inputMode="numeric"
                />
              </div>
              <div className="space-y-1">
                <Label>CVV</Label>
                <Input
                  value={cardCvv}
                  onChange={e => setCardCvv(e.target.value.replace(/\D/g, '').slice(0, 4))}
                  placeholder="123"
                  maxLength={4}
                  inputMode="numeric"
                />
              </div>
            </div>
            <div className="space-y-1">
              <Label>Nome no cartão</Label>
              <Input
                value={cardName}
                onChange={e => setCardName(e.target.value.toUpperCase())}
                placeholder="NOME COMO NO CARTÃO"
              />
            </div>
          </CardContent>
        </Card>

        <Button
          className="w-full h-12 font-semibold"
          onClick={handlePay}
          disabled={processing}
        >
          {processing ? (
            <span className="flex items-center gap-2">
              <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></span>
              Processando...
            </span>
          ) : (
            `Confirmar Pagamento — ${formatCurrency(plan.value)}`
          )}
        </Button>
      </div>
    </AppLayout>
  );
}
