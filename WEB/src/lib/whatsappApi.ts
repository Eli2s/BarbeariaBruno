/**
 * API do Frontend para disparo de mensagens pelo WhatsMiau do Backend.
 */

import { fetchMessageTemplates } from '@/api/messageTemplates';
import { apiPost } from '@/api/apiClient';
import { format, addDays } from 'date-fns';
import type { WhatsAppConfig, Client, Service, Plan } from '@/types';
import { useSettings } from '@/hooks/useSettings';

// ──────────────────────────────────────────────────
// WhatsApp Config helpers (stored in app settings)
// ──────────────────────────────────────────────────
export async function getWhatsAppConfig(): Promise<WhatsAppConfig | null> {
  try {
    const { apiGet } = await import('@/api/apiClient');
    const settings = await apiGet<any>('/settings/whatsapp');
    return settings || null;
  } catch {
    return null;
  }
}

export async function saveWhatsAppConfig(config: WhatsAppConfig): Promise<void> {
  const { apiPost } = await import('@/api/apiClient');
  await apiPost('/settings/whatsapp', config);
}

// Função para limpar número do telefone (somente números e adiciona 55)
function cleanPhone(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  return digits.startsWith('55') ? digits : `55${digits}`;
}

export interface WhatsAppSendResult {
  success: boolean;
  errorCode?: number;
  errorMessage?: string;
}

/**
 * Envia uma mensagem de texto via WhatsMiau do backend.
 */
export async function sendWhatsAppMessage(
  phone: string,
  message: string
): Promise<WhatsAppSendResult> {
  if (!phone || !message) {
    return { success: false, errorMessage: 'Telefone e mensagem são obrigatórios.' };
  }

  try {
    const result = await apiPost<any>('/admin/whatsapp/send-text', {
      phone: cleanPhone(phone),
      message,
    });

    if (result && result.success) {
      return { success: true };
    }

    return { success: false, errorMessage: result?.error || 'Erro desconhecido ao enviar mensagem.' };
  } catch (err: any) {
    console.error('[WhatsApp API] Falha ao enviar mensagem:', err);
    return { success: false, errorMessage: 'Falha de comunicação com a API de mensagens.' };
  }
}

// ──────────────────────────────────────────────────
// Templates de mensagem
// ──────────────────────────────────────────────────

function replaceVars(template: string, vars: Record<string, string>): string {
  let result = template;
  for (const [key, value] of Object.entries(vars)) {
    result = result.replaceAll(`{${key}}`, value);
  }
  return result;
}

const TEMPLATE_SERVICE_CONFIRMATION = `✂️ *Atendimento Confirmado!*

Olá, {nome}! Seu atendimento na *{barbearia}* foi registrado com sucesso.

📋 *Detalhes:*
• Serviços: {servicos}
• Valor: R$ {valor}
• Pagamento: {forma}
• Data: {data}

Obrigado pela preferência! Nos vemos em breve. 💈`;

const TEMPLATE_PAYMENT_CONFIRMATION = `✅ *Pagamento Confirmado!*

Olá, {nome}! Recebemos o pagamento do seu plano na *{barbearia}*.

📋 *Detalhes do Plano:*
• Plano: {plano}
• Valor: R$ {valor}
• Próxima cobrança: {proxima_data}

Qualquer dúvida, é só chamar! ✂️💈`;

const TEMPLATE_CASHBACK_ACTIVATED = `🎁 *Cashback Ativado!*

Olá, {nome}! Você ganhou *{percentual}% de desconto* no seu próximo atendimento na *{barbearia}*.

⏳ Válido até: {data_expiracao}

Não perca! ✂️💈`;

const TEMPLATE_CASHBACK_REMINDER = `⏰ *Seu cashback está expirando!*

Olá, {nome}! Você ainda tem *{percentual}% de desconto* disponível na *{barbearia}*.

⚠️ Expira em apenas *{dias_restantes} dia(s)*!

Agende seu atendimento agora! ✂️💈`;

// ──────────────────────────────────────────────────
// Funções de alto nível — chamadas automaticamente
// ──────────────────────────────────────────────────

/**
 * Envia confirmação após registro de atendimento.
 */
export async function sendServiceConfirmation(
  client: Client,
  service: Service,
  barberName?: string
): Promise<WhatsAppSendResult> {
  if (!client.whatsapp) return { success: false, errorMessage: 'Cliente sem WhatsApp cadastrado.' };

  const shopName = 'Bruno Barbearia'; // Deixe default por agora

  const servicesText = service.services.join(', ') || 'Serviço';
  const valor = service.totalValue.toFixed(2).replace('.', ',');
  const dataFormatada = format(new Date(service.date), 'dd/MM/yyyy \'às\' HH:mm');

  // Fetch template from API
  let template = TEMPLATE_SERVICE_CONFIRMATION;
  try {
    const templates = await fetchMessageTemplates();
    const savedTemplate = templates.find(t => t.type === 'thank_you');
    if (savedTemplate) template = savedTemplate.content;
  } catch { /* use default */ }

  const message = replaceVars(template, {
    nome: client.nickname || client.name,
    barbearia: shopName,
    servicos: servicesText,
    valor,
    forma: service.paymentMethod,
    data: dataFormatada,
    ...(barberName ? { barbeiro: barberName } : {}),
  });

  return sendWhatsAppMessage(client.whatsapp, message);
}

/**
 * Envia confirmação após pagamento de plano.
 */
export async function sendPaymentConfirmation(
  client: Client,
  plan: Plan
): Promise<WhatsAppSendResult> {
  if (!client.whatsapp) return { success: false, errorMessage: 'Cliente sem WhatsApp cadastrado.' };

  const shopName = 'Bruno Barbearia';

  const valor = plan.value.toFixed(2).replace('.', ',');
  const proximaData = format(new Date(plan.nextCharge), 'dd/MM/yyyy');

  // Fetch template from API
  let template = TEMPLATE_PAYMENT_CONFIRMATION;
  try {
    const templates = await fetchMessageTemplates();
    const savedTemplate = templates.find(t => t.type === 'payment');
    if (savedTemplate) template = savedTemplate.content;
  } catch { /* use default */ }

  const message = replaceVars(template, {
    nome: client.nickname || client.name,
    barbearia: shopName,
    plano: plan.name,
    valor,
    proxima_data: proximaData,
  });

  return sendWhatsAppMessage(client.whatsapp, message);
}

/**
 * Envia mensagem de cashback ativado.
 */
export async function sendCashbackMessage(
  clientName: string,
  percentage: number,
  expirationDate: string,
  phone: string
): Promise<WhatsAppSendResult> {
  const shopName = 'Bruno Barbearia';

  // Fetch template from API
  let template = TEMPLATE_CASHBACK_ACTIVATED;
  try {
    const templates = await fetchMessageTemplates();
    const savedTemplate = templates.find(t => t.type === 'cashback_activated');
    if (savedTemplate) template = savedTemplate.content;
  } catch { /* use default */ }

  const message = replaceVars(template, {
    nome: clientName,
    percentual: String(percentage),
    data_expiracao: format(new Date(expirationDate), 'dd/MM/yyyy'),
    barbearia: shopName,
  });

  return sendWhatsAppMessage(phone, message);
}

/**
 * Envia lembrete de cashback expirando.
 */
export async function sendCashbackReminder(
  clientName: string,
  percentage: number,
  daysLeft: number,
  phone: string
): Promise<WhatsAppSendResult> {
  const shopName = 'Bruno Barbearia';

  // Fetch template from API
  let template = TEMPLATE_CASHBACK_REMINDER;
  try {
    const templates = await fetchMessageTemplates();
    const savedTemplate = templates.find(t => t.type === 'cashback_reminder');
    if (savedTemplate) template = savedTemplate.content;
  } catch { /* use default */ }

  const message = replaceVars(template, {
    nome: clientName,
    percentual: String(percentage),
    dias_restantes: String(daysLeft),
    barbearia: shopName,
  });

  return sendWhatsAppMessage(phone, message);
}
