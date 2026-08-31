export interface CreditPackage {
  id: string;
  /**
   * Gommo `key` from POST .../subscriptions/credit_plans — sent as `id_base` on create_payment.
   * Synced from 79ai.net `credit_plans` + `/prices` display (2026-08).
   */
  gommoIdBase: string;
  name: string;
  /** Pre-VAT plan price (`priceVND` on 79ai /prices). */
  amountVnd: number;
  credits: number;
  /** Credit bonus percent (`sale` on credit_plans — shown as +X% Thưởng on 79ai). */
  bonusPercent: number;
  featured?: boolean;
}

/** Static mirror of Gommo `credit_plans` for domain 79ai.net. */
export const CREDIT_PACKAGES: readonly CreditPackage[] = [
  {
    id: 'basic-member',
    gommoIdBase: 'credit-basic',
    name: 'BASIC MEMBER',
    amountVnd: 50_000,
    credits: 50_000,
    bonusPercent: 0,
  },
  {
    id: 'vip-member',
    gommoIdBase: 'credit-vip',
    name: 'VIP MEMBER',
    amountVnd: 200_000,
    credits: 210_000,
    bonusPercent: 5,
  },
  {
    id: 'ultra-member',
    gommoIdBase: 'credit-ultra',
    name: 'ULTRA MEMBER',
    amountVnd: 1_000_000,
    credits: 1_100_000,
    bonusPercent: 10,
    featured: true,
  },
  {
    id: 'infinity-member',
    gommoIdBase: 'credit-infinity',
    name: 'INFINITY MEMBER',
    amountVnd: 5_000_000,
    credits: 5_600_000,
    bonusPercent: 12,
  },
  {
    id: 'agency-pro',
    gommoIdBase: 'credit-agency',
    name: 'AGENCY PRO',
    amountVnd: 10_000_000,
    credits: 11_500_000,
    bonusPercent: 15,
  },
];

export function getCreditPackage(packageId: string): CreditPackage | undefined {
  return CREDIT_PACKAGES.find((item) => item.id === packageId);
}
