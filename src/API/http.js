const express = require('express');
const StripeHelper = require("../STRIPE/helper");
const bots = require('../CONFIGS/bots');
const auth = require('../CONFIGS/auth');

module.exports = async () => {
    const app = global.http = express();

    app.set('trust proxy', 1);

    app.use((req, res, next) => {
        const token = req.headers['Authorization'];
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

        const billing_cycle_anchor = await StripeHelper.cancelSubscription(subscriptionId, customerId, userId, serverId, bot);
        if (!billing_cycle_anchor) {
            return res.status(400).json({
                status: 400,
                message: 'Failed to cancel subscription',
            });
        }

        return res.status(200).send({
            status: 200,
            data: {
                billing_cycle_anchor,
                serverId,
                userId,
                bot,
            },
        });
    });

    app.post('/successfully', express.raw({type: 'application/json'}), StripeHelper.handleWebhook.bind(StripeHelper));

    app.listen(6567, async () => {
        console.log('[API] => API is now listening on port 6567.');
    });
}
