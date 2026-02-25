import { apiGet, apiPost, apiPut, apiDelete } from './apiClient';
import type { Product } from '@/types';

export const fetchProducts = () => apiGet<Product[]>('/products');
export const fetchProduct = (id: number) => apiGet<Product>(`/products/${id}`);
export const createProduct = (data: Omit<Product, 'id'>) => apiPost<Product>('/products', data);
export const updateProduct = (id: number, data: Partial<Product>) => apiPut<Product>(`/products/${id}`, data);
export const deleteProduct = (id: number) => apiDelete(`/products/${id}`);
