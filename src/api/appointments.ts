import { apiGet, apiPost, apiDelete, apiPatch } from './apiClient';

export interface Appointment {
    id: number;
    clientName: string;
    clientPhone: string;
    barberId: number | null;
    serviceItem: string;
    dateTime: string;
    status: 'pendente' | 'confirmado' | 'cancelado' | 'finalizado';
    notes?: string | null;
    createdAt: string;
    barber?: { id: number; name: string; nickname: string } | null;
}

export interface CreateAppointmentPayload {
    clientName: string;
    clientPhone: string;
    barberId?: number | null;
    serviceItem: string;
    date: string; // YYYY-MM-DD
    time: string; // HH:mm
    notes?: string;
}

export const fetchAppointments = (status?: string) =>
    apiGet<Appointment[]>(`/appointments${status ? `?status=${status}` : ''}`);

export const fetchAvailability = (date: string, barberId?: number) =>
    apiGet<{ date: string; freeSlots: string[] }>(
        `/appointments/availability?date=${date}${barberId ? `&barberId=${barberId}` : ''}`
    );

export const fetchAppointmentsByPhone = (phone: string) =>
    apiGet<Appointment[]>(`/appointments/by-phone/${encodeURIComponent(phone)}`);

export const createAppointment = (data: CreateAppointmentPayload) =>
    apiPost<Appointment>('/appointments', data);

export const cancelAppointment = (id: number, clientPhone: string) =>
    apiPost<Appointment>(`/appointments/${id}/cancel`, { clientPhone });

export const rescheduleAppointment = (id: number, clientPhone: string, date: string, time: string) =>
    apiPost<Appointment>(`/appointments/${id}/reschedule`, { clientPhone, date, time });

export const updateAppointmentStatus = (id: number, status: 'confirmado' | 'cancelado' | 'finalizado') =>
    apiPatch<Appointment>(`/appointments/${id}/status`, { status });

// Swap
export const swapAppointments = (appointmentIdA: number, appointmentIdB: number) =>
    apiPost<{ a: Appointment; b: Appointment }>('/appointments/swap', { appointmentIdA, appointmentIdB });

// Delete
export const deleteAppointment = (id: number) =>
    apiDelete<void>(`/appointments/${id}`);

// Blocked periods
export interface BlockedPeriodPayload {
    barberId?: number;
    startDate: string;
    endDate: string;
    reason?: string;
}

export const fetchBlockedPeriods = (barberId?: number) =>
    apiGet<import('@/types').BlockedPeriod[]>(`/appointments/blocked-periods${barberId ? `?barberId=${barberId}` : ''}`);

export const createBlockedPeriod = (data: BlockedPeriodPayload) =>
    apiPost<import('@/types').BlockedPeriod>('/appointments/blocked-periods', data);

export const deleteBlockedPeriod = (id: number) =>
    apiDelete(`/appointments/blocked-periods/${id}`);
