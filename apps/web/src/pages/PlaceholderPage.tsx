import type { LucideIcon } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export function PlaceholderPage({
  title,
  description,
  icon: Icon,
}: {
  title: string;
  description: string;
  icon: LucideIcon;
}) {
  return (
    <div className="mx-auto max-w-lg pt-12">
      <Card>
        <CardHeader className="text-center">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-accent">
            <Icon className="h-7 w-7 text-primary" />
          </div>
          <CardTitle>{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
        <CardContent className="text-center text-sm text-muted">
          MVP tập trung Image + Chat + Wallet. Trang này sẽ mở rộng trong bản tiếp theo.
        </CardContent>
      </Card>
    </div>
  );
}
