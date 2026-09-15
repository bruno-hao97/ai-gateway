---
title: Authentication
description: Login และ Bearer token ด้วย @ai-gateway/client
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
// Token ถูกเก็บบน client อัตโนมัติ
```

## Token ที่ออกให้แล้ว

```typescript
const client = new GatewayClient({
  baseUrl: 'http://localhost:3001',
  accessToken: process.env.GATEWAY_TOKEN,
});
```

## โปรไฟล์ผู้ใช้ + credits

```typescript
const me = await client.auth.me('79ai.net');
const credits = me.balancesInfo?.credits_ai;
const username = me.userInfo?.username ?? me.data?.username;
```

ใช้ `username` สำหรับ [Billing topup](./billing.md)

## อัปเดต token เอง

```typescript
client.setAccessToken(newToken);
```
