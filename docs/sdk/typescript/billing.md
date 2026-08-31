---
title: Billing
description: Gommo VietQR topup via SDK
---

# Billing

Separate from `/gateway` — credit topup.

## Status and packages

```typescript
const status = await client.billing.status();
const packages = await client.billing.packages();
```

## Create Gommo payment (recommended)

```typescript
const me = await client.auth.me();
const username = me.userInfo?.username!;

const payment = await client.billing.createPayment({
  username,
  packageId: 'basic-member',
  invoiceBuyer: {
    type: 'consumer',
    name: 'Bán cho người tiêu dùng',
    email: '',
  },
  promoCode: 'OPTIONAL',
});

const orderCode = payment.data?.content ?? payment.data?.orderCode;
console.log(payment.data?.qrImage);
```

## Poll until paid

```typescript
const sync = await client.billing.syncPayment({ orderCode: String(orderCode) });
if (sync.data?.paid) console.log('Credits applied by Gommo');
```

## Order history

```typescript
const orders = await client.billing.listOrders(username, 20);
```

## Legacy PayOS

```typescript
const order = await client.billing.createTopup({ username, packageId: 'basic-member' });
```

Requires server `PAYOS_*` + merchant token.

See [Billing reference](../../reference/billing.md) and [Cookbook: Gommo VietQR](../../cookbook/gommo-topup.md).
