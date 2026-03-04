import { Router, Request, Response } from 'express';
import prisma from '../prisma';
import StripeService from '../services/StripeService';

const router = Router();

// Listar planos (filtro opcional por clientId)
router.get('/', async (req: Request, res: Response) => {
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
router.get('/:id', async (req: Request, res: Response) => {
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
router.post('/', async (req: Request, res: Response) => {
    try {
        const { name, description, value, periodicity, clientId, ...rest } = req.body;

        let stripeProductId = null;
        let stripePriceId = null;

        // Se não tem cliente fixo, é um "Template de Plano" geral da Barbearia
        // Logo, criamos ele na Stripe para futuros checkouts
        if (!clientId) {
            const stripeData = await StripeService.createProductAndPrice(
                name,
                description || 'Assinatura Barbearia',
                value,
                periodicity
            );
            stripeProductId = stripeData.productId;
            stripePriceId = stripeData.priceId;
        }

        const plan = await prisma.plan.create({
            data: {
                name,
                description,
                value,
                periodicity,
                clientId,
                stripeProductId,
                stripePriceId,
                ...rest
            }
        });
        res.status(201).json(plan);
    } catch (error: any) {
        console.error('[Plans] Create Error', error);
        res.status(500).json({ error: 'Erro ao criar plano' });
    }
});

// Atualizar plano
router.put('/:id', async (req: Request, res: Response) => {
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
router.delete('/:id', async (req: Request, res: Response) => {
    try {
        await prisma.plan.delete({ where: { id: Number(req.params.id) } });
        res.status(204).send();
    } catch (error) {
        res.status(500).json({ error: 'Erro ao deletar plano' });
    }
});

// Obter link de checkout (WhatsApp)
router.post('/:id/checkout-session', async (req: Request, res: Response) => {
    try {
        const planId = Number(req.params.id);
        const { clientId } = req.body;

        if (!clientId) {
            return res.status(400).json({ error: 'Client ID é obrigatório para gerar o checkout' });
        }

        const plan = await prisma.plan.findUnique({ where: { id: planId } });
        if (!plan) return res.status(404).json({ error: 'Plano não encontrado' });
        if (!plan.stripePriceId) return res.status(400).json({ error: 'Plano não possuí integração com Stripe' });

        const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
        const sessionUrl = await StripeService.createCheckoutSession(
            plan.stripePriceId,
            Number(clientId),
            frontendUrl
        );

        res.json({ checkoutUrl: sessionUrl });
    } catch (error: any) {
        console.error('[Plans] Checkout Session erro', error);
        res.status(500).json({ error: 'Erro ao gerar checkout da stripe' });
    }
});

export default router;
