import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as api from '@/api/cashbacks';
import type { Cashback } from '@/types';

export const useCashbacks = (clientId?: number) =>
    useQuery({
        queryKey: clientId ? ['cashbacks', { clientId }] : ['cashbacks'],
        queryFn: () => api.fetchCashbacks(clientId),
    });

export const useCreateCashback = () => {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (data: Omit<Cashback, 'id'>) => api.createCashback(data),
        onSuccess: () => { qc.invalidateQueries({ queryKey: ['cashbacks'] }); },
    });
};

export const useUpdateCashback = () => {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: ({ id, ...data }: Partial<Cashback> & { id: number }) => api.updateCashback(id, data),
        onSuccess: () => { qc.invalidateQueries({ queryKey: ['cashbacks'] }); },
    });
};

export const useDeleteCashback = () => {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (id: number) => api.deleteCashback(id),
        onSuccess: () => { qc.invalidateQueries({ queryKey: ['cashbacks'] }); },
    });
};
