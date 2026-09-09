/**
 * Endpoint detail drawer — 79ai-style docs modal for playground Endpoints tab.
 */
(function (global) {
  const $ = (id) => document.getElementById(id);

  const DETAIL_TAB_IDS = [
    'overview',
    'auth',
    'parameters',
    'payload',
    'code',
    'sandbox',
    'responses',
    'workflow',
    'ai',
  ];

  const CAPABILITY_FLAGS = [
    { key: 'startText', labelEn: 'Text prompt', labelVi: 'Prompt text' },
    { key: 'startImage', labelEn: 'Start image URL', labelVi: 'Ảnh bắt đầu' },
    { key: 'startImageAndEnd', labelEn: 'Start + end frames', labelVi: 'Frame đầu + cuối' },
    { key: 'withReference', labelEn: 'Reference images', labelVi: 'Ảnh tham chiếu' },
    { key: 'withMotion', labelEn: 'Motion / driving video', labelVi: 'Motion video' },
    { key: 'withMultiShots', labelEn: 'Multi-shot prompts', labelVi: 'Multi-shot' },
    { key: 'withEdit', labelEn: 'Video edit', labelVi: 'Chỉnh sửa video' },
    { key: 'withReplace', labelEn: 'Replace region', labelVi: 'Thay vùng' },
    { key: 'withLipsync', labelEn: 'Lipsync audio', labelVi: 'Lipsync audio' },
  ];

  let activeEndpointId = null;
  let activeDetailTab = 'overview';
  let payloadVariant = 'json';
  let codeMode = 'gateway';
  let sandboxDraft = {
    path: '',
    body: '',
    pollId: '',
    media: 'image',
    lastResponse: null,
    lastMeta: null,
  };

  function pgT(key, fallback) {
    return global.PortalI18n?.t(key, fallback) ?? fallback ?? key;
  }

  function isVi() {
    return global.PortalI18n?.getLocale() === 'vi';
  }

  function t(en, vi) {
    return isVi() ? vi || en : en;
  }

  function label(ep) {
    if (!ep?.name) return ep?.id || '';
    return isVi() ? ep.name.vi || ep.name.en : ep.name.en;
  }

  function epSummary(ep) {
    if (!ep) return '';
    if (ep.summary) return isVi() ? ep.summary.vi || ep.summary.en : ep.summary.en;
    if (ep.overview) return isVi() ? ep.overview.vi || ep.overview.en : ep.overview.en;
    return '';
  }

  function tabLabel(id) {
    return pgT(`ep.tab.${id}`, id);
  }

  function localizeRows(rows) {
    const reg = global.GatewayEndpointRegistry;
    const fn = reg?.localizeParam;
    if (!fn) return rows;
    return rows.map((p) => fn(p, isVi()));
  }

  function resolveGatewaySandboxPath(ep, ctx, extras = {}) {
    if (ep.id === 'poll-job') {
      const media =
        extras.media ||
        ep.pollMedia ||
        (ctx.jobType === 'music' ? 'music' : ctx.jobType === 'video' ? 'video' : 'image');
      const id = extras.pollId?.trim() || '{id_base}';
      return `/gateway/jobs/${encodeURIComponent(id)}?media=${encodeURIComponent(media)}`;
    }
    if (ep.id === 'list-models') {
      const jt = $('modelType')?.value || ctx.jobType || 'image';
      return `/gateway/models?type=${encodeURIComponent(jt)}`;
    }
    if (ep.id === 'audio-lists') {
      const pid = $('audioProjectId')?.value?.trim();
      return pid ? `/gateway/audio/lists?projectId=${encodeURIComponent(pid)}` : '/gateway/audio/lists';
    }
    return resolvePath(ep, ctx, 'gateway');
  }

  function defaultSandboxBody(ep, ctx) {
    if (ep.id === 'me-credits') {
      const token = $('token')?.value?.trim() || '';
      return { access_token: token || '<access_token>', domain: ctx.domain };
    }
    if (ep.id === 'audio-tts') {
      return { text: 'Hello', voice_id: '<voice_id>', server: 'elevenlabs_cheap', model: '<model>' };
    }
    return buildGatewayPayload(ep, ctx);
  }

  function ensureSandboxDraft(ep, ctx) {
    if (!sandboxDraft.path) sandboxDraft.path = resolveGatewaySandboxPath(ep, ctx);
    if (!sandboxDraft.body && ep.method !== 'GET') {
      sandboxDraft.body = JSON.stringify(defaultSandboxBody(ep, ctx), null, 2);
    }
    if (ep.id === 'poll-job' && !sandboxDraft.media) {
      sandboxDraft.media = ep.pollMedia || (ctx.jobType === 'music' ? 'music' : ctx.jobType === 'video' ? 'video' : 'image');
    }
  }

  function formatSandboxResponse(body) {
    try {
      const text = JSON.stringify(body, null, 2);
      if (global.GwJsonHighlight?.highlightJson) {
        return global.GwJsonHighlight.highlightJson(text);
      }
      return escapeHtml(text);
    } catch {
      return escapeHtml(String(body));
    }
  }

  function readPlaygroundContext(ep) {
    const jobType = ep?.jobType || $('jobType')?.value || 'image';
    const modelSlug = $('mediaModelSelect')?.value || '';
    const prompt = $('mediaPrompt')?.value?.trim() || '';
    const domain = $('loginDomain')?.value?.trim() || global.GatewayAiGuide?.DEFAULT_DOMAIN || '79ai.net';
    let base = '';
    try {
      if (typeof global.baseUrl === 'function') base = global.baseUrl();
      else base = window.location.origin.replace(/\/$/, '');
    } catch {
      base = window.location.origin.replace(/\/$/, '');
    }

    let modelName = modelSlug;
    const envelope = modelSlug && typeof global.getStoredModelsEnvelope === 'function'
      ? global.getStoredModelsEnvelope(jobType)
      : null;
    if (envelope && modelSlug && typeof global.normalizeModels === 'function') {
      const m = global.normalizeModels(envelope).find((x) => x.slug === modelSlug);
      if (m?.name) modelName = m.name;
    }

    const fields = {};
    document.querySelectorAll('[data-catalog-field]').forEach((sel) => {
      const key = sel.dataset.catalogField;
      const val = sel.value?.trim();
      if (key && val) fields[key] = val;
    });
    if (prompt) fields.prompt = prompt;

    return { baseUrl: base, jobType, modelSlug, modelName, domain, prompt, fields, envelope };
  }

  function resolveRawModel(ctx) {
    if (!ctx.modelSlug || !ctx.envelope || !global.parseModelsList) return null;
    const list = global.parseModelsList(ctx.envelope);
    const slugFn = global.modelSlug || ((m) => m?.slug || m?.model || '');
    return list.find((m) => slugFn(m) === ctx.modelSlug) || null;
  }

  function resolvePath(ep, ctx, mode = codeMode) {
    const jt = ep.jobType || ctx.jobType || 'image';
    const slug = ctx.modelSlug || 'model_slug';

    if (mode === 'proxy') {
      if (ep.id === 'list-models') return `/v2/ai/models?type=${jt}`;
      if (ep.id === 'poll-job') {
        const media = ep.pollMedia || global.GatewayAiGuide?.mediaForPoll?.(jt) || 'image';
        return `/v2/ai/jobs/{id_base}?media=${media}`;
      }
      if (ep.id?.startsWith('create-')) return `/v2/ai/jobs/${jt}/${slug}`;
      if (ep.id === 'upload-image') return `/v2/ai/upload/image`;
      if (ep.id === 'upload-video') return `/v2/ai/upload/video`;
      if (ep.id === 'upload-audio') return `/v2/ai/upload/audio`;
      if (ep.id === 'me-credits') return `/api/apps/go-mmo/ai/me`;
    }

    let path = ep.path || '';
    path = path.replace('{type}', jt).replace('{tool-type}', jt);
    if (ctx.modelSlug) path = path.replace('{modelSlug}', ctx.modelSlug);
    return path;
  }

  function catalogParamRows(ctx) {
    const rows = [];
    const slug = ctx.modelSlug;
    if (!slug || !global.normalizeModels) return rows;

    const model = global.normalizeModels(ctx.envelope || global.getStoredModelsEnvelope?.(ctx.jobType)).find(
      (m) => m.slug === slug,
    );
    if (!model) return rows;

    const defs = global.CATALOG_FIELD_DEFS || [];
    for (const def of defs) {
      const list =
        def.field === 'ratio'
          ? model.ratios
          : def.field === 'mode'
            ? model.modes
            : def.field === 'resolution'
              ? model.resolutions
              : model.durations;
      if (!list?.length) continue;
      rows.push({
        name: `fields.${def.field}`,
        in: 'body',
        type: 'string',
        required: true,
        description: pgT('ep.cap.catalogEnum', '{label} — enum from catalog (never guess)').replace(
          '{label}',
          def.label,
        ),
        example: list.slice(0, 4).join(' | '),
      });
    }
    return rows;
  }

  function modelCapabilityRows(raw) {
    if (!raw) return [];
    const rows = [];
    for (const cap of CAPABILITY_FLAGS) {
      if (!raw[cap.key]) continue;
      rows.push({
        name: cap.key,
        in: 'fields',
        type: 'capability',
        required: false,
        description: isVi() ? cap.labelVi : cap.labelEn,
        example: pgT('ep.cap.requiredWhen', 'Required when flag is true'),
      });
    }
    if (raw.withReference) {
      rows.push({
        name: 'fields.references[].url',
        in: 'body.fields',
        type: 'array<url>',
        required: true,
        description: pgT('ep.cap.refUrls', 'Style/component reference URLs'),
        example: 'https://cdn.example.com/ref.jpg',
      });
    }
    if (raw.startImage || raw.startImageAndEnd) {
      rows.push({
        name: 'fields.images[].url',
        in: 'body.fields',
        type: 'array<url>',
        required: true,
        description: pgT('ep.cap.frameUrls', 'Start/end frame image URLs'),
        example: 'https://cdn.example.com/start.jpg',
      });
    }
    return rows;
  }

  function buildGatewayPayload(ep, ctx) {
    if (ep.id?.startsWith('create-') && ep.id !== 'create-tool-job') {
      return {
        modelSlug: ctx.modelSlug || '<modelSlug>',
        wait: false,
        fields: { ...(ctx.prompt ? { prompt: ctx.prompt } : {}), ...ctx.fields },
        domain: ctx.domain,
      };
    }
    if (ep.id === 'auth-login') {
      return { email: 'user@example.com', password: '••••••', domain: ctx.domain };
    }
    if (ep.id === 'chat') {
      return { action: 'chat', messages: [{ role: 'user', content: ctx.prompt || 'Hello' }] };
    }
    return {};
  }

  function buildProxyFlatPayload(ep, ctx) {
    const jt = ep.jobType || ctx.jobType;
    if (ep.id?.startsWith('create-')) {
      return {
        domain: ctx.domain,
        ...(ctx.prompt ? { prompt: ctx.prompt } : {}),
        ...ctx.fields,
      };
    }
    if (ep.id === 'list-models') return { type: jt, domain: ctx.domain };
    return buildGatewayPayload(ep, ctx);
  }

  function buildPayloadText(ep, ctx) {
    if (codeMode === 'proxy' && payloadVariant === 'form') {
      const flat = buildProxyFlatPayload(ep, ctx);
      return Object.entries(flat)
        .map(([k, v]) => `${k}=${encodeURIComponent(String(v))}`)
        .join('&');
    }
    if (payloadVariant === 'multipart') {
      const flat = buildProxyFlatPayload(ep, ctx);
      return JSON.stringify({ ...flat, file: '@reference.jpg' }, null, 2);
    }
    const body = codeMode === 'proxy' ? buildProxyFlatPayload(ep, ctx) : buildGatewayPayload(ep, ctx);
    return JSON.stringify(body, null, 2);
  }

  function buildCurl(ep, ctx) {
    const base = ctx.baseUrl.replace(/\/$/, '');
    const path = resolvePath(ep, ctx, codeMode);
    const url = `${base}${path.startsWith('/') ? path : `/${path}`}`;
    const token = $('token')?.value?.trim();
    const tokenMask = token ? `${token.slice(0, 12)}…` : 'YOUR_ACCESS_TOKEN';

    if (payloadVariant === 'multipart' || ep.contentTypes?.includes('multipart/form-data') && payloadVariant !== 'json') {
      const field =
        ep.id === 'upload-video'
          ? 'video_file'
          : ep.id === 'upload-audio'
            ? 'audio_file'
            : 'file';
      return `curl -X ${ep.method} '${url}' \\\n  -H 'Authorization: Bearer ${tokenMask}' \\\n  -F '${field}=@reference.jpg'`;
    }
    if (ep.contentTypes?.includes('application/x-www-form-urlencoded') && ep.id === 'me-credits') {
      return `curl -X ${ep.method} '${url}' \\\n  -H 'Content-Type: application/x-www-form-urlencoded' \\\n  -d 'access_token=${tokenMask}&domain=${ctx.domain}'`;
    }
    if (payloadVariant === 'form' && codeMode === 'proxy') {
      const flat = buildProxyFlatPayload(ep, ctx);
      const data = Object.entries(flat).map(([k, v]) => `${k}=${encodeURIComponent(String(v))}`).join('&');
      return `curl -X ${ep.method} '${url}' \\\n  -H 'Authorization: Bearer ${tokenMask}' \\\n  -H 'Content-Type: application/x-www-form-urlencoded' \\\n  -d '${data}'`;
    }
    const body = buildPayloadText(ep, ctx);
    return `curl -X ${ep.method} '${url}' \\\n  -H 'Authorization: Bearer ${tokenMask}' \\\n  -H 'Content-Type: application/json' \\\n  -d '${body.replace(/'/g, "'\\''")}'`;
  }

  function renderParamTable(rows) {
    if (!rows.length) {
      return `<p class="pg-ep-detail-muted">${pgT('ep.noParams')}</p>`;
    }
    const head = `<thead><tr>
      <th>${pgT('ep.col.name')}</th>
      <th>${pgT('ep.col.in')}</th>
      <th>${pgT('ep.col.type')}</th>
      <th>${pgT('ep.col.required')}</th>
      <th>${pgT('ep.col.description')}</th>
    </tr></thead>`;
    const body = rows
      .map(
        (p) => `<tr>
          <td><code>${escapeHtml(p.name)}</code></td>
          <td>${escapeHtml(p.in || '—')}</td>
          <td>${escapeHtml(p.type || '—')}</td>
          <td>${p.required ? pgT('ep.yes') : pgT('ep.optional')}</td>
          <td>${escapeHtml(p.description || '')}${p.example ? `<br><span class="pg-ep-detail-muted">e.g. ${escapeHtml(p.example)}</span>` : ''}</td>
        </tr>`,
      )
      .join('');
    return `<div class="pg-ep-detail-table-wrap"><table class="pg-kv-table">${head}<tbody>${body}</tbody></table></div>`;
  }

  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function renderModeToggle() {
    return `<div class="pg-ep-mode-tabs">
      <button type="button" class="pg-ep-mode-tab${codeMode === 'gateway' ? ' active' : ''}" data-code-mode="gateway">${pgT('ep.mode.gateway')}</button>
      <button type="button" class="pg-ep-mode-tab${codeMode === 'proxy' ? ' active' : ''}" data-code-mode="proxy">${pgT('ep.mode.proxy')}</button>
    </div>`;
  }

  function renderOverview(ep, ctx) {
    const desc = isVi() ? ep.overview?.vi : ep.overview?.en;
    const types = (ep.contentTypes || []).map((c) => `<code>${c}</code>`).join(', ');
    return `
      <p class="pg-ep-detail-lead">${escapeHtml(desc || '')}</p>
      <dl class="pg-ep-detail-dl">
        <dt>${pgT('ep.overview.group')}</dt><dd><code>${escapeHtml(ep.group || '—')}</code></dd>
        <dt>${pgT('ep.overview.execution')}</dt><dd>${ep.async ? '<span class="pg-ep-badge">async</span>' : 'sync'}</dd>
        <dt>${pgT('ep.overview.contentTypes')}</dt><dd>${types || '—'}</dd>
        ${ep.upstreamPath ? `<dt>${pgT('ep.overview.upstream')}</dt><dd><code>${escapeHtml(ep.upstreamPath)}</code></dd>` : ''}
        <dt>${pgT('ep.overview.gatewayPath')}</dt><dd><code>${escapeHtml(resolvePath(ep, ctx, 'gateway'))}</code></dd>
        <dt>${pgT('ep.overview.proxyPath')}</dt><dd><code>${escapeHtml(resolvePath(ep, ctx, 'proxy'))}</code></dd>
        <dt>${pgT('ep.overview.baseUrl')}</dt><dd><code>${escapeHtml(ctx.baseUrl)}</code></dd>
      </dl>`;
  }

  function renderAuth(ep) {
    if (!ep.auth) {
      return `<p class="pg-ep-detail-lead">${pgT('ep.auth.none')}</p>`;
    }
    const reg = global.GatewayEndpointRegistry;
    const headers = (reg?.AUTH_HEADERS || []).map((h) => {
      const row = reg.localizeAuthHeader ? reg.localizeAuthHeader(h, isVi()) : h;
      return {
        name: row.name,
        in: row.source,
        type: row.type,
        required: row.required,
        description: row.description,
        example: row.example,
      };
    });
    return `
      <p class="pg-ep-detail-warn">${pgT('ep.auth.warn')}</p>
      <h3 class="pg-ep-detail-h3">${pgT('ep.auth.headers')}</h3>
      ${renderParamTable(headers)}
      <h3 class="pg-ep-detail-h3">${pgT('ep.auth.credentials')}</h3>
      <ul class="pg-ep-detail-list">
        <li><code>Authorization: Bearer &lt;ACCESS_TOKEN&gt;</code></li>
        <li>${pgT('ep.auth.loginVia')} <code>POST /gateway/auth/login</code></li>
      </ul>`;
  }

  function renderParameters(ep, ctx) {
    const staticRows = localizeRows((ep.parameters || []).map((p) => ({ ...p })));
    const dynamic = staticRows.some((p) => p.dynamicCatalog) ? catalogParamRows(ctx) : [];
    const raw = resolveRawModel(ctx);
    const caps = ep.id?.startsWith('create-') ? modelCapabilityRows(raw) : [];
    const merged = [...staticRows.filter((p) => !p.dynamicCatalog), ...dynamic];

    let extra = '';
    if (!ctx.modelSlug && ep.id?.startsWith('create-')) {
      extra = `<p class="pg-ep-detail-note">${pgT('ep.noModel')}</p>`;
    } else if (ctx.modelSlug) {
      extra = `<p class="pg-ep-detail-note">${pgT('ep.modelContext')}: <code>${escapeHtml(ctx.modelSlug)}</code>${raw?.name ? ` — ${escapeHtml(raw.name)}` : ''}</p>`;
    }

    return `
      <h3 class="pg-ep-detail-h3">${pgT('ep.params.pathQueryBody')}</h3>
      ${renderParamTable(merged)}
      ${caps.length ? `<h3 class="pg-ep-detail-h3">${pgT('ep.capabilities')}</h3>${renderParamTable(caps)}` : ''}
      ${extra}`;
  }

  function renderPayload(ep, ctx) {
    const variants = [];
    if (codeMode === 'gateway') variants.push('json');
    else {
      variants.push('json', 'form');
      if (ep.id?.startsWith('create-') || ep.id?.startsWith('upload')) variants.push('multipart');
    }
    if (ep.contentTypes?.includes('multipart/form-data') && !variants.includes('multipart')) {
      variants.push('multipart');
    }

    const tabBtns = variants
      .map((v) => {
        const label = v === 'json' ? 'JSON' : v === 'form' ? 'Form' : 'Multipart';
        return `<button type="button" class="pg-ep-payload-tab${payloadVariant === v ? ' active' : ''}" data-payload-variant="${v}">${label}</button>`;
      })
      .join('');

    const body = buildPayloadText(ep, ctx);
    const path = resolvePath(ep, ctx, codeMode);

    return `
      ${renderModeToggle()}
      <p class="pg-ep-detail-muted">${pgT('ep.payloadVariants')} · <code>${escapeHtml(path)}</code></p>
      <div class="pg-ep-payload-tabs">${tabBtns}</div>
      <pre class="pg-guide-pre pg-guide-pre--code" id="epDetailPayloadPre">${escapeHtml(body)}</pre>`;
  }

  function renderCode(ep, ctx) {
    const guide = global.GatewayAiGuide;
    const curl = buildCurl(ep, ctx);
    let ts = '';
    if (guide && ep.id?.startsWith('create-') && codeMode === 'gateway') {
      ts = guide.buildTsSample({ ...ctx, jobType: ep.jobType || ctx.jobType });
    }
    return `
      ${renderModeToggle()}
      <h3 class="pg-ep-detail-h3">cURL</h3>
      <pre class="pg-guide-pre pg-guide-pre--code" id="epDetailCurlPre">${escapeHtml(curl)}</pre>
      ${ts ? `<h3 class="pg-ep-detail-h3">TypeScript · fetch</h3><pre class="pg-guide-pre pg-guide-pre--code">${escapeHtml(ts)}</pre>` : ''}`;
  }

  function renderResponses() {
    const reg = global.GatewayEndpointRegistry;
    const errors = (reg?.ERROR_REFERENCE || [])
      .map((e) => {
        const recovery = isVi() ? e.recoveryVi || e.recovery : e.recovery;
        return `<tr><td><code>${e.code}</code></td><td>${e.http}</td><td>${escapeHtml(recovery)}</td></tr>`;
      })
      .join('');
    const recovery = reg?.RECOVERY_STRATEGY;
    const envelope = reg?.ENVELOPE_META;
    const checklist = isVi() ? reg?.VALIDATION_CHECKLIST?.vi : reg?.VALIDATION_CHECKLIST?.en;
    const checklistHtml = (checklist || [])
      .map((item) => `<li>${escapeHtml(item)}</li>`)
      .join('');

    return `
      <h3 class="pg-ep-detail-h3">${pgT('ep.responses.envelope')}</h3>
      <pre class="pg-guide-pre pg-guide-pre--code">{"success": true, "data": {…}, "message": "…", "code": "…"}</pre>
      ${
        envelope
          ? `<dl class="pg-ep-detail-dl">
        <dt>envelope_priority</dt><dd><code>${envelope.priority.join(', ')}</code></dd>
        <dt>structured_control_fields</dt><dd><code>${envelope.controlFields.join(', ')}</code></dd>
      </dl>`
          : ''
      }
      <h3 class="pg-ep-detail-h3">${pgT('ep.responses.checklist')}</h3>
      <ul class="pg-ep-detail-list">${checklistHtml}</ul>
      <h3 class="pg-ep-detail-h3">${pgT('ep.responses.errors')}</h3>
      <div class="pg-ep-detail-table-wrap"><table class="pg-kv-table">
        <thead><tr><th>${pgT('ep.col.code')}</th><th>${pgT('ep.col.http')}</th><th>${pgT('ep.col.recovery')}</th></tr></thead>
        <tbody>${errors}</tbody>
      </table></div>
      ${
        recovery
          ? `<h3 class="pg-ep-detail-h3">${pgT('ep.responses.recovery')}</h3>
      <pre class="pg-guide-pre pg-guide-pre--code">${escapeHtml(
        JSON.stringify(
          {
            ...recovery,
            rules: isVi() ? recovery.rulesVi || recovery.rules : recovery.rules,
          },
          null,
          2,
        ),
      )}</pre>`
          : ''
      }`;
  }

  function renderWorkflow(ep) {
    const reg = global.GatewayEndpointRegistry;
    const steps = reg?.localizeWorkflow ? reg.localizeWorkflow(ep, isVi()) : ep.workflow || [];
    const poll = reg?.POLL_POLICY;
    const stepsHtml = steps.map((s, i) => `<li><strong>${i + 1}.</strong> ${escapeHtml(s)}</li>`).join('');
    let pollHtml = '';
    if (ep.async && poll) {
      pollHtml = `
        <h3 class="pg-ep-detail-h3">${pgT('ep.workflow.policy')}</h3>
        <dl class="pg-ep-detail-dl">
          <dt>${pgT('ep.workflow.interval')}</dt><dd>${poll.intervalMs} ms</dd>
          <dt>${pgT('ep.workflow.maxAttempts')}</dt><dd>${poll.maxAttempts}</dd>
          <dt>${pgT('ep.workflow.processing')}</dt><dd><code>${poll.processing.join('</code>, <code>')}</code></dd>
          <dt>${pgT('ep.workflow.success')}</dt><dd><code>${poll.success.join('</code>, <code>')}</code></dd>
          <dt>${pgT('ep.workflow.failure')}</dt><dd><code>${poll.failure.join('</code>, <code>')}</code></dd>
        </dl>`;
    }
    return `<ol class="pg-ep-detail-list pg-ep-detail-list--ol">${stepsHtml}</ol>${pollHtml}`;
  }

  function renderAi(ep, ctx) {
    const guide = global.GatewayAiGuide;
    if (!guide) return `<p class="pg-ep-detail-muted">${pgT('ep.ai.guideMissing')}</p>`;

    const purpose = isVi() ? ep.aiPurpose?.vi : ep.aiPurpose?.en;
    const skillCtx = { ...ctx, jobType: ep.jobType || ctx.jobType };
    const skill = guide.buildSkillPrompt(skillCtx, isVi() ? 'vi' : 'en');

    return `
      <h3 class="pg-ep-detail-h3">${pgT('ep.ai.purpose')}</h3>
      <p>${escapeHtml(purpose || pgT('ep.ai.purposeDefault'))}</p>
      <h3 class="pg-ep-detail-h3">${pgT('ep.ai.rules')}</h3>
      <ul class="pg-ep-detail-list">
        <li>${pgT('ep.ai.ruleNoGuess')}</li>
        <li>${pgT('ep.ai.ruleModels')}</li>
        <li>${pgT('ep.ai.rulePoll')}</li>
      </ul>
      <h3 class="pg-ep-detail-h3">${pgT('ep.ai.skillExcerpt')}</h3>
      <pre class="pg-guide-pre pg-guide-pre--system pg-ep-detail-skill">${escapeHtml(skill.slice(0, 3200))}${skill.length > 3200 ? '\n…' : ''}</pre>`;
  }

  function renderSandbox(ep, ctx) {
    if (ep.id === 'upload-image' || ep.id === 'upload-video' || ep.id === 'upload-audio') {
      return `<p class="pg-ep-detail-note">${pgT('ep.sandbox.uploadHint')}</p>`;
    }

    ensureSandboxDraft(ep, ctx);
    const isGet = ep.method === 'GET';
    const pollFields =
      ep.id === 'poll-job'
        ? `<div class="pg-ep-sandbox-row">
        <label class="pg-ep-sandbox-label" for="epSandboxPollId">${pgT('ep.sandbox.pollId')}</label>
        <input type="text" class="pg-ep-sandbox-input" id="epSandboxPollId" value="${escapeHtml(sandboxDraft.pollId)}" placeholder="id_base" />
      </div>
      <div class="pg-ep-sandbox-row">
        <label class="pg-ep-sandbox-label" for="epSandboxMedia">${pgT('ep.sandbox.media')}</label>
        <select class="pg-ep-sandbox-input" id="epSandboxMedia">
          <option value="image"${sandboxDraft.media === 'image' ? ' selected' : ''}>image</option>
          <option value="video"${sandboxDraft.media === 'video' ? ' selected' : ''}>video</option>
          <option value="music"${sandboxDraft.media === 'music' ? ' selected' : ''}>music</option>
        </select>
      </div>`
        : '';

    const bodyField = isGet
      ? ''
      : `<div class="pg-ep-sandbox-row">
        <label class="pg-ep-sandbox-label" for="epSandboxBody">${pgT('ep.sandbox.body')}</label>
        <textarea class="pg-ep-sandbox-body" id="epSandboxBody" rows="10" spellcheck="false">${escapeHtml(sandboxDraft.body)}</textarea>
      </div>`;

    const responseHtml = sandboxDraft.lastResponse
      ? `<pre class="pg-guide-pre pg-guide-pre--code pg-ep-sandbox-response" id="epSandboxResponsePre">${formatSandboxResponse(sandboxDraft.lastResponse)}</pre>
         <p class="pg-ep-detail-muted" id="epSandboxMeta">${escapeHtml(sandboxDraft.lastMeta || '')}</p>`
      : `<p class="pg-ep-detail-muted" id="epSandboxEmpty">${pgT('ep.sandbox.empty')}</p>`;

    return `
      <p class="pg-ep-detail-muted">${pgT('ep.overview.baseUrl')}: <code>${escapeHtml(ctx.baseUrl)}</code></p>
      <div class="pg-ep-sandbox-row">
        <label class="pg-ep-sandbox-label" for="epSandboxPath">${pgT('ep.sandbox.path')}</label>
        <input type="text" class="pg-ep-sandbox-input pg-ep-sandbox-path" id="epSandboxPath" value="${escapeHtml(sandboxDraft.path)}" spellcheck="false" />
      </div>
      ${pollFields}
      ${bodyField}
      <div class="pg-ep-sandbox-actions">
        <button type="button" class="btn btn-primary btn-sm" id="epSandboxRun">${pgT('ep.sandbox.run')}</button>
        <span class="pg-ep-sandbox-status" id="epSandboxStatus"></span>
      </div>
      <h3 class="pg-ep-detail-h3">${pgT('ep.sandbox.response')}</h3>
      <div id="epSandboxResponseWrap">${responseHtml}</div>`;
  }

  async function runSandbox() {
    const ep = global.GatewayEndpointRegistry?.getById(activeEndpointId);
    if (!ep || ep.id === 'upload-image' || ep.id === 'upload-video' || ep.id === 'upload-audio') return;

    const ctx = readPlaygroundContext(ep);
    const pathInput = $('epSandboxPath');
    const bodyInput = $('epSandboxBody');
    const pollInput = $('epSandboxPollId');
    const mediaSelect = $('epSandboxMedia');
    const statusEl = $('epSandboxStatus');
    const runBtn = $('epSandboxRun');

    sandboxDraft.path = pathInput?.value?.trim() || resolveGatewaySandboxPath(ep, ctx);
    sandboxDraft.body = bodyInput?.value || sandboxDraft.body;
    sandboxDraft.pollId = pollInput?.value?.trim() || '';
    sandboxDraft.media = mediaSelect?.value || sandboxDraft.media;

    if (ep.id === 'poll-job' && !sandboxDraft.pollId) {
      if (statusEl) statusEl.textContent = pgT('ep.sandbox.needPollId');
      return;
    }

    if (ep.auth) {
      try {
        global.sandboxAuthHeaders?.(false, true);
      } catch (err) {
        if (statusEl) statusEl.textContent = err.message || pgT('ep.sandbox.needToken');
        return;
      }
    }

    if (runBtn) runBtn.disabled = true;
    if (statusEl) statusEl.textContent = pgT('ep.sandbox.running');

    const fetchFn = global.sandboxApiFetch;
    if (!fetchFn) {
      if (statusEl) statusEl.textContent = 'sandboxApiFetch missing';
      if (runBtn) runBtn.disabled = false;
      return;
    }

    try {
      let init = { method: ep.method };
      if (ep.method !== 'GET') {
        if (ep.id === 'me-credits') {
          let parsed;
          try {
            parsed = JSON.parse(sandboxDraft.body || '{}');
          } catch {
            if (statusEl) statusEl.textContent = pgT('ep.sandbox.invalidJson');
            return;
          }
          const params = new URLSearchParams({
            access_token: parsed.access_token || $('token')?.value?.trim() || '',
            domain: parsed.domain || ctx.domain,
          });
          const baseHeaders = global.sandboxAuthHeaders?.(false, true) || {};
          init.headers = { ...baseHeaders, 'Content-Type': 'application/x-www-form-urlencoded' };
          init.body = params.toString();
        } else {
          let parsed;
          try {
            parsed = JSON.parse(sandboxDraft.body || '{}');
          } catch {
            if (statusEl) statusEl.textContent = pgT('ep.sandbox.invalidJson');
            return;
          }
          init.headers = global.sandboxAuthHeaders?.(true, ep.auth) || {};
          init.body = JSON.stringify(parsed);
        }
      } else {
        init.headers = global.sandboxAuthHeaders?.(false, ep.auth) || {};
      }

      const result = await fetchFn(sandboxDraft.path, init);
      sandboxDraft.lastResponse = result.body;
      sandboxDraft.lastMeta = `HTTP ${result.status} · ${result.ms}ms · ${result.ok ? 'OK' : 'FAILED'}`;

      const wrap = $('epSandboxResponseWrap');
      if (wrap) {
        wrap.innerHTML = `<pre class="pg-guide-pre pg-guide-pre--code pg-ep-sandbox-response" id="epSandboxResponsePre">${formatSandboxResponse(result.body)}</pre>
          <p class="pg-ep-detail-muted" id="epSandboxMeta">${escapeHtml(sandboxDraft.lastMeta)}</p>`;
      }
      if (statusEl) statusEl.textContent = result.ok ? 'OK' : 'FAILED';
    } catch (err) {
      if (statusEl) statusEl.textContent = err.message || 'Error';
    } finally {
      if (runBtn) runBtn.disabled = false;
    }
  }

  function renderDetailPanel(ep, ctx) {
    switch (activeDetailTab) {
      case 'overview':
        return renderOverview(ep, ctx);
      case 'auth':
        return renderAuth(ep);
      case 'parameters':
        return renderParameters(ep, ctx);
      case 'payload':
        return renderPayload(ep, ctx);
      case 'code':
        return renderCode(ep, ctx);
      case 'sandbox':
        return renderSandbox(ep, ctx);
      case 'responses':
        return renderResponses();
      case 'workflow':
        return renderWorkflow(ep);
      case 'ai':
        return renderAi(ep, ctx);
      default:
        return '';
    }
  }

  function bindPanelInteractions() {
    const contentEl = $('epDetailContent');
    if (!contentEl) return;

    contentEl.querySelectorAll('[data-payload-variant]').forEach((btn) => {
      btn.addEventListener('click', () => {
        payloadVariant = btn.dataset.payloadVariant || 'json';
        renderModal();
      });
    });
    contentEl.querySelectorAll('[data-code-mode]').forEach((btn) => {
      btn.addEventListener('click', () => {
        codeMode = btn.dataset.codeMode || 'gateway';
        if (codeMode === 'gateway') payloadVariant = 'json';
        renderModal();
      });
    });

    $('epSandboxRun')?.addEventListener('click', () => {
      void runSandbox();
    });
    $('epSandboxPath')?.addEventListener('input', (e) => {
      sandboxDraft.path = e.target.value;
    });
    $('epSandboxBody')?.addEventListener('input', (e) => {
      sandboxDraft.body = e.target.value;
    });
    $('epSandboxPollId')?.addEventListener('input', (e) => {
      sandboxDraft.pollId = e.target.value;
      const ep = global.GatewayEndpointRegistry?.getById(activeEndpointId);
      if (ep?.id === 'poll-job') {
        const ctx = readPlaygroundContext(ep);
        sandboxDraft.path = resolveGatewaySandboxPath(ep, ctx, {
          pollId: sandboxDraft.pollId,
          media: $('epSandboxMedia')?.value || sandboxDraft.media,
        });
        const pathEl = $('epSandboxPath');
        if (pathEl) pathEl.value = sandboxDraft.path;
      }
    });
    $('epSandboxMedia')?.addEventListener('change', (e) => {
      sandboxDraft.media = e.target.value;
      const ep = global.GatewayEndpointRegistry?.getById(activeEndpointId);
      if (ep?.id === 'poll-job') {
        const ctx = readPlaygroundContext(ep);
        sandboxDraft.path = resolveGatewaySandboxPath(ep, ctx, {
          pollId: sandboxDraft.pollId,
          media: sandboxDraft.media,
        });
        const pathEl = $('epSandboxPath');
        if (pathEl) pathEl.value = sandboxDraft.path;
      }
    });
  }

  function renderModal() {
    const ep = global.GatewayEndpointRegistry?.getById(activeEndpointId);
    const overlay = $('endpointDetailOverlay');
    if (!ep || !overlay) return;

    const ctx = readPlaygroundContext(ep);
    const path = resolvePath(ep, ctx, codeMode);
    const methodEl = $('epDetailMethod');
    const titleEl = $('epDetailTitle');
    const pathEl = $('epDetailPath');
    const navEl = $('epDetailNav');
    const contentEl = $('epDetailContent');
    const tryBtn = $('epDetailTry');

    if (methodEl) {
      methodEl.textContent = ep.method;
      methodEl.className = `pg-method ${ep.method.toLowerCase()}`;
    }
    if (titleEl) titleEl.textContent = label(ep);
    if (pathEl) pathEl.textContent = path;
    if (tryBtn) tryBtn.hidden = ep.id === 'poll-job';

    if (navEl) {
      navEl.innerHTML = DETAIL_TAB_IDS.map(
        (id) =>
          `<button type="button" class="pg-ep-detail-nav-btn${activeDetailTab === id ? ' active' : ''}" data-ep-detail-tab="${id}">${tabLabel(id)}</button>`,
      ).join('');
    }

    if (contentEl) {
      contentEl.innerHTML = renderDetailPanel(ep, ctx);
      bindPanelInteractions();
    }

    global.PortalI18n?.applyDom(overlay);
  }

  function openEndpointDetail(id) {
    const ep = global.GatewayEndpointRegistry?.getById(id);
    if (!ep) return;
    activeEndpointId = id;
    activeDetailTab = 'overview';
    codeMode = 'gateway';
    payloadVariant = ep.contentTypes?.includes('application/json') ? 'json' : 'multipart';
    sandboxDraft = {
      path: '',
      body: '',
      pollId: '',
      media: ep.pollMedia || 'image',
      lastResponse: null,
      lastMeta: null,
    };
    const overlay = $('endpointDetailOverlay');
    if (overlay) {
      overlay.hidden = false;
      document.body.classList.add('pg-ep-detail-open');
    }
    renderModal();
  }

  function closeEndpointDetail() {
    activeEndpointId = null;
    const overlay = $('endpointDetailOverlay');
    if (overlay) overlay.hidden = true;
    document.body.classList.remove('pg-ep-detail-open');
  }

  function copyDetailContent() {
    const ep = global.GatewayEndpointRegistry?.getById(activeEndpointId);
    if (!ep) return;
    const ctx = readPlaygroundContext(ep);
    let text = '';
    if (activeDetailTab === 'code') {
      text = $('epDetailCurlPre')?.textContent || buildCurl(ep, ctx);
    } else if (activeDetailTab === 'payload') {
      text = $('epDetailPayloadPre')?.textContent || buildPayloadText(ep, ctx);
    } else if (activeDetailTab === 'ai' && global.GatewayAiGuide) {
      text = global.GatewayAiGuide.buildSkillPrompt(
        { ...ctx, jobType: ep.jobType || ctx.jobType },
        isVi() ? 'vi' : 'en',
      );
    } else {
      text = `${ep.method} ${resolvePath(ep, ctx, codeMode)}\n\n${$('epDetailContent')?.innerText || ''}`;
    }
    navigator.clipboard?.writeText(text).catch(() => {});
  }

  function openInRequestTab() {
    const ep = global.GatewayEndpointRegistry?.getById(activeEndpointId);
    if (!ep) return;
    closeEndpointDetail();
    if (typeof global.setResponseTab === 'function') global.setResponseTab('request');
    if (ep.jobType && $('jobType')) {
      $('jobType').value = ep.jobType;
      if (typeof global.openMediaJobPanel === 'function') {
        void global.openMediaJobPanel(ep.jobType, { autoFetch: false });
      }
    }
    if (typeof global.refreshRequestPreview === 'function') global.refreshRequestPreview();
  }

  function tryEndpoint() {
    const ep = global.GatewayEndpointRegistry?.getById(activeEndpointId);
    if (!ep) return;
    closeEndpointDetail();
    if (typeof global.setResponseTab === 'function') global.setResponseTab('result');

    switch (ep.id) {
      case 'list-models':
        global.openPanelById?.('models');
        $('btnModels')?.click();
        break;
      case 'create-image-job':
      case 'create-video-job':
      case 'create-music-job':
      case 'create-tts-job':
      case 'create-avatar-lipsync-job':
      case 'create-tool-job':
        if (ep.jobType) void global.openMediaJobPanel?.(ep.jobType, { autoFetch: false });
        $('btnMediaJob')?.click();
        break;
      case 'poll-job':
        global.openPanelById?.('poll-job');
        break;
      case 'info-image':
        global.openInfoPanel?.('image');
        break;
      case 'info-video':
        global.openInfoPanel?.('video');
        break;
      case 'info-music':
        global.openInfoPanel?.('music');
        break;
      case 'library-images':
        global.openLibraryPanel?.('images');
        break;
      case 'library-videos':
        global.openLibraryPanel?.('videos');
        break;
      case 'library-musics':
        global.openLibraryPanel?.('musics');
        break;
      case 'library-audios':
        global.openLibraryPanel?.('audios');
        break;
      case 'library-album-videos':
        global.openLibraryPanel?.('album-videos');
        break;
      case 'health':
        global.openHealthPanel?.();
        $('btnHealth')?.click();
        break;
      case 'chat':
        global.openPanelById?.('chat');
        break;
      case 'upload-image':
        global.openPanelById?.('upload');
        document.querySelector('[data-upload-tab="image"]')?.click();
        break;
      case 'upload-video':
        global.openPanelById?.('upload');
        document.querySelector('[data-upload-tab="video"]')?.click();
        break;
      case 'audio-tts':
        global.openPanelById?.('audio');
        break;
      case 'audio-lists':
        global.openPanelById?.('audio-lists');
        $('btnAudioLists')?.click();
        break;
      case 'auth-login':
        global.openPanelById?.('connection');
        break;
      case 'me-credits':
        global.openPanelById?.('connection');
        $('btnFetchMe')?.click();
        break;
      default:
        openInRequestTab();
    }
  }

  function endpointsBaseUrl() {
    try {
      if (typeof global.baseUrl === 'function') return global.baseUrl().replace(/\/$/, '');
    } catch {
      /* ignore */
    }
    return window.location.origin.replace(/\/$/, '');
  }

  function renderEndpointsBase(ctx) {
    const base = (ctx?.baseUrl || endpointsBaseUrl()).replace(/\/$/, '');
    const baseEl = $('endpointsBaseUrl');
    if (baseEl) baseEl.textContent = base;

    const hintEl = $('endpointsContextHint');
    if (hintEl) hintEl.hidden = true;
  }

  function copyEndpointsBase() {
    const base = $('endpointsBaseUrl')?.textContent?.trim();
    if (!base || base === '—') return;
    navigator.clipboard?.writeText(base).catch(() => {});
  }

  function renderEndpointsTable() {
    const tbody = $('endpointsTableBody');
    const reg = global.GatewayEndpointRegistry;
    if (!tbody || !reg) return;

    const ctx = readPlaygroundContext({});
    const base = (ctx.baseUrl || endpointsBaseUrl()).replace(/\/$/, '');
    renderEndpointsBase(ctx);

    tbody.innerHTML = reg.ENDPOINTS.map((ep) => {
      const name = label(ep);
      const sub = epSummary(ep);
      const m = ep.method.toLowerCase();
      const path = resolvePath(ep, ctx, 'gateway');
      const fullUrl = `${base}${path.startsWith('/') ? path : `/${path}`}`;
      return `<tr>
        <td class="pg-endpoints-name-cell">
          <div class="pg-endpoints-name">${escapeHtml(name)}</div>
          ${sub ? `<div class="pg-endpoints-summary">${escapeHtml(sub)}</div>` : ''}
        </td>
        <td><span class="pg-method ${m}">${ep.method}</span></td>
        <td><code class="pg-endpoints-full-url">${escapeHtml(fullUrl)}</code></td>
        <td class="pg-endpoints-actions">
          <button type="button" class="btn btn-ghost btn-sm pg-endpoint-view" data-endpoint-id="${escapeHtml(ep.id)}" aria-label="${escapeHtml(pgT('ep.view', 'View'))} ${escapeHtml(name)}">
            <span class="pg-endpoint-view-icon" aria-hidden="true">👁</span>
            <span>${pgT('ep.view')}</span>
          </button>
        </td>
      </tr>`;
    }).join('');

    tbody.querySelectorAll('.pg-endpoint-view').forEach((btn) => {
      btn.addEventListener('click', () => openEndpointDetail(btn.dataset.endpointId));
    });

    const overlay = $('endpointDetailOverlay');
    if (overlay) global.PortalI18n?.applyDom(overlay);
    const pane = $('responsePaneEndpoints');
    if (pane) global.PortalI18n?.applyDom(pane);
  }

  function init() {
    renderEndpointsTable();

    $('btnCopyEndpointsBase')?.addEventListener('click', copyEndpointsBase);

    $('epDetailClose')?.addEventListener('click', closeEndpointDetail);
    $('endpointDetailOverlay')?.addEventListener('click', (e) => {
      if (e.target.id === 'endpointDetailOverlay') closeEndpointDetail();
    });
    $('epDetailCopy')?.addEventListener('click', copyDetailContent);
    $('epDetailOpen')?.addEventListener('click', openInRequestTab);
    $('epDetailTry')?.addEventListener('click', tryEndpoint);

    $('epDetailNav')?.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-ep-detail-tab]');
      if (!btn) return;
      activeDetailTab = btn.dataset.epDetailTab || 'overview';
      renderModal();
    });

    window.addEventListener('portal-locale-change', () => {
      renderEndpointsTable();
      if (activeEndpointId) renderModal();
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && activeEndpointId) closeEndpointDetail();
    });
  }

  global.GatewayEndpointDetail = {
    init,
    open: openEndpointDetail,
    close: closeEndpointDetail,
    refresh: renderModal,
    refreshEndpointsTable: renderEndpointsTable,
  };
})(typeof window !== 'undefined' ? window : globalThis);
