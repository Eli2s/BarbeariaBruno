import { Router, Request, Response } from 'express';
import prisma from '../prisma';

const router = Router();

/**
 * POST /api/cron/check-overdue
 * Chamado pelo Vercel Cron Job diariamente às 6h UTC.
 * Marca pagamentos vencidos como 'atrasado' e cria registros pendentes.
 */
router.post('/check-overdue', async (req: Request, res: Response) => {
    const authHeader = req.headers.authorization;
    const cronSecret = process.env.CRON_SECRET;

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    try {
        const today = new Date().toISOString().split('T')[0];

        // Planos ativos com nextCharge vencida
        const overduePlans = await prisma.plan.findMany({
            where: {
                status: 'ativo',
                nextCharge: { lt: today },
            },
            include: { payments: true },
        });

        let recordsCreated = 0;
        let recordsUpdated = 0;

        for (const plan of overduePlans) {
            // Verifica se já existe um registro para a data esperada
            const existingForDate = plan.payments.find(
                p => p.expectedDate === plan.nextCharge
            );

            if (!existingForDate) {
                // Cria novo registro como atrasado
                await prisma.planPayment.create({
                    data: {
                        planId: plan.id,
                        expectedDate: plan.nextCharge,
                        status: 'atrasado',
                        value: plan.value,
                    },
                });
                recordsCreated++;
            } else if (existingForDate.status === 'pendente') {
                // Atualiza pendente → atrasado
                await prisma.planPayment.update({
                    where: { id: existingForDate.id },
                    data: { status: 'atrasado' },
                });
                recordsUpdated++;
            }
        }

        console.log(`[Cron] check-overdue: ${overduePlans.length} planos vencidos, ${recordsCreated} criados, ${recordsUpdated} atualizados`);

        res.json({
            ok: true,
            date: today,
            overduePlansFound: overduePlans.length,
            recordsCreated,
            recordsUpdated,
        });
    } catch (error: any) {
        console.error('[Cron] check-overdue error:', error.message);
        res.status(500).json({ error: 'Erro ao processar pagamentos vencidos' });
    }
});

export default router;
