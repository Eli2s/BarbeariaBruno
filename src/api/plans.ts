import { apiGet, apiPost, apiPut, apiDelete } from './apiClient';
import type { Plan } from '@/types';

export const fetchPlans = (clientId?: number) =>
    apiGet<Plan[]>(clientId ? `/plans?clientId=${clientId}` : '/plans');
export const fetchPlan = (id: number) => apiGet<Plan>(`/plans/${id}`);
export const createPlan = (data: Omit<Plan, 'id'>) => apiPost<Plan>('/plans', data);
export const updatePlan = (id: number, data: Partial<Plan>) => apiPut<Plan>(`/plans/${id}`, data);
export const deletePlan = (id: number) => apiDelete(`/plans/${id}`);
