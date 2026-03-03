import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import whatsMiauService from '../services/WhatsMiauService';

const router = Router();
const prisma = new PrismaClient();

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Formata DateTime para exibição amigável em PT-BR */
function formatDateTime(dt: Date): string {
    return new Intl.DateTimeFormat('pt-BR', {
        dateStyle: 'short',
        timeStyle: 'short',
        timeZone: 'America/Sao_Paulo',
    }).format(dt);
}

/** Gera slots de 30 min entre horários */
function generateSlots(start: number, end: number): string[] {
    const slots: string[] = [];
    for (let h = start; h < end; h++) {
        slots.push(`${String(h).padStart(2, '0')}:00`);
        slots.push(`${String(h).padStart(2, '0')}:30`);
    }
    return slots;
}

// ── GET /api/appointments ─────────────────────────────────────────────────────
// Lista agendamentos (admin). Pode filtrar por status via ?status=confirmado
router.get('/', async (req: Request, res: Response) => {
    try {
        const { status } = req.query;
        const where = status ? { status: status as string } : {};

        const appointments = await prisma.appointment.findMany({
            where,
            include: { barber: true },
            orderBy: { dateTime: 'asc' },
        });

        res.json(appointments);
    } catch (err: any) {
        console.error('[Appointments] GET error:', err.message);
        res.status(500).json({ error: 'Erro ao listar agendamentos.' });
    }
});

// ── GET /api/appointments/availability ───────────────────────────────────────
// Retorna horários livres para uma data e (opcionalmente) um barbeiro
router.get('/availability', async (req: Request, res: Response) => {
    const { date, barberId } = req.query;

    if (!date || typeof date !== 'string') {
        return res.status(400).json({ error: 'Informe o parâmetro date (YYYY-MM-DD).' });
    }

    try {
        const dayStart = new Date(`${date}T00:00:00`);
        const dayEnd = new Date(`${date}T23:59:59`);

        const where: any = {
            dateTime: { gte: dayStart, lte: dayEnd },
            status: { not: 'cancelado' },
        };
        if (barberId) where.barberId = Number(barberId);

        const taken = await prisma.appointment.findMany({ where, select: { dateTime: true } });
        const takenHM = new Set(
            taken.map((a: any) => {
                const d = new Date(a.dateTime);
                return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
            })
        );

        const allSlots = generateSlots(9, 19); // 09:00 – 18:30

        let freeSlots = allSlots.filter(s => !takenHM.has(s));

        // Se a data de pesquisa for igual a hoje, remove os horários que já passaram
        const now = new Date();
        const queryDateString = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

        if (date === queryDateString) {
            const currentHour = now.getHours();
            const currentMinute = now.getMinutes();

            freeSlots = freeSlots.filter(s => {
                const [h, m] = s.split(':').map(Number);
                if (h > currentHour) return true;
                if (h === currentHour && m > currentMinute) return true;
                return false;
            });
        }

        return res.json({ date, freeSlots });
    } catch (err: any) {
        console.error('[Appointments] availability error:', err.message);
        return res.status(500).json({ error: 'Erro ao verificar disponibilidade.' });
    }
});

// ── GET /api/appointments/by-phone/:phone ────────────────────────────────────
// Busca agendamentos ativos de um cliente pelo telefone (para cancelar/reagendar)
router.get('/by-phone/:phone', async (req: Request, res: Response) => {
    const phone = req.params.phone as string;
    try {
        const appointments = await prisma.appointment.findMany({
            where: {
                clientPhone: phone,
                status: { not: 'cancelado' },
                dateTime: { gte: new Date() }, // somente futuros
            },
            include: { barber: true },
            orderBy: { dateTime: 'asc' },
        });
        return res.json(appointments);
    } catch (err: any) {
        console.error('[Appointments] by-phone error:', err.message);
        return res.status(500).json({ error: 'Erro ao buscar agendamentos.' });
    }
});

// ── POST /api/appointments ────────────────────────────────────────────────────
// Cria agendamento já confirmado automaticamente (público — sem autenticação)
router.post('/', async (req: Request, res: Response) => {
    const { clientName, clientPhone, barberId, serviceItem, date, time, notes } = req.body;

    if (!clientName || !clientPhone || !serviceItem || !date || !time) {
        return res.status(400).json({ error: 'Campos obrigatórios: clientName, clientPhone, serviceItem, date, time.' });
    }

    try {
        const dateTime = new Date(`${date}T${time}:00`);
        if (isNaN(dateTime.getTime())) {
            return res.status(400).json({ error: 'Data ou hora inválida.' });
        }

        if (dateTime < new Date()) {
            return res.status(400).json({ error: 'Não é possível agendar em um horário que já passou.' });
        }

        // Verificar conflito de horário
        const conflict = await prisma.appointment.findFirst({
            where: {
                barberId: barberId ? Number(barberId) : undefined,
                dateTime,
                status: { not: 'cancelado' },
            },
        });
        if (conflict) {
            return res.status(409).json({ error: 'Esse horário já está reservado. Por favor, escolha outro.' });
        }

        const appointment = await prisma.appointment.create({
            data: {
                clientName,
                clientPhone,
                barberId: barberId ? Number(barberId) : null,
                serviceItem,
                dateTime,
                status: 'confirmado', // Auto-confirma
                notes: notes || null,
            },
            include: { barber: true },
        });

        // Tentar registrar cliente também no banco geral caso não exista pelo WhatsApp
        try {
            const existingClient = await prisma.client.findFirst({
                where: { whatsapp: clientPhone }
            });

            if (!existingClient) {
                await prisma.client.create({
                    data: {
                        name: clientName,
                        nickname: clientName.split(' ')[0], // Primeiro nome como nickname padrão
                        whatsapp: clientPhone
                    }
                });
            }
        } catch (clientErr) {
            console.error('[Appointments] Erro no auto-cadastro de cliente:', clientErr);
            // Non-blocking: mesmo que falhe, não impede a criação do agendamento.
        }

        const barberName = appointment.barber?.name || 'seu barbeiro';

        // Mensagem de confirmação direta para o cliente
        try {
            const msg = `Olá ${clientName}! ✅ Seu agendamento para *${formatDateTime(dateTime)}* com *${barberName}* (${serviceItem}) está *confirmado*! Te esperamos. Obrigado!`;
            await whatsMiauService.sendText(clientPhone, msg);
        } catch (waErr) {
            console.warn('[Appointments] WhatsApp (criação) falhou:', waErr);
        }

        return res.status(201).json(appointment);
    } catch (err: any) {
        console.error('[Appointments] POST error:', err.message);
        return res.status(500).json({ error: 'Erro ao criar agendamento.' });
    }
});

// ── PATCH /api/appointments/:id/cancel ────────────────────────────────────────
// Cliente cancela seu agendamento (público — sem auth, validação por telefone)
router.patch('/:id/cancel', async (req: Request, res: Response) => {
    const id = Number(req.params.id);
    const { clientPhone } = req.body;

    try {
        const existing = await prisma.appointment.findUnique({ where: { id }, include: { barber: true } });
        if (!existing) return res.status(404).json({ error: 'Agendamento não encontrado.' });
        if (existing.clientPhone !== clientPhone) {
            return res.status(403).json({ error: 'Telefone não confere com o agendamento.' });
        }
        if (existing.status === 'cancelado') {
            return res.status(400).json({ error: 'Agendamento já está cancelado.' });
        }

        const appointment = await prisma.appointment.update({
            where: { id },
            data: { status: 'cancelado' },
            include: { barber: true },
        });

        try {
            const msg = `Olá ${appointment.clientName}. Seu agendamento para *${formatDateTime(appointment.dateTime)}* foi *cancelado* com sucesso. Caso queira, faça um novo agendamento a qualquer momento!`;
            await whatsMiauService.sendText(appointment.clientPhone, msg);
        } catch (waErr) {
            console.warn('[Appointments] WhatsApp (cancelar) falhou:', waErr);
        }

        return res.json(appointment);
    } catch (err: any) {
        console.error('[Appointments] cancel error:', err.message);
        return res.status(500).json({ error: 'Erro ao cancelar agendamento.' });
    }
});
// ── POST /api/appointments/swap ────────────────────────────────────────────────
// Admin troca (swap) a data/hora de dois agendamentos diretamente
router.post('/swap', async (req: Request, res: Response) => {
    try {
        const { appointmentIdA, appointmentIdB } = req.body;
        if (!appointmentIdA || !appointmentIdB) {
            return res.status(400).json({ error: 'appointmentIdA e appointmentIdB são requeridos.' });
        }

        const [a, b] = await Promise.all([
            prisma.appointment.findUnique({ where: { id: Number(appointmentIdA) }, include: { barber: true } }),
            prisma.appointment.findUnique({ where: { id: Number(appointmentIdB) }, include: { barber: true } }),
        ]);

        if (!a || !b) {
            return res.status(404).json({ error: 'Um ou ambos agendamentos não encontrados.' });
        }

        const [updatedA, updatedB] = await prisma.$transaction([
            prisma.appointment.update({
                where: { id: a.id },
                data: { dateTime: b.dateTime },
                include: { barber: true },
            }),
            prisma.appointment.update({
                where: { id: b.id },
                data: { dateTime: a.dateTime },
                include: { barber: true },
            }),
        ]);

        // Enviar WhatsApp avisando da mudança para o cliente A
        try {
            const msgA = `Olá ${updatedA.clientName}. Seu agendamento foi *reagendado* (mudou de horário). Nova data e hora: *${formatDateTime(updatedA.dateTime)}*. Para mais detalhes, acesse nosso painel de agendamentos.`;
            await whatsMiauService.sendText(updatedA.clientPhone, msgA);
        } catch (waErr) {
            console.warn('[Appointments] WhatsApp (swap A) falhou:', waErr);
        }

        // Enviar WhatsApp avisando da mudança para o cliente B
        try {
            const msgB = `Olá ${updatedB.clientName}. Seu agendamento foi *reagendado* (mudou de horário). Nova data e hora: *${formatDateTime(updatedB.dateTime)}*. Para mais detalhes, acesse nosso painel de agendamentos.`;
            await whatsMiauService.sendText(updatedB.clientPhone, msgB);
        } catch (waErr) {
            console.warn('[Appointments] WhatsApp (swap B) falhou:', waErr);
        }

        return res.json({ a: updatedA, b: updatedB });
    } catch (err: any) {
        console.error('[Appointments] swap error:', err.message);
        return res.status(500).json({ error: 'Erro ao trocar agendamentos.' });
    }
});

// ── PATCH /api/appointments/:id/reschedule ────────────────────────────────────
// Cliente reagenda: cancela o antigo e cria um novo com a nova data/hora
router.patch('/:id/reschedule', async (req: Request, res: Response) => {
    const id = Number(req.params.id);
    const { clientPhone, date, time } = req.body;

    if (!date || !time) {
        return res.status(400).json({ error: 'Informe date e time para reagendar.' });
    }

    try {
        const existing = await prisma.appointment.findUnique({ where: { id }, include: { barber: true } });
        if (!existing) return res.status(404).json({ error: 'Agendamento não encontrado.' });
        if (existing.clientPhone !== clientPhone) {
            return res.status(403).json({ error: 'Telefone não confere com o agendamento.' });
        }

        const newDateTime = new Date(`${date}T${time}:00`);
        if (isNaN(newDateTime.getTime())) {
            return res.status(400).json({ error: 'Data ou hora inválida.' });
        }

        // Checar conflito no novo horário
        const conflict = await prisma.appointment.findFirst({
            where: {
                barberId: existing.barberId || undefined,
                dateTime: newDateTime,
                status: { not: 'cancelado' },
            },
        });
        if (conflict) {
            return res.status(409).json({ error: 'Esse novo horário já está reservado.' });
        }

        // Cancelar o antigo
        await prisma.appointment.update({
            where: { id },
            data: { status: 'cancelado' },
        });

        // Criar novo agendamento
        const newAppointment = await prisma.appointment.create({
            data: {
                clientName: existing.clientName,
                clientPhone: existing.clientPhone,
                barberId: existing.barberId,
                serviceItem: existing.serviceItem,
                dateTime: newDateTime,
                status: 'confirmado',
                notes: existing.notes,
            },
            include: { barber: true },
        });

        const barberName = newAppointment.barber?.name || 'seu barbeiro';

        try {
            const msg = `Olá ${newAppointment.clientName}! 🔄 Seu agendamento foi *reagendado* com sucesso para *${formatDateTime(newDateTime)}* com *${barberName}* (${newAppointment.serviceItem}). Te esperamos!`;
            await whatsMiauService.sendText(newAppointment.clientPhone, msg);
        } catch (waErr) {
            console.warn('[Appointments] WhatsApp (reagendar) falhou:', waErr);
        }

        return res.json(newAppointment);
    } catch (err: any) {
        console.error('[Appointments] reschedule error:', err.message);
        return res.status(500).json({ error: 'Erro ao reagendar.' });
    }
});

// ── PATCH /api/appointments/:id/status ───────────────────────────────────────
// Admin confirma (confirmado) ou recusa (cancelado) um agendamento
router.patch('/:id/status', async (req: Request, res: Response) => {
    const id = Number(req.params.id);
    const { status } = req.body;

    if (!['confirmado', 'cancelado', 'finalizado'].includes(status)) {
        return res.status(400).json({ error: 'Status deve ser "confirmado", "cancelado" ou "finalizado".' });
    }

    try {
        const appointment = await prisma.appointment.update({
            where: { id },
            data: { status },
            include: { barber: true },
        });

        const dataHora = formatDateTime(appointment.dateTime);
        const barberName = appointment.barber?.name || 'seu barbeiro';

        try {
            let msg = '';
            if (status === 'confirmado') {
                msg = `Olá ${appointment.clientName}! ✅ Seu agendamento para *${dataHora}* com *${barberName}* (${appointment.serviceItem}) foi *confirmado*! Te esperamos. Obrigado!`;
            } else if (status === 'finalizado') {
                msg = `Olá ${appointment.clientName}! 💇 Seu atendimento com *${barberName}* foi finalizado. Agradecemos pela preferência e volte sempre!`;
            } else {
                msg = `Olá ${appointment.clientName}. 😔 Infelizmente seu agendamento para *${dataHora}* foi *cancelado*. Por favor, entre em contato para remarcar.`;
            }
            await whatsMiauService.sendText(appointment.clientPhone, msg);
        } catch (waErr) {
            console.warn('[Appointments] WhatsApp (status) falhou:', waErr);
        }

        return res.json(appointment);
    } catch (err: any) {
        console.error('[Appointments] PATCH status error:', err.message);
        if (err.code === 'P2025') return res.status(404).json({ error: 'Agendamento não encontrado.' });
        return res.status(500).json({ error: 'Erro ao atualizar agendamento.' });
    }
});

// ── DELETE /api/appointments/:id ─────────────────────────────────────────────
// Admin exclui (hard delete) um agendamento
router.delete('/:id', async (req: Request, res: Response) => {
    const id = Number(req.params.id);

    try {
        const appointment = await prisma.appointment.delete({
            where: { id },
        });

        // Tentar enviar notificação pelo WhatsApp (fire-and-forget)
        if (appointment.status !== 'finalizado') {
            try {
                const dataHora = formatDateTime(appointment.dateTime);
                const msg = `Olá ${appointment.clientName}. Seu agendamento para *${dataHora}* (${appointment.serviceItem}) foi removido da agenda. Caso tenha dúvidas, entre em contato conosco.`;
                await whatsMiauService.sendText(appointment.clientPhone, msg);
            } catch (waErr) {
                console.warn('[Appointments] WhatsApp (delete) falhou:', waErr);
            }
        }

        return res.json({ ok: true });
    } catch (err: any) {
        console.error('[Appointments] DELETE error:', err.message);
        if (err.code === 'P2025') return res.status(404).json({ error: 'Agendamento não encontrado.' });
        return res.status(500).json({ error: 'Erro ao excluir agendamento.' });
    }
});

// --- Blocked Periods ---

// GET /api/appointments/blocked-periods
router.get('/blocked-periods', async (req, res) => {
    try {
        const { barberId } = req.query;
        const where = barberId ? { barberId: Number(barberId) } : {};
        const periods = await prisma.blockedPeriod.findMany({
            where,
            include: { barber: true },
        });
        const result = periods.map(p => ({
            id: p.id,
            barberId: p.barberId,
            barberName: p.barber?.name || null,
            startDate: p.startDate.toISOString(),
            endDate: p.endDate.toISOString(),
            reason: p.reason,
        }));
        res.json(result);
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

// POST /api/appointments/blocked-periods
router.post('/blocked-periods', async (req, res) => {
    try {
        const { barberId, startDate, endDate, reason } = req.body;
        const period = await prisma.blockedPeriod.create({
            data: {
                barberId: barberId ? Number(barberId) : null,
                startDate: new Date(startDate),
                endDate: new Date(endDate),
                reason: reason || null,
            },
        });
        res.json(period);
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

// DELETE /api/appointments/blocked-periods/:id
router.delete('/blocked-periods/:id', async (req, res) => {
    try {
        await prisma.blockedPeriod.delete({
            where: { id: Number(req.params.id) },
        });
        res.json({ ok: true });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

export default router;
