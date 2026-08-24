import { config } from '../config.js';
import {
  assertMerchantCanCover,
  fetchMerchantCreditsAi,
  MerchantBalanceError,
} from './merchantBalance.js';
import { merchantSendBalances } from './merchantSendBalances.js';

export interface SendCreditsInput {
  username: string;
  value: number;
  message: string;
  type?: string;
  /** Bỏ qua buffer khi fulfill webhook (đã reserve lúc tạo đơn) */
  skipBuffer?: boolean;
}

export interface SendCreditsResult {
  creditsSent: number;
  merchantBalanceAfter?: number;
}

/** Internal sendBalances — dùng admin route và billing webhook (không qua x-admin-key). */
export async function sendCreditsToUser(input: SendCreditsInput): Promise<SendCreditsResult> {
  const user = input.username.trim();
  const msg = input.message.trim();
  const credits = Math.floor(input.value);

  if (!user) throw new Error('username bắt buộc');
  if (!msg) throw new Error('message bắt buộc');
  if (!Number.isFinite(credits) || credits <= 0) throw new Error('value phải > 0');

  const merchantBalance = await fetchMerchantCreditsAi();
  assertMerchantCanCover({
    merchantBalance,
    reservedCredits: 0,
    creditsToSend: credits,
    bufferCredits: input.skipBuffer ? 0 : config.topup.merchantBufferCredits,
  });

  await merchantSendBalances({
    username: user,
    value: credits,
    message: msg,
    type: input.type,
  });

  let merchantBalanceAfter: number | undefined;
  try {
    merchantBalanceAfter = await fetchMerchantCreditsAi();
  } catch {
    /* optional */
  }

  return { creditsSent: credits, merchantBalanceAfter };
}

export { MerchantBalanceError };
