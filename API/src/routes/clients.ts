import { Router } from 'express';
import prisma from '../prisma';

const router = Router();

// Listar todos os clientes
router.get('/', async (_req, res) => {
    try {
        const clients = await prisma.client.findMany({
            orderBy: { createdAt: 'desc' },
        });
        res.json(clients);
    } catch (error) {
        res.status(500).json({ error: 'Erro ao buscar clientes' });
    }
});

// Buscar cliente por ID
router.get('/:id', async (req, res) => {
    try {
        const client = await prisma.client.findUnique({
            where: { id: Number(req.params.id) },
            include: { services: true, plans: true, cashbacks: true },
        });
        if (!client) return res.status(404).json({ error: 'Cliente não encontrado' });
        res.json(client);
    } catch (error) {
        res.status(500).json({ error: 'Erro ao buscar cliente' });
    }
});

// Criar cliente
router.post('/', async (req, res) => {
    try {
        const client = await prisma.client.create({ data: req.body });
        res.status(201).json(client);
    } catch (error) {
        res.status(500).json({ error: 'Erro ao criar cliente' });
    }
});

// Atualizar cliente
router.put('/:id', async (req, res) => {
    try {
        const client = await prisma.client.update({
            where: { id: Number(req.params.id) },
            data: req.body,
        });
        res.json(client);
    } catch (error) {
        res.status(500).json({ error: 'Erro ao atualizar cliente' });
    }
});

// Deletar cliente
router.delete('/:id', async (req, res) => {
    try {
        await prisma.client.delete({ where: { id: Number(req.params.id) } });
        res.status(204).send();
    } catch (error) {
        res.status(500).json({ error: 'Erro ao deletar cliente' });
    }
});

export default router;
