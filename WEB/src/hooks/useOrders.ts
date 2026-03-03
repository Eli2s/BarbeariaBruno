import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as api from '@/api/orders';
import type { Order } from '@/types';

export const useOrders = () =>
    useQuery({ queryKey: ['orders'], queryFn: api.fetchOrders });

export const useCreateOrder = () => {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (data: Omit<Order, 'id'>) => api.createOrder(data),
        onSuccess: () => { qc.invalidateQueries({ queryKey: ['orders'] }); },
    });
};

export const useUpdateOrder = () => {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: ({ id, ...data }: Partial<Order> & { id: number }) => api.updateOrder(id, data),
        onSuccess: () => { qc.invalidateQueries({ queryKey: ['orders'] }); },
    });
};

export const useDeleteOrder = () => {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (id: number) => api.deleteOrder(id),
        onSuccess: () => { qc.invalidateQueries({ queryKey: ['orders'] }); },
    });
};
