const auth = require('../CONFIGS/auth.json');
const bots = require('../CONFIGS/bots.json');

const stripe = require('stripe')(auth.stripeAPIToken);

async function updateSubscription(subscriptionId, data) {
    return await stripe.subscriptions.update(
        subscriptionId,
        {
            ...data
        }
    );
}

async function fetchSubscriptions(bot, customerId = null) {
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
}

async function createCheckout(userId, serverId, bot, plan = null) {
    const product = bots.products[bot];
    if (!product) {
        return false;
    }

    const priceId = Array.isArray(product.ids) ? (plan && product.ids[plan] ? product.ids[plan] : product.ids[0]) : product.id;
    if (!priceId) {
        return false;
    }

    const session = await stripe.checkout.sessions.create({
        success_url: product.success_url ? product.success_url.replace('{serverId}', serverId).replace('{userId}', userId) : undefined,
        cancel_url: product.cancel_url ? product.cancel_url.replace('{serverId}', serverId).replace('{userId}', userId) : undefined,
        allow_promotion_codes: true,
        subscription_data: {
            metadata: {
                productId: priceId,
                userId,
                serverId,
                bot,
                isCheckout: true,
            }
        },
        metadata: {
            productId: priceId,
            userId,
            serverId,
            bot,
            isCheckout: true,
        },
        line_items: [
            {price: priceId, quantity: 1},
        ],
        mode: product.mode ?? 'subscription',
    });

    return session.url;
}

async function cancelSubscription(subscriptionId, customerId, userId, serverId, bot) {
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
        subscriptionData = await stripe.subscriptions.update(subscriptionId, {
            cancel_at_period_end: true,
        });
    } catch (err) {
        console.log('[Stripe] => Failed to cancel subscription');
        console.log(err);
        return false;
    }

    if (!subscriptionData) {
        return false;
    }

    ws.emit('subscription-canceled', {
        userId,
        serverId,
        customerId,
        subscriptionId,
        bot,
    });

    return subscriptionData.cancel_at;
}

module.exports = {
    updateSubscription,
    fetchSubscriptions,
    createCheckout,
    cancelSubscription,
}
