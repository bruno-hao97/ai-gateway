import type { InvoiceBuyer } from './user-api';
import { pickMsg, type PortalLocale } from './portal-locale';

type BillingLocale = PortalLocale;

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

function normalizeBillingLocale(localeOrVi: BillingLocale | boolean): BillingLocale {
  if (typeof localeOrVi === 'boolean') return localeOrVi ? 'vi' : 'en';
  return localeOrVi;
}

/** 79ai /prices footer: total incl. 5% VAT. */
export function formatPayTotalLine(amountVnd: number, localeOrVi: BillingLocale | boolean): string {
  const locale = normalizeBillingLocale(localeOrVi);
  const totalVnd = calcBillingTotals(amountVnd).totalVnd;
  const numLocale = locale === 'vi' ? 'vi-VN' : locale === 'th' ? 'th-TH' : 'en-US';
  const formatted = totalVnd.toLocaleString(numLocale);
  if (locale === 'vi') return `Thanh toán ${formatted}đ VAT 5%`;
  if (locale === 'th') return `ชำระ ${formatted}đ รวม VAT 5%`;
  return `Pay ${formatted}đ incl. 5% VAT`;
}

export function billingCurrencyDisclaimer(localeOrVi: BillingLocale | boolean): string {
  const locale = normalizeBillingLocale(localeOrVi);
  if (locale === 'vi') return '';
  if (locale === 'th') {
    return 'ยอด USD เป็นค่าประมาณ — เรียกเก็บเป็นดองเวียด (VND) ผ่านการโอนเงิน';
  }
  return 'USD amounts are approximate. You will be charged in Vietnamese đồng (VND) via bank transfer.';
}

export function formatVnd(amount: number, localeOrVi: BillingLocale | boolean): string {
  const locale = normalizeBillingLocale(localeOrVi);
  const numLocale = locale === 'vi' ? 'vi-VN' : locale === 'th' ? 'th-TH' : 'en-US';
  return `${amount.toLocaleString(numLocale)}đ`;
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
  localeOrVi: BillingLocale | boolean,
): string {
  const locale = normalizeBillingLocale(localeOrVi);
  if (buyer.type === 'consumer') {
    return pickMsg(
      locale,
      'Recipient: Consumer — no email',
      'Gửi tới: Bán cho người tiêu dùng — không gửi email',
      'ผู้รับ: ผู้บริโภค — ไม่ส่งอีเมล',
    );
  }
  if (buyer.type === 'personal') {
    const parts = [buyer.name, buyer.national_id, buyer.email].filter(Boolean);
    const target = parts.join(' - ');
    return pickMsg(locale, `Sent to: ${target}`, `Gửi tới: ${target}`, `ส่งถึง: ${target}`);
  }
  const target = [buyer.name, buyer.tax_code, buyer.email].filter(Boolean).join(' - ');
  return pickMsg(locale, `Sent to: ${target}`, `Gửi tới: ${target}`, `ส่งถึง: ${target}`);
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
  localeOrVi: BillingLocale | boolean,
): string | null {
  const locale = normalizeBillingLocale(localeOrVi);
  if (tab === 'consumer') return null;

  if (tab === 'personal') {
    if (!form.name.trim()) {
      return pickMsg(locale, 'Please enter your full name.', 'Vui lòng nhập họ và tên.', 'กรุณากรอกชื่อ-นามสกุล');
    }
    if (!form.address.trim()) {
      return pickMsg(locale, 'Please enter your address.', 'Vui lòng nhập địa chỉ.', 'กรุณากรอกที่อยู่');
    }
    if (!form.phone.trim()) {
      return pickMsg(locale, 'Please enter your phone number.', 'Vui lòng nhập số điện thoại.', 'กรุณากรอกเบอร์โทร');
    }
    if (!form.email.trim()) {
      return pickMsg(locale, 'Please enter your email.', 'Vui lòng nhập email.', 'กรุณากรอกอีเมล');
    }
    if (!form.nationalId.trim()) {
      return pickMsg(locale, 'Please enter your national ID.', 'Vui lòng nhập CCCD / CMND.', 'กรุณากรอกเลขบัตรประชาชน');
    }
    return null;
  }

  if (!form.companyName.trim()) {
    return pickMsg(locale, 'Please enter company name.', 'Vui lòng nhập tên công ty hoặc hộ kinh doanh.', 'กรุณากรอกชื่อบริษัท');
  }
  if (!form.taxCode.trim()) {
    return pickMsg(locale, 'Please enter tax code.', 'Vui lòng nhập mã số thuế.', 'กรุณากรอกเลขประจำตัวผู้เสียภาษี');
  }
  if (!form.address.trim()) {
    return pickMsg(locale, 'Please enter company address.', 'Vui lòng nhập địa chỉ công ty.', 'กรุณากรอกที่อยู่บริษัท');
  }
  if (!form.recipientName.trim()) {
    return pickMsg(
      locale,
      'Please enter invoice recipient name.',
      'Vui lòng nhập họ tên người nhận hóa đơn.',
      'กรุณากรอกชื่อผู้รับใบแจ้งหนี้',
    );
  }
  if (!form.email.trim()) {
    return pickMsg(locale, 'Please enter invoice email.', 'Vui lòng nhập email nhận hóa đơn.', 'กรุณากรอกอีเมลรับใบแจ้งหนี้');
  }
  if (!form.phone.trim()) {
    return pickMsg(locale, 'Please enter phone number.', 'Vui lòng nhập số điện thoại.', 'กรุณากรอกเบอร์โทร');
  }
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
