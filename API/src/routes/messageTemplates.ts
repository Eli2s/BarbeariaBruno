import { Router } from 'express';
import prisma from '../prisma';

const router = Router();

// Listar templates de mensagem
router.get('/', async (_req, res) => {
    try {
        const templates = await prisma.messageTemplate.findMany({
            orderBy: { name: 'asc' },
        });
        res.json(templates);
    } catch (error) {
        res.status(500).json({ error: 'Erro ao buscar templates' });
    }
});

// Buscar template por ID
router.get('/:id', async (req, res) => {
    try {
        const template = await prisma.messageTemplate.findUnique({
            where: { id: Number(req.params.id) },
        });
        if (!template) return res.status(404).json({ error: 'Template não encontrado' });
        res.json(template);
    } catch (error) {
        res.status(500).json({ error: 'Erro ao buscar template' });
    }
});

// Criar template
router.post('/', async (req, res) => {
    try {
        const template = await prisma.messageTemplate.create({ data: req.body });
        res.status(201).json(template);
    } catch (error) {
        res.status(500).json({ error: 'Erro ao criar template' });
    }
});

// Atualizar template
router.put('/:id', async (req, res) => {
    try {
        const template = await prisma.messageTemplate.update({
            where: { id: Number(req.params.id) },
            data: req.body,
        });
        res.json(template);
    } catch (error) {
        res.status(500).json({ error: 'Erro ao atualizar template' });
    }
});

// Deletar template
router.delete('/:id', async (req, res) => {
    try {
        await prisma.messageTemplate.delete({ where: { id: Number(req.params.id) } });
        res.status(204).send();
    } catch (error) {
        res.status(500).json({ error: 'Erro ao deletar template' });
    }
});

export default router;
