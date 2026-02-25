import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as api from '@/api/settings';
import type { AppSettings } from '@/types';

export const useSettings = () =>
    useQuery({ queryKey: ['settings'], queryFn: api.fetchSettings });

export const useSetting = (key: string | undefined) =>
    useQuery({
        queryKey: ['settings', key],
        queryFn: () => api.fetchSetting(key!),
        enabled: !!key,
    });

export const useUpsertSetting = () => {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: ({ key, value }: { key: string; value: string }) => api.upsertSetting(key, value),
        onSuccess: () => { qc.invalidateQueries({ queryKey: ['settings'] }); },
    });
};
