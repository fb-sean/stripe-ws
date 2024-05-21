const auth = require('../CONFIGS/auth.json');
const bots = require('../CONFIGS/bots.json');
const StripeHelper = require("./helper");

const stripe = require('stripe')(auth.stripeAPIToken);

async function handleWebhook(req, res) {
    const header = stripe.webhooks.generateTestHeaderString({
        payload: req.body,
        secret: auth.stripeSecret,
    });

    let event;
    try {
        event = stripe.webhooks.constructEvent(req.body, header, auth.stripeSecret);
    } catch (err) {
        console.log(`${new Date().toISOString()} -> Webhook Error: ${err.message}`);
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

    await delay(5000); // Might fix an issue with sub not existing

    // Events: https://stripe.com/docs/api/events/types
    switch (event.type) {
        case 'checkout.session.completed': {
            await processPayment(eventData);

            break;
        }
        case 'charge.succeeded': {
            await processPayment(eventData);

            break;
        }
        case 'charge.failed': {

            await processFailedPayment(eventData);

            break;
        }
        case 'customer.subscription.deleted': {
            await processCancel(eventData);

            break;
        }
        case 'subscription_schedule.expiring': {

            await processExpiring(eventData);

            break;
        }
        default:
            break;
    }

    return res.json({received: true});
}

async function processFailedPayment(eventData) {
    const {
        customer,
        failure_message
    } = eventData;

    if (!customer) return;

    const subscriptions = await StripeHelper.fetchSubscriptions(bot ?? 'memer', customer); // 'memer' because of old customers who didn't have a bot metadata
    const subscription = Array.isArray(subscriptions) ? subscriptions[0] : subscriptions;

    if (!subscription?.id) {
        return console.log(`${new Date().toISOString()} -> Webhook Issue: Customer without subscription ID: ${customer} BOT: ${bot} USER: ${userId} SERVER: ${serverId} PRODUCT: ${productId}`);
    }

    const {
        userId,
        serverId,
        bot,
        productId,
    } = subscription.metadata;

    ws.emit('subscription-payment-failed', {
        userId,
        serverId,
        customerId: customer,
        subscriptionId: subscription.id,
        productId,
        bot,
    });
}

async function processPayment(eventData) {
    const {
        customer,
        metadata
    } = eventData;

    const {
        userId,
        serverId,
        bot,
        isCheckout,
        productId,
    } = metadata;

    if (!customer || !bot) return;

    const subscriptions = await StripeHelper.fetchSubscriptions(bot ?? 'memer', customer); // 'memer' because of old customers who didn't have a bot metadata
    const subscription = Array.isArray(subscriptions) ? subscriptions[0] : subscriptions;

    if (!subscription?.id) {
        return console.log(`${new Date().toISOString()} -> Webhook Issue: Customer without subscription ID: ${customer} BOT: ${bot} USER: ${userId} SERVER: ${serverId} PRODUCT: ${productId}`);
    }

    if (isCheckout) {
        const newMetadata = {
            ...metadata,
            isCheckout: false,
        }

        await StripeHelper.updateSubscription(subscription.id, {
            metadata: newMetadata,
        });

        ws.emit('subscription-session-completed', {
            userId,
            serverId,
            customerId: customer,
            subscriptionId: subscription.id,
            productId,
            bot,
        });
    } else {
        ws.emit('subscription-payment-succeeded', {
            userId,
            serverId,
            customerId: customer,
            subscriptionId: subscription.id,
            productId,
            bot,
        });
    }
}

function processCancel(eventData) {
    // EventData: https://stripe.com/docs/api/subscriptions/object
    const {
        metadata: {
            userId,
            serverId,
            productId,
            bot,
        },
        id,
        customer
    } = eventData;

    ws.emit('subscription-ended', {
        userId,
        serverId,
        customerId: customer,
        subscriptionId: id,
        productId,
        bot,
    });
}

function processExpiring(eventData) {
    const {
        metadata: {
            userId,
            serverId,
            productId,
            bot,
        },
        subscription,
        customer
    } = eventData;

    // Occurs 7 days before a subscription schedule will expire.
    ws.emit('subscription-expiring', {
        userId,
        serverId,
        customerId: customer,
        subscriptionId: subscription,
        productId,
        bot,
    });
}

function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

module.exports = {
    handleWebhook,
};
