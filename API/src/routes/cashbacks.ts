import { Router } from 'express';
import prisma from '../prisma';

const router = Router();

// Listar cashbacks (filtro opcional por clientId)
router.get('/', async (req, res) => {
    try {
        const where = req.query.clientId
            ? { clientId: Number(req.query.clientId) }
            : {};
        const cashbacks = await prisma.cashback.findMany({
            where,
            orderBy: { expirationDate: 'desc' },
            include: { client: true },
        });
        res.json(cashbacks);
    } catch (error) {
        res.status(500).json({ error: 'Erro ao buscar cashbacks' });
    }
});

// Buscar cashback por ID
router.get('/:id', async (req, res) => {
    try {
        const cashback = await prisma.cashback.findUnique({
            where: { id: Number(req.params.id) },
            include: { client: true },
        });
        if (!cashback) return res.status(404).json({ error: 'Cashback não encontrado' });
        res.json(cashback);
    } catch (error) {
        res.status(500).json({ error: 'Erro ao buscar cashback' });
    }
});

// Criar cashback
router.post('/', async (req, res) => {
    try {
        const cashback = await prisma.cashback.create({ data: req.body });
        res.status(201).json(cashback);
    } catch (error) {
        res.status(500).json({ error: 'Erro ao criar cashback' });
    }
});

// Atualizar cashback
router.put('/:id', async (req, res) => {
    try {
        const cashback = await prisma.cashback.update({
            where: { id: Number(req.params.id) },
            data: req.body,
        });
        res.json(cashback);
    } catch (error) {
        res.status(500).json({ error: 'Erro ao atualizar cashback' });
    }
});

// Deletar cashback
router.delete('/:id', async (req, res) => {
    try {
        await prisma.cashback.delete({ where: { id: Number(req.params.id) } });
        res.status(204).send();
    } catch (error) {
        res.status(500).json({ error: 'Erro ao deletar cashback' });
    }
});

export default router;
