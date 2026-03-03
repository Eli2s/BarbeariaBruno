import { apiGet, apiPost, apiPut, apiDelete } from './apiClient';
import type { PlanPayment } from '@/types';

export const fetchPlanPayments = (planId?: number) =>
    apiGet<PlanPayment[]>(planId ? `/plan-payments?planId=${planId}` : '/plan-payments');
export const createPlanPayment = (data: Omit<PlanPayment, 'id'>) => apiPost<PlanPayment>('/plan-payments', data);
export const updatePlanPayment = (id: number, data: Partial<PlanPayment>) => apiPut<PlanPayment>(`/plan-payments/${id}`, data);
export const deletePlanPayment = (id: number) => apiDelete(`/plan-payments/${id}`);
