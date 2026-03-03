import { Router } from 'express';
import prisma from '../prisma';

const router = Router();

// Listar barbeiros
router.get('/', async (_req, res) => {
    try {
        const barbers = await prisma.barber.findMany({
            orderBy: { name: 'asc' },
        });
        res.json(barbers);
    } catch (error) {
        res.status(500).json({ error: 'Erro ao buscar barbeiros' });
    }
});

// Buscar barbeiro por ID
router.get('/:id', async (req, res) => {
    try {
        const barber = await prisma.barber.findUnique({
            where: { id: Number(req.params.id) },
            include: { commissions: true, services: true },
        });
        if (!barber) return res.status(404).json({ error: 'Barbeiro não encontrado' });
        res.json(barber);
    } catch (error) {
        res.status(500).json({ error: 'Erro ao buscar barbeiro' });
    }
});

// Criar barbeiro
router.post('/', async (req, res) => {
    try {
        const barber = await prisma.barber.create({ data: req.body });
        res.status(201).json(barber);
    } catch (error) {
        res.status(500).json({ error: 'Erro ao criar barbeiro' });
    }
});

// Atualizar barbeiro
router.put('/:id', async (req, res) => {
    try {
        const barber = await prisma.barber.update({
            where: { id: Number(req.params.id) },
            data: req.body,
        });
        res.json(barber);
    } catch (error) {
        res.status(500).json({ error: 'Erro ao atualizar barbeiro' });
    }
});

// Deletar barbeiro
router.delete('/:id', async (req, res) => {
    try {
        await prisma.barber.delete({ where: { id: Number(req.params.id) } });
        res.status(204).send();
    } catch (error) {
        res.status(500).json({ error: 'Erro ao deletar barbeiro' });
    }
});

export default router;
