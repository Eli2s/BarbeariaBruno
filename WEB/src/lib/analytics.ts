import type { Service, Plan, ClientAnalysis, ClientClassification } from '@/types';
import { differenceInDays, parseISO, format, subMonths } from 'date-fns';

const DAY_NAMES = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];

function getPeriod(hour: number): string {
  if (hour < 12) return 'Manhã';
  if (hour < 18) return 'Tarde';
  return 'Noite';
}

export function analyzeClient(services: Service[], plans: Plan[]): ClientAnalysis {
  const sorted = [...services].sort((a, b) => a.date.localeCompare(b.date));
  const totalVisits = sorted.length;
  const totalSpent = sorted.reduce((s, v) => s + v.totalValue, 0);
  const averageTicket = totalVisits > 0 ? Math.round(totalSpent / totalVisits) : 0;

  // Frequency
  let avgDaysBetweenVisits = 0;
  if (totalVisits > 1) {
    const gaps: number[] = [];
    for (let i = 1; i < sorted.length; i++) {
      gaps.push(differenceInDays(parseISO(sorted[i].date), parseISO(sorted[i - 1].date)));
    }
    avgDaysBetweenVisits = Math.round(gaps.reduce((a, b) => a + b, 0) / gaps.length);
  }

  // Most frequent day
  const dayCounts: Record<number, number> = {};
  const periodCounts: Record<string, number> = {};
  for (const s of sorted) {
    const d = parseISO(s.date);
    const day = d.getDay();
    dayCounts[day] = (dayCounts[day] || 0) + 1;
    const period = getPeriod(d.getHours());
    periodCounts[period] = (periodCounts[period] || 0) + 1;
  }
  const mostFrequentDay = DAY_NAMES[Number(Object.entries(dayCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? 0)];
  const mostFrequentPeriod = Object.entries(periodCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? 'Manhã';

  // Top services
  const svcCounts: Record<string, number> = {};
  for (const s of sorted) {
    for (const svc of s.services) {
      svcCounts[svc] = (svcCounts[svc] || 0) + 1;
    }
  }
  const totalSvcCount = Object.values(svcCounts).reduce((a, b) => a + b, 0);
  const topServices = Object.entries(svcCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([name, count]) => ({ name, count, pct: Math.round((count / totalSvcCount) * 100) }));

  // Top products
  const prodCounts: Record<string, { count: number; total: number }> = {};
  for (const s of sorted) {
    for (const p of s.products) {
      if (!prodCounts[p.name]) prodCounts[p.name] = { count: 0, total: 0 };
      prodCounts[p.name].count += p.quantity;
      prodCounts[p.name].total += p.unitPrice * p.quantity;
    }
  }
  const topProducts = Object.entries(prodCounts)
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, 3)
    .map(([name, v]) => ({ name, count: v.count, total: v.total }));

  // Payment methods
  const payCounts: Record<string, number> = {};
  for (const s of sorted) {
    payCounts[s.paymentMethod] = (payCounts[s.paymentMethod] || 0) + 1;
  }
  const topPay = Object.entries(payCounts).sort((a, b) => b[1] - a[1])[0];
  const mostUsedPayment = topPay
    ? { method: topPay[0], pct: Math.round((topPay[1] / totalVisits) * 100) }
    : { method: 'N/A', pct: 0 };

  // Classification
  let classification: ClientClassification = 'Novo Cliente';
  const hasActivePlan = plans.some(p => p.status === 'ativo');
  const productBuyRate = sorted.filter(s => s.products.length > 0).length / Math.max(totalVisits, 1);

  if (totalVisits >= 15 && avgDaysBetweenVisits <= 16 && averageTicket >= 80) {
    classification = 'Fiel Premium';
  } else if (totalVisits >= 8 && avgDaysBetweenVisits <= 20) {
    classification = 'Cliente Regular';
  } else if (totalVisits >= 3 && avgDaysBetweenVisits > 25) {
    classification = 'Cliente Esporádico';
  } else if (productBuyRate > 0.5) {
    classification = 'Consumidor de Produtos';
  } else if (totalVisits >= 5 && averageTicket < 50) {
    classification = 'Baixo Ticket';
  }

  // Suggestion
  let suggestion = '';
  if (!hasActivePlan) {
    if (classification === 'Fiel Premium') {
      suggestion = `Recomendo Plano Quinzenal R$ ${Math.round(averageTicket * 1.7)},00 — ele vem a cada ${avgDaysBetweenVisits} dias e gasta R$ ${averageTicket},00 em média. Um plano premium com benefícios extras fideliza ainda mais.`;
    } else if (classification === 'Cliente Regular') {
      suggestion = `Recomendo Plano Mensal R$ ${Math.round(averageTicket * 0.9)},00 — desconto de 10% sobre o ticket médio para garantir recorrência.`;
    } else if (classification === 'Cliente Esporádico') {
      suggestion = `Ofereça um Plano Mensal Básico R$ ${Math.round(averageTicket * 0.8)},00 com desconto atrativo para aumentar a frequência.`;
    } else {
      suggestion = `Cliente novo ou de baixo ticket — acompanhe mais visitas antes de sugerir um plano.`;
    }
  } else {
    suggestion = 'Cliente já possui plano ativo. Considere upgrade ou benefícios adicionais.';
  }

  return {
    classification, suggestion, totalSpent, averageTicket, totalVisits,
    avgDaysBetweenVisits, mostFrequentDay, mostFrequentPeriod,
    topServices, topProducts, mostUsedPayment,
  };
}

export function getMonthlySpending(services: Service[]): { month: string; value: number }[] {
  const result: { month: string; value: number }[] = [];
  const now = new Date();
  for (let i = 11; i >= 0; i--) {
    const m = subMonths(now, i);
    const key = format(m, 'yyyy-MM');
    const label = format(m, 'MMM/yy');
    const total = services
      .filter(s => s.date.startsWith(key))
      .reduce((sum, s) => sum + s.totalValue, 0);
    result.push({ month: label, value: total });
  }
  return result;
}
