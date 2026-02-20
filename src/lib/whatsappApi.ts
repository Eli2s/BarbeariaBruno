/**
 * WhatsApp Cloud API (Meta) — Serviço de envio
 *
 * Chama diretamente a API graph.facebook.com sem backend intermediário.
 * As credenciais ficam armazenadas no IndexedDB (tabela `settings`).
 */

import { db } from '@/db/database';
import { format } from 'date-fns';
import type { WhatsAppConfig, Client, Service, Plan } from '@/types';

const SETTINGS_KEY = 'whatsapp_config';
const META_API_VERSION = 'v19.0';

// ──────────────────────────────────────────────────
// Config helpers
// ──────────────────────────────────────────────────

export async function getWhatsAppConfig(): Promise<WhatsAppConfig | null> {
  try {
    const row = await db.settings.get(SETTINGS_KEY);
    if (!row) return null;
    return JSON.parse(row.value) as WhatsAppConfig;
  } catch {
    return null;
  }
}

export async function saveWhatsAppConfig(config: WhatsAppConfig): Promise<void> {
  await db.settings.put({ key: SETTINGS_KEY, value: JSON.stringify(config) });
}

export async function isWhatsAppConfigured(): Promise<boolean> {
  const config = await getWhatsAppConfig();
  return !!(
    config?.enabled &&
    config.phoneNumberId?.trim() &&
    config.accessToken?.trim()
  );
}

// ──────────────────────────────────────────────────
// Envio via Meta Cloud API
// ──────────────────────────────────────────────────

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
 * Traduz códigos de erro da Meta para mensagens em português claras.
 */
export function getWhatsAppErrorHint(code: number): string {
  switch (code) {
    case 131030:
      return 'Número não está na lista de destinatários permitidos. No modo de teste, adicione o número em Meta for Developers → WhatsApp → API Setup → "To" phone numbers.';
    case 190:
      return 'Access Token inválido ou expirado. Gere um novo token no painel da Meta e atualize nas configurações.';
    case 131047:
      return 'Mensagem fora da janela de 24h. Use um template de mensagem aprovado pela Meta.';
    case 131026:
      return 'Número de destinatário inválido. Verifique se o número está correto com o código do país (55).';
    default:
      return `Erro na API Meta (código ${code}). Verifique as configurações do WhatsApp.`;
  }
}

/**
 * Envia uma mensagem de texto simples via Meta WhatsApp Cloud API.
 * Retorna objeto com `{ success, errorCode?, errorMessage? }`.
 */
export async function sendWhatsAppMessage(
  phone: string,
  message: string
): Promise<WhatsAppSendResult> {
  const config = await getWhatsAppConfig();

  if (!config?.enabled || !config.phoneNumberId || !config.accessToken) {
    console.info('[WhatsApp] Integração não configurada — mensagem não enviada.');
    return { success: false, errorMessage: 'Integração não configurada.' };
  }

  const url = `https://graph.facebook.com/${META_API_VERSION}/${config.phoneNumberId}/messages`;

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${config.accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: cleanPhone(phone),
        type: 'text',
        text: { body: message, preview_url: false },
      }),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      const errorCode: number | undefined = err?.error?.code;
      const errorMessage = errorCode ? getWhatsAppErrorHint(errorCode) : (err?.error?.message || 'Erro desconhecido na API Meta.');
      console.error('[WhatsApp] Erro na API Meta:', err);
      return { success: false, errorCode, errorMessage };
    }

    return { success: true };
  } catch (err) {
    console.error('[WhatsApp] Falha ao conectar com a API Meta:', err);
    return { success: false, errorMessage: 'Falha de conexão com a API Meta. Verifique sua internet.' };
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

  const config = await getWhatsAppConfig();
  const shopName = config?.shopName || 'Bruno Barbearia';

  const servicesText = service.services.join(', ') || 'Serviço';
  const valor = service.totalValue.toFixed(2).replace('.', ',');
  const dataFormatada = format(new Date(service.date), 'dd/MM/yyyy \'às\' HH:mm');

  const message = replaceVars(TEMPLATE_SERVICE_CONFIRMATION, {
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

  const config = await getWhatsAppConfig();
  const shopName = config?.shopName || 'Bruno Barbearia';

  const valor = plan.value.toFixed(2).replace('.', ',');
  const proximaData = format(new Date(plan.nextCharge), 'dd/MM/yyyy');

  const message = replaceVars(TEMPLATE_PAYMENT_CONFIRMATION, {
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
  const config = await getWhatsAppConfig();
  const shopName = config?.shopName || 'Bruno Barbearia';

  const savedTemplate = await db.messageTemplates
    .where('type').equals('cashback_activated').first();

  const template = savedTemplate?.content || TEMPLATE_CASHBACK_ACTIVATED;

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
  const config = await getWhatsAppConfig();
  const shopName = config?.shopName || 'Bruno Barbearia';

  const savedTemplate = await db.messageTemplates
    .where('type').equals('cashback_reminder').first();

  const template = savedTemplate?.content || TEMPLATE_CASHBACK_REMINDER;

  const message = replaceVars(template, {
    nome: clientName,
    percentual: String(percentage),
    dias_restantes: String(daysLeft),
    barbearia: shopName,
  });

  return sendWhatsAppMessage(phone, message);
}
