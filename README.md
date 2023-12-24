# Stripe-WS
> What is this? 

Simple this code is a example of how to use Stripe at multiple services and talk with each other with a websocket.

> How to use?

You can check the source and also use it, but you need to read the license of this repository.


> How should the configs look like?

### auth.json
```json
{
  "wsToken": "",
  "httpToken": "",
  "stripeAPIToken": "",
  "stripeSecret": ""
}
```

### bots.json
```json
{
  "allowed": [
    "memer"
    ...
  ],
  "products": {
    "memer": {
      "id": "",
      "success_url": "",
      "cancel_url": ""
    },
    ...
  }
}
```

> Are there any placeholders in the cancel and success url? YES

### Placeholders
```js
{serverId} // The server id
{userId} // The user id
```




