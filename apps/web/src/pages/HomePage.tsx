import { Link } from 'react-router-dom';
import { Image, MessageSquare, Wallet } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { getCreditsAi, getDisplayName } from '@/lib/authStore';
import { formatCredits } from '@/lib/utils';
import { useOutletContext } from 'react-router-dom';
import type { AppOutletContext } from '@/components/layout/AppShell';
import { useEffect } from 'react';

export function HomePage() {
  const { refreshCredits } = useOutletContext<AppOutletContext>();

  useEffect(() => {
    void refreshCredits();
  }, [refreshCredits]);

  const credits = getCreditsAi();

  return (
    <div className="mx-auto max-w-4xl space-y-8">
      <div>
        <p className="text-sm text-muted">Good to see you</p>
        <h1 className="text-3xl font-bold tracking-tight">{getDisplayName()}</h1>
        <p className="mt-2 text-lg text-muted">
          Balance: <span className="font-semibold text-foreground">{formatCredits(credits)}</span> credits
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="hover:border-primary/30 transition-colors">
          <CardHeader>
            <Image className="h-8 w-8 text-primary" />
            <CardTitle className="text-base">Image Studio</CardTitle>
            <CardDescription>Tạo ảnh từ prompt + catalog models</CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild className="w-full">
              <Link to="/app/image">Open studio</Link>
            </Button>
          </CardContent>
        </Card>
        <Card className="hover:border-primary/30 transition-colors">
          <CardHeader>
            <MessageSquare className="h-8 w-8 text-primary" />
            <CardTitle className="text-base">Chat</CardTitle>
            <CardDescription>Agent chat với streaming</CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild className="w-full" variant="secondary">
              <Link to="/app/chat">Start chat</Link>
            </Button>
          </CardContent>
        </Card>
        <Card className="hover:border-primary/30 transition-colors">
          <CardHeader>
            <Wallet className="h-8 w-8 text-primary" />
            <CardTitle className="text-base">Wallet</CardTitle>
            <CardDescription>Nạp credit qua PayOS</CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild className="w-full" variant="outline">
              <Link to="/app/wallet">Top up</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
