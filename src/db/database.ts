import Dexie from 'dexie';
import type { Client, Service, Plan, Product, PlanPayment, ServiceItem, Order, Barber, BarberItemCommission, Cashback, MessageTemplate, AppSettings } from '@/types';

class BrunoDatabase extends Dexie {
  clients!: Dexie.Table<Client, number>;
  services!: Dexie.Table<Service, number>;
  plans!: Dexie.Table<Plan, number>;
  products!: Dexie.Table<Product, number>;
  planPayments!: Dexie.Table<PlanPayment, number>;
  serviceItems!: Dexie.Table<ServiceItem, number>;
  orders!: Dexie.Table<Order, number>;
  barbers!: Dexie.Table<Barber, number>;
  barberItemCommissions!: Dexie.Table<BarberItemCommission, number>;
  cashbacks!: Dexie.Table<Cashback, number>;
  messageTemplates!: Dexie.Table<MessageTemplate, number>;
  settings!: Dexie.Table<AppSettings, string>;

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
    this.version(5).stores({
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
      settings: 'key',
    });
  }
}

export const db = new BrunoDatabase();
