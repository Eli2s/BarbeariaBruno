import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as api from '@/api/products';
import type { Product } from '@/types';

export const useProducts = () =>
    useQuery({ queryKey: ['products'], queryFn: api.fetchProducts });

export const useProduct = (id: number | undefined) =>
    useQuery({
        queryKey: ['products', id],
        queryFn: () => api.fetchProduct(id!),
        enabled: !!id,
    });

export const useCreateProduct = () => {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (data: Omit<Product, 'id'>) => api.createProduct(data),
        onSuccess: () => { qc.invalidateQueries({ queryKey: ['products'] }); },
    });
};

export const useUpdateProduct = () => {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: ({ id, ...data }: Partial<Product> & { id: number }) => api.updateProduct(id, data),
        onSuccess: () => { qc.invalidateQueries({ queryKey: ['products'] }); },
    });
};

export const useDeleteProduct = () => {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (id: number) => api.deleteProduct(id),
        onSuccess: () => { qc.invalidateQueries({ queryKey: ['products'] }); },
    });
};
