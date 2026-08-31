---
title: Billing
description: Nạp credit Gommo VietQR qua SDK
---

# Billing

Tách khỏi `/gateway` — nạp credit.

## Status và gói

```typescript
const status = await client.billing.status();
const packages = await client.billing.packages();
```

## Tạo payment Gommo (khuyến nghị)

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
});

const orderCode = payment.data?.content ?? payment.data?.orderCode;
```

## Poll đến khi paid

```typescript
const sync = await client.billing.syncPayment({ orderCode: String(orderCode) });
```

## Lịch sử

```typescript
const orders = await client.billing.listOrders(username, 20);
```

## PayOS legacy

```typescript
await client.billing.createTopup({ username, packageId: 'basic-member' });
```

Xem [Billing reference](../../reference/billing.md) và [Cookbook Gommo VietQR](../../cookbook/gommo-topup.md).
