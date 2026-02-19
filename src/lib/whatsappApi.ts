import { supabase } from '@/integrations/supabase/client';
import { db } from '@/db/database';
import { format } from 'date-fns';

function cleanPhone(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  return digits.startsWith('55') ? digits : `55${digits}`;
}

async function getTemplate(type: 'cashback_activated' | 'cashback_reminder' | 'thank_you'): Promise<string> {
  const template = await db.messageTemplates.where('type').equals(type).first();
  return template?.content ?? '';
}

function replaceVars(template: string, vars: Record<string, string>): string {
  let result = template;
  for (const [key, value] of Object.entries(vars)) {
    result = result.replaceAll(`{${key}}`, value);
  }
  return result;
}

export async function sendWhatsAppMessage(phone: string, message: string): Promise<boolean> {
  try {
    const { data, error } = await supabase.functions.invoke('send-whatsapp', {
      body: { phone: cleanPhone(phone), message },
    });
    if (error) {
      console.error('WhatsApp send error:', error);
      return false;
    }
    return data?.success ?? false;
  } catch (err) {
    console.error('WhatsApp send failed:', err);
    return false;
  }
}

export async function sendCashbackMessage(
  clientName: string,
  percentage: number,
  expirationDate: string,
  phone: string
): Promise<boolean> {
  const template = await getTemplate('cashback_activated');
  if (!template) return false;
  const message = replaceVars(template, {
    nome: clientName,
    percentual: String(percentage),
    data_expiracao: format(new Date(expirationDate), 'dd/MM/yyyy'),
  });
  return sendWhatsAppMessage(phone, message);
}

export async function sendCashbackReminder(
  clientName: string,
  percentage: number,
  daysLeft: number,
  phone: string
): Promise<boolean> {
  const template = await getTemplate('cashback_reminder');
  if (!template) return false;
  const message = replaceVars(template, {
    nome: clientName,
    percentual: String(percentage),
    dias_restantes: String(daysLeft),
  });
  return sendWhatsAppMessage(phone, message);
}
