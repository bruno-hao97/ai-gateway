import { useEffect, useMemo, useState } from 'react';
import { Download, Loader2, Video } from 'lucide-react';
import { toast } from 'sonner';
import { useOutletContext } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import type { AppOutletContext } from '@/components/layout/AppShell';
import { ApiError, gatewayGet, gatewayPost } from '@/lib/apiClient';
import { pickJobResultUrl } from '@/lib/jobResult';
import type { CatalogModel } from '@/lib/models';
import { parseModelsEnvelope } from '@/lib/models';

export function VideoStudioPage() {
  const { refreshCredits } = useOutletContext<AppOutletContext>();
  const [models, setModels] = useState<CatalogModel[]>([]);
  const [loadingModels, setLoadingModels] = useState(true);
  const [modelSlug, setModelSlug] = useState('');
  const [ratio, setRatio] = useState('');
  const [mode, setMode] = useState('');
  const [resolution, setResolution] = useState('');
  const [duration, setDuration] = useState('');
  const [prompt, setPrompt] = useState('A cat walking in a sunny garden, cinematic');
  const [generating, setGenerating] = useState(false);
  const [resultUrl, setResultUrl] = useState<string | null>(null);

  const selected = useMemo(
    () => models.find((m) => m.slug === modelSlug),
    [models, modelSlug],
  );

  useEffect(() => {
    void (async () => {
      setLoadingModels(true);
      try {
        const envelope = await gatewayGet<{ data?: unknown }>('/gateway/models?type=video');
        const list = parseModelsEnvelope(envelope);
        setModels(list);
        if (list[0]) {
          setModelSlug(list[0].slug);
          setRatio(list[0].ratios[0] || '');
          setMode(list[0].modes[0] || '');
          setResolution(list[0].resolutions[0] || '');
          setDuration(list[0].durations[0] || '');
        }
      } catch (err) {
        toast.error(err instanceof ApiError ? err.message : 'Không tải được models');
      } finally {
        setLoadingModels(false);
      }
    })();
  }, []);

  useEffect(() => {
    if (!selected) return;
    if (selected.ratios.length && !selected.ratios.includes(ratio)) setRatio(selected.ratios[0]);
    if (selected.modes.length && !selected.modes.includes(mode)) setMode(selected.modes[0]);
    if (selected.resolutions.length && !selected.resolutions.includes(resolution)) {
      setResolution(selected.resolutions[0]);
    }
    if (selected.durations.length && !selected.durations.includes(duration)) {
      setDuration(selected.durations[0]);
    }
  }, [selected, ratio, mode, resolution, duration]);

  async function generate() {
    if (!modelSlug) {
      toast.error('Chọn model');
      return;
    }
    if (!ratio && selected?.ratios.length) {
      toast.error('Chọn ratio từ catalog');
      return;
    }
    if (!duration && selected?.durations.length) {
      toast.error('Chọn duration từ catalog');
      return;
    }
    setGenerating(true);
    setResultUrl(null);
    try {
      const fields: Record<string, string> = { prompt: prompt.trim() };
      if (ratio) fields.ratio = ratio;
      if (mode) fields.mode = mode;
      if (resolution) fields.resolution = resolution;
      if (duration) fields.duration = duration;

      const res = await gatewayPost<{ data?: unknown }>('/gateway/jobs/video', {
        modelSlug,
        wait: true,
        fields,
      });
      const url = pickJobResultUrl(res, 'video');
      if (!url) throw new Error('Job xong nhưng không có result URL');
      setResultUrl(url);
      await refreshCredits();
      toast.success('Video đã sẵn sàng');
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Tạo video thất bại');
    } finally {
      setGenerating(false);
    }
  }

  return (
    <div className="mx-auto grid max-w-6xl gap-6 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Video className="h-5 w-5 text-primary" />
            Video Studio
          </CardTitle>
          <CardDescription>Catalog từ GET /gateway/models?type=video — poll tới khi có URL.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {loadingModels ? (
            <p className="flex items-center gap-2 text-sm text-muted">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading models…
            </p>
          ) : models.length === 0 ? (
            <p className="text-sm text-muted">Không có model video. Kiểm tra token và gateway.</p>
          ) : (
            <>
              <div className="space-y-2">
                <Label>Model</Label>
                <Select value={modelSlug} onValueChange={setModelSlug}>
                  <SelectTrigger>
                    <SelectValue placeholder="Chọn model" />
                  </SelectTrigger>
                  <SelectContent>
                    {models.map((m) => (
                      <SelectItem key={m.slug} value={m.slug}>
                        {m.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {selected && selected.ratios.length > 0 && (
                <div className="space-y-2">
                  <Label>Ratio</Label>
                  <Select value={ratio} onValueChange={setRatio}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {selected.ratios.map((r) => (
                        <SelectItem key={r} value={r}>
                          {r}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              {selected && selected.modes.length > 0 && (
                <div className="space-y-2">
                  <Label>Mode</Label>
                  <Select value={mode} onValueChange={setMode}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {selected.modes.map((m) => (
                        <SelectItem key={m} value={m}>
                          {m}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              {selected && selected.resolutions.length > 0 && (
                <div className="space-y-2">
                  <Label>Resolution</Label>
                  <Select value={resolution} onValueChange={setResolution}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {selected.resolutions.map((r) => (
                        <SelectItem key={r} value={r}>
                          {r}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              {selected && selected.durations.length > 0 && (
                <div className="space-y-2">
                  <Label>Duration</Label>
                  <Select value={duration} onValueChange={setDuration}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {selected.durations.map((d) => (
                        <SelectItem key={d} value={d}>
                          {d}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              <div className="space-y-2">
                <Label>Prompt</Label>
                <Textarea value={prompt} onChange={(e) => setPrompt(e.target.value)} rows={4} />
              </div>
              <Button className="w-full" onClick={() => void generate()} disabled={generating}>
                {generating ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" /> Generating…
                  </>
                ) : (
                  'Generate video'
                )}
              </Button>
            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Result</CardTitle>
          <CardDescription>wait: true — có thể mất vài phút</CardDescription>
        </CardHeader>
        <CardContent>
          {!resultUrl && !generating && (
            <div className="flex min-h-[320px] flex-col items-center justify-center rounded-xl border border-dashed border-border bg-accent/30 p-8 text-center text-sm text-muted">
              Video sẽ hiển thị ở đây sau khi job hoàn thành.
            </div>
          )}
          {generating && (
            <div className="flex min-h-[320px] flex-col items-center justify-center gap-3 rounded-xl bg-accent/40">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-sm text-muted">Đang render video…</p>
            </div>
          )}
          {resultUrl && (
            <div className="space-y-4">
              <video
                src={resultUrl}
                controls
                className="w-full rounded-xl border border-border bg-black"
              />
              <Button asChild variant="secondary" className="w-full">
                <a href={resultUrl} download target="_blank" rel="noreferrer">
                  <Download className="h-4 w-4" />
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
