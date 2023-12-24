# Stripe-WS

## Introduction
**Stripe-WS** is a practical example showcasing the integration of Stripe for payment processing in applications that utilize websockets for communication. This microservice demonstrates how to configure and use Stripe across multiple services, enabling seamless interactions through websockets.

## How to Use
To get started with Stripe-WS:

1. **Explore the Code:** Familiarize yourself with the source code to understand how Stripe is integrated and how websockets are used for communication between services.
2. **Clone and Configure:** Clone this repository to your local machine. Before running the application, you'll need to set up your configuration files as described below.
3. **Understand the License:** Ensure you read and comply with the license terms of this repository.

## Configuration Files
You need to create and configure the following JSON files:

### `src/CONFIGS/auth.json`
This file contains authentication tokens necessary for Stripe and websocket communication.
```json
{
  "wsToken": "<your_websocket_token>",
  "httpToken": "<your_http_token>",
  "stripeAPIToken": "<your_stripe_api_token>",
  "stripeSecret": "<your_stripe_secret_key>"
}
```

### `src/CONFIGS/bots.json`
This file specifies the allowed bots and product configurations for Stripe transactions.
```json
{
  "allowed": [
    "bot_name",
    ...
  ],
  "products": {
    "bot_name": {
      "id": "<product_id>",
      "success_url": "<url_on_success>",
      "cancel_url": "<url_on_cancel>"
    },
    ...
  }
}
```

## Dynamic URLs with Placeholders
In the `bots.json` file, you can use placeholders in `success_url` and `cancel_url` fields, which will be dynamically replaced:

- `{serverId}`: Replaced with the server ID where the transaction is initiated.
- `{userId}`: Replaced with the user ID initiating the transaction.

## Contributions and Feedback
Your contributions and feedback are welcome to improve this project. Feel free to submit issues or pull requests for enhancements.


