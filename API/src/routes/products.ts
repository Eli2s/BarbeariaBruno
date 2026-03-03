import { Router } from 'express';
import prisma from '../prisma';

const router = Router();

// Listar produtos
router.get('/', async (_req, res) => {
    try {
        const products = await prisma.product.findMany({
            orderBy: { name: 'asc' },
        });
        res.json(products);
    } catch (error) {
        res.status(500).json({ error: 'Erro ao buscar produtos' });
    }
});

// Buscar produto por ID
router.get('/:id', async (req, res) => {
    try {
        const product = await prisma.product.findUnique({
            where: { id: Number(req.params.id) },
        });
        if (!product) return res.status(404).json({ error: 'Produto não encontrado' });
        res.json(product);
    } catch (error) {
        res.status(500).json({ error: 'Erro ao buscar produto' });
    }
});

// Criar produto
router.post('/', async (req, res) => {
    try {
        const product = await prisma.product.create({ data: req.body });
        res.status(201).json(product);
    } catch (error) {
        res.status(500).json({ error: 'Erro ao criar produto' });
    }
});

// Atualizar produto
router.put('/:id', async (req, res) => {
    try {
        const product = await prisma.product.update({
            where: { id: Number(req.params.id) },
            data: req.body,
        });
        res.json(product);
    } catch (error) {
        res.status(500).json({ error: 'Erro ao atualizar produto' });
    }
});

// Deletar produto
router.delete('/:id', async (req, res) => {
    try {
        await prisma.product.delete({ where: { id: Number(req.params.id) } });
        res.status(204).send();
    } catch (error) {
        res.status(500).json({ error: 'Erro ao deletar produto' });
    }
});

export default router;
