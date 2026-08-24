import { PayOS } from '@payos/node';
import { config, isPayOsConfigured } from '../config.js';

let payosClient: PayOS | null = null;

function getPayOsClient(): PayOS {
  if (!isPayOsConfigured()) {
    throw new Error('Chưa cấu hình PayOS — thiếu PAYOS_* trong .env');
  }
  if (!payosClient) {
    payosClient = new PayOS({
      clientId: config.payos.clientId,
      apiKey: config.payos.apiKey,
      checksumKey: config.payos.checksumKey,
    });
  }
  return payosClient;
}

export interface CreateTopupPayOsInput {
  username: string;
  amountVnd: number;
}

export interface PayOsPaymentResult {
  status: string;
  url?: string;
  qrImage?: string;
  bankTransfer: {
    accountName: string;
    bankName: string;
    accountNumber: string;
    amount: string;
    amountFormatted: string;
    content: string;
  };
  orderCode: number;
}

const BANK_BIN_LABELS: Record<string, string> = {
  '970416': 'ACB',
  '970422': 'MB Bank',
  '970436': 'Vietcombank',
  '970415': 'VietinBank',
  '970418': 'BIDV',
  '970407': 'Techcombank',
};

function generateOrderCode(): number {
  const suffix = Math.floor(Math.random() * 900) + 100;
  const timePart = Number(String(Date.now()).slice(-6));
  return timePart * 1000 + suffix;
}

function buildTopupDescription(orderCode: number): string {
  return `TU${String(orderCode).slice(-6)}`.slice(0, 9);
}

function formatAmountVnd(amount: number): string {
  return `${Math.round(amount).toLocaleString('en-US')} VND`;
}

function resolveBankName(bin?: string): string {
  if (!bin) return '';
  return BANK_BIN_LABELS[bin] || `BIN ${bin}`;
}

function normalizePayOsError(err: unknown): string {
  if (err && typeof err === 'object') {
    const row = err as Record<string, unknown>;
    const desc = typeof row.desc === 'string' ? row.desc : '';
    const message = typeof row.message === 'string' ? row.message : '';
    if (desc) return desc;
    if (message) return message;
  }
  if (err instanceof Error && err.message) return err.message;
  return 'PayOS tạo thanh toán thất bại';
}

export async function createTopupPayOsPayment(input: CreateTopupPayOsInput): Promise<PayOsPaymentResult> {
  const amount = Math.round(input.amountVnd);
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error('Số tiền nạp không hợp lệ');
  }

  const orderCode = generateOrderCode();
  const description = buildTopupDescription(orderCode);

  try {
    const data = await getPayOsClient().paymentRequests.create({
      orderCode,
      amount,
      description,
      returnUrl: config.payos.returnUrl,
      cancelUrl: config.payos.cancelUrl,
    });

    const transferAmount = data.amount ?? amount;
    const content = data.description || String(data.orderCode ?? orderCode);

    return {
      status: 'success',
      url: data.checkoutUrl,
      qrImage: data.qrCode,
      orderCode: data.orderCode ?? orderCode,
      bankTransfer: {
        accountName: data.accountName || '',
        bankName: resolveBankName(data.bin),
        accountNumber: data.accountNumber || '',
        amount: String(transferAmount),
        amountFormatted: formatAmountVnd(transferAmount),
        content,
      },
    };
  } catch (err) {
    throw new Error(normalizePayOsError(err));
  }
}

export function verifyPayOsWebhookSignature(payload: Record<string, unknown>, signature: string): boolean {
  if (!signature || !isPayOsConfigured()) return false;
  try {
    getPayOsClient().webhooks.verify({ ...payload, signature } as never);
    return true;
  } catch {
    return false;
  }
}
