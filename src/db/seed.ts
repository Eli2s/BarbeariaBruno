import { db } from './database';
import type { Client, Service, Plan, Product, PlanPayment, Barber } from '@/types';
import { subDays, subMonths, format, addDays, startOfMonth } from 'date-fns';

export async function clearAndReseed() {
  await db.serviceItems.clear();
  await db.barbers.clear();
  await db.messageTemplates.clear();
  await db.clients.clear();
  await db.services.clear();
  await db.products.clear();
  await db.plans.clear();
  await db.planPayments.clear();
  await seedDatabase();
}

const today = new Date();
const fmt = (d: Date) => format(d, 'yyyy-MM-dd');
const fmtDt = (d: Date) => format(d, "yyyy-MM-dd'T'HH:mm");

// Tabela de preços real — Sr. Brunão
const SERVICE_PRICES: Record<string, number> = {
  'Corte': 35,
  'Barba': 35,
  'Corte + Barba': 60,
  'Barba Só Maquina': 15,
  'Abaixar a Barba': 5,
  'Sobrancelha': 5,
  'Bigode': 5,
  'Pezinho': 10,
  'Depilação de Nariz': 10,
  'Corte Só Um Pente Simples': 30,
  'Alisamento': 30,
};
const SERVICES_LIST = Object.keys(SERVICE_PRICES);
const PAYMENTS = ['Pix', 'Dinheiro', 'Cartão Débito', 'Cartão Crédito'];

export async function seedDatabase() {
  // ── Service Items (tabela de preços) ──
  const serviceCount = await db.serviceItems.count();
  if (serviceCount === 0) {
    await db.serviceItems.bulkAdd(
      Object.entries(SERVICE_PRICES).map(([name, price]) => ({ name, price }))
    );
  }

  // ── Barbeiros ──
  const barberCount = await db.barbers.count();
  if (barberCount === 0) {
    await db.barbers.bulkAdd([
      { name: 'Bruno Ferreira', nickname: 'Brunão', whatsapp: '11999001122', defaultCommission: 50, isActive: true, createdAt: new Date().toISOString() },
      { name: 'Carlos Silva', nickname: 'Carlão', whatsapp: '11998003344', defaultCommission: 40, isActive: true, createdAt: new Date().toISOString() },
      { name: 'Lucas Oliveira', nickname: 'Luke', whatsapp: '11997005566', defaultCommission: 35, isActive: true, createdAt: new Date().toISOString() },
      { name: 'Diego Marques', nickname: 'Diguinho', whatsapp: '11996112233', defaultCommission: 45, isActive: true, createdAt: new Date().toISOString() },
    ] as Barber[]);
  }

  // ── Templates de mensagem ──
  const templateCount = await db.messageTemplates.count();
  if (templateCount === 0) {
    await db.messageTemplates.bulkAdd([
      { type: 'cashback_activated' as const, name: 'Cashback Ativado', content: 'Obrigado pela visita, {nome}! 🎉\n\nVocê ganhou *{percentual}% de desconto* no próximo serviço, válido até {data_expiracao}.\n\nVolte logo! 💈✂️' },
      { type: 'cashback_reminder' as const, name: 'Lembrete de Cashback', content: 'Oi {nome}! 👋\n\nFaltam apenas *{dias_restantes} dias* para seu cashback de *{percentual}%* expirar!\n\nAgende seu próximo corte e aproveite o desconto. 💈' },
      { type: 'thank_you' as const, name: 'Agradecimento', content: 'Obrigado pela preferência, {nome}! 🙏\n\nFoi um prazer atendê-lo. Até a próxima! ✂️💈' },
    ]);
  }

  const count = await db.clients.count();
  if (count > 0) return;

  // ── Produtos ──
  const products: Product[] = [
    { name: 'Pomada Modeladora', category: 'Finalização', price: 45, stock: 12, description: 'Pomada profissional para modelar e fixar o cabelo com brilho' },
    { name: 'Óleo para Barba', category: 'Barba', price: 35, stock: 8, description: 'Óleo hidratante que amacia e perfuma a barba' },
    { name: 'Shampoo Antiqueda', category: 'Cabelo', price: 55, stock: 6, description: 'Shampoo com ativos que fortalecem o bulbo capilar' },
    { name: 'Cera Matte', category: 'Finalização', price: 40, stock: 10, description: 'Cera com acabamento fosco para looks naturais' },
    { name: 'Balm para Barba', category: 'Barba', price: 38, stock: 7, description: 'Balm nutritivo que hidrata e doma a barba' },
  ];
  const prodIds = await db.products.bulkAdd(products, { allKeys: true });

  // ── Clientes fictícios ──
  const clients: Client[] = [
    { name: 'Lucas Mendes', nickname: 'Lukinha', whatsapp: '11999887766', tags: ['VIP'], createdAt: fmt(subMonths(today, 8)) },
    { name: 'Rafael Costa', nickname: 'Rafa', whatsapp: '11988776655', tags: ['Barba'], createdAt: fmt(subMonths(today, 12)) },
    { name: 'Pedro Henrique Silva', nickname: 'PH', whatsapp: '11977665544', tags: ['Fiel'], createdAt: fmt(subMonths(today, 6)) },
    { name: 'Gabriel Oliveira', nickname: 'Gabs', whatsapp: '11966554433', tags: [], createdAt: fmt(subMonths(today, 10)) },
    { name: 'Thiago Santos', nickname: 'Thiago', whatsapp: '11955443322', tags: ['Esporádico'], createdAt: fmt(subMonths(today, 14)) },
    { name: 'Matheus Almeida', nickname: 'Math', whatsapp: '11944332211', tags: ['Produtos'], createdAt: fmt(subMonths(today, 4)) },
    { name: 'João Pedro Souza', nickname: 'JP', whatsapp: '11933221100', tags: ['VIP', 'Plano'], createdAt: fmt(subMonths(today, 9)) },
    { name: 'Carlos Eduardo Lima', nickname: 'Cadu', whatsapp: '11922110099', tags: [], createdAt: fmt(subMonths(today, 2)) },
    { name: 'Bruno Nunes', nickname: 'Bruninho', whatsapp: '11911009988', tags: ['Fiel'], createdAt: fmt(subMonths(today, 11)) },
    { name: 'André Vieira', nickname: 'Dedé', whatsapp: '11900998877', tags: ['Novo'], createdAt: fmt(subMonths(today, 1)) },
    { name: 'Felipe Rocha', nickname: 'Fel', whatsapp: '11989871234', tags: ['VIP'], createdAt: fmt(subMonths(today, 7)) },
    { name: 'Henrique Dias', nickname: 'Kique', whatsapp: '11978762345', tags: ['Barba', 'Fiel'], createdAt: fmt(subMonths(today, 5)) },
    { name: 'Igor Pinheiro', nickname: 'Igor', whatsapp: '11967653456', tags: [], createdAt: fmt(subMonths(today, 3)) },
    { name: 'Leandro Campos', nickname: 'Leão', whatsapp: '11956544567', tags: ['Plano'], createdAt: fmt(subMonths(today, 16)) },
    { name: 'Renato Barbosa', nickname: 'Renato', whatsapp: '11945435678', tags: ['Novo'], createdAt: fmt(subDays(today, 20)) },
  ];
  const clientIds = await db.clients.bulkAdd(clients, { allKeys: true });

  // ── Buscar barbeiros para obter IDs reais ──
  const barbers = await db.barbers.toArray();
  const barberIds = barbers.map(b => b.id!);
  const barberCommissions = barbers.map(b => b.defaultCommission);

  // Helper: calcula valor do serviço baseado nos itens reais
  const calcValue = (svcs: string[]) =>
    svcs.reduce((sum, s) => sum + (SERVICE_PRICES[s] ?? 35), 0);

  // Helper: escolhe barbeiro aleatório
  const randBarber = () => {
    const idx = Math.floor(Math.random() * barberIds.length);
    return { barberId: barberIds[idx], commissionPct: barberCommissions[idx] };
  };

  // ── Atendimentos — histórico (últimos 6 meses) ──
  const allServices: Service[] = [];

  // Padrões por cliente: [clientIdx, periodicidade em dias, lista de combos comuns]
  const patterns: { ci: number; freq: number; combos: string[][] }[] = [
    { ci: 0, freq: 12, combos: [['Corte + Barba'], ['Corte', 'Sobrancelha']] },
    { ci: 1, freq: 14, combos: [['Barba'], ['Corte + Barba']] },
    { ci: 2, freq: 10, combos: [['Corte + Barba', 'Sobrancelha'], ['Corte']] },
    { ci: 3, freq: 25, combos: [['Corte'], ['Barba Só Maquina']] },
    { ci: 4, freq: 40, combos: [['Corte Só Um Pente Simples']] },
    { ci: 5, freq: 15, combos: [['Corte + Barba'], ['Corte', 'Pezinho']] },
    { ci: 6, freq: 13, combos: [['Corte + Barba', 'Sobrancelha'], ['Corte + Barba']] },
    { ci: 7, freq: 20, combos: [['Corte'], ['Barba']] },
    { ci: 8, freq: 11, combos: [['Corte + Barba'], ['Corte', 'Barba']] },
    { ci: 9, freq: 30, combos: [['Corte'], ['Abaixar a Barba']] },
    { ci: 10, freq: 12, combos: [['Corte + Barba'], ['Corte', 'Sobrancelha']] },
    { ci: 11, freq: 10, combos: [['Barba'], ['Corte + Barba']] },
    { ci: 12, freq: 22, combos: [['Corte'], ['Bigode']] },
    { ci: 13, freq: 14, combos: [['Corte + Barba'], ['Corte']] },
    { ci: 14, freq: 45, combos: [['Barba Só Maquina']] },
  ];

  const monthStart = startOfMonth(today);

  for (const p of patterns) {
    const clientId = clientIds[p.ci];
    const numVisits = Math.floor(180 / p.freq); // ~6 meses de histórico
    for (let i = 0; i < numVisits; i++) {
      const daysAgo = i * p.freq + Math.floor(Math.random() * 4);
      if (daysAgo < 0) continue;
      const date = subDays(today, daysAgo);
      const hour = [9, 10, 11, 14, 15, 16, 17][Math.floor(Math.random() * 7)];
      const combo = p.combos[Math.floor(Math.random() * p.combos.length)];
      const value = calcValue(combo);
      const { barberId, commissionPct } = randBarber();
      const barberCommission = Math.round(value * commissionPct / 100);

      // Produto ocasional (~30% chance)
      const hasProduct = Math.random() > 0.7;
      const prodList = hasProduct ? [{
        productId: prodIds[Math.floor(Math.random() * prodIds.length)],
        name: products[Math.floor(Math.random() * products.length)].name,
        quantity: 1,
        unitPrice: products[Math.floor(Math.random() * products.length)].price,
      }] : [];

      allServices.push({
        clientId,
        date: fmtDt(new Date(date.getFullYear(), date.getMonth(), date.getDate(), hour, 0)),
        services: combo,
        products: prodList,
        totalValue: value + (hasProduct && prodList[0] ? prodList[0].unitPrice : 0),
        paymentMethod: PAYMENTS[Math.floor(Math.random() * PAYMENTS.length)],
        usedPlanCredit: false,
        barberId,
        barberCommission,
      });
    }
  }

  // ── Atendimentos EXTRAS neste mês (para o dashboard ter dados ricos) ──
  const thisMonthExtra: { combos: string[]; ci: number }[] = [
    { combos: ['Corte + Barba'], ci: 0 },
    { combos: ['Corte + Barba', 'Sobrancelha'], ci: 2 },
    { combos: ['Corte'], ci: 3 },
    { combos: ['Barba'], ci: 1 },
    { combos: ['Corte + Barba'], ci: 6 },
    { combos: ['Corte', 'Pezinho'], ci: 5 },
    { combos: ['Barba Só Maquina'], ci: 14 },
    { combos: ['Corte + Barba'], ci: 10 },
    { combos: ['Alisamento'], ci: 7 },
    { combos: ['Depilação de Nariz', 'Barba'], ci: 11 },
    { combos: ['Corte Só Um Pente Simples'], ci: 4 },
    { combos: ['Corte + Barba'], ci: 8 },
    { combos: ['Corte'], ci: 12 },
    { combos: ['Barba'], ci: 9 },
    { combos: ['Corte + Barba', 'Bigode'], ci: 13 },
    { combos: ['Corte'], ci: 0 },
    { combos: ['Barba Só Maquina'], ci: 3 },
    { combos: ['Sobrancelha', 'Bigode'], ci: 2 },
    { combos: ['Corte + Barba'], ci: 6 },
    { combos: ['Abaixar a Barba'], ci: 1 },
  ];

  for (let i = 0; i < thisMonthExtra.length; i++) {
    const { combos, ci } = thisMonthExtra[i];
    const clientId = clientIds[ci];
    const daysAgo = Math.floor(Math.random() * (today.getDate() - 1));
    const date = subDays(today, daysAgo);
    // garante que está dentro do mês
    if (date < monthStart) continue;
    const hour = [9, 10, 11, 14, 15, 16, 17][Math.floor(Math.random() * 7)];
    const value = calcValue(combos);
    const { barberId, commissionPct } = randBarber();
    const barberCommission = Math.round(value * commissionPct / 100);
    allServices.push({
      clientId,
      date: fmtDt(new Date(date.getFullYear(), date.getMonth(), date.getDate(), hour, 0)),
      services: combos,
      products: [],
      totalValue: value,
      paymentMethod: PAYMENTS[Math.floor(Math.random() * PAYMENTS.length)],
      usedPlanCredit: false,
      barberId,
      barberCommission,
    });
  }

  await db.services.bulkAdd(allServices);

  // ── Planos ──
  const plans: Plan[] = [
    { clientId: clientIds[0], name: 'Plano Quinzenal Premium', description: 'Corte + Barba a cada 15 dias', value: 160, periodicity: 'quinzenal', startDate: fmt(subMonths(today, 3)), nextCharge: fmt(addDays(today, 5)), status: 'ativo', benefits: 'Desconto em produtos', createdAt: fmt(subMonths(today, 3)) },
    { clientId: clientIds[2], name: 'Plano Mensal Completo', description: 'Corte + Barba + Sobrancelha mensal', value: 120, periodicity: 'mensal', startDate: fmt(subMonths(today, 5)), nextCharge: fmt(addDays(today, 12)), status: 'ativo', benefits: 'Hidratação grátis 1x/mês', createdAt: fmt(subMonths(today, 5)) },
    { clientId: clientIds[6], name: 'Plano Quinzenal VIP', description: 'Corte + Barba + Sobrancelha quinzenal', value: 200, periodicity: 'quinzenal', startDate: fmt(subMonths(today, 4)), nextCharge: fmt(addDays(today, 2)), status: 'ativo', benefits: '10% off em todos produtos', createdAt: fmt(subMonths(today, 4)) },
    { clientId: clientIds[8], name: 'Plano Mensal Básico', description: 'Corte mensal', value: 80, periodicity: 'mensal', startDate: fmt(subMonths(today, 2)), nextCharge: fmt(addDays(today, 18)), status: 'ativo', createdAt: fmt(subMonths(today, 2)) },
    { clientId: clientIds[13], name: 'Plano Mensal', description: 'Corte + Barba mensal', value: 90, periodicity: 'mensal', startDate: fmt(subMonths(today, 8)), nextCharge: fmt(addDays(today, 3)), status: 'ativo', createdAt: fmt(subMonths(today, 8)) },
    { clientId: clientIds[3], name: 'Plano Mensal', description: 'Corte mensal', value: 70, periodicity: 'mensal', startDate: fmt(subMonths(today, 6)), nextCharge: fmt(subDays(today, 10)), status: 'cancelado', createdAt: fmt(subMonths(today, 6)) },
  ];
  const planIds = await db.plans.bulkAdd(plans, { allKeys: true });

  // ── Pagamentos de planos ──
  const payments: PlanPayment[] = [];
  for (let i = 0; i < 4; i++) {
    const expected = subDays(today, (3 - i) * 15 + 5);
    payments.push({ planId: planIds[0], expectedDate: fmt(expected), paidDate: fmt(addDays(expected, 0)), status: 'pago', value: 160 });
  }
  payments.push({ planId: planIds[0], expectedDate: fmt(addDays(today, 5)), status: 'pendente', value: 160 });
  payments.push({ planId: planIds[2], expectedDate: fmt(addDays(today, 2)), status: 'pendente', value: 200 });
  payments.push({ planId: planIds[4], expectedDate: fmt(addDays(today, 3)), status: 'pendente', value: 90 });
  await db.planPayments.bulkAdd(payments);
}
