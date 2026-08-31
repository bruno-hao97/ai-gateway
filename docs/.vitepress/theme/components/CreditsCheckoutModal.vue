<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue';
import {
  buildInvoiceBuyer,
  calcBillingTotals,
  emptyInvoiceForm,
  formatAccountDisplay,
  formatInvoiceDeliveryNoteShort,
  billingCurrencyDisclaimer,
  formatVnd,
  validateInvoiceForm,
  type InvoiceFormState,
  type InvoiceTab,
} from '../models/invoice-buyer';
import {
  createTopup,
  formatCredits,
  syncGommoPayment,
  type CreditPackage,
  type InvoiceBuyer,
  type TopupPayment,
} from '../models/user-api';

const props = defineProps<{
  open: boolean;
  pkg: CreditPackage | null;
  username: string;
  defaultEmail: string;
  isVi: boolean;
}>();

const emit = defineEmits<{
  close: [];
  paid: [];
  toast: [message: string];
}>();

type CheckoutStep = 'summary' | 'invoice' | 'payment';

const step = ref<CheckoutStep>('summary');
const agreedTerms = ref(false);
const companyConfirmed = ref(false);
const promoCode = ref('');
const invoiceTab = ref<InvoiceTab>('consumer');
const form = reactive<InvoiceFormState>(emptyInvoiceForm());
const formError = ref('');
const creating = ref(false);
const payment = ref<TopupPayment | null>(null);
const invoiceBuyer = ref<InvoiceBuyer | null>(null);
const paymentWaiting = ref(false);
const paymentPollError = ref('');
let paymentPollTimer: ReturnType<typeof setInterval> | null = null;

const totals = computed(() => calcBillingTotals(props.pkg?.amountVnd ?? 0));

const currencyDisclaimer = computed(() => billingCurrencyDisclaimer(props.isVi));

const payTotals = computed(() => {
  const p = payment.value;
  if (p?.amountBaseVnd != null && p.vatAmountVnd != null && p.amountVnd != null) {
    return {
      subtotalVnd: p.amountBaseVnd,
      vatVnd: p.vatAmountVnd,
      totalVnd: p.amountVnd,
      vatPercent: p.vatPercent ?? 5,
    };
  }
  return { ...totals.value, vatPercent: 5 };
});

const transferMemo = computed(() => {
  const p = payment.value;
  return String(p?.content || p?.orderCode || '').trim();
});

const accountNumberLabel = computed(() => {
  const p = payment.value;
  if (!p?.acc) return '';
  return formatAccountDisplay(p.acc, p.store);
});

const hasBankDetails = computed(() => {
  const p = payment.value;
  return Boolean(p?.holder || p?.acc || p?.bank || transferMemo.value);
});

const copiedField = ref<string | null>(null);
let copiedTimer: ReturnType<typeof setTimeout> | null = null;

async function copyField(key: string, value: string) {
  if (!value || typeof navigator === 'undefined') return;
  try {
    await navigator.clipboard.writeText(value);
    copiedField.value = key;
    if (copiedTimer) clearTimeout(copiedTimer);
    copiedTimer = setTimeout(() => {
      copiedField.value = null;
    }, 2000);
  } catch {
    /* ignore */
  }
}

const packageLineLabel = computed(() => {
  if (!props.pkg) return '';
  return `${formatCredits(props.pkg.credits)} Credits - ${props.pkg.name}`;
});

const invoiceNote = computed(() => {
  if (!invoiceBuyer.value || step.value !== 'payment') return '';
  return formatInvoiceDeliveryNoteShort(invoiceBuyer.value, props.isVi);
});

const canConfirmSummary = computed(() => agreedTerms.value && Boolean(props.pkg));

const canContinueInvoice = computed(() => {
  if (invoiceTab.value === 'company' && !companyConfirmed.value) return false;
  return true;
});

function resetState() {
  step.value = 'summary';
  agreedTerms.value = false;
  companyConfirmed.value = false;
  promoCode.value = '';
  invoiceTab.value = 'consumer';
  Object.assign(form, emptyInvoiceForm(props.defaultEmail));
  formError.value = '';
  creating.value = false;
  payment.value = null;
  invoiceBuyer.value = null;
  stopPaymentPoll();
}

function stopPaymentPoll() {
  if (paymentPollTimer) {
    clearInterval(paymentPollTimer);
    paymentPollTimer = null;
  }
  paymentWaiting.value = false;
}

async function pollPaymentOnce(orderCode: string) {
  const result = await syncGommoPayment(orderCode);
  if (payment.value) {
    payment.value = { ...payment.value, paid: result.paid, deposit: result.deposit };
    if (result.deposit?.amount) {
      payment.value.amountVnd = Number(result.deposit.amount) || payment.value.amountVnd;
    }
  }
  if (result.paid) {
    stopPaymentPoll();
    emit('toast', props.isVi ? 'Nạp credit thành công!' : 'Top-up successful!');
    emit('paid');
    closeModal(false);
  }
}

function startPaymentPoll(orderCode: string) {
  stopPaymentPoll();
  paymentWaiting.value = true;
  paymentPollError.value = '';
  void pollPaymentOnce(orderCode).catch((e) => {
    paymentPollError.value = e instanceof Error ? e.message : String(e);
  });
  paymentPollTimer = setInterval(() => {
    void pollPaymentOnce(orderCode).catch((e) => {
      paymentPollError.value = e instanceof Error ? e.message : String(e);
    });
  }, 3500);
}

function closeModal(confirmPending = true) {
  if (
    confirmPending &&
    paymentWaiting.value &&
    payment.value &&
    !payment.value.paid &&
    step.value === 'payment'
  ) {
    const ok = window.confirm(
      props.isVi
        ? 'Đơn đang chờ thanh toán. Bạn có chắc muốn đóng?'
        : 'Payment is pending. Close anyway?',
    );
    if (!ok) return;
  }
  stopPaymentPoll();
  emit('close');
}

function goBack() {
  formError.value = '';
  if (step.value === 'invoice') step.value = 'summary';
}

function goToInvoice() {
  if (!canConfirmSummary.value) return;
  step.value = 'invoice';
  formError.value = '';
}

function onTabChange(tab: InvoiceTab) {
  invoiceTab.value = tab;
  formError.value = '';
  if (tab !== 'company') companyConfirmed.value = false;
}

async function submitPayment() {
  if (!props.pkg || !props.username) return;

  const validationError = validateInvoiceForm(invoiceTab.value, form, props.isVi);
  if (validationError) {
    formError.value = validationError;
    return;
  }
  if (invoiceTab.value === 'company' && !companyConfirmed.value) {
    formError.value = props.isVi
      ? 'Vui lòng xác nhận thông tin hóa đơn là đúng.'
      : 'Please confirm invoice details are correct.';
    return;
  }

  formError.value = '';
  creating.value = true;
  const buyer = buildInvoiceBuyer(invoiceTab.value, form);
  invoiceBuyer.value = buyer;

  try {
    const result = await createTopup(
      props.username,
      props.pkg.id,
      buyer,
      promoCode.value.trim() || undefined,
    );
    payment.value = result;
    step.value = 'payment';
    const orderCode = String(result.content || result.orderCode || '').trim();
    if (orderCode) startPaymentPoll(orderCode);
  } catch (e) {
    formError.value = e instanceof Error ? e.message : String(e);
  } finally {
    creating.value = false;
  }
}

watch(
  () => props.open,
  (isOpen) => {
    if (isOpen) {
      resetState();
      Object.assign(form, emptyInvoiceForm(props.defaultEmail));
    } else {
      stopPaymentPoll();
    }
  },
);

watch(
  () => props.defaultEmail,
  (email) => {
    if (!form.email) form.email = email;
  },
);
</script>

<template>
  <Teleport to="body">
    <div
      v-if="open && pkg"
      class="or-checkout-backdrop"
      role="presentation"
      @click.self="closeModal()"
    >
      <div
        class="or-checkout-modal"
        :class="{
          'or-checkout-modal--payment': step === 'payment',
          'or-checkout-modal--invoice': step === 'invoice',
        }"
        role="dialog"
        aria-modal="true"
        :aria-label="isVi ? 'Nạp credit' : 'Top up credits'"
      >
        <button type="button" class="or-checkout-close" aria-label="Close" @click="closeModal()">
          ×
        </button>

        <!-- Step 1: Summary -->
        <template v-if="step === 'summary'">
          <div class="or-checkout-icon or-checkout-icon-coin" aria-hidden="true">₫</div>
          <h2 class="or-checkout-title">{{ isVi ? 'Nạp Credit' : 'Top up credits' }}</h2>
          <p class="or-checkout-sub">
            {{
              isVi
                ? 'Credit sẽ được cộng vào tài khoản ngay sau khi thanh toán.'
                : 'Credits are added to your account right after payment.'
            }}
          </p>

          <div class="or-checkout-summary">
            <div class="or-checkout-summary-row">
              <span>{{ packageLineLabel }}</span>
              <span>{{ formatVnd(totals.subtotalVnd, isVi) }}</span>
            </div>
            <div class="or-checkout-summary-row or-checkout-muted">
              <span>{{ isVi ? 'VAT 5%' : 'VAT 5%' }}</span>
              <span>{{ formatVnd(totals.vatVnd, isVi) }}</span>
            </div>
            <div class="or-checkout-summary-row or-checkout-total">
              <span>{{ isVi ? 'Tổng' : 'Total' }}</span>
              <span>{{ formatVnd(totals.totalVnd, isVi) }}</span>
            </div>
          </div>
          <p v-if="currencyDisclaimer" class="or-checkout-disclaimer">{{ currencyDisclaimer }}</p>

          <input
            v-model="promoCode"
            type="text"
            class="or-checkout-input"
            :placeholder="isVi ? 'Nhập mã tăng thêm (nếu có)' : 'Promo code (optional)'"
          />
          <p class="or-checkout-hint">
            {{
              isVi
                ? 'Gói nạp này áp dụng cho mọi model, không áp dụng với chương trình khuyến mãi khác.'
                : 'This package applies to all models; not combinable with other promos.'
            }}
          </p>

          <label class="or-checkout-check">
            <input v-model="agreedTerms" type="checkbox" />
            <span>
              {{
                isVi
                  ? 'Tôi đã đọc và đồng ý: không hoàn Credit, chỉ nạp vừa đủ nhu cầu.'
                  : 'I agree: no credit refunds; only top up what I need.'
              }}
            </span>
          </label>

          <button
            type="button"
            class="or-checkout-btn or-checkout-btn-accent"
            :disabled="!canConfirmSummary"
            @click="goToInvoice"
          >
            {{
              isVi
                ? `Xác nhận và thanh toán ${formatVnd(totals.totalVnd, isVi)}`
                : `Confirm and pay ${formatVnd(totals.totalVnd, isVi)}`
            }}
          </button>
          <p class="or-checkout-foot">
            {{
              isVi
                ? 'Bằng việc xác nhận, bạn đồng ý với các Điều khoản & Chính sách của chúng tôi.'
                : 'By confirming, you agree to our Terms & Policies.'
            }}
          </p>
        </template>

        <!-- Step 2: Invoice -->
        <template v-else-if="step === 'invoice'">
          <button type="button" class="or-checkout-back" @click="goBack">
            {{ isVi ? '← Quay lại' : '← Back' }}
          </button>
          <h2 class="or-checkout-title">{{ isVi ? 'Thông tin hóa đơn' : 'Invoice details' }}</h2>
          <p class="or-checkout-sub or-checkout-invoice-sub">
            {{
              isVi
                ? 'Mọi đơn giá sau khi thanh toán Credit sẽ được lưu lại pháp lý tại địa chỉ, CCCD và email.'
                : 'Invoice data is stored for legal records (address, ID, email).'
            }}
          </p>

          <div class="or-checkout-invoice-scroll">
            <div class="or-checkout-tabs" role="tablist">
            <button
              type="button"
              role="tab"
              class="or-checkout-tab"
              :class="{ active: invoiceTab === 'consumer' }"
              :aria-selected="invoiceTab === 'consumer'"
              @click="onTabChange('consumer')"
            >
              {{ isVi ? 'Vãng lai' : 'Guest' }}
            </button>
            <button
              type="button"
              role="tab"
              class="or-checkout-tab"
              :class="{ active: invoiceTab === 'personal' }"
              :aria-selected="invoiceTab === 'personal'"
              @click="onTabChange('personal')"
            >
              {{ isVi ? 'Cá nhân' : 'Personal' }}
            </button>
            <button
              type="button"
              role="tab"
              class="or-checkout-tab"
              :class="{ active: invoiceTab === 'company' }"
              :aria-selected="invoiceTab === 'company'"
              @click="onTabChange('company')"
            >
              {{ isVi ? 'Công ty' : 'Company' }}
            </button>
          </div>

          <div v-if="invoiceTab === 'consumer'" class="or-checkout-consumer-box">
            <p>
              {{
                isVi
                  ? 'Bạn không cần điền gì! Hóa đơn ghi "Bán cho người tiêu dùng" và không gửi email.'
                  : 'Nothing to fill in. Invoice shows "Consumer" with no email.'
              }}
            </p>
          </div>

          <div v-else-if="invoiceTab === 'personal'" class="or-checkout-form">
            <label class="or-checkout-field">
              <span>{{ isVi ? 'Họ và tên anh/chị *' : 'Full name *' }}</span>
              <input v-model="form.name" type="text" class="or-checkout-input" />
            </label>
            <label class="or-checkout-field">
              <span>{{ isVi ? 'Địa chỉ *' : 'Address *' }}</span>
              <input v-model="form.address" type="text" class="or-checkout-input" />
            </label>
            <label class="or-checkout-field">
              <span>{{ isVi ? 'Sđt liên hệ anh/chị *' : 'Phone *' }}</span>
              <input v-model="form.phone" type="tel" class="or-checkout-input" />
            </label>
            <label class="or-checkout-field">
              <span>{{ isVi ? 'Email nhận kết quả sau khi mua *' : 'Email *' }}</span>
              <input v-model="form.email" type="email" class="or-checkout-input" />
            </label>
            <label class="or-checkout-field">
              <span>{{ isVi ? 'CCCD / CMND *' : 'National ID *' }}</span>
              <input v-model="form.nationalId" type="text" class="or-checkout-input" />
            </label>
            <label class="or-checkout-field">
              <span>{{ isVi ? 'Mã giới thiệu' : 'Referral code' }}</span>
              <input v-model="form.referralCode" type="text" class="or-checkout-input" />
            </label>
          </div>

          <div v-else class="or-checkout-form">
            <label class="or-checkout-field">
              <span>{{ isVi ? 'Tên công ty hoặc hộ kinh doanh *' : 'Company name *' }}</span>
              <input v-model="form.companyName" type="text" class="or-checkout-input" />
            </label>
            <label class="or-checkout-field">
              <span>{{ isVi ? 'Mã số thuế *' : 'Tax code *' }}</span>
              <input v-model="form.taxCode" type="text" class="or-checkout-input" />
            </label>
            <label class="or-checkout-field">
              <span>{{ isVi ? 'Địa chỉ công ty *' : 'Company address *' }}</span>
              <input v-model="form.address" type="text" class="or-checkout-input" />
            </label>
            <label class="or-checkout-field">
              <span>{{ isVi ? 'Họ tên người nhận hóa đơn *' : 'Invoice recipient *' }}</span>
              <input v-model="form.recipientName" type="text" class="or-checkout-input" />
            </label>
            <label class="or-checkout-field">
              <span>{{ isVi ? 'Email nhận hóa đơn *' : 'Invoice email *' }}</span>
              <input v-model="form.email" type="email" class="or-checkout-input" />
            </label>
            <label class="or-checkout-field">
              <span>{{ isVi ? 'Số điện thoại *' : 'Phone *' }}</span>
              <input v-model="form.phone" type="tel" class="or-checkout-input" />
            </label>
            <label class="or-checkout-check or-checkout-check-inline">
              <input v-model="companyConfirmed" type="checkbox" />
              <span>{{ isVi ? 'Xác nhận thông tin hóa đơn là đúng' : 'Invoice details are correct' }}</span>
            </label>
          </div>

            <p v-if="formError" class="or-checkout-error">{{ formError }}</p>
          </div>

          <div class="or-checkout-invoice-foot">
          <button
            type="button"
            class="or-checkout-btn or-checkout-btn-accent"
            :disabled="creating || !canContinueInvoice"
            @click="submitPayment"
          >
            {{
              creating
                ? isVi
                  ? 'Đang tạo đơn…'
                  : 'Creating order…'
                : isVi
                  ? 'Tiếp tục thanh toán'
                  : 'Continue to payment'
            }}
          </button>
          </div>
        </template>

        <!-- Step 3: Payment -->
        <template v-else-if="step === 'payment' && payment">
          <div class="or-checkout-pay-badge" aria-hidden="true">
            {{ String(payment.orderCode || 'SP').slice(0, 2) }}
          </div>
          <h2 class="or-checkout-title">{{ isVi ? 'Thanh toán' : 'Payment' }}</h2>
          <p class="or-checkout-sub">
            {{ isVi ? 'Quét mã bằng app ngân hàng để hoàn tất' : 'Scan with your banking app to complete' }}
          </p>

          <div class="or-checkout-summary or-checkout-pay-summary">
            <div class="or-checkout-summary-row or-checkout-muted">
              <span>{{ isVi ? 'GÓI' : 'Plan' }}</span>
              <span>{{ pkg.name }}</span>
            </div>
            <div class="or-checkout-summary-row">
              <span>{{ isVi ? 'Tạm tính' : 'Subtotal' }}</span>
              <span>{{ formatVnd(payTotals.subtotalVnd, isVi) }}</span>
            </div>
            <div class="or-checkout-summary-row or-checkout-muted">
              <span>{{ isVi ? `Thuế ${payTotals.vatPercent ?? 5}%` : `Tax ${payTotals.vatPercent ?? 5}%` }}</span>
              <span>+{{ formatVnd(payTotals.vatVnd, isVi) }}</span>
            </div>
            <div class="or-checkout-summary-row or-checkout-total">
              <span>{{ isVi ? 'Tổng' : 'Total' }}</span>
              <span>{{ formatVnd(payTotals.totalVnd, isVi) }}</span>
            </div>
          </div>
          <p v-if="currencyDisclaimer" class="or-checkout-disclaimer">{{ currencyDisclaimer }}</p>

          <p v-if="invoiceNote" class="or-checkout-invoice-note">
            <svg class="or-checkout-invoice-icon" viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
              <path
                fill="currentColor"
                d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6zm4 18H6V4h7v5h5v11z"
              />
            </svg>
            <span>{{ invoiceNote }}</span>
          </p>

          <div class="or-checkout-pay-card">
            <img
              v-if="payment.qrImage || payment.qrFallback || payment.url"
              :src="payment.qrImage || payment.qrFallback || payment.url"
              alt="VietQR"
              class="or-checkout-qr"
            />
            <p class="or-checkout-qr-hint">
              {{
                isVi
                  ? 'Mở app ngân hàng → Quét mã → Xác nhận'
                  : 'Open banking app → Scan → Confirm'
              }}
            </p>

            <dl v-if="hasBankDetails" class="or-checkout-bank">
              <div v-if="payment.holder" class="or-checkout-bank-row">
                <dt>{{ isVi ? 'Chủ tài khoản' : 'Account holder' }}</dt>
                <dd><span>{{ payment.holder }}</span></dd>
              </div>
              <div v-if="payment.acc" class="or-checkout-bank-row">
                <dt>{{ isVi ? 'Số tài khoản' : 'Account number' }}</dt>
                <dd>
                  <span>{{ accountNumberLabel }}</span>
                  <button
                    type="button"
                    class="or-checkout-copy"
                    :title="isVi ? 'Sao chép' : 'Copy'"
                    aria-label="Copy account number"
                    @click="copyField('acc', payment.acc!)"
                  >
                    <svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true">
                      <path
                        fill="currentColor"
                        d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z"
                      />
                    </svg>
                  </button>
                </dd>
              </div>
              <div v-if="payment.bank" class="or-checkout-bank-row">
                <dt>{{ isVi ? 'Ngân hàng' : 'Bank' }}</dt>
                <dd><span>{{ payment.bank }}</span></dd>
              </div>
              <div v-if="transferMemo" class="or-checkout-bank-row">
                <dt>{{ isVi ? 'Nội dung chuyển khoản' : 'Transfer memo' }}</dt>
                <dd>
                  <span>{{ transferMemo }}</span>
                  <button
                    type="button"
                    class="or-checkout-copy"
                    :title="isVi ? 'Sao chép' : 'Copy'"
                    aria-label="Copy transfer memo"
                    @click="copyField('memo', transferMemo)"
                  >
                    <svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true">
                      <path
                        fill="currentColor"
                        d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z"
                      />
                    </svg>
                  </button>
                </dd>
              </div>
            </dl>
          </div>

          <p v-if="paymentWaiting && !payment.paid" class="or-checkout-waiting">
            {{ isVi ? 'Đang chờ ngân hàng xác nhận…' : 'Waiting for bank confirmation…' }}
          </p>
          <p v-else-if="payment.paid" class="or-checkout-paid">
            {{ isVi ? 'Đã thanh toán — credits đã được cộng.' : 'Paid — credits applied.' }}
          </p>
          <p v-if="paymentPollError" class="or-checkout-poll-error">{{ paymentPollError }}</p>

          <p class="or-checkout-hint or-checkout-hint-center or-checkout-pay-foot">
            {{
              isVi
                ? 'Giữ nguyên nội dung chuyển khoản để credit được cộng tự động.'
                : 'Keep the transfer memo exactly as shown for automatic credit.'
            }}
          </p>
        </template>
      </div>
    </div>
  </Teleport>
</template>
