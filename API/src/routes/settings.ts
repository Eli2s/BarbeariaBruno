import { Router } from 'express';
import prisma from '../prisma';

const router = Router();

// Listar todas as configurações
router.get('/', async (_req, res) => {
    try {
        const settings = await prisma.appSettings.findMany();
        res.json(settings);
    } catch (error) {
        res.status(500).json({ error: 'Erro ao buscar configurações' });
    }
});

// Buscar configuração por chave
router.get('/:key', async (req, res) => {
    try {
        const setting = await prisma.appSettings.findUnique({
            where: { key: req.params.key },
        });
        if (!setting) return res.status(404).json({ error: 'Configuração não encontrada' });
        res.json(setting);
    } catch (error) {
        res.status(500).json({ error: 'Erro ao buscar configuração' });
    }
});

// Criar ou atualizar configuração (upsert)
router.put('/:key', async (req, res) => {
    try {
        const setting = await prisma.appSettings.upsert({
            where: { key: req.params.key },
            update: { value: req.body.value },
            create: { key: req.params.key, value: req.body.value },
        });
        res.json(setting);
    } catch (error) {
        res.status(500).json({ error: 'Erro ao salvar configuração' });
    }
});

// Deletar configuração
router.delete('/:key', async (req, res) => {
    try {
        await prisma.appSettings.delete({ where: { key: req.params.key } });
        res.status(204).send();
    } catch (error) {
        res.status(500).json({ error: 'Erro ao deletar configuração' });
    }
});

export default router;
