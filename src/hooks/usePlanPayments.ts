import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as api from '@/api/planPayments';
import type { PlanPayment } from '@/types';

export const usePlanPayments = (planId?: number) =>
    useQuery({
        queryKey: planId ? ['planPayments', { planId }] : ['planPayments'],
        queryFn: () => api.fetchPlanPayments(planId),
    });

export const useCreatePlanPayment = () => {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (data: Omit<PlanPayment, 'id'>) => api.createPlanPayment(data),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ['planPayments'] });
            qc.invalidateQueries({ queryKey: ['plans'] });
        },
    });
};

export const useUpdatePlanPayment = () => {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: ({ id, ...data }: Partial<PlanPayment> & { id: number }) => api.updatePlanPayment(id, data),
        onSuccess: () => { qc.invalidateQueries({ queryKey: ['planPayments'] }); },
    });
};

export const useDeletePlanPayment = () => {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (id: number) => api.deletePlanPayment(id),
        onSuccess: () => { qc.invalidateQueries({ queryKey: ['planPayments'] }); },
    });
};
