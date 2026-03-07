import { Router, Request, Response } from 'express';
import Stripe from 'stripe';
import prisma from '../prisma';
import StripeService from '../services/StripeService';

const router = Router();

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

            // Assinatura criada via Stripe Checkout
            case 'checkout.session.completed': {
                const session = event.data.object as Stripe.Checkout.Session;
                const clientIdRaw = session.client_reference_id;
                const stripeCustomerId = session.customer as string;
                const subscriptionId = session.subscription as string;

                if (!clientIdRaw) break;

                const clientId = parseInt(clientIdRaw, 10);

                await prisma.client.update({
                    where: { id: clientId },
                    data: { stripeCustomerId } as any,
                });

                const lineItems = await new Stripe(process.env.STRIPE_SECRET_KEY || '').checkout.sessions.listLineItems(session.id);
                const priceId = lineItems.data[0]?.price?.id;

                if (!priceId) break;

                const whereClause: Record<string, unknown> = { stripePriceId: priceId, clientId: null };
                const templatePlan = await prisma.plan.findFirst({ where: whereClause as any });

                if (!templatePlan) break;

                // Cria a assinatura específica do cliente
                const today = new Date().toISOString().split('T')[0];
                const planData: Record<string, unknown> = {
                    name: templatePlan.name,
                    description: templatePlan.description,
                    value: templatePlan.value,
                    periodicity: templatePlan.periodicity,
                    customDays: templatePlan.customDays,
                    benefits: templatePlan.benefits,
                    clientId,
                    stripeSubscriptionId: subscriptionId,
                    stripeProductId: templatePlan.stripeProductId,
                    stripePriceId: templatePlan.stripePriceId,
                    status: 'ativo',
                    startDate: today,
                    nextCharge: calculateNextCharge(templatePlan.periodicity, templatePlan.customDays),
                };
                await (prisma.plan.create as any)({ data: planData });

                console.log(`[Stripe] Plano criado para cliente ${clientId} via checkout.session.completed`);
                break;
            }

            // Pagamento recorrente confirmado (inclui o primeiro pagamento)
            case 'invoice.payment_succeeded': {
                const invoice = event.data.object as Stripe.Invoice;
                const subscriptionId = (invoice as any).subscription as string;
                if (!subscriptionId) break;

                const whereClause: Record<string, unknown> = { stripeSubscriptionId: subscriptionId };
                const plan = await prisma.plan.findFirst({ where: whereClause as any });

                if (!plan) {
                    console.warn(`[Stripe] invoice.payment_succeeded: plano não encontrado para subscription ${subscriptionId}`);
                    break;
                }

                const today = new Date().toISOString().split('T')[0];
                const nextCharge = calculateNextCharge(plan.periodicity, plan.customDays);

                // Verifica se já existe um pagamento pago hoje para evitar duplicatas
                const existing = await prisma.planPayment.findFirst({
                    where: { planId: plan.id, paidDate: today },
                });

                if (!existing) {
                    await prisma.planPayment.create({
                        data: {
                            planId: plan.id,
                            expectedDate: today,
                            paidDate: today,
                            status: 'pago',
                            value: plan.value,
                        },
                    });
                }

                // Atualiza nextCharge e garante status ativo
                await prisma.plan.update({
                    where: { id: plan.id },
                    data: { nextCharge, status: 'ativo' } as any,
                });

                console.log(`[Stripe] Pagamento registrado para plano ${plan.id} (subscription ${subscriptionId})`);
                break;
            }

            // Pagamento falhou (cartão recusado, saldo insuficiente, etc.)
            case 'invoice.payment_failed': {
                const invoice = event.data.object as Stripe.Invoice;
                const subscriptionId = (invoice as any).subscription as string;
                if (!subscriptionId) break;

                const whereClause: Record<string, unknown> = { stripeSubscriptionId: subscriptionId };
                const plan = await prisma.plan.findFirst({ where: whereClause as any });

                if (!plan) break;

                const today = new Date().toISOString().split('T')[0];

                // Cria registro de pagamento atrasado (se não existir para hoje)
                const existing = await prisma.planPayment.findFirst({
                    where: { planId: plan.id, expectedDate: today, status: 'atrasado' },
                });

                if (!existing) {
                    await prisma.planPayment.create({
                        data: {
                            planId: plan.id,
                            expectedDate: today,
                            status: 'atrasado',
                            value: plan.value,
                        },
                    });
                }

                console.warn(`[Stripe] Pagamento FALHOU para plano ${plan.id} (subscription ${subscriptionId})`);
                break;
            }

            // Assinatura cancelada (pelo cliente, pelo admin ou por inadimplência)
            case 'customer.subscription.deleted': {
                const subscription = event.data.object as Stripe.Subscription;

                const result = await (prisma.plan.updateMany as any)({
                    where: { stripeSubscriptionId: subscription.id },
                    data: { status: 'cancelado' },
                });

                console.log(`[Stripe] Assinatura ${subscription.id} cancelada — ${result.count} plano(s) atualizados`);
                break;
            }

            // Assinatura pausada
            case 'customer.subscription.paused': {
                const subscription = event.data.object as Stripe.Subscription;

                await (prisma.plan.updateMany as any)({
                    where: { stripeSubscriptionId: subscription.id },
                    data: { status: 'pausado' },
                });

                console.log(`[Stripe] Assinatura ${subscription.id} pausada`);
                break;
            }

            // Assinatura reativada
            case 'customer.subscription.resumed': {
                const subscription = event.data.object as Stripe.Subscription;

                await (prisma.plan.updateMany as any)({
                    where: { stripeSubscriptionId: subscription.id },
                    data: { status: 'ativo' },
                });

                console.log(`[Stripe] Assinatura ${subscription.id} reativada`);
                break;
            }

            default:
                console.log(`[Stripe] Evento ${event.type} ignorado.`);
        }

        res.json({ received: true });
    } catch (err: any) {
        console.error('[Stripe Webhook] Erro fatal:', err.message);
        res.status(500).json({ error: 'Webhook processing fatal error.' });
    }
});

function calculateNextCharge(periodicity: string, customDays?: number | null): string {
    const d = new Date();
    if (periodicity === 'mensal') {
        d.setMonth(d.getMonth() + 1);
    } else if (periodicity === 'quinzenal') {
        d.setDate(d.getDate() + 15);
    } else if (periodicity === 'personalizado' && customDays) {
        d.setDate(d.getDate() + customDays);
    } else {
        d.setDate(d.getDate() + 30);
    }
    return d.toISOString().split('T')[0];
}

export default router;
