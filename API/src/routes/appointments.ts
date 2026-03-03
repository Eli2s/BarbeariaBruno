import { Router } from 'express';
import prisma from '../prisma';

const router = Router();

// GET /appointments - list all (optional status filter)
router.get('/', async (req, res) => {
    try {
        const { status } = req.query;
        const where = status ? { status: String(status) } : {};
        const appointments = await prisma.appointment.findMany({
            where,
            include: { barber: { select: { id: true, name: true, nickname: true } } },
            orderBy: { dateTime: 'desc' },
        });
        res.json(appointments);
    } catch (err: any) {
        res.status(500).json({ message: err.message });
    }
});

// GET /appointments/availability?date=YYYY-MM-DD&barberId=X
router.get('/availability', async (req, res) => {
    try {
        const { date, barberId } = req.query;
        const dayStart = new Date(`${date}T00:00:00`);
        const dayEnd = new Date(`${date}T23:59:59`);

        const booked = await prisma.appointment.findMany({
            where: {
                dateTime: { gte: dayStart, lte: dayEnd },
                status: { not: 'cancelado' },
                ...(barberId ? { barberId: Number(barberId) } : {}),
            },
            select: { dateTime: true },
        });

        const bookedTimes = booked.map(a =>
            a.dateTime.toLocaleTimeString('pt-BR', {
                hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo',
            })
        );

        const allSlots: string[] = [];
        for (let h = 7; h <= 19; h++) {
            allSlots.push(`${String(h).padStart(2, '0')}:00`);
            allSlots.push(`${String(h).padStart(2, '0')}:30`);
        }

        const freeSlots = allSlots.filter(s => !bookedTimes.includes(s));
        res.json({ date, freeSlots });
    } catch (err: any) {
        res.status(500).json({ message: err.message });
    }
});

// GET /appointments/by-phone/:phone
router.get('/by-phone/:phone', async (req, res) => {
    try {
        const appointments = await prisma.appointment.findMany({
            where: { clientPhone: req.params.phone },
            include: { barber: { select: { id: true, name: true, nickname: true } } },
            orderBy: { dateTime: 'desc' },
        });
        res.json(appointments);
    } catch (err: any) {
        res.status(500).json({ message: err.message });
    }
});

// POST /appointments - create
router.post('/', async (req, res) => {
    try {
        const { clientName, clientPhone, barberId, serviceItem, date, time, notes } = req.body;
        const dateTime = new Date(`${date}T${time}:00`);
        const appointment = await prisma.appointment.create({
            data: {
                clientName,
                clientPhone,
                serviceItem,
                dateTime,
                notes: notes || null,
                barberId: barberId ? Number(barberId) : null,
            },
            include: { barber: { select: { id: true, name: true, nickname: true } } },
        });
        res.json(appointment);
    } catch (err: any) {
        res.status(500).json({ message: err.message });
    }
});

// POST /appointments/:id/status
router.post('/:id/status', async (req, res) => {
    try {
        const appointment = await prisma.appointment.update({
            where: { id: Number(req.params.id) },
            data: { status: req.body.status },
            include: { barber: { select: { id: true, name: true, nickname: true } } },
        });
        res.json(appointment);
    } catch (err: any) {
        res.status(500).json({ message: err.message });
    }
});

// POST /appointments/:id/cancel
router.post('/:id/cancel', async (req, res) => {
    try {
        const appointment = await prisma.appointment.update({
            where: { id: Number(req.params.id) },
            data: { status: 'cancelado' },
            include: { barber: { select: { id: true, name: true, nickname: true } } },
        });
        res.json(appointment);
    } catch (err: any) {
        res.status(500).json({ message: err.message });
    }
});

// POST /appointments/:id/reschedule
router.post('/:id/reschedule', async (req, res) => {
    try {
        const { date, time } = req.body;
        const dateTime = new Date(`${date}T${time}:00`);
        const appointment = await prisma.appointment.update({
            where: { id: Number(req.params.id) },
            data: { dateTime, status: 'pendente' },
            include: { barber: { select: { id: true, name: true, nickname: true } } },
        });
        res.json(appointment);
    } catch (err: any) {
        res.status(500).json({ message: err.message });
    }
});

// --- Blocked Periods ---

// GET /appointments/blocked-periods
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
        res.status(500).json({ message: err.message });
    }
});

// POST /appointments/blocked-periods
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
        res.status(500).json({ message: err.message });
    }
});

// DELETE /appointments/blocked-periods/:id
router.delete('/blocked-periods/:id', async (req, res) => {
    try {
        await prisma.blockedPeriod.delete({
            where: { id: Number(req.params.id) },
        });
        res.json({ ok: true });
    } catch (err: any) {
        res.status(500).json({ message: err.message });
    }
});

export default router;
