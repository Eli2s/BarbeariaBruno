import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'sk_test_fallback');

class StripeService {
    async createProductAndPrice(name: string, description: string, amount: number, periodicity: string) {
        let interval: Stripe.PriceCreateParams.Recurring.Interval = 'month';
        let interval_count = 1;

        if (periodicity === 'quinzenal') {
            interval = 'day';
            interval_count = 15;
        } else if (periodicity === 'anual') {
            interval = 'year';
            interval_count = 1;
        } else if (periodicity === 'personalizado') {
            // defaults to monthly if unmapped since stripe has limited intervals
            interval = 'day';
            interval_count = 30; // We'll assume a standard 30 day config from caller instead
        }

        const product = await stripe.products.create({
            name,
            description,
            type: 'service',
        });

        const price = await stripe.prices.create({
            product: product.id,
            unit_amount: Math.round(amount * 100),
            currency: 'brl',
            recurring: {
                interval,
                interval_count,
            },
        });

        return { productId: product.id, priceId: price.id };
    }

    async createCheckoutSession(priceId: string, clientId: number, frontendUrl: string) {
        const session = await stripe.checkout.sessions.create({
            mode: 'subscription',
            payment_method_types: ['card'],
            line_items: [
                {
                    price: priceId,
                    quantity: 1,
                },
            ],
            client_reference_id: String(clientId),
            success_url: `${frontendUrl}/planos/sucesso?session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: `${frontendUrl}/`,
        });

        return session.url;
    }

    constructWebhookEvent(body: string | Buffer, signature: string) {
        return stripe.webhooks.constructEvent(
            body,
            signature,
            process.env.STRIPE_WEBHOOK_SECRET || ''
        );
    }
}

export default new StripeService();
