import { Router } from 'express';
import prisma from '../prisma';

const router = Router();

// Listar atendimentos (filtro opcional por clientId)
router.get('/', async (req, res) => {
    try {
        const where = req.query.clientId
            ? { clientId: Number(req.query.clientId) }
            : {};
        const services = await prisma.service.findMany({
            where,
            orderBy: { date: 'desc' },
            include: { client: true, barber: true },
        });
        res.json(services);
    } catch (error) {
        res.status(500).json({ error: 'Erro ao buscar atendimentos' });
    }
});

// Buscar atendimento por ID
router.get('/:id', async (req, res) => {
    try {
        const service = await prisma.service.findUnique({
            where: { id: Number(req.params.id) },
            include: { client: true, barber: true },
        });
        if (!service) return res.status(404).json({ error: 'Atendimento não encontrado' });
        res.json(service);
    } catch (error) {
        res.status(500).json({ error: 'Erro ao buscar atendimento' });
    }
});

// Criar atendimento
router.post('/', async (req, res) => {
    try {
        const service = await prisma.service.create({ data: req.body });
        res.status(201).json(service);
    } catch (error) {
        res.status(500).json({ error: 'Erro ao criar atendimento' });
    }
});

// Atualizar atendimento
router.put('/:id', async (req, res) => {
    try {
        const service = await prisma.service.update({
            where: { id: Number(req.params.id) },
            data: req.body,
        });
        res.json(service);
    } catch (error) {
        res.status(500).json({ error: 'Erro ao atualizar atendimento' });
    }
});

// Deletar atendimento
router.delete('/:id', async (req, res) => {
    try {
        await prisma.service.delete({ where: { id: Number(req.params.id) } });
        res.status(204).send();
    } catch (error) {
        res.status(500).json({ error: 'Erro ao deletar atendimento' });
    }
});

export default router;
