import Dexie, { type EntityTable } from 'dexie';
import type { Client, Service, Plan, Product, PlanPayment, ServiceItem, Order, Barber, BarberItemCommission, Cashback, MessageTemplate } from '@/types';

class BrunoDatabase extends Dexie {
  clients!: EntityTable<Client, 'id'>;
  services!: EntityTable<Service, 'id'>;
  plans!: EntityTable<Plan, 'id'>;
  products!: EntityTable<Product, 'id'>;
  planPayments!: EntityTable<PlanPayment, 'id'>;
  serviceItems!: EntityTable<ServiceItem, 'id'>;
  orders!: EntityTable<Order, 'id'>;
  barbers!: EntityTable<Barber, 'id'>;
  barberItemCommissions!: EntityTable<BarberItemCommission, 'id'>;
  cashbacks!: EntityTable<Cashback, 'id'>;
  messageTemplates!: EntityTable<MessageTemplate, 'id'>;

  constructor() {
    super('bruno-barbearia');
    this.version(1).stores({
      clients: '++id, name, nickname, whatsapp',
      services: '++id, clientId, date',
      plans: '++id, clientId, status, nextCharge',
      products: '++id, name, category',
      planPayments: '++id, planId, status, expectedDate',
    });
    this.version(2).stores({
      clients: '++id, name, nickname, whatsapp',
      services: '++id, clientId, date',
      plans: '++id, clientId, status, nextCharge',
      products: '++id, name, category',
      planPayments: '++id, planId, status, expectedDate',
      serviceItems: '++id, name',
    });
    this.version(3).stores({
      clients: '++id, name, nickname, whatsapp',
      services: '++id, clientId, date',
      plans: '++id, clientId, status, nextCharge',
      products: '++id, name, category',
      planPayments: '++id, planId, status, expectedDate',
      serviceItems: '++id, name',
      orders: '++id, status, createdAt',
    });
    this.version(4).stores({
      clients: '++id, name, nickname, whatsapp',
      services: '++id, clientId, date, barberId',
      plans: '++id, clientId, status, nextCharge',
      products: '++id, name, category',
      planPayments: '++id, planId, status, expectedDate',
      serviceItems: '++id, name',
      orders: '++id, status, createdAt',
      barbers: '++id, name, isActive',
      barberItemCommissions: '++id, barberId, itemId, itemType',
      cashbacks: '++id, clientId, status, expirationDate',
      messageTemplates: '++id, type',
    });
  }
}

export const db = new BrunoDatabase();

