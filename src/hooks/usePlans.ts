import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as api from '@/api/plans';
import type { Plan } from '@/types';

export const usePlans = (clientId?: number) =>
    useQuery({
        queryKey: clientId ? ['plans', { clientId }] : ['plans'],
        queryFn: () => api.fetchPlans(clientId),
    });

export const usePlan = (id: number | undefined) =>
    useQuery({
        queryKey: ['plans', id],
        queryFn: () => api.fetchPlan(id!),
        enabled: !!id,
    });

export const useCreatePlan = () => {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (data: Omit<Plan, 'id'>) => api.createPlan(data),
        onSuccess: () => { qc.invalidateQueries({ queryKey: ['plans'] }); },
    });
};

export const useUpdatePlan = () => {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: ({ id, ...data }: Partial<Plan> & { id: number }) => api.updatePlan(id, data),
        onSuccess: () => { qc.invalidateQueries({ queryKey: ['plans'] }); },
    });
};

export const useDeletePlan = () => {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (id: number) => api.deletePlan(id),
        onSuccess: () => { qc.invalidateQueries({ queryKey: ['plans'] }); },
    });
};

export const useCreateCheckout = () => {
    return useMutation({
        mutationFn: ({ planId, clientId }: { planId: number, clientId: number }) => api.createCheckoutSession(planId, clientId),
    });
};
