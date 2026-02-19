import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/db/database';
import { AppLayout } from '@/components/AppLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { ArrowLeft, X, Plus, Minus, UserPlus, Gift, Save } from 'lucide-react';
import { toast } from 'sonner';
import { format, addDays } from 'date-fns';
import { sendCashbackMessage } from '@/lib/whatsappApi';
import { phoneMask } from '@/lib/format';
import type { Cashback } from '@/types';

const PAYMENT_METHODS = ['Pix', 'Dinheiro', 'Cartão Débito', 'Cartão Crédito'];

export default function ServiceFormPage() {
  const navigate = useNavigate();
  const clients = useLiveQuery(() => db.clients.toArray()) ?? [];
  const products = useLiveQuery(() => db.products.toArray()) ?? [];
  const serviceItems = useLiveQuery(() => db.serviceItems.toArray()) ?? [];
  const barbers = useLiveQuery(() => db.barbers.filter(b => b.isActive).toArray()) ?? [];

  const [clientId, setClientId] = useState<number | null>(null);
  const [clientSearch, setClientSearch] = useState('');
  const [showClientList, setShowClientList] = useState(false);
  const [dateTime, setDateTime] = useState(format(new Date(), "yyyy-MM-dd'T'HH:mm"));
  const [selectedServices, setSelectedServices] = useState<{ id: number; name: string; price: number }[]>([]);
  const [selectedProducts, setSelectedProducts] = useState<{ productId: number; name: string; quantity: number; unitPrice: number }[]>([]);
  const [totalValue, setTotalValue] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState('');
  const [observation, setObservation] = useState('');
  const [usePlanCredit, setUsePlanCredit] = useState(false);
  const [activePlan, setActivePlan] = useState<any>(null);
  const [barberId, setBarberId] = useState<string>('');

  // Quick add client state
  const [showQuickForm, setShowQuickForm] = useState(false);
  const [quickName, setQuickName] = useState('');
  const [quickWhatsapp, setQuickWhatsapp] = useState('');
  const [quickErrors, setQuickErrors] = useState<{ name?: string; whatsapp?: string }>({});

  // Cashback
  const [activateCashback, setActivateCashback] = useState(false);
  const [cashbackPercentage, setCashbackPercentage] = useState(20);
  const [activeCashback, setActiveCashback] = useState<Cashback | null>(null);
  const [cashbackDiscount, setCashbackDiscount] = useState(0);

  useEffect(() => {
    if (clientId) {
      db.plans.where('clientId').equals(clientId).and(p => p.status === 'ativo').first().then(p => setActivePlan(p ?? null));
      // Check active cashback
      db.cashbacks.where('clientId').equals(clientId).and(c => c.status === 'ativo').first().then(cb => {
        if (cb && new Date(cb.expirationDate) > new Date()) {
          setActiveCashback(cb);
        } else {
          setActiveCashback(null);
          if (cb) db.cashbacks.update(cb.id!, { status: 'expirado' });
        }
      });
    } else {
      setActiveCashback(null);
      setCashbackDiscount(0);
    }
  }, [clientId]);

  // Auto-calculate total with cashback
  useEffect(() => {
    const svcTotal = selectedServices.reduce((acc, s) => acc + s.price, 0);
    const prodTotal = selectedProducts.reduce((acc, p) => acc + p.unitPrice * p.quantity, 0);
    let total = svcTotal + prodTotal;

    if (activeCashback) {
      const discount = svcTotal * (activeCashback.percentage / 100);
      setCashbackDiscount(discount);
      total -= discount;
    } else {
      setCashbackDiscount(0);
    }

    setTotalValue(Math.max(0, total));
  }, [selectedServices, selectedProducts, activeCashback]);

  const toggleService = (svc: typeof serviceItems[0]) => {
    const exists = selectedServices.find(s => s.id === svc.id);
    if (exists) {
      setSelectedServices(selectedServices.filter(s => s.id !== svc.id));
    } else {
      setSelectedServices([...selectedServices, { id: svc.id!, name: svc.name, price: svc.price }]);
    }
  };

  const toggleProduct = (prod: typeof products[0]) => {
    const exists = selectedProducts.find(p => p.productId === prod.id);
    if (exists) {
      setSelectedProducts(selectedProducts.filter(p => p.productId !== prod.id));
    } else {
      setSelectedProducts([...selectedProducts, { productId: prod.id!, name: prod.name, quantity: 1, unitPrice: prod.price }]);
    }
  };

  const updateProductQty = (prodId: number, delta: number) => {
    setSelectedProducts(selectedProducts.map(p =>
      p.productId === prodId ? { ...p, quantity: Math.max(1, p.quantity + delta) } : p
    ));
  };

  const filteredClients = clients.filter(c => {
    const q = clientSearch.toLowerCase();
    return c.name.toLowerCase().includes(q) || c.nickname.toLowerCase().includes(q);
  });

  const validateQuickForm = () => {
    const errors: { name?: string; whatsapp?: string } = {};
    if (quickName.trim().length < 3) errors.name = 'Nome deve ter pelo menos 3 caracteres';
    const digits = quickWhatsapp.replace(/\D/g, '');
    if (digits.length !== 11) errors.whatsapp = 'WhatsApp deve ter 11 dígitos (com DDD)';
    setQuickErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const isQuickFormValid = quickName.trim().length >= 3 && quickWhatsapp.replace(/\D/g, '').length === 11;

  const handleOpenQuickForm = () => {
    setQuickName(clientSearch.trim());
    setQuickWhatsapp('');
    setQuickErrors({});
    setShowQuickForm(true);
    setShowClientList(false);
  };

  const handleSaveQuickClient = async () => {
    if (!validateQuickForm()) return;
    const id = await db.clients.add({
      name: quickName.trim(),
      nickname: '',
      whatsapp: quickWhatsapp.replace(/\D/g, ''),
      tags: [],
      createdAt: new Date().toISOString(),
    });
    setClientId(id as number);
    setClientSearch('');
    setShowQuickForm(false);
    setShowClientList(false);
    toast.success(`Cliente "${quickName.trim()}" cadastrado!`);
  };

  // Calculate commission for a barber
  const calculateCommission = async (barberIdNum: number) => {
    const barber = await db.barbers.get(barberIdNum);
    if (!barber) return { commission: 0, shopValue: totalValue };

    let totalCommission = 0;

    for (const svc of selectedServices) {
      const specific = await db.barberItemCommissions
        .where({ barberId: barberIdNum, itemId: svc.id, itemType: 'service' })
        .first();
      const pct = specific ? specific.percentage : barber.defaultCommission;
      totalCommission += svc.price * (pct / 100);
    }

    for (const prod of selectedProducts) {
      const specific = await db.barberItemCommissions
        .where({ barberId: barberIdNum, itemId: prod.productId, itemType: 'product' })
        .first();
      const pct = specific ? specific.percentage : barber.defaultCommission;
      totalCommission += prod.unitPrice * prod.quantity * (pct / 100);
    }

    return {
      commission: Math.round(totalCommission * 100) / 100,
      shopValue: Math.round((totalValue - totalCommission) * 100) / 100,
    };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientId || selectedServices.length === 0 || !paymentMethod || !barberId) {
      toast.error('Preencha barbeiro, cliente, serviços e forma de pagamento');
      return;
    }

    const barberIdNum = Number(barberId);
    const { commission, shopValue } = await calculateCommission(barberIdNum);

    const serviceId = await db.services.add({
      clientId,
      date: dateTime,
      services: selectedServices.map(s => s.name),
      products: selectedProducts,
      totalValue: totalValue || 0,
      paymentMethod,
      observation,
      usedPlanCredit: usePlanCredit,
      barberId: barberIdNum,
      barberCommission: commission,
      shopValue,
      cashbackApplied: cashbackDiscount,
      cashbackPercentage: activeCashback?.percentage ?? 0,
    });

    // Mark cashback as used
    if (activeCashback) {
      await db.cashbacks.update(activeCashback.id!, { status: 'usado' });
    }

    // Activate new cashback
    if (activateCashback && clientId) {
      const expDate = format(addDays(new Date(), 30), 'yyyy-MM-dd');
      await db.cashbacks.add({
        clientId,
        percentage: cashbackPercentage,
        startDate: format(new Date(), 'yyyy-MM-dd'),
        expirationDate: expDate,
        status: 'ativo',
        serviceId: serviceId as number,
      });

      // Send WhatsApp message
      const client = clients.find(c => c.id === clientId);
      if (client?.whatsapp) {
        sendCashbackMessage(client.name, cashbackPercentage, expDate, client.whatsapp)
          .then(ok => ok ? toast.success('Cashback enviado via WhatsApp!') : null)
          .catch(() => {});
      }
    }

    toast.success('Atendimento registrado!');
    navigate('/');
  };

  const selectedClient = clients.find(c => c.id === clientId);

  return (
    <AppLayout>
      <div className="p-4 max-w-lg md:max-w-2xl mx-auto space-y-4">
        <div className="flex items-center gap-3 pt-2">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}><ArrowLeft size={20} /></Button>
          <h1 className="text-xl font-bold">Novo Atendimento</h1>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Barber Selection */}
          <div className="space-y-2">
            <Label>Barbeiro *</Label>
            <Select value={barberId} onValueChange={setBarberId}>
              <SelectTrigger><SelectValue placeholder="Selecione o barbeiro..." /></SelectTrigger>
              <SelectContent>
                {barbers.map(b => (
                  <SelectItem key={b.id} value={String(b.id)}>
                    {b.nickname || b.name} ({b.defaultCommission}%)
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Client Search */}
          <div className="space-y-2">
            <Label>Cliente *</Label>
            {selectedClient ? (
              <div className="flex items-center gap-2">
                <Badge className="gap-1">{selectedClient.nickname || selectedClient.name} <X size={10} className="cursor-pointer" onClick={() => setClientId(null)} /></Badge>
              </div>
            ) : (
              <div>
                <div className="relative">
                  <Input value={clientSearch} onChange={e => { setClientSearch(e.target.value); setShowClientList(true); setShowQuickForm(false); }} placeholder="Buscar cliente..." onFocus={() => setShowClientList(true)} />
                  {showClientList && clientSearch && !showQuickForm && (
                    <div className="absolute z-10 w-full mt-1 bg-card border rounded-lg shadow-lg max-h-40 overflow-y-auto">
                      {filteredClients.map(c => (
                        <button key={c.id} type="button" className="w-full text-left px-3 py-2 text-sm hover:bg-secondary" onClick={() => { setClientId(c.id!); setClientSearch(''); setShowClientList(false); }}>
                          {c.name} {c.nickname ? `(${c.nickname})` : ''}
                        </button>
                      ))}
                      {filteredClients.length === 0 && (
                        <button type="button" className="w-full text-left px-3 py-2 text-sm hover:bg-secondary flex items-center gap-2 text-primary" onClick={handleOpenQuickForm}>
                          <UserPlus size={14} /> Cadastrar "{clientSearch.trim()}"
                        </button>
                      )}
                    </div>
                  )}
                </div>

                {/* Quick Add Client Inline Form */}
                {showQuickForm && (
                  <div className="mt-2 p-3 border border-primary/30 rounded-lg bg-accent/10 space-y-3">
                    <p className="text-xs font-semibold text-primary flex items-center gap-1"><UserPlus size={13} /> Cadastro rápido de cliente</p>

                    <div className="space-y-1">
                      <Label className="text-xs">Nome completo *</Label>
                      <Input
                        value={quickName}
                        onChange={e => {
                          setQuickName(e.target.value);
                          setQuickErrors(prev => ({ ...prev, name: e.target.value.trim().length < 3 ? 'Nome deve ter pelo menos 3 caracteres' : undefined }));
                        }}
                        placeholder="Nome completo do cliente"
                        className="h-9 text-sm"
                      />
                      {quickErrors.name && <p className="text-xs text-destructive mt-1">{quickErrors.name}</p>}
                    </div>

                    <div className="space-y-1">
                      <Label className="text-xs">WhatsApp * (com DDD)</Label>
                      <Input
                        value={quickWhatsapp}
                        onChange={e => {
                          const masked = phoneMask(e.target.value);
                          setQuickWhatsapp(masked);
                          const digits = masked.replace(/\D/g, '');
                          setQuickErrors(prev => ({ ...prev, whatsapp: digits.length !== 11 ? 'WhatsApp deve ter 11 dígitos (com DDD)' : undefined }));
                        }}
                        placeholder="(11) 99999-9999"
                        className="h-9 text-sm"
                      />
                      {quickErrors.whatsapp && <p className="text-xs text-destructive mt-1">{quickErrors.whatsapp}</p>}
                    </div>

                    <div className="flex gap-2">
                      <Button
                        type="button"
                        size="sm"
                        className="flex-1 gap-1"
                        disabled={!isQuickFormValid}
                        onClick={handleSaveQuickClient}
                      >
                        <Save size={13} /> Salvar e Continuar
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => { setShowQuickForm(false); setClientSearch(''); }}
                      >
                        Cancelar
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>


          {/* Active Cashback Alert */}
          {activeCashback && (
            <Card className="border-primary/50 bg-primary/10">
              <CardContent className="p-3 flex items-start gap-2">
                <Gift size={16} className="text-primary mt-0.5 shrink-0" />
                <div>
                  <p className="text-sm font-semibold text-primary">
                    Cashback ativo: {activeCashback.percentage}% de desconto
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Válido até {format(new Date(activeCashback.expirationDate), 'dd/MM/yyyy')}
                  </p>
                  {cashbackDiscount > 0 && (
                    <p className="text-xs text-primary mt-1">
                      Desconto aplicado: -R$ {cashbackDiscount.toFixed(2).replace('.', ',')}
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          <div className="space-y-2">
            <Label>Data/Hora</Label>
            <Input type="datetime-local" value={dateTime} onChange={e => setDateTime(e.target.value)} />
          </div>

          {/* Services */}
          <div className="space-y-2">
            <Label>Serviços *</Label>
            {serviceItems.length > 0 ? (
              <div className="space-y-1">
                {serviceItems.map(svc => {
                  const sel = selectedServices.find(s => s.id === svc.id);
                  return (
                    <div key={svc.id} className="flex items-center justify-between text-sm py-1">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <Checkbox checked={!!sel} onCheckedChange={() => toggleService(svc)} />
                        <span>{svc.name}</span>
                      </label>
                      <span className="text-xs text-muted-foreground">R$ {svc.price.toFixed(2).replace('.', ',')}</span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Nenhum serviço cadastrado. <span className="text-primary cursor-pointer underline" onClick={() => navigate('/servicos-cadastrados')}>Cadastrar serviços</span></p>
            )}
          </div>

          {/* Products */}
          <div className="space-y-2">
            <Label>Produtos vendidos</Label>
            <div className="space-y-1">
              {products.map(p => {
                const sel = selectedProducts.find(sp => sp.productId === p.id);
                return (
                  <div key={p.id} className="flex items-center justify-between text-sm py-1">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <Checkbox checked={!!sel} onCheckedChange={() => toggleProduct(p)} />
                      <span>{p.name} - R$ {p.price.toFixed(2).replace('.', ',')}</span>
                    </label>
                    {sel && (
                      <div className="flex items-center gap-1">
                        <Button type="button" variant="ghost" size="icon" className="h-6 w-6" onClick={() => updateProductQty(p.id!, -1)}><Minus size={12} /></Button>
                        <span className="text-xs w-4 text-center">{sel.quantity}</span>
                        <Button type="button" variant="ghost" size="icon" className="h-6 w-6" onClick={() => updateProductQty(p.id!, 1)}><Plus size={12} /></Button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="space-y-2">
            <Label>Valor Total (R$)</Label>
            <Input type="number" step="0.01" value={totalValue || ''} onChange={e => setTotalValue(Number(e.target.value))} placeholder="0,00" />
          </div>

          <div className="space-y-2">
            <Label>Forma de Pagamento *</Label>
            <Select value={paymentMethod} onValueChange={setPaymentMethod}>
              <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
              <SelectContent>
                {PAYMENT_METHODS.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Observação</Label>
            <Textarea value={observation} onChange={e => setObservation(e.target.value)} placeholder="Observações..." rows={2} />
          </div>

          {activePlan && (
            <div className="flex items-center gap-2 p-3 gradient-subtle rounded-lg">
              <Checkbox checked={usePlanCredit} onCheckedChange={(v) => setUsePlanCredit(!!v)} />
              <span className="text-sm">Utilizar crédito do plano ({activePlan.name})</span>
            </div>
          )}

          {/* Cashback Activation */}
          <Card className="border-primary/20">
            <CardContent className="p-3 space-y-2">
              <div className="flex items-center gap-2">
                <Switch checked={activateCashback} onCheckedChange={setActivateCashback} />
                <Label className="text-sm cursor-pointer">Ativar Cashback para este cliente?</Label>
              </div>
              {activateCashback && (
                <div className="flex items-center gap-3 pl-1">
                  <div className="space-y-1 flex-1">
                    <Label className="text-xs">Desconto (%)</Label>
                    <Input type="number" min={1} max={100} value={cashbackPercentage} onChange={e => setCashbackPercentage(Number(e.target.value))} className="h-8" />
                  </div>
                  <div className="text-xs text-muted-foreground mt-4">
                    Válido até {format(addDays(new Date(), 30), 'dd/MM/yyyy')}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Button type="submit" className="w-full h-12 font-semibold">Registrar Atendimento</Button>
        </form>
      </div>
    </AppLayout>
  );
}
