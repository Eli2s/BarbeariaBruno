import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as api from '@/api/messageTemplates';
import type { MessageTemplate } from '@/types';

export const useMessageTemplates = () =>
    useQuery({ queryKey: ['messageTemplates'], queryFn: api.fetchMessageTemplates });

export const useCreateMessageTemplate = () => {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (data: Omit<MessageTemplate, 'id'>) => api.createMessageTemplate(data),
        onSuccess: () => { qc.invalidateQueries({ queryKey: ['messageTemplates'] }); },
    });
};

export const useCreateMessageTemplatesBulk = () => {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (data: Omit<MessageTemplate, 'id'>[]) => api.createMessageTemplatesBulk(data),
        onSuccess: () => { qc.invalidateQueries({ queryKey: ['messageTemplates'] }); },
    });
};

export const useUpdateMessageTemplate = () => {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: ({ id, ...data }: Partial<MessageTemplate> & { id: number }) => api.updateMessageTemplate(id, data),
        onSuccess: () => { qc.invalidateQueries({ queryKey: ['messageTemplates'] }); },
    });
};

export const useDeleteMessageTemplate = () => {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (id: number) => api.deleteMessageTemplate(id),
        onSuccess: () => { qc.invalidateQueries({ queryKey: ['messageTemplates'] }); },
    });
};
