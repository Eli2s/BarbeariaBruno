import { db } from './database';
import type { Client, Service, Plan, Product, PlanPayment, Barber } from '@/types';
import { subDays, subMonths, format, addDays } from 'date-fns';

const today = new Date();
const fmt = (d: Date) => format(d, 'yyyy-MM-dd');
const fmtDt = (d: Date) => format(d, "yyyy-MM-dd'T'HH:mm");

const SERVICES_LIST = ['Corte Degradê', 'Barba Completa', 'Corte Tesoura', 'Selagem', 'Pigmentação', 'Sobrancelha', 'Corte Social', 'Barba Simples', 'Hidratação'];
const PAYMENTS = ['Pix', 'Dinheiro', 'Cartão Débito', 'Cartão Crédito'];

export async function seedDatabase() {
  // Seed de serviços padrão
  const serviceCount = await db.serviceItems.count();
  if (serviceCount === 0) {
    await db.serviceItems.bulkAdd([
      { name: 'Corte', price: 45 },
      { name: 'Corte e Barba', price: 65 },
      { name: 'Pintura', price: 80 },
      { name: 'Sobrancelha', price: 25 },
    ]);
  }

  // Seed barbers
  const barberCount = await db.barbers.count();
  if (barberCount === 0) {
    await db.barbers.bulkAdd([
      { name: 'Bruno Ferreira', nickname: 'Bruno', whatsapp: '11999001122', defaultCommission: 50, isActive: true, createdAt: new Date().toISOString() },
      { name: 'Carlos Silva', nickname: 'Carlão', whatsapp: '11998003344', defaultCommission: 40, isActive: true, createdAt: new Date().toISOString() },
      { name: 'Lucas Oliveira', nickname: 'Luke', whatsapp: '11997005566', defaultCommission: 35, isActive: true, createdAt: new Date().toISOString() },
    ] as Barber[]);
  }

  // Seed message templates
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

  const products: Product[] = [
    { name: 'Pomada Modeladora', category: 'Finalização', price: 45, stock: 12 },
    { name: 'Óleo para Barba', category: 'Barba', price: 35, stock: 8 },
    { name: 'Shampoo Antiqueda', category: 'Cabelo', price: 55, stock: 6 },
    { name: 'Cera Matte', category: 'Finalização', price: 40, stock: 10 },
    { name: 'Balm para Barba', category: 'Barba', price: 38, stock: 7 },
    { name: 'Tônico Capilar', category: 'Cabelo', price: 60, stock: 4 },
  ];
  const prodIds = await db.products.bulkAdd(products, { allKeys: true });

  const clients: Client[] = [
    { name: 'Lucas Mendes', nickname: 'Lukinha', whatsapp: '11999887766', tags: ['VIP'], createdAt: fmt(subMonths(today, 8)) },
    { name: 'Rafael Costa', nickname: 'Rafa', whatsapp: '11988776655', tags: ['Barba'], createdAt: fmt(subMonths(today, 12)) },
    { name: 'Pedro Henrique Silva', nickname: 'PH', whatsapp: '11977665544', tags: ['Fiel'], createdAt: fmt(subMonths(today, 6)) },
    { name: 'Gabriel Oliveira', nickname: 'Gabs', whatsapp: '11966554433', tags: [], createdAt: fmt(subMonths(today, 10)) },
    { name: 'Thiago Santos', nickname: 'Thiago', whatsapp: '11955443322', tags: ['Esporádico'], createdAt: fmt(subMonths(today, 14)) },
    { name: 'Matheus Almeida', nickname: 'Math', whatsapp: '11944332211', tags: ['Produtos'], createdAt: fmt(subMonths(today, 4)) },
    { name: 'João Pedro Souza', nickname: 'JP', whatsapp: '11933221100', tags: ['VIP', 'Plano'], createdAt: fmt(subMonths(today, 9)) },
    { name: 'Carlos Eduardo Lima', nickname: 'Cadu', whatsapp: '11922110099', tags: [], createdAt: fmt(subMonths(today, 2)) },
    { name: 'Bruno Ferreira', nickname: 'Brunão', whatsapp: '11911009988', tags: ['Fiel'], createdAt: fmt(subMonths(today, 11)) },
    { name: 'André Vieira', nickname: 'Dedé', whatsapp: '11900998877', tags: ['Novo'], createdAt: fmt(subMonths(today, 1)) },
  ];
  const clientIds = await db.clients.bulkAdd(clients, { allKeys: true });

  // Generate varied service history
  const allServices: Service[] = [];
  const servicePatterns: { clientIdx: number; freq: number; avgValue: number; svcCount: number }[] = [
    { clientIdx: 0, freq: 12, avgValue: 95, svcCount: 2 },  // Lucas - fiel, gasta bem
    { clientIdx: 1, freq: 14, avgValue: 80, svcCount: 2 },  // Rafa - regular
    { clientIdx: 2, freq: 10, avgValue: 110, svcCount: 3 }, // PH - fiel premium
    { clientIdx: 3, freq: 25, avgValue: 55, svcCount: 1 },  // Gabs - esporádico
    { clientIdx: 4, freq: 40, avgValue: 45, svcCount: 1 },  // Thiago - muito esporádico
    { clientIdx: 5, freq: 15, avgValue: 70, svcCount: 1 },  // Math - compra produtos
    { clientIdx: 6, freq: 13, avgValue: 100, svcCount: 2 }, // JP - VIP com plano
    { clientIdx: 7, freq: 20, avgValue: 50, svcCount: 1 },  // Cadu - novo
    { clientIdx: 8, freq: 11, avgValue: 85, svcCount: 2 },  // Brunão - fiel
    { clientIdx: 9, freq: 30, avgValue: 60, svcCount: 1 },  // Dedé - novo
  ];

  for (const p of servicePatterns) {
    const clientId = clientIds[p.clientIdx];
    const numVisits = Math.floor(300 / p.freq);
    for (let i = 0; i < numVisits; i++) {
      const daysAgo = i * p.freq + Math.floor(Math.random() * 5) - 2;
      if (daysAgo < 0) continue;
      const date = subDays(today, daysAgo);
      const hour = [9, 10, 11, 14, 15, 16, 17][Math.floor(Math.random() * 7)];
      const svcs: string[] = [];
      for (let s = 0; s < p.svcCount; s++) {
        const svc = SERVICES_LIST[Math.floor(Math.random() * SERVICES_LIST.length)];
        if (!svcs.includes(svc)) svcs.push(svc);
      }
      const hasProduct = p.clientIdx === 5 || Math.random() > 0.7;
      const prodList = hasProduct ? [{
        productId: prodIds[Math.floor(Math.random() * prodIds.length)],
        name: products[Math.floor(Math.random() * products.length)].name,
        quantity: 1,
        unitPrice: products[Math.floor(Math.random() * products.length)].price
      }] : [];
      const variation = (Math.random() - 0.5) * 30;
      allServices.push({
        clientId,
        date: fmtDt(new Date(date.getFullYear(), date.getMonth(), date.getDate(), hour, 0)),
        services: svcs,
        products: prodList,
        totalValue: Math.round(p.avgValue + variation),
        paymentMethod: PAYMENTS[Math.floor(Math.random() * PAYMENTS.length)],
        usedPlanCredit: false,
      });
    }
  }
  await db.services.bulkAdd(allServices);

  // Plans
  const plans: Plan[] = [
    {
      clientId: clientIds[0], name: 'Plano Quinzenal Premium', description: 'Corte + Barba a cada 15 dias',
      value: 160, periodicity: 'quinzenal', startDate: fmt(subMonths(today, 3)),
      nextCharge: fmt(addDays(today, 5)), status: 'ativo', benefits: 'Desconto em produtos',
      createdAt: fmt(subMonths(today, 3)),
    },
    {
      clientId: clientIds[2], name: 'Plano Mensal Completo', description: 'Corte + Barba + Sobrancelha mensal',
      value: 120, periodicity: 'mensal', startDate: fmt(subMonths(today, 5)),
      nextCharge: fmt(addDays(today, 12)), status: 'ativo', benefits: 'Hidratação grátis 1x/mês',
      createdAt: fmt(subMonths(today, 5)),
    },
    {
      clientId: clientIds[6], name: 'Plano Quinzenal VIP', description: 'Corte + Barba + Selagem quinzenal',
      value: 200, periodicity: 'quinzenal', startDate: fmt(subMonths(today, 4)),
      nextCharge: fmt(addDays(today, 2)), status: 'ativo', benefits: '10% off em todos produtos',
      createdAt: fmt(subMonths(today, 4)),
    },
    {
      clientId: clientIds[8], name: 'Plano Mensal Básico', description: 'Corte mensal',
      value: 80, periodicity: 'mensal', startDate: fmt(subMonths(today, 2)),
      nextCharge: fmt(addDays(today, 18)), status: 'ativo',
      createdAt: fmt(subMonths(today, 2)),
    },
    {
      clientId: clientIds[3], name: 'Plano Mensal', description: 'Corte mensal',
      value: 70, periodicity: 'mensal', startDate: fmt(subMonths(today, 6)),
      nextCharge: fmt(subDays(today, 10)), status: 'cancelado',
      createdAt: fmt(subMonths(today, 6)),
    },
  ];
  const planIds = await db.plans.bulkAdd(plans, { allKeys: true });

  // Plan payments
  const payments: PlanPayment[] = [];
  for (let i = 0; i < 4; i++) {
    const planId = planIds[0];
    const expected = subDays(today, (3 - i) * 15 + 5);
    payments.push({
      planId, expectedDate: fmt(expected), paidDate: fmt(addDays(expected, Math.random() > 0.3 ? 0 : 2)),
      status: 'pago', value: 160,
    });
  }
  payments.push({
    planId: planIds[0], expectedDate: fmt(addDays(today, 5)), status: 'pendente', value: 160,
  });
  payments.push({
    planId: planIds[2], expectedDate: fmt(addDays(today, 2)), status: 'pendente', value: 200,
  });
  await db.planPayments.bulkAdd(payments);
}
