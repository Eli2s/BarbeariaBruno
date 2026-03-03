import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as api from '@/api/clients';
import type { Client } from '@/types';

export const useClients = () =>
    useQuery({ queryKey: ['clients'], queryFn: api.fetchClients });

export const useClient = (id: number | undefined) =>
    useQuery({
        queryKey: ['clients', id],
        queryFn: () => api.fetchClient(id!),
        enabled: !!id,
    });

export const useCreateClient = () => {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (data: Omit<Client, 'id'>) => api.createClient(data),
        onSuccess: () => { qc.invalidateQueries({ queryKey: ['clients'] }); },
    });
};

export const useUpdateClient = () => {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: ({ id, ...data }: Partial<Client> & { id: number }) => api.updateClient(id, data),
        onSuccess: () => { qc.invalidateQueries({ queryKey: ['clients'] }); },
    });
};

export const useDeleteClient = () => {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (id: number) => api.deleteClient(id),
        onSuccess: () => { qc.invalidateQueries({ queryKey: ['clients'] }); },
    });
};
