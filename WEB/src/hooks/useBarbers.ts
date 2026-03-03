import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as api from '@/api/barbers';
import type { Barber } from '@/types';

export const useBarbers = () =>
    useQuery({ queryKey: ['barbers'], queryFn: api.fetchBarbers });

export const useBarber = (id: number | undefined) =>
    useQuery({
        queryKey: ['barbers', id],
        queryFn: () => api.fetchBarber(id!),
        enabled: !!id,
    });

export const useCreateBarber = () => {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (data: Omit<Barber, 'id'>) => api.createBarber(data),
        onSuccess: () => { qc.invalidateQueries({ queryKey: ['barbers'] }); },
    });
};

export const useUpdateBarber = () => {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: ({ id, ...data }: Partial<Barber> & { id: number }) => api.updateBarber(id, data),
        onSuccess: () => { qc.invalidateQueries({ queryKey: ['barbers'] }); },
    });
};

export const useDeleteBarber = () => {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (id: number) => api.deleteBarber(id),
        onSuccess: () => { qc.invalidateQueries({ queryKey: ['barbers'] }); },
    });
};
