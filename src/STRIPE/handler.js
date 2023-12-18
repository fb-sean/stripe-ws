const auth = require('../CONFIGS/auth.json');
const bots = require('../CONFIGS/bots.json');

const stripe = require('stripe')(auth.stripeAPIToken);

module.exports = {
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
