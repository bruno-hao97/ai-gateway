import { Link } from 'react-router-dom';
import { ArrowRight, Image, MessageSquare, Music, Sparkles, Video } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

const features = [
  {
    icon: Image,
    title: 'Image Studio',
    desc: 'Tạo ảnh AI từ catalog models — ratio/mode/resolution từ server, không đoán.',
  },
  {
    icon: Video,
    title: 'Video',
    desc: 'Video generation qua gateway REST — sắp có trên app.',
  },
  {
    icon: MessageSquare,
    title: 'Chat',
    desc: 'Trò chuyện với agent AI, hỗ trợ stream SSE.',
  },
  {
    icon: Music,
    title: 'Audio & TTS',
    desc: 'Giọng nói và text-to-speech qua /gateway/audio.',
  },
];

export function LandingPage() {
  return (
    <div className="min-h-dvh">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-4 py-6">
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Sparkles className="h-5 w-5" />
          </div>
          <span className="text-lg font-semibold">AI Studio</span>
        </div>
        <Button asChild variant="outline">
          <Link to="/login">Login</Link>
        </Button>
      </header>

      <section className="mx-auto max-w-6xl px-4 pb-16 pt-10 text-center md:pt-20">
        <p className="mb-3 text-sm font-medium uppercase tracking-wider text-primary">Powered by Gommo</p>
        <h1 className="mx-auto max-w-3xl text-4xl font-bold tracking-tight md:text-6xl">
          Create with AI.
          <span className="block text-primary">Image, video, chat & audio.</span>
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-lg text-muted">
          User app kết nối ai-gateway — proxy Gommo an toàn, credits qua vmedia.ai.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Button asChild size="lg">
            <Link to="/login">
              Get started
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
          <Button asChild size="lg" variant="secondary">
            <a href="https://vmedia.ai" target="_blank" rel="noreferrer">
              Register vmedia.ai
            </a>
          </Button>
        </div>
      </section>

      <section className="mx-auto grid max-w-6xl gap-4 px-4 pb-20 md:grid-cols-2 lg:grid-cols-4">
        {features.map(({ icon: Icon, title, desc }) => (
          <Card key={title} className="border-border/80 bg-card/90">
            <CardHeader>
              <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-lg bg-accent">
                <Icon className="h-5 w-5 text-primary" />
              </div>
              <CardTitle className="text-base">{title}</CardTitle>
              <CardDescription>{desc}</CardDescription>
            </CardHeader>
          </Card>
        ))}
      </section>

      <footer className="border-t border-border py-8 text-center text-sm text-muted">
        Powered by{' '}
        <a href="https://gommo.net" className="font-medium text-primary hover:underline" target="_blank" rel="noreferrer">
          Gommo
        </a>{' '}
        · vmedia.ai
      </footer>
    </div>
  );
}
