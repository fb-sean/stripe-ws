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

async function fetchSubscriptions(bot = null, customerId = null) {
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
        const filteredSubscriptions = bot ? response.data.filter(subscription => subscription.metadata.bot === bot) : response.data;
        allSubscriptions.push(...filteredSubscriptions);

        if (!response.has_more) break;
        lastSubscriptionId = response.data[response.data.length - 1].id;
    }

    return allSubscriptions;
}

async function fetchSubscription(subscriptionId, customerId) {
    const subscription = await stripe.subscriptions.retrieve(subscriptionId).catch(() => {
    });
    const customer = await stripe.customers.retrieve(customerId).catch(() => {
    });

    if (!subscription?.id || !customer?.id) {
        return null;
    }

    return {
        nextPayment: subscription.current_period_end,
        lastPayment: subscription.current_period_start,
        customer: {
            address: customer.address,
            email: customer.email,
        },
        discount: subscription.discount ? {
            code: subscription.discount.coupon.name,
            percent_off: subscription.discount.coupon.percent_off,
            duration: subscription.discount.coupon.duration,
        } : null
    };
}

async function createCheckout(userId, serverId = 'none', bot, plan = null) {
    const product = bots.products[bot];
    if (!product) {
        return false;
    }

    const priceId = typeof product.ids === 'object' ? (plan && product.ids[plan] ? product.ids[plan] : [...Object.values(product.ids)][0]) : product.id;
    if (!priceId) {
        return false;
    }

    const session = await stripe.checkout.sessions.create({
        success_url: product.success_url ? product.success_url.replaceAll('{serverId}', serverId).replaceAll('{userId}', userId) : undefined,
        cancel_url: product.cancel_url ? product.cancel_url.replaceAll('{serverId}', serverId).replaceAll('{userId}', userId) : undefined,
        allow_promotion_codes: true,
        billing_address_collection: 'required',
        consent_collection: {
            terms_of_service: 'required',
        },
        managed_payments: {
            enabled: true,
        },
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
    }, {
        apiVersion: '2025-11-17.clover; managed_payments_preview=v1'
    });

    return session.url;
}

async function createCustomCheckoutWithPrice(userId, bot, price, additionalData = {}) {
    const product = bots.products[bot];
    if (!product) {
        return false;
    }

    if (!price) {
        return false;
    }

    const session = await stripe.checkout.sessions.create({
        customer_email: additionalData?.email ?? undefined,
        success_url: product.success_url.replaceAll('{userId}', userId).replaceAll('{serverId}', additionalData.serverId ?? ''),
        cancel_url: product.cancel_url.replaceAll('{userId}', userId).replaceAll('{serverId}', additionalData.serverId ?? ''),
        allow_promotion_codes: true,
        billing_address_collection: 'required',
        consent_collection: {
            terms_of_service: 'required',
        },
        managed_payments: {
            enabled: true,
        },
        metadata: {
            ...additionalData,
            bot,
            userId,
            isCheckout: true,
        },
        line_items: [
            {
                price_data: {
                    currency: 'usd',
                    unit_amount: price,
                    product_data: {
                        name: 'Custom Payment',
                    }
                }, quantity: 1
            },
        ],
        invoice_creation: {
            enabled: true,
            invoice_data: {
                metadata: {
                    userId,
                    bot,
                    ...additionalData,
                },
            },
        },
        mode: 'payment',
    }, {
        apiVersion: '2025-11-17.clover; managed_payments_preview=v1'
    });

    return session.url;
}

async function createBillingPortalSession(customerId, bot) {
    const product = bots.products[bot];
    if (!product) {
        return null;
    }

    const session = await stripe.billingPortal.sessions.create({
        customer: customerId,
        return_url: product.dashboard_url ?? undefined,
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
        console.log(`${new Date().toISOString()} -> [Stripe] => Failed to cancel subscription`);
        console.log(err);
        return false;
    }

    if (!subscriptionData) {
        return false;
    }

    console.log(`${new Date().toISOString()} -> [Websocket] => Sending subscription-canceled for ${userId}`);

    ws.emit('subscription-canceled', {
        userId,
        serverId,
        customerId,
        subscriptionId,
        productId: subscriptionData?.metadata?.productId ?? null,
        bot,
    });

    return subscriptionData.cancel_at;
}

module.exports = {
    updateSubscription,
    fetchSubscriptions,
    createCheckout,
    cancelSubscription,
    fetchSubscription,
    createCustomCheckoutWithPrice,
    createBillingPortalSession
}
