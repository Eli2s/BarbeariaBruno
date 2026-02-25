import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as api from '@/api/services';
import type { Service } from '@/types';

export const useServices = (clientId?: number) =>
    useQuery({
        queryKey: clientId ? ['services', { clientId }] : ['services'],
        queryFn: () => api.fetchServices(clientId),
    });

export const useService = (id: number | undefined) =>
    useQuery({
        queryKey: ['services', id],
        queryFn: () => api.fetchService(id!),
        enabled: !!id,
    });

export const useCreateService = () => {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (data: Omit<Service, 'id'>) => api.createService(data),
        onSuccess: () => { qc.invalidateQueries({ queryKey: ['services'] }); },
    });
};

export const useUpdateService = () => {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: ({ id, ...data }: Partial<Service> & { id: number }) => api.updateService(id, data),
        onSuccess: () => { qc.invalidateQueries({ queryKey: ['services'] }); },
    });
};

export const useDeleteService = () => {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (id: number) => api.deleteService(id),
        onSuccess: () => { qc.invalidateQueries({ queryKey: ['services'] }); },
    });
};
