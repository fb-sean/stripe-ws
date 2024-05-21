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

## Events
- subscription-payment-failed | Happens when a subscription payment fails. **Use that to invalidate the subscription.**
- subscription-session-completed | Happens when a subscription session is completed. 
- subscription-payment-succeeded | Happens when a subscription payment is successful. **Use that to validate the subscription.**
- subscription-ended | Happens when a subscription is ended. **Use that to delete the subscription.**
- subscription-expiring | Happens 7 days before a subscription expires. 
- subscription-canceled | Happens when a user cancels a subscription. 

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
You can choose either provide an id array to support multiple plans or a single id for a single plan.
```json
{
  "allowed": [
    "bot_name",
    ...
  ],
  "products": {
    "bot_name": {
      "id": "<price_id>",
      "ids": {
        "monthly": "<price_id>", 
        "yearly": "<price_id>"
      },
      "success_url": "<url_on_success>",
      "cancel_url": "<url_on_cancel>"
    },
    ...
  }
}
```

### `src/CONFIGS/port.json`
This file specifies the ports the service should run on.
```json
{
  "httpPort": 8080, // Default: 4854
  "wsPort": 8081 // Default: 4855
}
```

## Dynamic URLs with Placeholders
In the `bots.json` file, you can use placeholders in `success_url` and `cancel_url` fields, which will be dynamically replaced:

- `{serverId}`: Replaced with the server ID where the transaction is initiated.
- `{userId}`: Replaced with the user ID initiating the transaction.

## Contributions and Feedback
Your contributions and feedback are welcome to improve this project. Feel free to submit issues or pull requests for enhancements.


