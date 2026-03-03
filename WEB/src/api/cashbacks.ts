import { apiGet, apiPost, apiPut, apiDelete } from './apiClient';
import type { Cashback } from '@/types';

export const fetchCashbacks = (clientId?: number) =>
    apiGet<Cashback[]>(clientId ? `/cashbacks?clientId=${clientId}` : '/cashbacks');
export const fetchCashback = (id: number) => apiGet<Cashback>(`/cashbacks/${id}`);
export const createCashback = (data: Omit<Cashback, 'id'>) => apiPost<Cashback>('/cashbacks', data);
export const updateCashback = (id: number, data: Partial<Cashback>) => apiPut<Cashback>(`/cashbacks/${id}`, data);
export const deleteCashback = (id: number) => apiDelete(`/cashbacks/${id}`);
