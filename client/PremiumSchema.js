const mongoose = require('mongoose');

module.exports = mongoose.model('',  mongoose.Schema({
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
    canceled: {
        type: Boolean,
        default: false,
    },
    timestamp: {
        type: Number,
        default: Date.now(),
    },
}));
