export function openWhatsApp(phone: string, message: string) {
  const cleanPhone = phone.replace(/\D/g, '');
  const fullPhone = cleanPhone.startsWith('55') ? cleanPhone : `55${cleanPhone}`;
  const encoded = encodeURIComponent(message);
  window.open(`https://wa.me/${fullPhone}?text=${encoded}`, '_blank');
}

export function generateReminderMessage(clientName: string, planName: string, value: number, date: string): string {
  return `Olá ${clientName}! 👋\n\nAqui é o Bruno da barbearia. Passando pra lembrar que a próxima cobrança do seu ${planName} (R$ ${value.toFixed(2).replace('.', ',')}) vence em ${date}.\n\nQualquer dúvida, é só chamar! ✂️💈`;
}
