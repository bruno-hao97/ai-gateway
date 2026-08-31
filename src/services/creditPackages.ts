export interface CreditPackage {
  id: string;
  /**
   * Gommo `id_base` for POST .../subscriptions/create_payment.
   * Naming follows 79ai (`credit-basic`, `credit-vip`, …). Only `credit-basic` is confirmed
   * from live Network capture; verify others against your Gommo domain before production.
   */
  gommoIdBase: string;
  name: string;
  amountVnd: number;
  credits: number;
  bonusPercent: number;
  featured?: boolean;
}

export const CREDIT_PACKAGES: readonly CreditPackage[] = [
  {
    id: 'basic-member',
    gommoIdBase: 'credit-basic',
    name: 'BASIC - MEMBER',
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
    credits: 5_750_000,
    bonusPercent: 12,
  },
  {
    id: 'agency-pro',
    gommoIdBase: 'credit-agency-pro',
    name: 'AGENCY PRO',
    amountVnd: 10_000_000,
    credits: 11_500_000,
    bonusPercent: 15,
  },
  {
    id: 'master-agency',
    gommoIdBase: 'credit-master-agency',
    name: 'MASTER AGENCY',
    amountVnd: 20_000_000,
    credits: 24_000_000,
    bonusPercent: 20,
  },
];

export function getCreditPackage(packageId: string): CreditPackage | undefined {
  return CREDIT_PACKAGES.find((item) => item.id === packageId);
}
