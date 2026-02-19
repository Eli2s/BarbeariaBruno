export interface Client {
  id?: number;
  name: string;
  nickname: string;
  whatsapp: string;
  photo?: string;
  tags: string[];
  createdAt: string;
}

export interface Service {
  id?: number;
  clientId: number;
  date: string;
  services: string[];
  products: { productId: number; name: string; quantity: number; unitPrice: number }[];
  totalValue: number;
  paymentMethod: string;
  observation?: string;
  usedPlanCredit: boolean;
  barberId?: number;
  barberCommission?: number;
  shopValue?: number;
  cashbackApplied?: number;
  cashbackPercentage?: number;
}

export interface Plan {
  id?: number;
  clientId: number;
  name: string;
  description: string;
  value: number;
  periodicity: 'quinzenal' | 'mensal' | 'personalizado';
  customDays?: number;
  startDate: string;
  nextCharge: string;
  status: 'ativo' | 'pausado' | 'cancelado';
  benefits?: string;
  internalNote?: string;
  createdAt: string;
}

export interface Product {
  id?: number;
  name: string;
  category: string;
  price: number;
  stock: number;
  description?: string;
  image?: string;
}

export interface PlanPayment {
  id?: number;
  planId: number;
  expectedDate: string;
  paidDate?: string;
  status: 'pendente' | 'pago' | 'atrasado';
  value: number;
}

export interface ServiceItem {
  id?: number;
  name: string;
  price: number;
}

export interface Barber {
  id?: number;
  name: string;
  nickname: string;
  whatsapp: string;
  photo?: string;
  defaultCommission: number;
  isActive: boolean;
  createdAt: string;
}

export interface BarberItemCommission {
  id?: number;
  barberId: number;
  itemId: number;
  itemType: 'service' | 'product';
  percentage: number;
}

export interface Cashback {
  id?: number;
  clientId: number;
  percentage: number;
  startDate: string;
  expirationDate: string;
  status: 'ativo' | 'usado' | 'expirado';
  serviceId?: number;
  lastReminderSent?: string;
}

export interface MessageTemplate {
  id?: number;
  type: 'cashback_activated' | 'cashback_reminder' | 'thank_you';
  name: string;
  content: string;
}

export interface Order {
  id?: number;
  items: { productId: number; name: string; quantity: number; unitPrice: number }[];
  totalValue: number;
  customerName: string;
  customerWhatsapp: string;
  paymentMethod: 'cartao' | 'pix' | 'link_whatsapp';
  status: 'pendente' | 'pago' | 'cancelado';
  createdAt: string;
}

export type ClientClassification =
  | 'Fiel Premium'
  | 'Cliente Regular'
  | 'Cliente Esporádico'
  | 'Consumidor de Produtos'
  | 'Baixo Ticket'
  | 'Novo Cliente';

export interface ClientAnalysis {
  classification: ClientClassification;
  suggestion: string;
  totalSpent: number;
  averageTicket: number;
  totalVisits: number;
  avgDaysBetweenVisits: number;
  mostFrequentDay: string;
  mostFrequentPeriod: string;
  topServices: { name: string; count: number; pct: number }[];
  topProducts: { name: string; count: number; total: number }[];
  mostUsedPayment: { method: string; pct: number };
}
