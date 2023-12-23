const express = require('express');
const StripeHelper = require("../STRIPE/helper");
const StripeHandler = require("../STRIPE/handler");
const bots = require('../CONFIGS/bots');
const auth = require('../CONFIGS/auth');

module.exports = () => {
    const app = global.http = express();

    app.set('trust proxy', 1);

    app.use((req, res, next) => {
        if (req.originalUrl === '/successfully') {
            next();

            return;
        }

        const token = req.headers['authorization'];
        if (!token) return res.status(400).json({
            status: 400,
            message: 'You need to pass a token!',
        });

        if (auth.httpToken !== token) return res.status(400).json({
            status: 400,
            message: 'Invalid token!',
        });

        next();
    });

    app.use((req, res, next) => {
        if (req.originalUrl === '/successfully') {
            next();
        } else {
            express.json()(req, res, next);
        }
    });

    app.post('/create', async (req, res) => {
        const {
            userId,
            serverId,
            bot,
        } = req.body;

        if (!userId || !serverId || !bot) return res.status(400).json({
            status: 400,
            message: 'Missing parameters',
        });

        if (!bots.allowed.includes(bot)) {
            return res.status(400).json({
                status: 400,
                message: 'Invalid bot',
            });
        }

        const link = await StripeHelper.createCheckout(userId, serverId, bot);

        if (!link) {
            return res.status(400).json({
                status: 400,
                message: 'Failed to create checkout',
            });
        }

        return res.status(200).send({
            status: 200,
            link
        });
    });

    app.get('/subscriptions/:bot', async (req, res) => {
        const {bot} = req.params;

        if (!bots.allowed.includes(bot)) {
            return res.status(400).json({
                status: 400,
                message: 'Invalid bot',
            });
        }

        const subscriptions = await StripeHelper.fetchSubscriptions(bot);
        if (!subscriptions) {
            return res.status(400).json({
                status: 400,
                message: 'Failed to fetch subscriptions',
            });
        }

        return res.status(200).send({
            status: 200,
            subscriptions,
        });
    });

    app.post('/cancel', async (req, res) => {
        const {
            subscriptionId,
            customerId,
            userId,
            serverId,
            bot
        } = req.body;

        if ((!subscriptionId && !customerId) || !bot) return res.status(400).json({
            status: 400,
            message: 'Missing parameters',
        });

        if (!bots.allowed.includes(bot)) {
            return res.status(400).json({
                status: 400,
                message: 'Invalid bot',
            });
        }

        const cancel_at = await StripeHelper.cancelSubscription(subscriptionId, customerId, userId, serverId, bot);
        if (!cancel_at) {
            return res.status(400).json({
                status: 400,
                message: 'Failed to cancel subscription',
            });
        }

        return res.status(200).send({
            status: 200,
            data: {
                cancel_at,
                serverId,
                userId,
                bot,
            },
        });
    });

    app.post('/successfully', express.raw({type: 'application/json'}), StripeHandler.handleWebhook.bind(StripeHelper));

    app.listen(4854, async () => {
        console.log('[API] => API is now listening on port 4854.');
    });
}
