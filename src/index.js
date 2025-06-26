const websocket = require('./API/websocket');
const http = require('./API/http');

console.log(`${new Date().toISOString()} -> [STRIPE-WS] => Starting websocket server...`);
websocket();

console.log(`${new Date().toISOString()} -> [STRIPE-WS] => Starting API server...`);
http();