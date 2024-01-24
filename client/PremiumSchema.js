const mongoose = require('mongoose');

// @TODO: Add your mongodb collection name here
module.exports = mongoose.model('', mongoose.Schema({
    serverId: {
        type: String,
    },
    userId: {
        type: String,
    },
    customerId: {
        type: String,
    },
    subscriptionId: {
        type: String,
    },
    productId: {
        type: String,
    },
    canceled: {
        type: Boolean,
        default: false,
    },
    timestamp: {
        type: Number,
        default: Date.now(),
    },
}));
