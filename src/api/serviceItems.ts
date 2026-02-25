import { apiGet, apiPost, apiPut, apiDelete } from './apiClient';
import type { ServiceItem } from '@/types';

export const fetchServiceItems = () => apiGet<ServiceItem[]>('/service-items');
export const fetchServiceItem = (id: number) => apiGet<ServiceItem>(`/service-items/${id}`);
export const createServiceItem = (data: Omit<ServiceItem, 'id'>) => apiPost<ServiceItem>('/service-items', data);
export const updateServiceItem = (id: number, data: Partial<ServiceItem>) => apiPut<ServiceItem>(`/service-items/${id}`, data);
export const deleteServiceItem = (id: number) => apiDelete(`/service-items/${id}`);
