import { apiGet, apiPost, apiPut, apiDelete } from './apiClient';
import type { Service } from '@/types';

export const fetchServices = (clientId?: number) =>
    apiGet<Service[]>(clientId ? `/services?clientId=${clientId}` : '/services');
export const fetchService = (id: number) => apiGet<Service>(`/services/${id}`);
export const createService = (data: Omit<Service, 'id'>) => apiPost<Service>('/services', data);
export const updateService = (id: number, data: Partial<Service>) => apiPut<Service>(`/services/${id}`, data);
export const deleteService = (id: number) => apiDelete(`/services/${id}`);
