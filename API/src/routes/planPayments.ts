import { Router } from 'express';
import prisma from '../prisma';

const router = Router();

// Listar pagamentos (filtro opcional por planId)
router.get('/', async (req, res) => {
    try {
        const where = req.query.planId
            ? { planId: Number(req.query.planId) }
            : {};
        const payments = await prisma.planPayment.findMany({
            where,
            orderBy: { expectedDate: 'desc' },
            include: { plan: true },
        });
        res.json(payments);
    } catch (error) {
        res.status(500).json({ error: 'Erro ao buscar pagamentos' });
    }
});

// Buscar pagamento por ID
router.get('/:id', async (req, res) => {
    try {
        const payment = await prisma.planPayment.findUnique({
            where: { id: Number(req.params.id) },
            include: { plan: true },
        });
        if (!payment) return res.status(404).json({ error: 'Pagamento não encontrado' });
        res.json(payment);
    } catch (error) {
        res.status(500).json({ error: 'Erro ao buscar pagamento' });
    }
});

// Criar pagamento
router.post('/', async (req, res) => {
    try {
        const payment = await prisma.planPayment.create({ data: req.body });
        res.status(201).json(payment);
    } catch (error) {
        res.status(500).json({ error: 'Erro ao criar pagamento' });
    }
});

// Atualizar pagamento
router.put('/:id', async (req, res) => {
    try {
        const payment = await prisma.planPayment.update({
            where: { id: Number(req.params.id) },
            data: req.body,
        });
        res.json(payment);
    } catch (error) {
        res.status(500).json({ error: 'Erro ao atualizar pagamento' });
    }
});

// Deletar pagamento
router.delete('/:id', async (req, res) => {
    try {
        await prisma.planPayment.delete({ where: { id: Number(req.params.id) } });
        res.status(204).send();
    } catch (error) {
        res.status(500).json({ error: 'Erro ao deletar pagamento' });
    }
});

export default router;
