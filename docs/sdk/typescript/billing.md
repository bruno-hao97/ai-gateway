---
title: Billing
description: PayOS topup via SDK
---

# Billing

Separate from `/gateway` — credit topup.

## Status and packages

```typescript
const status = await client.billing.status();
const packages = await client.billing.packages();
```

## Create topup

```typescript
const me = await client.auth.me();
const username = me.userInfo?.username!;

const order = await client.billing.createTopup({
  username,
  packageId: 'basic-member',
});

console.log(order.data?.url);       // PayOS checkout
console.log(order.data?.orderCode);
```

## Poll order

```typescript
await client.billing.getOrder(order.data!.orderCode!);
```

See [Billing reference](../../reference/billing.md) and [Cookbook: PayOS](../../cookbook/payos-topup.md).
