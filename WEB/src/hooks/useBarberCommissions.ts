import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as api from '@/api/barberCommissions';
import type { BarberItemCommission } from '@/types';

export const useBarberCommissions = (barberId?: number) =>
    useQuery({
        queryKey: barberId ? ['barberCommissions', { barberId }] : ['barberCommissions'],
        queryFn: () => api.fetchBarberCommissions(barberId),
    });

export const useCreateBarberCommission = () => {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (data: Omit<BarberItemCommission, 'id'>) => api.createBarberCommission(data),
        onSuccess: () => { qc.invalidateQueries({ queryKey: ['barberCommissions'] }); },
    });
};

export const useUpdateBarberCommission = () => {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: ({ id, ...data }: Partial<BarberItemCommission> & { id: number }) => api.updateBarberCommission(id, data),
        onSuccess: () => { qc.invalidateQueries({ queryKey: ['barberCommissions'] }); },
    });
};

export const useDeleteBarberCommission = () => {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (id: number) => api.deleteBarberCommission(id),
        onSuccess: () => { qc.invalidateQueries({ queryKey: ['barberCommissions'] }); },
    });
};

export const useDeleteBarberCommissionsByBarber = () => {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (barberId: number) => api.deleteBarberCommissionsByBarber(barberId),
        onSuccess: () => { qc.invalidateQueries({ queryKey: ['barberCommissions'] }); },
    });
};

export const useBulkCreateBarberCommissions = () => {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (data: Omit<BarberItemCommission, 'id'>[]) => api.bulkCreateBarberCommissions(data),
        onSuccess: () => { qc.invalidateQueries({ queryKey: ['barberCommissions'] }); },
    });
};
