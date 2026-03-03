import { Router } from 'express';
import prisma from '../prisma';

const router = Router();

// Listar comissões (filtro opcional por barberId)
router.get('/', async (req, res) => {
    try {
        const where = req.query.barberId
            ? { barberId: Number(req.query.barberId) }
            : {};
        const commissions = await prisma.barberItemCommission.findMany({
            where,
            include: { barber: true },
        });
        res.json(commissions);
    } catch (error) {
        res.status(500).json({ error: 'Erro ao buscar comissões' });
    }
});

// Buscar comissão por ID
router.get('/:id', async (req, res) => {
    try {
        const commission = await prisma.barberItemCommission.findUnique({
            where: { id: Number(req.params.id) },
            include: { barber: true },
        });
        if (!commission) return res.status(404).json({ error: 'Comissão não encontrada' });
        res.json(commission);
    } catch (error) {
        res.status(500).json({ error: 'Erro ao buscar comissão' });
    }
});

// Criar comissão
router.post('/', async (req, res) => {
    try {
        const commission = await prisma.barberItemCommission.create({ data: req.body });
        res.status(201).json(commission);
    } catch (error) {
        res.status(500).json({ error: 'Erro ao criar comissão' });
    }
});

// Bulk create comissões
router.post('/bulk', async (req, res) => {
    try {
        const data = req.body as any[];
        const result = await prisma.barberItemCommission.createMany({ data });
        const created = await prisma.barberItemCommission.findMany({
            where: { barberId: data[0]?.barberId },
        });
        res.status(201).json(created);
    } catch (error) {
        res.status(500).json({ error: 'Erro ao criar comissões em lote' });
    }
});

// Deletar todas comissões de um barbeiro
router.delete('/by-barber/:barberId', async (req, res) => {
    try {
        await prisma.barberItemCommission.deleteMany({
            where: { barberId: Number(req.params.barberId) },
        });
        res.status(204).send();
    } catch (error) {
        res.status(500).json({ error: 'Erro ao deletar comissões do barbeiro' });
    }
});

// Atualizar comissão
router.put('/:id', async (req, res) => {
    try {
        const commission = await prisma.barberItemCommission.update({
            where: { id: Number(req.params.id) },
            data: req.body,
        });
        res.json(commission);
    } catch (error) {
        res.status(500).json({ error: 'Erro ao atualizar comissão' });
    }
});

// Deletar comissão
router.delete('/:id', async (req, res) => {
    try {
        await prisma.barberItemCommission.delete({ where: { id: Number(req.params.id) } });
        res.status(204).send();
    } catch (error) {
        res.status(500).json({ error: 'Erro ao deletar comissão' });
    }
});

export default router;
