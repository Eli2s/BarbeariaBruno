import { apiGet, apiPost, apiPut, apiDelete } from './apiClient';
import type { Client } from '@/types';

export const fetchClients = () => apiGet<Client[]>('/clients');
export const fetchClient = (id: number) => apiGet<Client>(`/clients/${id}`);
export const createClient = (data: Omit<Client, 'id'>) => apiPost<Client>('/clients', data);
export const updateClient = (id: number, data: Partial<Client>) => apiPut<Client>(`/clients/${id}`, data);
export const deleteClient = (id: number) => apiDelete(`/clients/${id}`);
