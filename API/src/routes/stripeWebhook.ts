import { Router, Request, Response } from 'express';
import Stripe from 'stripe';
import prisma from '../prisma';
import StripeService from '../services/StripeService';

const router = Router();

// Endpoint cru (raw) porque a stripe precisa ler a stream para parsear
// A configuração disso no Express.js requer que usemos express.raw({type: 'application/json'})
// Porém, o body já chega dependendo da camada global. Usaremos apenas o req.body.
router.post('/', async (req: Request, res: Response) => {
    const sig = req.headers['stripe-signature'] as string;
    let event: Stripe.Event;

    try {
        event = StripeService.constructWebhookEvent(req.body, sig);
    } catch (err: any) {
        console.error(`⚠️ Erro no webhook da stripe: ${err.message}`);
        res.status(400).send(`Webhook Error: ${err.message}`);
        return;
    }

    try {
        switch (event.type) {
            case 'checkout.session.completed':
                const session = event.data.object as Stripe.Checkout.Session;

                // Aqui extraímos os metadados do checkout criado em Plans.ts
                const clientIdRaw = session.client_reference_id;
                const stripeCustomerId = session.customer as string;
                const subscriptionId = session.subscription as string;

                if (clientIdRaw) {
                    const clientId = parseInt(clientIdRaw, 10);

                    // 1. Atualizar a ID do Stripe no Cliente para compras futuras (1 click)
                    await prisma.client.update({
                        where: { id: clientId },
                        data: { stripeCustomerId }
                    });

                    // 2. Localizar o "Plano Modelo" usando o preço do item comprado
                    // O checkout session não retorna diretamente os expanded items
                    // mas sabemos via query de price ou resgatando a propria API q qual plan pertence
                    const lineItems = await new Stripe(process.env.STRIPE_SECRET_KEY || '').checkout.sessions.listLineItems(session.id);
                    const priceId = lineItems.data[0].price?.id;

                    if (priceId) {
                        const templatePlan = await prisma.plan.findFirst({
                            where: { stripePriceId: priceId, clientId: null }
                        });

                        if (templatePlan) {
                            // 3. Criar uma via (instância de assinatura ativa) para o Cliente
                            await prisma.plan.create({
                                data: {
                                    name: templatePlan.name,
                                    description: templatePlan.description,
                                    value: templatePlan.value,
                                    periodicity: templatePlan.periodicity,
                                    clientId: clientId,
                                    stripeSubscriptionId: subscriptionId,
                                    status: 'ativo',
                                    startDate: new Date().toISOString().split('T')[0],
                                    nextCharge: calculateNextCharge(templatePlan.periodicity),
                                }
                            });
                        }
                    }
                }
                break;
            case 'invoice.payment_succeeded':
                // Futuramente lida com pagamentos recorrentes sendo renovados (mês 2, mês 3...)
                // const invoice = event.data.object as Stripe.Invoice;
                // invoice.subscription traz o ID. Basta usar isso pra renovar no prisma.
                break;
            default:
                console.log(`Evento ${event.type} ignorado pela integração.`);
        }

        res.json({ received: true });
    } catch (err: any) {
        console.error('[Stripe Webhook] Fatal erro:', err.message);
        res.status(500).json({ error: 'Webhook processing fatal error.' });
    }
});


function calculateNextCharge(periodicity: string): string {
    const d = new Date();
    if (periodicity === 'mensal') {
        d.setMonth(d.getMonth() + 1);
    } else if (periodicity === 'quinzenal') {
        d.setDate(d.getDate() + 15);
    } else {
        d.setDate(d.getDate() + 30);
    }
    return d.toISOString().split('T')[0];
}

export default router;
