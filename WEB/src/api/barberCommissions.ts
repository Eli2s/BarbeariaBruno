import { apiGet, apiPost, apiPut, apiDelete } from './apiClient';
import type { BarberItemCommission } from '@/types';

export const fetchBarberCommissions = (barberId?: number) =>
    apiGet<BarberItemCommission[]>(barberId ? `/barber-commissions?barberId=${barberId}` : '/barber-commissions');
export const createBarberCommission = (data: Omit<BarberItemCommission, 'id'>) =>
    apiPost<BarberItemCommission>('/barber-commissions', data);
export const updateBarberCommission = (id: number, data: Partial<BarberItemCommission>) =>
    apiPut<BarberItemCommission>(`/barber-commissions/${id}`, data);
export const deleteBarberCommission = (id: number) => apiDelete(`/barber-commissions/${id}`);
export const deleteBarberCommissionsByBarber = (barberId: number) =>
    apiDelete(`/barber-commissions/by-barber/${barberId}`);
export const bulkCreateBarberCommissions = (data: Omit<BarberItemCommission, 'id'>[]) =>
    apiPost<BarberItemCommission[]>('/barber-commissions/bulk', data);
