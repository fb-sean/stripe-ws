const {createServer} = require('http');
const {Server} = require('socket.io');
const StripeHelper = require("../STRIPE/helper");
const bots = require("../CONFIGS/bots.json");

const httpServer = createServer();

const io = global.ws = new Server(httpServer, {});

module.exports = async () => {
    io.on('connection', client => {
        client.on('disconnect', () => {
            console.log('[Websocket] => User disconnected.');
        });

        client.on('create-checkout', async (data) => {
            const {
                userId,
                serverId,
                bot,
            } = data;

            if (!userId || !serverId || !bot) return;

            if (!bots.allowed.includes(bot)) {
                return;
            }

            const link = await StripeHelper.createCheckout(userId, serverId, bot);

            client.emit('checkout-link', {
                bot,
                userId,
                serverId,
                link,
            });
        })
    });

    httpServer.listen(8658);
}
