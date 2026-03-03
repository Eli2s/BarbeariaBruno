import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as api from '@/api/serviceItems';
import type { ServiceItem } from '@/types';

export const useServiceItems = () =>
    useQuery({ queryKey: ['serviceItems'], queryFn: api.fetchServiceItems });

export const useCreateServiceItem = () => {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (data: Omit<ServiceItem, 'id'>) => api.createServiceItem(data),
        onSuccess: () => { qc.invalidateQueries({ queryKey: ['serviceItems'] }); },
    });
};

export const useUpdateServiceItem = () => {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: ({ id, ...data }: Partial<ServiceItem> & { id: number }) => api.updateServiceItem(id, data),
        onSuccess: () => { qc.invalidateQueries({ queryKey: ['serviceItems'] }); },
    });
};

export const useDeleteServiceItem = () => {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (id: number) => api.deleteServiceItem(id),
        onSuccess: () => { qc.invalidateQueries({ queryKey: ['serviceItems'] }); },
    });
};
