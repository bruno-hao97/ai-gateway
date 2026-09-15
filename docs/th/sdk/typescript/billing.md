---
title: Billing
description: Gommo VietQR topup ผ่าน SDK
---

# Billing

แยกจาก `/gateway` — เติม credits

## สถานะและแพ็กเกจ

```typescript
const status = await client.billing.status();
const packages = await client.billing.packages();
```

## สร้างการชำระ Gommo (แนะนำ)

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

## Poll จนชำระแล้ว

```typescript
const sync = await client.billing.syncPayment({ orderCode: String(orderCode) });
if (sync.data?.paid) console.log('Credits applied by Gommo');
```

## ประวัติคำสั่งซื้อ

```typescript
const orders = await client.billing.listOrders(username, 20);
```

## PayOS legacy

```typescript
const order = await client.billing.createTopup({ username, packageId: 'basic-member' });
```

ต้องมี `PAYOS_*` บน server + merchant token

ดู [Billing reference](../../reference/billing.md) และ [Cookbook: Gommo VietQR](../../cookbook/gommo-topup.md)
