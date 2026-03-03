import { apiGet, apiPost, apiPut, apiDelete } from './apiClient';
import type { Barber } from '@/types';

export const fetchBarbers = () => apiGet<Barber[]>('/barbers');
export const fetchBarber = (id: number) => apiGet<Barber>(`/barbers/${id}`);
export const createBarber = (data: Omit<Barber, 'id'>) => apiPost<Barber>('/barbers', data);
export const updateBarber = (id: number, data: Partial<Barber>) => apiPut<Barber>(`/barbers/${id}`, data);
export const deleteBarber = (id: number) => apiDelete(`/barbers/${id}`);
