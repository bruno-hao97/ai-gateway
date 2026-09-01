import { useEffect, useState } from 'react';
import { AudioLines, Loader2, Play } from 'lucide-react';
import { toast } from 'sonner';
import { useOutletContext } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import type { AppOutletContext } from '@/components/layout/AppShell';
import { ApiError, gatewayPost } from '@/lib/apiClient';

type VoiceServer = 'elevenlabs_cheap' | 'minimaxai_cheap' | 'omnivoice_local';

interface VoiceItem {
  voice_id: string;
  name: string;
  preview_url?: string;
}

const SERVERS: { id: VoiceServer; label: string; defaultModel: string }[] = [
  { id: 'elevenlabs_cheap', label: 'ElevenLabs', defaultModel: 'eleven_multilingual_v2' },
  { id: 'minimaxai_cheap', label: 'MiniMax', defaultModel: 'speech-02-turbo' },
  { id: 'omnivoice_local', label: 'OmniVoice', defaultModel: 'default' },
];

function pickAudioUrl(data: unknown): string | null {
  if (!data || typeof data !== 'object') return null;
  const root = data as Record<string, unknown>;
  const nested = root.data as Record<string, unknown> | undefined;
  const fileUrl = nested?.fileUrl || nested?.file_url;
  if (typeof fileUrl === 'string' && fileUrl.startsWith('http')) return fileUrl;
  const audioInfo = nested?.audioInfo as { file_url?: string; result_url?: string; url?: string } | undefined;
  const fromInfo = audioInfo?.file_url || audioInfo?.result_url || audioInfo?.url;
  return typeof fromInfo === 'string' && fromInfo.startsWith('http') ? fromInfo : null;
}

export function AudioStudioPage() {
  const { refreshCredits } = useOutletContext<AppOutletContext>();
  const [server, setServer] = useState<VoiceServer>('elevenlabs_cheap');
  const [voices, setVoices] = useState<VoiceItem[]>([]);
  const [voiceId, setVoiceId] = useState('');
  const [model, setModel] = useState('eleven_multilingual_v2');
  const [voiceQuery, setVoiceQuery] = useState('');
  const [text, setText] = useState('Xin chào, đây là bản demo text-to-speech qua AI Gateway.');
  const [loadingVoices, setLoadingVoices] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);

  const serverMeta = SERVERS.find((item) => item.id === server) || SERVERS[0];

  async function loadVoices(nextServer = server, query = voiceQuery) {
    setLoadingVoices(true);
    try {
      const res = await gatewayPost<{ data?: { voices?: VoiceItem[] } }>('/gateway/audio/voices', {
        server: nextServer,
        page: 0,
        query: query.trim() || undefined,
      });
      const list = res.data?.voices || [];
      setVoices(list);
      if (list[0]) setVoiceId(list[0].voice_id);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Không tải được voices');
      setVoices([]);
      setVoiceId('');
    } finally {
      setLoadingVoices(false);
    }
  }

  useEffect(() => {
    setModel(serverMeta.defaultModel);
    void loadVoices(server);
  }, [server]);

  async function synthesize() {
    if (!voiceId) {
      toast.error('Chọn voice');
      return;
    }
    if (!text.trim()) {
      toast.error('Nhập text');
      return;
    }
    setGenerating(true);
    setAudioUrl(null);
    try {
      const selectedVoice = voices.find((v) => v.voice_id === voiceId);
      const res = await gatewayPost<{ data?: unknown }>('/gateway/audio/tts', {
        text: text.trim(),
        voice_id: voiceId,
        server,
        model,
        voice_name: selectedVoice?.name,
      });
      const url = pickAudioUrl(res);
      if (!url) throw new Error('TTS xong nhưng không có file URL');
      setAudioUrl(url);
      await refreshCredits();
      toast.success('Audio đã sẵn sàng');
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'TTS thất bại');
    } finally {
      setGenerating(false);
    }
  }

  return (
    <div className="mx-auto grid max-w-6xl gap-6 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AudioLines className="h-5 w-5 text-primary" />
            Audio Studio
          </CardTitle>
          <CardDescription>TTS qua POST /gateway/audio/tts — voices từ catalog upstream.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Provider</Label>
            <Select
              value={server}
              onValueChange={(value) => setServer(value as VoiceServer)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SERVERS.map((item) => (
                  <SelectItem key={item.id} value={item.id}>
                    {item.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex gap-2">
            <Input
              value={voiceQuery}
              onChange={(e) => setVoiceQuery(e.target.value)}
              placeholder="Tìm voice…"
            />
            <Button variant="secondary" disabled={loadingVoices} onClick={() => void loadVoices()}>
              {loadingVoices ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Tìm'}
            </Button>
          </div>

          <div className="space-y-2">
            <Label>Voice</Label>
            {loadingVoices ? (
              <p className="flex items-center gap-2 text-sm text-muted">
                <Loader2 className="h-4 w-4 animate-spin" /> Loading voices…
              </p>
            ) : voices.length === 0 ? (
              <p className="text-sm text-muted">Không có voice — thử provider khác.</p>
            ) : (
              <Select value={voiceId} onValueChange={setVoiceId}>
                <SelectTrigger>
                  <SelectValue placeholder="Chọn voice" />
                </SelectTrigger>
                <SelectContent>
                  {voices.map((voice) => (
                    <SelectItem key={voice.voice_id} value={voice.voice_id}>
                      {voice.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          <div className="space-y-2">
            <Label>Model</Label>
            <Input value={model} onChange={(e) => setModel(e.target.value)} />
          </div>

          <div className="space-y-2">
            <Label>Text</Label>
            <Textarea value={text} onChange={(e) => setText(e.target.value)} rows={5} />
          </div>

          <Button className="w-full" onClick={() => void synthesize()} disabled={generating || !voiceId}>
            {generating ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" /> Synthesizing…
              </>
            ) : (
              'Generate speech'
            )}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Result</CardTitle>
          <CardDescription>Phát hoặc tải file audio</CardDescription>
        </CardHeader>
        <CardContent>
          {!audioUrl && !generating && (
            <div className="flex min-h-[320px] flex-col items-center justify-center rounded-xl border border-dashed border-border bg-accent/30 p-8 text-center text-sm text-muted">
              Audio sẽ hiển thị ở đây sau khi TTS hoàn thành.
            </div>
          )}
          {generating && (
            <div className="flex min-h-[320px] items-center justify-center rounded-xl bg-accent/40">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          )}
          {audioUrl && (
            <div className="space-y-4">
              <audio src={audioUrl} controls className="w-full" />
              <Button asChild variant="secondary" className="w-full">
                <a href={audioUrl} download target="_blank" rel="noreferrer">
                  <Play className="h-4 w-4" />
                  Download
                </a>
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
