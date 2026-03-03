import { apiGet, apiPost, apiPut, apiDelete } from './apiClient';
import type { Order } from '@/types';

export const fetchOrders = () => apiGet<Order[]>('/orders');
export const fetchOrder = (id: number) => apiGet<Order>(`/orders/${id}`);
export const createOrder = (data: Omit<Order, 'id'>) => apiPost<Order>('/orders', data);
export const updateOrder = (id: number, data: Partial<Order>) => apiPut<Order>(`/orders/${id}`, data);
export const deleteOrder = (id: number) => apiDelete(`/orders/${id}`);
