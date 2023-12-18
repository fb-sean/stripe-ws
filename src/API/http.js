const express = require('express');
const StripeHelper = require("../STRIPE/helper");
const bots = require('../CONFIGS/bots');

module.exports = async () => {
    const app = express();

    app.set('trust proxy', 1);

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

        return await StripeHelper.createCheckout(userId, serverId, bot);
    });

    app.post('/successfully', express.raw({type: 'application/json'}), () => {

    });

    app.listen(6567, async () => {

    });
}
