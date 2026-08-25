---
title: Authentication
description: Login and Bearer token with @ai-gateway/client
---

# Authentication

## Login

```typescript
const client = new GatewayClient({ baseUrl: 'http://localhost:3001' });

const { access_token } = await client.auth.login({
  email: 'you@example.com',
  password: 'secret',
  domain: '79ai.net',
});
// Token is stored on client automatically
```

## Pre-issued token

```typescript
const client = new GatewayClient({
  baseUrl: 'http://localhost:3001',
  accessToken: process.env.GATEWAY_TOKEN,
});
```

## User profile + credits

```typescript
const me = await client.auth.me('79ai.net');
const credits = me.balancesInfo?.credits_ai;
const username = me.userInfo?.username ?? me.data?.username;
```

Use `username` for [Billing topup](./billing.md).

## Manual token update

```typescript
client.setAccessToken(newToken);
```
