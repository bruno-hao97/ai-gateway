import type { InvoiceBuyer } from './user-api';

export type InvoiceTab = 'consumer' | 'personal' | 'company';

export const VAT_RATE = 0.05;

export const CONSUMER_INVOICE_NAME = 'Bán cho người tiêu dùng';

export interface InvoiceFormState {
  name: string;
  email: string;
  phone: string;
  address: string;
  nationalId: string;
  companyName: string;
  taxCode: string;
  recipientName: string;
  referralCode: string;
}

export function emptyInvoiceForm(defaultEmail = ''): InvoiceFormState {
  return {
    name: '',
    email: defaultEmail,
    phone: '',
    address: '',
    nationalId: '',
    companyName: '',
    taxCode: '',
    recipientName: '',
    referralCode: '',
  };
}

export function calcBillingTotals(amountVnd: number): {
  subtotalVnd: number;
  vatVnd: number;
  totalVnd: number;
} {
  const subtotalVnd = Math.max(0, Math.floor(amountVnd));
  const vatVnd = Math.round(subtotalVnd * VAT_RATE);
  return { subtotalVnd, vatVnd, totalVnd: subtotalVnd + vatVnd };
}

const DEFAULT_VND_USD_DISPLAY_RATE = 25_000;

/** Approximate VND→USD for EN catalog display only; checkout still charges VND. */
export function vndUsdDisplayRate(): number {
  const raw = import.meta.env.VITE_VND_USD_DISPLAY_RATE as string | undefined;
  const n = raw ? Number(raw) : DEFAULT_VND_USD_DISPLAY_RATE;
  return Number.isFinite(n) && n > 0 ? n : DEFAULT_VND_USD_DISPLAY_RATE;
}

export function formatApproxUsd(amountVnd: number): string {
  const usd = amountVnd / vndUsdDisplayRate();
  const formatted = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(usd);
  return `~${formatted}`;
}

export function billingCurrencyDisclaimer(isVi: boolean): string {
  return isVi
    ? ''
    : 'USD amounts are approximate. You will be charged in Vietnamese đồng (VND) via bank transfer.';
}

export function formatVnd(amount: number, isVi: boolean): string {
  return `${amount.toLocaleString(isVi ? 'vi-VN' : 'en-US')}đ`;
}

/** 79ai-style mask: `96247NFHR0` → `962****HR0` */
export function maskBankAccount(acc: string): string {
  const value = acc.trim();
  if (value.length <= 7) return value;
  return `${value.slice(0, 3)}****${value.slice(-4)}`;
}

/** Masked STK only — 79ai does not append store suffix on the payment modal. */
export function formatAccountDisplay(acc: string, _store?: string): string {
  return maskBankAccount(acc);
}

/** Shorter note on payment step to avoid modal scroll. */
export function formatInvoiceDeliveryNoteShort(
  buyer: InvoiceBuyer,
  isVi: boolean,
): string {
  if (buyer.type === 'consumer') {
    return isVi
      ? 'Gửi tới: Bán cho người tiêu dùng — không gửi email'
      : 'Recipient: Consumer — no email';
  }
  if (buyer.type === 'personal') {
    const parts = [buyer.name, buyer.national_id, buyer.email].filter(Boolean);
    const target = parts.join(' - ');
    return isVi ? `Gửi tới: ${target}` : `Sent to: ${target}`;
  }
  const target = [buyer.name, buyer.tax_code, buyer.email].filter(Boolean).join(' - ');
  return isVi ? `Gửi tới: ${target}` : `Sent to: ${target}`;
}

export function buildInvoiceBuyer(tab: InvoiceTab, form: InvoiceFormState): InvoiceBuyer {
  if (tab === 'consumer') {
    return {
      type: 'consumer',
      name: CONSUMER_INVOICE_NAME,
      email: '',
    };
  }

  if (tab === 'personal') {
    return {
      type: 'personal',
      name: form.name.trim(),
      email: form.email.trim(),
      phone: form.phone.trim(),
      address: form.address.trim(),
      national_id: form.nationalId.trim(),
      ...(form.referralCode.trim() ? { referral_code: form.referralCode.trim() } : {}),
    };
  }

  return {
    type: 'company',
    name: form.companyName.trim(),
    email: form.email.trim(),
    phone: form.phone.trim(),
    tax_code: form.taxCode.trim(),
    address: form.address.trim(),
    gui_name: form.recipientName.trim(),
  };
}

export function validateInvoiceForm(
  tab: InvoiceTab,
  form: InvoiceFormState,
  isVi: boolean,
): string | null {
  if (tab === 'consumer') return null;

  if (tab === 'personal') {
    if (!form.name.trim()) return isVi ? 'Vui lòng nhập họ và tên.' : 'Please enter your full name.';
    if (!form.address.trim()) return isVi ? 'Vui lòng nhập địa chỉ.' : 'Please enter your address.';
    if (!form.phone.trim()) return isVi ? 'Vui lòng nhập số điện thoại.' : 'Please enter your phone number.';
    if (!form.email.trim()) return isVi ? 'Vui lòng nhập email.' : 'Please enter your email.';
    if (!form.nationalId.trim()) {
      return isVi ? 'Vui lòng nhập CCCD / CMND.' : 'Please enter your national ID.';
    }
    return null;
  }

  if (!form.companyName.trim()) {
    return isVi ? 'Vui lòng nhập tên công ty hoặc hộ kinh doanh.' : 'Please enter company name.';
  }
  if (!form.taxCode.trim()) return isVi ? 'Vui lòng nhập mã số thuế.' : 'Please enter tax code.';
  if (!form.address.trim()) return isVi ? 'Vui lòng nhập địa chỉ công ty.' : 'Please enter company address.';
  if (!form.recipientName.trim()) {
    return isVi ? 'Vui lòng nhập họ tên người nhận hóa đơn.' : 'Please enter invoice recipient name.';
  }
  if (!form.email.trim()) return isVi ? 'Vui lòng nhập email nhận hóa đơn.' : 'Please enter invoice email.';
  if (!form.phone.trim()) return isVi ? 'Vui lòng nhập số điện thoại.' : 'Please enter phone number.';
  return null;
}

export function formatInvoiceDeliveryNote(buyer: InvoiceBuyer, isVi: boolean): string {
  if (buyer.type === 'consumer') {
    return isVi
      ? 'Hóa đơn sẽ được gửi sau khi thanh toán thành công. Gửi tới: Bán cho người tiêu dùng — không gửi email'
      : 'Invoice after payment. Recipient: Consumer — no email';
  }
  if (buyer.type === 'personal') {
    const parts = [buyer.name, buyer.national_id, buyer.email].filter(Boolean);
    const target = parts.join(' - ');
    return isVi
      ? `Hóa đơn sẽ được gửi sau khi thanh toán thành công. Gửi tới: ${target}`
      : `Invoice after payment. Sent to: ${target}`;
  }
  const target = [buyer.name, buyer.tax_code, buyer.email].filter(Boolean).join(' - ');
  return isVi
    ? `Hóa đơn sẽ được gửi sau khi thanh toán thành công. Gửi tới: ${target}`
    : `Invoice after payment. Sent to: ${target}`;
}
