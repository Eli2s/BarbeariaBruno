import { apiGet, apiPost, apiPut, apiDelete } from './apiClient';
import type { MessageTemplate } from '@/types';

export const fetchMessageTemplates = () => apiGet<MessageTemplate[]>('/message-templates');
export const createMessageTemplate = (data: Omit<MessageTemplate, 'id'>) =>
    apiPost<MessageTemplate>('/message-templates', data);
export const createMessageTemplatesBulk = (data: Omit<MessageTemplate, 'id'>[]) =>
    Promise.all(data.map(d => createMessageTemplate(d)));
export const updateMessageTemplate = (id: number, data: Partial<MessageTemplate>) =>
    apiPut<MessageTemplate>(`/message-templates/${id}`, data);
export const deleteMessageTemplate = (id: number) => apiDelete(`/message-templates/${id}`);
