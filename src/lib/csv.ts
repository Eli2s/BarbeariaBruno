import { db } from '@/db/database';

function downloadCSV(filename: string, content: string) {
  const blob = new Blob(['\ufeff' + content], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export async function exportClients() {
  const clients = await db.clients.toArray();
  const header = 'Nome,Apelido,WhatsApp,Tags,Cadastrado em';
  const rows = clients.map(c => `"${c.name}","${c.nickname}","${c.whatsapp}","${c.tags.join('; ')}","${c.createdAt}"`);
  downloadCSV('clientes.csv', [header, ...rows].join('\n'));
}

export async function exportServices() {
  const services = await db.services.toArray();
  const clients = await db.clients.toArray();
  const clientMap = Object.fromEntries(clients.map(c => [c.id, c.name]));
  const header = 'Cliente,Data,Serviços,Produtos,Valor Total,Pagamento,Obs,Crédito Plano';
  const rows = services.map(s =>
    `"${clientMap[s.clientId] || ''}","${s.date}","${s.services.join('; ')}","${s.products.map(p => `${p.name} x${p.quantity}`).join('; ')}","${s.totalValue.toFixed(2)}","${s.paymentMethod}","${s.observation || ''}","${s.usedPlanCredit ? 'Sim' : 'Não'}"`
  );
  downloadCSV('atendimentos.csv', [header, ...rows].join('\n'));
}

export async function exportPlans() {
  const plans = await db.plans.toArray();
  const clients = await db.clients.toArray();
  const clientMap = Object.fromEntries(clients.map(c => [c.id, c.name]));
  const header = 'Cliente,Plano,Valor,Periodicidade,Início,Próxima Cobrança,Status';
  const rows = plans.map(p =>
    `"${clientMap[p.clientId] || ''}","${p.name}","${p.value.toFixed(2)}","${p.periodicity}","${p.startDate}","${p.nextCharge}","${p.status}"`
  );
  downloadCSV('planos.csv', [header, ...rows].join('\n'));
}
