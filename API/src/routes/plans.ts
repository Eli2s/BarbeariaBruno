import { Router } from 'express';
import prisma from '../prisma';

const router = Router();

// Listar planos (filtro opcional por clientId)
router.get('/', async (req, res) => {
    try {
        const where = req.query.clientId
            ? { clientId: Number(req.query.clientId) }
            : {};
        const plans = await prisma.plan.findMany({
            where,
            orderBy: { createdAt: 'desc' },
            include: { client: true, payments: true },
        });
        res.json(plans);
    } catch (error) {
        res.status(500).json({ error: 'Erro ao buscar planos' });
    }
});

// Buscar plano por ID
router.get('/:id', async (req, res) => {
    try {
        const plan = await prisma.plan.findUnique({
            where: { id: Number(req.params.id) },
            include: { client: true, payments: true },
        });
        if (!plan) return res.status(404).json({ error: 'Plano não encontrado' });
        res.json(plan);
    } catch (error) {
        res.status(500).json({ error: 'Erro ao buscar plano' });
    }
});

// Criar plano
router.post('/', async (req, res) => {
    try {
        const plan = await prisma.plan.create({ data: req.body });
        res.status(201).json(plan);
    } catch (error) {
        res.status(500).json({ error: 'Erro ao criar plano' });
    }
});

// Atualizar plano
router.put('/:id', async (req, res) => {
    try {
        const plan = await prisma.plan.update({
            where: { id: Number(req.params.id) },
            data: req.body,
        });
        res.json(plan);
    } catch (error) {
        res.status(500).json({ error: 'Erro ao atualizar plano' });
    }
});

// Deletar plano
router.delete('/:id', async (req, res) => {
    try {
        await prisma.plan.delete({ where: { id: Number(req.params.id) } });
        res.status(204).send();
    } catch (error) {
        res.status(500).json({ error: 'Erro ao deletar plano' });
    }
});

export default router;
