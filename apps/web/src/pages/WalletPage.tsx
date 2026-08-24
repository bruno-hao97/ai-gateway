import { useEffect, useState } from 'react';
import { ExternalLink, Loader2, Wallet } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ApiError, gatewayGet, gatewayPost } from '@/lib/apiClient';
import { getUsername } from '@/lib/authStore';
import { formatCredits } from '@/lib/utils';

interface CreditPackage {
  id: string;
  name: string;
  amountVnd: number;
  credits: number;
  bonusPercent: number;
  featured?: boolean;
}

interface TopupResult {
  data?: {
    url?: string;
    qrImage?: string;
    orderCode?: number;
    credits?: number;
    bankTransfer?: { content?: string; amountFormatted?: string };
  };
}

export function WalletPage() {
  const username = getUsername();
  const [packages, setPackages] = useState<CreditPackage[]>([]);
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState<string | null>(null);
  const [payment, setPayment] = useState<TopupResult['data'] | null>(null);

  useEffect(() => {
    void (async () => {
      try {
        const res = await gatewayGet<{ data?: CreditPackage[] }>('/billing/packages');
        setPackages(res.data || []);
      } catch (err) {
        toast.error(err instanceof ApiError ? err.message : 'Không tải gói nạp');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  async function createTopup(packageId: string) {
    if (!username) {
      toast.error('Thiếu username Gommo — đăng nhập lại');
      return;
    }
    setPaying(packageId);
    setPayment(null);
    try {
      const res = await gatewayPost<TopupResult>('/billing/topup/create', { username, packageId });
      setPayment(res.data || null);
      toast.success('Đơn PayOS đã tạo — quét QR hoặc mở link');
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : 'Tạo đơn thất bại';
      if (msg.includes('PayOS') || msg.includes('cấu hình')) {
        toast.error('Billing chưa cấu hình — cấu hình PayOS trên server sau');
      } else {
        toast.error(msg);
      }
    } finally {
      setPaying(null);
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold">
          <Wallet className="h-7 w-7 text-primary" />
          Wallet
        </h1>
        <p className="mt-1 text-muted">
          Nạp credit qua PayOS · user <strong>{username || '—'}</strong>
        </p>
      </div>

      {loading ? (
        <p className="flex items-center gap-2 text-sm text-muted">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading packages…
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
                  disabled={paying === pkg.id}
                  onClick={() => void createTopup(pkg.id)}
                >
                  {paying === pkg.id ? 'Creating…' : 'Nạp ngay'}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {payment && (
        <Card>
          <CardHeader>
            <CardTitle>Thanh toán PayOS</CardTitle>
            <CardDescription>Order #{payment.orderCode}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {payment.qrImage && (
              <img src={payment.qrImage} alt="PayOS QR" className="mx-auto max-w-xs rounded-lg border" />
            )}
            {payment.url && (
              <Button asChild className="w-full">
                <a href={payment.url} target="_blank" rel="noreferrer">
                  <ExternalLink className="h-4 w-4" />
                  Mở trang thanh toán
                </a>
              </Button>
            )}
            {payment.bankTransfer && (
              <p className="text-center text-sm text-muted">
                {payment.bankTransfer.amountFormatted} · {payment.bankTransfer.content}
              </p>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
