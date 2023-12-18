const websocket = require('./API/websocket');
const http = require('./API/http');

console.log('[STRIPE-WS] => Starting websocket server...');
websocket();

console.log('[STRIPE-WS] => Starting API server...');
http();
