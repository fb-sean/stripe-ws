const auth = require('../CONFIGS/auth.json');
const bots = require('../CONFIGS/bots.json');

const stripe = require('stripe')(auth.stripeAPIToken);

module.exports = {
    async updateSubscription(subscriptionId, oldMetaData, newMetaData) {
        return await stripe.subscriptions.update(
            subscriptionId,
            {
                metadata: {
                    ...oldMetaData,
                    ...newMetaData
                },
            }
        );
    },
    async fetchSubscriptions(bot, customerId = null) {
        let allSubscriptions = [];
        let lastSubscriptionId = null;

        const baseParams = {
            limit: 100,
            customer: customerId ?? undefined,
        };

        while (true) {
            const params = {
                ...baseParams
            };

            if (lastSubscriptionId) params.starting_after = lastSubscriptionId;

            const response = await stripe.subscriptions.list(params);
            const filteredSubscriptions = response.data.filter(subscription => subscription.metadata.bot === bot);
            allSubscriptions.push(...filteredSubscriptions);

            if (!response.has_more) break;
            lastSubscriptionId = response.data[response.data.length - 1].id;
        }

        return allSubscriptions;
    },
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
                    isCheckout: true,
                }
            },
            metadata: {
                productId: product.id,
                userId,
                serverId,
                bot,
                isCheckout: true,
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

        // This does not mean the subscription is ended!
        ws.emit('subscription-cancelled', {
            userId,
            serverId,
            customerId,
            subscriptionId,
            bot,
        });

        return subscriptionData.billing_cycle_anchor;
    }
}
