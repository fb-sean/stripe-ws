const auth = require('../CONFIGS/auth.json');
const bots = require('../CONFIGS/bots.json');

const stripe = require('stripe')(auth.stripeAPIToken);

module.exports = {
    async createCheckout(userId, serverId, bot) {
        const product = bots.products.find(product => product.name === bot);
        if (!product) {
            return false;
        }

        const session = await stripe.checkout.sessions.create({
            success_url: product.success_url ? product.success_url.replace('{serverId}', serverId).replace('{userId}', userId) : undefined,
            cancel_url: product.cancel_url ? product.cancel_url.replace('{serverId}', serverId).replace('{userId}', userId) : undefined,
            allow_promotion_codes: true,
            subscription_data: {
                metadata: {
                    productId: product.id,
                    userId,
                    serverId,
                    bot,
                }
            },
            metadata: {
                productId: product.id,
                userId,
                serverId,
                bot,
            },
            line_items: [
                {price: product.id, quantity: 1},
            ],
            mode: product.mode ?? 'subscription',
        });

        return session.url;
    },
    async cancelSubscription(subscriptionId, customerId, userId, serverId, bot) {
        if (!ws) return false;

        if (!subscriptionId) {
            try {
                const subscriptions = await stripe.subscriptions.list({
                    customer: customerId,
                });

                subscriptionId = subscriptions?.data[0]?.id;
            } catch (err) {
            }
        }

        if (!subscriptionId) {
            return false;
        }

        let subscriptionData;

        try {
            subscriptionData = await stripe.subscriptions.cancel(subscriptionId, {
                prorate: true,
            });
        } catch (err) {
            return false;
        }

        if (!subscriptionData) {
            return false;
        }

        ws.emit('subscription-cancelled', {
            userId,
            serverId,
            bot,
        });

        return subscriptionData.billing_cycle_anchor;
    },
    async handleWebhook(req, res) {
        const header = stripe.webhooks.generateTestHeaderString({
            payload: req.body,
            secret: auth.stripeSecret,
        });

        let event;
        try {
            event = stripe.webhooks.constructEvent(req.body, header, auth.stripeSecret);
        } catch (err) {
            console.log(`Webhook Error: ${err.message}`);
            return res
                .status(400)
                .send({
                    status: 400,
                    message: `Webhook Error: ${err.message}`,
                });
        }

        const eventData = {
            ...event.data.object,
            ...event.data.metadata
        };

        switch (event.type) {
            case 'checkout.session.completed': {
                await this.processPayment(eventData);

                break;
            }
            case 'charge.succeeded': {
                await this.processPayment(eventData);

                break;
            }
            default:
                break;
        }

        return res.json({received: true});
    },
    async processPayment(eventData) {

    }
}
