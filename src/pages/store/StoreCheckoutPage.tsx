import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/db/database';
import { PublicLayout } from '@/components/PublicLayout';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ArrowLeft, CreditCard, Smartphone, QrCode, Package, CheckCircle, Send } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { openWhatsApp } from '@/lib/whatsapp';

type PaymentMethod = 'cartao' | 'pix' | 'link_whatsapp';

export default function StoreCheckoutPage() {
  const { productId } = useParams();
  const navigate = useNavigate();
  const product = useLiveQuery(() => db.products.get(Number(productId)), [productId]);

  const [step, setStep] = useState<'info' | 'payment' | 'done'>('info');
  const [name, setName] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cartao');

  // Card fields
  const [cardNumber, setCardNumber] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCvv, setCardCvv] = useState('');
  const [cardName, setCardName] = useState('');

  const [processing, setProcessing] = useState(false);

  if (!product) return null;
  const total = product.price * quantity;

  const handleInfoNext = () => {
    if (!name.trim()) { toast.error('Informe seu nome'); return; }
    if (!whatsapp.trim() || whatsapp.length < 10) { toast.error('Informe um WhatsApp válido'); return; }
    setStep('payment');
  };

  const handlePay = async () => {
    if (paymentMethod === 'cartao') {
      if (!cardNumber || cardNumber.replace(/\s/g, '').length < 16) { toast.error('Número do cartão inválido'); return; }
      if (!cardExpiry || cardExpiry.length < 5) { toast.error('Validade inválida'); return; }
      if (!cardCvv || cardCvv.length < 3) { toast.error('CVV inválido'); return; }
      if (!cardName.trim()) { toast.error('Nome no cartão obrigatório'); return; }
    }

    setProcessing(true);

    // Simulate processing
    await new Promise(r => setTimeout(r, 2000));

    const createdAt = format(new Date(), "yyyy-MM-dd'T'HH:mm");
    const orderId = await db.orders.add({
      items: [{ productId: product.id!, name: product.name, quantity, unitPrice: product.price }],
      totalValue: total,
      customerName: name,
      customerWhatsapp: whatsapp,
      paymentMethod,
      status: paymentMethod === 'link_whatsapp' ? 'pendente' : 'pago',
      createdAt,
    });

    // Decrease stock
    await db.products.update(product.id!, { stock: Math.max(0, product.stock - quantity) });

    // Send receipt via WhatsApp
    const statusLabel = paymentMethod === 'link_whatsapp' ? '⏳ Aguardando pagamento' : '✅ Pago';
    const paymentLabel = paymentMethod === 'cartao' ? 'Cartão de Crédito' : paymentMethod === 'pix' ? 'Pix' : 'Link WhatsApp';
    const dateFormatted = format(new Date(), 'dd/MM/yyyy HH:mm');

    const receipt = `🧾 *COMPROVANTE DE COMPRA*\n` +
      `━━━━━━━━━━━━━━━━━━━━\n` +
      `💈 *Bruno Barbearia*\n\n` +
      `📦 Produto: ${product.name}\n` +
      `🔢 Quantidade: ${quantity}\n` +
      `💰 Valor: R$ ${total.toFixed(2).replace('.', ',')}\n` +
      `💳 Pagamento: ${paymentLabel}\n` +
      `📅 Data: ${dateFormatted}\n` +
      `🆔 Pedido: #${orderId}\n` +
      `📌 Status: ${statusLabel}\n` +
      `━━━━━━━━━━━━━━━━━━━━\n` +
      (paymentMethod === 'link_whatsapp'
        ? `\n🔗 Finalize o pagamento pelo link:\n[Link de pagamento simulado]\n`
        : `\nObrigado pela compra! 🙏\n`) +
      `Qualquer dúvida, estamos à disposição! ✂️`;

    openWhatsApp(whatsapp, receipt);

    setProcessing(false);
    setStep('done');
  };

  const formatCardNumber = (value: string) => {
    const digits = value.replace(/\D/g, '').slice(0, 16);
    return digits.replace(/(\d{4})/g, '$1 ').trim();
  };

  const formatExpiry = (value: string) => {
    const digits = value.replace(/\D/g, '').slice(0, 4);
    if (digits.length >= 3) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
    return digits;
  };

  if (step === 'done') {
    return (
      <PublicLayout>
        <div className="p-4 max-w-md mx-auto flex flex-col items-center justify-center min-h-[60vh] text-center space-y-4">
          <div className="w-20 h-20 rounded-full gradient-primary flex items-center justify-center gradient-glow">
            <CheckCircle className="text-white" size={40} />
          </div>
          <h2 className="text-xl font-bold">
            {paymentMethod === 'link_whatsapp' ? 'Pedido criado!' : 'Pagamento confirmado!'}
          </h2>
          <p className="text-sm text-muted-foreground">
            {paymentMethod === 'link_whatsapp'
              ? 'O link de pagamento foi enviado para seu WhatsApp.'
              : 'Seu pedido foi realizado com sucesso. Obrigado pela compra!'}
          </p>
          <div className="gradient-subtle rounded-lg p-4 w-full">
            <p className="text-sm"><strong>{quantity}x</strong> {product.name}</p>
            <p className="text-lg font-bold gradient-text">R$ {total.toFixed(2).replace('.', ',')}</p>
          </div>
          <Button variant="outline" onClick={() => navigate('/loja')} className="gap-1">
            <ArrowLeft size={14} /> Voltar à Loja
          </Button>
        </div>
      </PublicLayout>
    );
  }

  return (
    <PublicLayout>
      <div className="p-4 max-w-md mx-auto space-y-4 py-6">
        <Button variant="ghost" size="sm" onClick={() => step === 'payment' ? setStep('info') : navigate(-1)} className="gap-1">
          <ArrowLeft size={14} /> Voltar
        </Button>

        {/* Product Summary */}
        <Card>
          <CardContent className="p-4 flex gap-3">
            <div className="w-16 h-16 rounded-lg gradient-subtle flex items-center justify-center shrink-0">
              {product.image ? (
                <img src={product.image} alt={product.name} className="w-16 h-16 rounded-lg object-cover" />
              ) : (
                <Package size={24} className="text-muted-foreground/40" />
              )}
            </div>
            <div className="flex-1">
              <p className="font-semibold">{product.name}</p>
              <p className="text-sm text-muted-foreground">{product.category}</p>
              <div className="flex items-center gap-2 mt-1">
                <p className="text-lg font-bold gradient-text">
                  R$ {total.toFixed(2).replace('.', ',')}
                </p>
                {quantity > 1 && <span className="text-xs text-muted-foreground">({quantity}x R$ {product.price.toFixed(2).replace('.', ',')})</span>}
              </div>
            </div>
          </CardContent>
        </Card>

        {step === 'info' && (
          <div className="space-y-4">
            <h3 className="font-semibold">Seus Dados</h3>
            <div className="space-y-3">
              <div className="space-y-1">
                <Label>Nome completo *</Label>
                <Input value={name} onChange={e => setName(e.target.value)} placeholder="Seu nome" />
              </div>
              <div className="space-y-1">
                <Label>WhatsApp *</Label>
                <Input
                  value={whatsapp}
                  onChange={e => setWhatsapp(e.target.value.replace(/\D/g, '').slice(0, 11))}
                  placeholder="11999887766"
                  inputMode="numeric"
                />
              </div>
              <div className="space-y-1">
                <Label>Quantidade</Label>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="icon" className="h-9 w-9" onClick={() => setQuantity(Math.max(1, quantity - 1))}>-</Button>
                  <span className="text-lg font-semibold w-8 text-center">{quantity}</span>
                  <Button variant="outline" size="icon" className="h-9 w-9" onClick={() => setQuantity(Math.min(product.stock, quantity + 1))}>+</Button>
                  <span className="text-xs text-muted-foreground">({product.stock} em estoque)</span>
                </div>
              </div>
            </div>
            <Button className="w-full h-12 font-semibold" onClick={handleInfoNext}>
              Continuar para Pagamento
            </Button>
          </div>
        )}

        {step === 'payment' && (
          <div className="space-y-4">
            <h3 className="font-semibold">Método de Pagamento</h3>

            {/* Payment tabs */}
            <div className="grid grid-cols-3 gap-2">
              {([
                { key: 'cartao' as const, label: 'Cartão', icon: CreditCard },
                { key: 'pix' as const, label: 'Pix', icon: QrCode },
                { key: 'link_whatsapp' as const, label: 'Link WhatsApp', icon: Smartphone },
              ]).map(m => (
                <button
                  key={m.key}
                  onClick={() => setPaymentMethod(m.key)}
                  className={`p-3 rounded-lg border text-center transition-all text-xs font-medium flex flex-col items-center gap-1.5 ${
                    paymentMethod === m.key
                      ? 'border-primary gradient-subtle shadow-sm'
                      : 'border-border hover:border-primary/30'
                  }`}
                >
                  <m.icon size={18} className={paymentMethod === m.key ? 'text-primary' : 'text-muted-foreground'} />
                  {m.label}
                </button>
              ))}
            </div>

            {/* Card Form */}
            {paymentMethod === 'cartao' && (
              <div className="space-y-3">
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
              </div>
            )}

            {/* Pix */}
            {paymentMethod === 'pix' && (
              <Card className="gradient-subtle">
                <CardContent className="p-4 flex flex-col items-center gap-3">
                  <div className="w-40 h-40 bg-white rounded-lg flex items-center justify-center border">
                    <QrCode size={100} className="text-gray-800" />
                  </div>
                  <p className="text-xs text-muted-foreground text-center">
                    Escaneie o QR Code acima ou copie o código Pix para pagar
                  </p>
                  <Button variant="outline" size="sm" className="text-xs" onClick={() => {
                    navigator.clipboard.writeText('00020126360014br.gov.bcb.pix0114+55119SIMULADO5204000053039865802BR');
                    toast.success('Código Pix copiado!');
                  }}>
                    Copiar Código Pix
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* Link WhatsApp */}
            {paymentMethod === 'link_whatsapp' && (
              <Card className="gradient-subtle">
                <CardContent className="p-4 flex flex-col items-center gap-3 text-center">
                  <Send size={32} className="text-primary" />
                  <div>
                    <p className="text-sm font-semibold">Enviar link de pagamento</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Um link de pagamento será enviado para o WhatsApp <strong>{whatsapp}</strong> para que você finalize o pagamento pelo seu celular.
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}

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
              ) : paymentMethod === 'link_whatsapp' ? (
                'Enviar Link de Pagamento'
              ) : (
                `Pagar R$ ${total.toFixed(2).replace('.', ',')}`
              )}
            </Button>
          </div>
        )}
      </div>
    </PublicLayout>
  );
}
