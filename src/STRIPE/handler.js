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
        case 'customer.subscription.deleted': {
            await processCancel(eventData);

            break;
        }
        default:
            break;
    }

    return res.json({received: true});
};

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
    } = metadata;

    if (!customer) return;

    const subscriptions = await StripeHelper.fetchSubscriptions(bot ?? 'memer', customer); // 'memer' because of old customers who didn't have a bot metadata
    if (isCheckout) {
        await StripeHelper.updateSubscription(subscriptions[0].id, metadata, {
            isCheckout: false,
        });

        ws.emit('subscription-created', {
            userId,
            serverId,
            customerId: customer,
            subscriptionId: subscriptions[0].id,
            bot,
        });
    } else {
        ws.emit('subscription-renewed', {
            userId,
            serverId,
            customerId: customer,
            subscriptionId: subscriptions[0].id,
            bot,
        });
    }
};

async function processCancel(eventData) {
    // EventData: https://stripe.com/docs/api/subscriptions/object

    const {
        metadata: {
            userId,
            serverId,
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
        bot,
    });
};

module.exports = {
    handleWebhook,
    processPayment,
    processCancel,
};
