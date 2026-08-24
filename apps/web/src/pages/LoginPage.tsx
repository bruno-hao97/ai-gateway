import { type FormEvent, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ApiError, fetchMe, loginWithPassword } from '@/lib/apiClient';
import { saveAuth } from '@/lib/authStore';
import { GOMMO_DOMAIN } from '@/lib/env';
import { Sparkles } from 'lucide-react';

export function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: string } | null)?.from || '/app';
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const domain = GOMMO_DOMAIN;
      const access_token = await loginWithPassword(email.trim(), password, domain);
      const me = await fetchMe(access_token, domain);
      saveAuth({ access_token, domain, me });
      toast.success('Đăng nhập thành công');
      navigate(from, { replace: true });
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Đăng nhập thất bại');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-dvh items-center justify-center bg-[linear-gradient(135deg,oklch(0.97_0.02_270),oklch(0.99_0_0))] p-4">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="text-center">
          <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <Sparkles className="h-6 w-6" />
          </div>
          <CardTitle>Welcome back</CardTitle>
          <CardDescription>
            Login qua gateway proxy · domain <strong>{GOMMO_DOMAIN}</strong>
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={onSubmit}>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Signing in…' : 'Sign in'}
            </Button>
          </form>
          <p className="mt-6 text-center text-sm text-muted">
            Chưa có tài khoản?{' '}
            <a href="https://vmedia.ai" className="font-medium text-primary hover:underline" target="_blank" rel="noreferrer">
              Đăng ký vmedia.ai
            </a>
          </p>
          <p className="mt-2 text-center text-sm">
            <Link to="/" className="text-muted hover:text-foreground">
              ← Back to home
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
