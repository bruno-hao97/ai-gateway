import { useEffect, useRef, useState } from 'react';
import { CheckCircle2, Loader2, Wallet, X } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ApiError, gatewayGet, gatewayPost } from '@/lib/apiClient';
import { getUsername } from '@/lib/authStore';
import { gommoClientDeviceFields } from '@/lib/gommoDevice';
import { formatCredits } from '@/lib/utils';

interface CreditPackage {
  id: string;
  name: string;
  amountVnd: number;
  credits: number;
  bonusPercent: number;
  featured?: boolean;
}

interface TopupPayment {
  url?: string;
  qrImage?: string;
  qrFallback?: string;
  orderCode?: string;
  content?: string;
  credits?: number;
  amountVnd?: number;
  amountBaseVnd?: number;
  vatAmountVnd?: number;
  bank?: string;
  acc?: string;
  holder?: string;
  store?: string;
  paid?: boolean;
}

interface PaymentSyncResult {
  paid: boolean;
  orderCode: string;
}

type TopupOrderStatus = 'pending' | 'paid' | 'credited' | 'failed';

interface TopupOrder {
  orderCode: string;
  packageId: string;
  amountVnd: number;
  credits: number;
  status: TopupOrderStatus;
  source?: 'gommo' | 'payos';
  createdAt: string;
}

const VAT_RATE = 0.05;
const CONSUMER_INVOICE = {
  type: 'consumer',
  name: 'Bán cho người tiêu dùng',
  email: '',
} as const;

function calcTotals(amountVnd: number) {
  const subtotalVnd = Math.max(0, Math.floor(amountVnd));
  const vatVnd = Math.round(subtotalVnd * VAT_RATE);
  return { subtotalVnd, vatVnd, totalVnd: subtotalVnd + vatVnd };
}

function maskAccount(acc: string): string {
  const value = acc.trim();
  if (value.length <= 7) return value;
  return `${value.slice(0, 3)}****${value.slice(-4)}`;
}

function formatOrderStatus(status: TopupOrderStatus): string {
  const labels: Record<TopupOrderStatus, string> = {
    pending: 'Chờ thanh toán',
    paid: 'Đã thanh toán',
    credited: 'Đã cộng credits',
    failed: 'Thất bại',
  };
  return labels[status] || status;
}

export function WalletPage() {
  const username = getUsername();
  const [packages, setPackages] = useState<CreditPackage[]>([]);
  const [orders, setOrders] = useState<TopupOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [checkoutPkg, setCheckoutPkg] = useState<CreditPackage | null>(null);
  const [agreedTerms, setAgreedTerms] = useState(false);
  const [promoCode, setPromoCode] = useState('');
  const [creating, setCreating] = useState(false);
  const [payment, setPayment] = useState<TopupPayment | null>(null);
  const [paymentWaiting, setPaymentWaiting] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  async function loadPackages() {
    const res = await gatewayGet<{ data?: CreditPackage[] }>('/billing/packages');
    setPackages(res.data || []);
  }

  async function loadOrders() {
    if (!username) {
      setOrders([]);
      return;
    }
    setOrdersLoading(true);
    try {
      const params = new URLSearchParams({ username, limit: '20' });
      const res = await gatewayGet<{ data?: TopupOrder[] }>(`/billing/topup/orders?${params}`);
      setOrders(res.data || []);
    } catch {
      setOrders([]);
    } finally {
      setOrdersLoading(false);
    }
  }

  useEffect(() => {
    void (async () => {
      try {
        await loadPackages();
        await loadOrders();
      } catch (err) {
        toast.error(err instanceof ApiError ? err.message : 'Không tải gói nạp');
      } finally {
        setLoading(false);
      }
    })();
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [username]);

  function stopPoll() {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
    setPaymentWaiting(false);
  }

  async function pollOnce(orderCode: string) {
    const device = gommoClientDeviceFields('vi');
    const res = await gatewayPost<{ data?: PaymentSyncResult }>('/billing/payment/sync', {
      orderCode,
      ...device,
    });
    if (res.data?.paid) {
      stopPoll();
      setPayment((prev) => (prev ? { ...prev, paid: true } : prev));
      toast.success('Nạp credit thành công!');
      void loadOrders();
    }
  }

  function startPoll(orderCode: string) {
    stopPoll();
    setPaymentWaiting(true);
    void pollOnce(orderCode).catch((err) => {
      toast.error(err instanceof ApiError ? err.message : 'Không đồng bộ được thanh toán');
    });
    pollRef.current = setInterval(() => {
      void pollOnce(orderCode).catch(() => {
        /* keep polling */
      });
    }, 3500);
  }

  function closeCheckout() {
    if (paymentWaiting && payment && !payment.paid) {
      const ok = window.confirm('Đơn đang chờ thanh toán. Bạn có chắc muốn đóng?');
      if (!ok) return;
    }
    stopPoll();
    setCheckoutPkg(null);
    setPayment(null);
    setAgreedTerms(false);
    setPromoCode('');
  }

  async function startPayment() {
    if (!checkoutPkg || !username || !agreedTerms) return;
    setCreating(true);
    try {
      const device = gommoClientDeviceFields('vi');
      const res = await gatewayPost<{ data?: TopupPayment }>('/billing/payment/create', {
        username,
        packageId: checkoutPkg.id,
        invoiceBuyer: CONSUMER_INVOICE,
        promoCode: promoCode.trim() || undefined,
        ...device,
      });
      const data = res.data || null;
      setPayment(data);
      const orderCode = String(data?.content || data?.orderCode || '').trim();
      if (orderCode) startPoll(orderCode);
      void loadOrders();
      toast.success('Đơn VietQR đã tạo — quét mã hoặc chuyển khoản');
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Tạo đơn thất bại');
    } finally {
      setCreating(false);
    }
  }

  const checkoutTotals = checkoutPkg ? calcTotals(checkoutPkg.amountVnd) : null;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold">
          <Wallet className="h-7 w-7 text-primary" />
          Wallet
        </h1>
        <p className="mt-1 text-muted">
          Nạp credit qua Gommo (VietQR) · user <strong>{username || '—'}</strong>
        </p>
      </div>

      {loading ? (
        <p className="flex items-center gap-2 text-sm text-muted">
          <Loader2 className="h-4 w-4 animate-spin" /> Đang tải gói nạp…
        </p>
      ) : packages.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-muted">
            Chưa có gói hoặc billing chưa bật trên gateway.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {packages.map((pkg) => (
            <Card key={pkg.id} className={pkg.featured ? 'border-primary/40 ring-1 ring-primary/20' : ''}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <CardTitle className="text-base">{pkg.name}</CardTitle>
                  {pkg.bonusPercent > 0 && <Badge>+{pkg.bonusPercent}%</Badge>}
                </div>
                <CardDescription>
                  {formatCredits(pkg.credits)} credits · {pkg.amountVnd.toLocaleString('vi-VN')} ₫
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button
                  className="w-full"
                  variant={pkg.featured ? 'default' : 'secondary'}
                  onClick={() => {
                    setCheckoutPkg(pkg);
                    setPayment(null);
                    setAgreedTerms(false);
                    setPromoCode('');
                  }}
                >
                  Nạp ngay
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-2">
          <div>
            <CardTitle className="text-base">Lịch sử nạp</CardTitle>
            <CardDescription>Đơn tạo qua gateway (Gommo VietQR)</CardDescription>
          </div>
          <Button variant="outline" size="sm" disabled={ordersLoading} onClick={() => void loadOrders()}>
            {ordersLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Làm mới'}
          </Button>
        </CardHeader>
        <CardContent>
          {ordersLoading && orders.length === 0 ? (
            <p className="text-sm text-muted">Đang tải…</p>
          ) : orders.length === 0 ? (
            <p className="text-sm text-muted">Chưa có đơn nạp. Tạo đơn VietQR ở trên để bắt đầu.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-muted">
                    <th className="pb-2 pr-3">Mã đơn</th>
                    <th className="pb-2 pr-3">Credits</th>
                    <th className="pb-2 pr-3">Số tiền</th>
                    <th className="pb-2 pr-3">Trạng thái</th>
                    <th className="pb-2">Thời gian</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map((order) => (
                    <tr key={order.orderCode} className="border-b border-border/50">
                      <td className="py-2 pr-3 font-mono text-xs">{order.orderCode}</td>
                      <td className="py-2 pr-3">{formatCredits(order.credits)}</td>
                      <td className="py-2 pr-3">{order.amountVnd.toLocaleString('vi-VN')} ₫</td>
                      <td className="py-2 pr-3">{formatOrderStatus(order.status)}</td>
                      <td className="py-2 text-muted">
                        {new Date(order.createdAt).toLocaleString('vi-VN')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {checkoutPkg && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <Card className="max-h-[92dvh] w-full max-w-md overflow-y-auto">
            <CardHeader className="flex flex-row items-start justify-between gap-2">
              <div>
                <CardTitle>{payment ? 'Thanh toán' : 'Nạp Credit'}</CardTitle>
                <CardDescription>
                  {payment
                    ? 'Quét VietQR hoặc chuyển khoản — credits cộng tự động'
                    : 'Credit cộng ngay sau khi thanh toán thành công'}
                </CardDescription>
              </div>
              <Button variant="ghost" size="icon" onClick={closeCheckout} aria-label="Đóng">
                <X className="h-4 w-4" />
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              {!payment ? (
                <>
                  <div className="space-y-2 rounded-lg border p-3 text-sm">
                    <div className="flex justify-between">
                      <span>
                        {formatCredits(checkoutPkg.credits)} — {checkoutPkg.name}
                      </span>
                      <span>{checkoutTotals?.subtotalVnd.toLocaleString('vi-VN')}₫</span>
                    </div>
                    <div className="flex justify-between text-muted">
                      <span>VAT 5%</span>
                      <span>{checkoutTotals?.vatVnd.toLocaleString('vi-VN')}₫</span>
                    </div>
                    <div className="flex justify-between font-semibold text-primary">
                      <span>Tổng</span>
                      <span>{checkoutTotals?.totalVnd.toLocaleString('vi-VN')}₫</span>
                    </div>
                  </div>
                  <input
                    className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                    placeholder="Mã khuyến mãi (nếu có)"
                    value={promoCode}
                    onChange={(e) => setPromoCode(e.target.value)}
                  />
                  <label className="flex items-start gap-2 text-sm">
                    <input
                      type="checkbox"
                      className="mt-1"
                      checked={agreedTerms}
                      onChange={(e) => setAgreedTerms(e.target.checked)}
                    />
                    <span>
                      Tôi đã đọc và đồng ý: không hoàn Credit, chỉ nạp vừa đủ nhu cầu.
                    </span>
                  </label>
                  <Button
                    className="w-full"
                    disabled={!agreedTerms || creating}
                    onClick={() => void startPayment()}
                  >
                    {creating ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" /> Đang tạo đơn…
                      </>
                    ) : (
                      `Xác nhận và thanh toán ${checkoutTotals?.totalVnd.toLocaleString('vi-VN')}₫`
                    )}
                  </Button>
                </>
              ) : (
                <>
                  {payment.paid ? (
                    <div className="flex items-center gap-2 rounded-lg border border-green-500/30 bg-green-500/10 p-3 text-sm text-green-700">
                      <CheckCircle2 className="h-5 w-5 shrink-0" />
                      Thanh toán thành công — credits đã được cộng.
                    </div>
                  ) : paymentWaiting ? (
                    <p className="flex items-center gap-2 text-sm text-muted">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Đang chờ xác nhận chuyển khoản…
                    </p>
                  ) : null}

                  {(payment.qrImage || payment.qrFallback) && (
                    <img
                      src={payment.qrImage || payment.qrFallback}
                      alt="VietQR"
                      className="mx-auto max-w-[260px] rounded-lg border bg-white p-2"
                    />
                  )}

                  <p className="text-center text-xs text-muted">
                    Nội dung CK: <strong>{payment.content || payment.orderCode}</strong>
                  </p>

                  {(payment.bank || payment.acc || payment.holder) && (
                    <div className="space-y-1 rounded-lg border bg-muted/30 p-3 text-sm">
                      {payment.holder && (
                        <div className="flex justify-between gap-2">
                          <span className="text-muted">Chủ TK</span>
                          <span>{payment.holder}</span>
                        </div>
                      )}
                      {payment.acc && (
                        <div className="flex justify-between gap-2">
                          <span className="text-muted">STK</span>
                          <span className="font-mono">
                            {maskAccount(payment.acc)}
                            {payment.store ? ` · ${payment.store}` : ''}
                          </span>
                        </div>
                      )}
                      {payment.bank && (
                        <div className="flex justify-between gap-2">
                          <span className="text-muted">Ngân hàng</span>
                          <span>{payment.bank}</span>
                        </div>
                      )}
                    </div>
                  )}

                  <Button className="w-full" variant="secondary" onClick={closeCheckout}>
                    {payment.paid ? 'Đóng' : 'Đóng (giữ đơn chờ)'}
                  </Button>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
