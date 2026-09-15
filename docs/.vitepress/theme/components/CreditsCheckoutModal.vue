<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue';
import { usePortalCopy } from '../composables/use-portal-copy';
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
import type { PortalLocale } from '../models/portal-locale';
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
  locale: PortalLocale;
}>();

const emit = defineEmits<{
  close: [];
  paid: [];
  toast: [message: string];
}>();

const { isVi, m } = usePortalCopy(computed(() => props.locale));

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

const currencyDisclaimer = computed(() => billingCurrencyDisclaimer(props.locale));

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
  return formatInvoiceDeliveryNoteShort(invoiceBuyer.value, props.locale);
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
    emit('toast', m('Top-up successful!', 'Nạp credit thành công!', 'เติม credit สำเร็จ!'));
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
      m(
        'Payment is pending. Close anyway?',
        'Đơn đang chờ thanh toán. Bạn có chắc muốn đóng?',
        'การชำระเงินกำลังรอดำเนินการ ปิดเลยหรือไม่?',
      ),
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

  const validationError = validateInvoiceForm(invoiceTab.value, form, props.locale);
  if (validationError) {
    formError.value = validationError;
    return;
  }
  if (invoiceTab.value === 'company' && !companyConfirmed.value) {
    formError.value = m(
      'Please confirm invoice details are correct.',
      'Vui lòng xác nhận thông tin hóa đơn là đúng.',
      'กรุณายืนยันว่ารายละเอียดใบแจ้งหนี้ถูกต้อง',
    );
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
        :aria-label="m('Top up credits', 'Nạp credit', 'เติม credit')"
      >
        <button type="button" class="or-checkout-close" aria-label="Close" @click="closeModal()">
          ×
        </button>

        <!-- Step 1: Summary -->
        <template v-if="step === 'summary'">
          <div class="or-checkout-icon or-checkout-icon-coin" aria-hidden="true">₫</div>
          <h2 class="or-checkout-title">{{ m('Top up credits', 'Nạp Credit', 'เติม Credit') }}</h2>
          <p class="or-checkout-sub">
            {{
              m(
                'Credits are added to your account right after payment.',
                'Credit sẽ được cộng vào tài khoản ngay sau khi thanh toán.',
                'Credit จะเข้าบัญชีทันทีหลังชำระเงิน',
              )
            }}
          </p>

          <div class="or-checkout-summary">
            <div class="or-checkout-summary-row">
              <span>{{ packageLineLabel }}</span>
              <span>{{ formatVnd(totals.subtotalVnd, locale) }}</span>
            </div>
            <div class="or-checkout-summary-row or-checkout-muted">
              <span>{{ m('VAT 5%', 'VAT 5%', 'VAT 5%') }}</span>
              <span>{{ formatVnd(totals.vatVnd, locale) }}</span>
            </div>
            <div class="or-checkout-summary-row or-checkout-total">
              <span>{{ m('Total', 'Tổng', 'รวม') }}</span>
              <span>{{ formatVnd(totals.totalVnd, locale) }}</span>
            </div>
          </div>
          <p v-if="currencyDisclaimer" class="or-checkout-disclaimer">{{ currencyDisclaimer }}</p>

          <input
            v-model="promoCode"
            type="text"
            class="or-checkout-input"
            :placeholder="m('Promo code (optional)', 'Nhập mã tăng thêm (nếu có)', 'รหัสโปรโม (ถ้ามี)')"
          />
          <p class="or-checkout-hint">
            {{
              m(
                'This package applies to all models; not combinable with other promos.',
                'Gói nạp này áp dụng cho mọi model, không áp dụng với chương trình khuyến mãi khác.',
                'แพ็กเกจนี้ใช้ได้กับทุก model ไม่รวมกับโปรโมอื่น',
              )
            }}
          </p>

          <label class="or-checkout-check">
            <input v-model="agreedTerms" type="checkbox" />
            <span>
              {{
                m(
                  'I agree: no credit refunds; only top up what I need.',
                  'Tôi đã đọc và đồng ý: không hoàn Credit, chỉ nạp vừa đủ nhu cầu.',
                  'ฉันยอมรับ: ไม่คืน Credit เติมเท่าที่ต้องการเท่านั้น',
                )
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
              m(
                `Confirm and pay ${formatVnd(totals.totalVnd, locale)}`,
                `Xác nhận và thanh toán ${formatVnd(totals.totalVnd, locale)}`,
                `ยืนยันและชำระ ${formatVnd(totals.totalVnd, locale)}`,
              )
            }}
          </button>
          <p class="or-checkout-foot">
            {{
              m(
                'By confirming, you agree to our Terms & Policies.',
                'Bằng việc xác nhận, bạn đồng ý với các Điều khoản & Chính sách của chúng tôi.',
                'เมื่อยืนยัน แสดงว่าคุณยอมรับข้อกำหนดและนโยบายของเรา',
              )
            }}
          </p>
        </template>

        <!-- Step 2: Invoice -->
        <template v-else-if="step === 'invoice'">
          <button type="button" class="or-checkout-back" @click="goBack">
            {{ m('← Back', '← Quay lại', '← กลับ') }}
          </button>
          <h2 class="or-checkout-title">{{ m('Invoice details', 'Thông tin hóa đơn', 'รายละเอียดใบแจ้งหนี้') }}</h2>
          <p class="or-checkout-sub or-checkout-invoice-sub">
            {{
              m(
                'Invoice data is stored for legal records (address, ID, email).',
                'Mọi đơn giá sau khi thanh toán Credit sẽ được lưu lại pháp lý tại địa chỉ, CCCD và email.',
                'ข้อมูลใบแจ้งหนี้จัดเก็บตามกฎหมาย (ที่อยู่ บัตรประชาชน อีเมล)',
              )
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
              {{ m('Guest', 'Vãng lai', 'ลูกค้าทั่วไป') }}
            </button>
            <button
              type="button"
              role="tab"
              class="or-checkout-tab"
              :class="{ active: invoiceTab === 'personal' }"
              :aria-selected="invoiceTab === 'personal'"
              @click="onTabChange('personal')"
            >
              {{ m('Personal', 'Cá nhân', 'บุคคล') }}
            </button>
            <button
              type="button"
              role="tab"
              class="or-checkout-tab"
              :class="{ active: invoiceTab === 'company' }"
              :aria-selected="invoiceTab === 'company'"
              @click="onTabChange('company')"
            >
              {{ m('Company', 'Công ty', 'บริษัท') }}
            </button>
          </div>

          <div v-if="invoiceTab === 'consumer'" class="or-checkout-consumer-box">
            <p>
              {{
                m(
                  'Nothing to fill in. Invoice shows "Consumer" with no email.',
                  'Bạn không cần điền gì! Hóa đơn ghi "Bán cho người tiêu dùng" và không gửi email.',
                  'ไม่ต้องกรอกอะไร ใบแจ้งหนี้แสดง "ผู้บริโภค" โดยไม่ส่งอีเมล',
                )
              }}
            </p>
          </div>

          <div v-else-if="invoiceTab === 'personal'" class="or-checkout-form">
            <label class="or-checkout-field">
              <span>{{ m('Full name *', 'Họ và tên anh/chị *', 'ชื่อ-นามสกุล *') }}</span>
              <input v-model="form.name" type="text" class="or-checkout-input" />
            </label>
            <label class="or-checkout-field">
              <span>{{ m('Address *', 'Địa chỉ *', 'ที่อยู่ *') }}</span>
              <input v-model="form.address" type="text" class="or-checkout-input" />
            </label>
            <label class="or-checkout-field">
              <span>{{ m('Phone *', 'Sđt liên hệ anh/chị *', 'เบอร์โทร *') }}</span>
              <input v-model="form.phone" type="tel" class="or-checkout-input" />
            </label>
            <label class="or-checkout-field">
              <span>{{ m('Email *', 'Email nhận kết quả sau khi mua *', 'อีเมล *') }}</span>
              <input v-model="form.email" type="email" class="or-checkout-input" />
            </label>
            <label class="or-checkout-field">
              <span>{{ m('National ID *', 'CCCD / CMND *', 'บัตรประชาชน *') }}</span>
              <input v-model="form.nationalId" type="text" class="or-checkout-input" />
            </label>
            <label class="or-checkout-field">
              <span>{{ m('Referral code', 'Mã giới thiệu', 'รหัสแนะนำ') }}</span>
              <input v-model="form.referralCode" type="text" class="or-checkout-input" />
            </label>
          </div>

          <div v-else class="or-checkout-form">
            <label class="or-checkout-field">
              <span>{{ m('Company name *', 'Tên công ty hoặc hộ kinh doanh *', 'ชื่อบริษัท *') }}</span>
              <input v-model="form.companyName" type="text" class="or-checkout-input" />
            </label>
            <label class="or-checkout-field">
              <span>{{ m('Tax code *', 'Mã số thuế *', 'เลขประจำตัวผู้เสียภาษี *') }}</span>
              <input v-model="form.taxCode" type="text" class="or-checkout-input" />
            </label>
            <label class="or-checkout-field">
              <span>{{ m('Company address *', 'Địa chỉ công ty *', 'ที่อยู่บริษัท *') }}</span>
              <input v-model="form.address" type="text" class="or-checkout-input" />
            </label>
            <label class="or-checkout-field">
              <span>{{ m('Invoice recipient *', 'Họ tên người nhận hóa đơn *', 'ชื่อผู้รับใบแจ้งหนี้ *') }}</span>
              <input v-model="form.recipientName" type="text" class="or-checkout-input" />
            </label>
            <label class="or-checkout-field">
              <span>{{ m('Invoice email *', 'Email nhận hóa đơn *', 'อีเมลรับใบแจ้งหนี้ *') }}</span>
              <input v-model="form.email" type="email" class="or-checkout-input" />
            </label>
            <label class="or-checkout-field">
              <span>{{ m('Phone *', 'Số điện thoại *', 'เบอร์โทร *') }}</span>
              <input v-model="form.phone" type="tel" class="or-checkout-input" />
            </label>
            <label class="or-checkout-check or-checkout-check-inline">
              <input v-model="companyConfirmed" type="checkbox" />
              <span>{{ m('Invoice details are correct', 'Xác nhận thông tin hóa đơn là đúng', 'ยืนยันว่ารายละเอียดใบแจ้งหนี้ถูกต้อง') }}</span>
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
                ? m('Creating order…', 'Đang tạo đơn…', 'กำลังสร้างคำสั่ง…')
                : m('Continue to payment', 'Tiếp tục thanh toán', 'ดำเนินการชำระเงิน')
            }}
          </button>
          </div>
        </template>

        <!-- Step 3: Payment -->
        <template v-else-if="step === 'payment' && payment">
          <div class="or-checkout-pay-badge" aria-hidden="true">
            {{ String(payment.orderCode || 'SP').slice(0, 2) }}
          </div>
          <h2 class="or-checkout-title">{{ m('Payment', 'Thanh toán', 'ชำระเงิน') }}</h2>
          <p class="or-checkout-sub">
            {{ m('Scan with your banking app to complete', 'Quét mã bằng app ngân hàng để hoàn tất', 'สแกนด้วยแอปธนาคารเพื่อชำระเงิน') }}
          </p>

          <div class="or-checkout-summary or-checkout-pay-summary">
            <div class="or-checkout-summary-row or-checkout-muted">
              <span>{{ m('Plan', 'GÓI', 'แพ็กเกจ') }}</span>
              <span>{{ pkg.name }}</span>
            </div>
            <div class="or-checkout-summary-row">
              <span>{{ m('Subtotal', 'Tạm tính', 'ยอดก่อนภาษี') }}</span>
              <span>{{ formatVnd(payTotals.subtotalVnd, locale) }}</span>
            </div>
            <div class="or-checkout-summary-row or-checkout-muted">
              <span>{{ m(`Tax ${payTotals.vatPercent ?? 5}%`, `Thuế ${payTotals.vatPercent ?? 5}%`, `ภาษี ${payTotals.vatPercent ?? 5}%`) }}</span>
              <span>+{{ formatVnd(payTotals.vatVnd, locale) }}</span>
            </div>
            <div class="or-checkout-summary-row or-checkout-total">
              <span>{{ m('Total', 'Tổng', 'รวม') }}</span>
              <span>{{ formatVnd(payTotals.totalVnd, locale) }}</span>
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
                m(
                  'Open banking app → Scan → Confirm',
                  'Mở app ngân hàng → Quét mã → Xác nhận',
                  'เปิดแอปธนาคาร → สแกน → ยืนยัน',
                )
              }}
            </p>

            <dl v-if="hasBankDetails" class="or-checkout-bank">
              <div v-if="payment.holder" class="or-checkout-bank-row">
                <dt>{{ m('Account holder', 'Chủ tài khoản', 'เจ้าของบัญชี') }}</dt>
                <dd><span>{{ payment.holder }}</span></dd>
              </div>
              <div v-if="payment.acc" class="or-checkout-bank-row">
                <dt>{{ m('Account number', 'Số tài khoản', 'เลขบัญชี') }}</dt>
                <dd>
                  <span>{{ accountNumberLabel }}</span>
                  <button
                    type="button"
                    class="or-checkout-copy"
                    :title="m('Copy', 'Sao chép', 'คัดลอก')"
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
                <dt>{{ m('Bank', 'Ngân hàng', 'ธนาคาร') }}</dt>
                <dd><span>{{ payment.bank }}</span></dd>
              </div>
              <div v-if="transferMemo" class="or-checkout-bank-row">
                <dt>{{ m('Transfer memo', 'Nội dung chuyển khoản', 'หมายเหตุการโอน') }}</dt>
                <dd>
                  <span>{{ transferMemo }}</span>
                  <button
                    type="button"
                    class="or-checkout-copy"
                    :title="m('Copy', 'Sao chép', 'คัดลอก')"
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
            {{ m('Waiting for bank confirmation…', 'Đang chờ ngân hàng xác nhận…', 'กำลังรอธนาคารยืนยัน…') }}
          </p>
          <p v-else-if="payment.paid" class="or-checkout-paid">
            {{ m('Paid — credits applied.', 'Đã thanh toán — credits đã được cộng.', 'ชำระแล้ว — credits เข้าแล้ว') }}
          </p>
          <p v-if="paymentPollError" class="or-checkout-poll-error">{{ paymentPollError }}</p>

          <p class="or-checkout-hint or-checkout-hint-center or-checkout-pay-foot">
            {{
              m(
                'Keep the transfer memo exactly as shown for automatic credit.',
                'Giữ nguyên nội dung chuyển khoản để credit được cộng tự động.',
                'ใช้หมายเหตุการโอนตามที่แสดงเพื่อให้ credit เข้าอัตโนมัติ',
              )
            }}
          </p>
        </template>
      </div>
    </div>
  </Teleport>
</template>
