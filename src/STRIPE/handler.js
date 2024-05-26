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
        case 'invoice.payment_failed': {
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
        subscription: subscriptionId,
        subscription_details: {
            metadata
        },
        customer
    } = eventData;

    if (!customer) return;

    if (!subscriptionId) {
        return console.log(`${new Date().toISOString()} -> Webhook Issue: Customer without subscription ID: ${customer}`);
    }

    const {
        userId,
        serverId,
        bot,
        productId,
    } = metadata;

    ws.emit('subscription-payment-failed', {
        userId,
        serverId,
        customerId: customer,
        subscriptionId: subscriptionId,
        productId,
        bot,
    });
}

async function processPayment(eventData) {
    const {
        customer,
    } = eventData;

    let metadata = eventData.metadata ?? null;
    let subscriptionId = eventData.subscription ?? null;
    if (!metadata || !subscriptionId) {
        const subscriptions = await StripeHelper.fetchSubscriptions(null, customer);
        const subscription = Array.isArray(subscriptions) ? subscriptions[0] : subscriptions;

        if (!subscription?.id) {
            return console.log(`${new Date().toISOString()} -> Webhook Issue: Customer without subscription ID: ${customer}`);
        }

        metadata = subscription.metadata;
        subscriptionId = subscription.id;
    }

    const {
        userId,
        serverId,
        bot,
        isCheckout,
        productId,
    } = metadata;

    if (isCheckout) {
        const newMetadata = {
            ...metadata,
            isCheckout: false,
        }

        await StripeHelper.updateSubscription(subscriptionId, {
            metadata: newMetadata,
        });

        ws.emit('subscription-session-completed', {
            userId,
            serverId,
            customerId: customer,
            subscriptionId: subscriptionId,
            productId,
            bot,
        });
    } else {
        ws.emit('subscription-payment-succeeded', {
            userId,
            serverId,
            customerId: customer,
            subscriptionId: subscriptionId,
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
