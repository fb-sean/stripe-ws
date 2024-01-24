const io = require('socket.io-client');
const axios = require('axios');
const premiumAPI = '';
const premiumWS = '';
const wsToken = '';
const httpToken = '';
const bot = '';
const Premium = require("./PremiumSchema");

class PremiumAPI {
    constructor() {
        this.socket = null;
    }

    static async cancelPremium(subscriptionId, customerId, userId, serverId) {
        const response = await axios.post(premiumAPI + 'cancel', {
            subscriptionId,
            customerId,
            userId,
            serverId,
            bot,
        }, {
            headers: {
                'Authorization': httpToken
            }
        }).catch(() => {
        });

        if (!response || !response.data || !response.data.data) {
            return null;
        }

        return response.data.data.cancel_at;
    }

    static async createPremiumCheckout(userId, serverId, plan) {
        const response = await axios.post(premiumAPI + 'create', {
            userId,
            serverId,
            bot,
            plan,
        }, {
            headers: {
                'Authorization': httpToken
            }
        }).catch(() => {
        });

        if (!response || !response.data || !response.data.link) {
            return null;
        }

        return response.data.link;
    }

    connect() {
        this.socket = io(premiumWS, {
            query: {
                token: wsToken
            },
            reconnection: true,
            reconnectionAttempts: Infinity,
            reconnectionDelay: 1000,
            reconnectionDelayMax: 5000,
            randomizationFactor: 0.5
        });

        this.socket.on('connect', () => {
            console.info('Connected to premium websocket.');
        });

        this.socket.on('disconnect', (reason) => {
            console.error(`Disconnected from premium websocket. Reason: ${reason}`);
        });

        this.socket.on('reconnect_attempt', (attemptNumber) => {
            console.info(`Reconnect attempt #${attemptNumber}`);
        });

        this.socket.on('reconnect_error', (error) => {
            console.error(`Reconnection error: ${error}`);
        });

        this.socket.on('reconnect_failed', () => {
            console.error('Failed to reconnect to the premium websocket.');
        });

        this.listenToEvents();
    }

    listenToEvents() {
        /*
        * Data is always
        * {
        * userId,
        * serverId,
        * customerId,
        * subscriptionId,
        * productId, // Can be used to check which plan the user have ex: yearly, monthly
        * bot,
        * }
        */

        this.socket.on('subscription-created', async (data) => {
            if (data.bot !== bot) return;

            await this.handleCreate(data.userId, data.serverId, data.customerId, data.subscriptionId, data.productId);
        });

        this.socket.on('subscription-renewed', async (data) => {
            if (data.bot !== bot) return;

            await this.handleRenew(data.userId, data.serverId, data.customerId, data.subscriptionId, data.productId);
        });

        this.socket.on('subscription-ended', async (data) => {
            if (data.bot !== bot) return;

            await this.handleEnd(data.userId, data.serverId, data.customerId, data.subscriptionId, data.productId);
        });

        this.socket.on('subscription-canceled', async (data) => {
            if (data.bot !== bot) return;

            await this.handleCanceled(data.userId, data.serverId, data.customerId, data.subscriptionId, data.productId);
        });

        this.socket.on('subscription-expiring', async (data) => {
            if (data.bot !== bot) return;

            await this.handleExpiring(data.userId, data.serverId, data.customerId, data.subscriptionId, data.productId);
        });
    }

    async handleCreate(userId, serverId, customerId, subscriptionId, productId) {
        console.info(`Subscription created for ${userId} on ${serverId}`);

        await Premium.create({
            serverId,
            userId,
            customerId,
            subscriptionId,
            productId,
            timestamp: Date.now(),
        });
    }

    async handleRenew(userId, serverId, customerId, subscriptionId, productId) {
        console.info(`Subscription renewed for ${userId} on ${serverId}`);
    }

    async handleEnd(userId, serverId, customerId, subscriptionId, productId) {
        console.info(`Subscription ended for ${userId} on ${serverId}`);

        await Premium.deleteOne({
            serverId,
            subscriptionId, // When you use multiple plans you need this, else you might delete the wrong subscription
            userId,
        });
    }

    async handleCanceled(userId, serverId, customerId, subscriptionId, productId) {
        console.info(`Subscription canceled for ${userId} on ${serverId}`);

        await Premium.updateOne({
            serverId,
            subscriptionId, // When you use multiple plans you need this, else you might delete the wrong subscription
            userId,
        }, {
            canceled: true,
        });
    }

    async handleExpiring(userId, serverId, customerId, subscriptionId, productId) {
        console.info(`Subscription expiring for ${userId} on ${serverId} soon`);
    }
}

module.exports = PremiumAPI;
