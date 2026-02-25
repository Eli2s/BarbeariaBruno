import { apiGet, apiPut } from './apiClient';
import type { AppSettings } from '@/types';

export const fetchSettings = () => apiGet<AppSettings[]>('/settings');
export const fetchSetting = (key: string) => apiGet<AppSettings>(`/settings/${key}`);
export const upsertSetting = (key: string, value: string) =>
    apiPut<AppSettings>(`/settings/${key}`, { key, value });
