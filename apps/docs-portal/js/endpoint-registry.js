/**
 * Structured endpoint records for playground Endpoints tab + detail drawer.
 */
(function (global) {
  const POLL_POLICY = {
    intervalMs: 3500,
    maxAttempts: 80,
    processing: [
      'PENDING',
      'PENDING_ACTIVE',
      'PENDING_PROCESSING',
      'PROCESSING',
      'QUEUED',
      'ACTIVE',
      'MEDIA_GENERATION_STATUS_PENDING',
      'MEDIA_GENERATION_STATUS_ACTIVE',
      'MEDIA_GENERATION_STATUS_PROCESSING',
    ],
    success: ['SUCCESS', 'SUCCEEDED', 'DONE', 'COMPLETED', 'MEDIA_GENERATION_STATUS_SUCCESSFUL'],
    failure: ['FAILED', 'ERROR', 'CANCELLED', 'REJECTED'],
  };

  const ERROR_REFERENCE = [
    {
      code: 'VALIDATION_ERROR',
      http: 400,
      recovery: 'Reload POST v2.api.gommo.net/ai/models and use supported fields/enums only.',
      recoveryVi: 'Gọi lại POST v2.api.gommo.net/ai/models và chỉ dùng field/enum được catalog hỗ trợ.',
    },
    {
      code: 'UNAUTHORIZED',
      http: 401,
      recovery: 'Check Bearer token; do not retry unchanged credentials.',
      recoveryVi: 'Kiểm tra Bearer token; không retry khi credential chưa đổi.',
    },
    {
      code: 'FORBIDDEN',
      http: 403,
      recovery: 'Fix token, domain whitelist, or account permissions.',
      recoveryVi: 'Sửa token, domain whitelist hoặc quyền tài khoản.',
    },
    {
      code: 'RATE_LIMITED',
      http: 429,
      recovery: 'Retry with exponential backoff.',
      recoveryVi: 'Retry với exponential backoff.',
    },
    {
      code: 'UPSTREAM_ERROR',
      http: 502,
      recovery: 'Retry later with idempotency safeguards.',
      recoveryVi: 'Retry sau với idempotency an toàn.',
    },
    {
      code: 'INSUFFICIENT_CREDITS',
      http: 402,
      recovery: 'Top up credits before retrying create jobs.',
      recoveryVi: 'Nạp credits trước khi retry create job.',
    },
  ];

  const ENVELOPE_META = {
    priority: ['data', 'raw'],
    controlFields: ['http_status', 'success', 'ok', 'error_code', 'data.status'],
  };

  const VALIDATION_CHECKLIST = {
    en: [
      'Method/path and required fields match this endpoint record.',
      'Authentication is present only in headers and the request uses HTTPS.',
      'Content-Type and serialization match the selected transport.',
      'Response is classified by HTTP status, success/ok, error_code — not message text.',
      'Model id and options came from one fresh POST v2.api.gommo.net/ai/models record.',
      'Required user confirmation was captured before credit-consuming jobs.',
    ],
    vi: [
      'Method/path và field bắt buộc khớp endpoint record.',
      'Auth chỉ ở headers và request dùng HTTPS.',
      'Content-Type và serialization khớp transport đã chọn.',
      'Phân loại response theo HTTP status, success/ok, error_code — không parse text.',
      'Model id và option lấy từ một bản ghi POST v2.api.gommo.net/ai/models mới.',
      'Đã xác nhận với user trước job tốn credits.',
    ],
  };

  const AUTH_HEADERS = [
    {
      name: 'Authorization',
      type: 'string',
      required: true,
      source: 'header',
      description: 'Bearer access token from POST api.gommo.net/api/apps/go-mmo/auth/login.',
      descriptionVi: 'Bearer access token từ POST api.gommo.net/api/apps/go-mmo/auth/login.',
      example: 'Bearer YOUR_ACCESS_TOKEN',
    },
    {
      name: 'Content-Type',
      type: 'enum',
      required: true,
      source: 'header',
      description: 'Request encoding.',
      descriptionVi: 'Encoding request.',
      example: 'application/json',
    },
    {
      name: 'Accept',
      type: 'string',
      required: false,
      source: 'header',
      description: 'Response media type.',
      descriptionVi: 'Kiểu media response.',
      example: 'application/json',
    },
  ];

  const RECOVERY_STRATEGY = {
    classification_order: ['http_status', 'error_code', 'data.status', 'success_or_ok'],
    rules: [
      'Never parse localized message text with regex.',
      'Refresh model catalog on VALIDATION_ERROR.',
      'Stop on UNAUTHORIZED or FORBIDDEN until credentials are fixed.',
      'Use capped exponential backoff for RATE_LIMITED.',
      'Retry safe requests on transient 5xx / UPSTREAM_ERROR.',
      'Stop polling on terminal failure status.',
    ],
    rulesVi: [
      'Không parse message đã localize bằng regex.',
      'Refresh catalog model khi VALIDATION_ERROR.',
      'Dừng khi UNAUTHORIZED hoặc FORBIDDEN cho đến khi sửa credential.',
      'Dùng exponential backoff có giới hạn cho RATE_LIMITED.',
      'Retry request an toàn khi 5xx / UPSTREAM_ERROR tạm thời.',
      'Dừng poll khi status thất bại terminal.',
    ],
  };

  function pickLocale(isVi, en, vi) {
    return isVi ? vi || en : en;
  }

  function localizeParam(param, isVi) {
    if (!param) return param;
    return {
      ...param,
      description: pickLocale(isVi, param.description, param.descriptionVi),
    };
  }

  function localizeWorkflow(ep, isVi) {
    if (!ep) return [];
    return pickLocale(isVi, ep.workflow, ep.workflowVi) || [];
  }

  function localizeAuthHeader(header, isVi) {
    return localizeParam(header, isVi);
  }

  function createJobEndpoint(jobType, labels, summary) {
    const pollMedia =
      jobType === 'music'
        ? 'music'
        : jobType === 'video' || jobType === 'avatar-lipsync' || jobType.startsWith('video-')
          ? 'video'
          : 'image';

    return {
      id: `create-${jobType}-job`,
      jobType,
      name: labels,
      method: 'POST',
      path: `/gateway/jobs/${jobType}`,
      upstreamPath: `POST /v2/ai/jobs/${jobType}/{modelSlug}`,
      group: 'create',
      async: true,
      contentTypes: ['application/json'],
      auth: true,
      summary,
      overview: {
        en: `Create an asynchronous ${jobType} job on v2.api.gommo.net (POST /ai/jobs/${jobType}/{modelSlug}). Optional dev proxy: POST /gateway/jobs/${jobType} (JSON).`,
        vi: `Tạo job ${jobType} bất đồng bộ trên v2.api.gommo.net (POST /ai/jobs/${jobType}/{modelSlug}). Proxy dev tùy chọn: POST /gateway/jobs/${jobType} (JSON).`,
      },
      parameters: [
        {
          name: 'type',
          in: 'path',
          type: 'string',
          required: true,
          description: 'Job type segment.',
          descriptionVi: 'Segment loại job.',
          example: jobType,
        },
        {
          name: 'modelSlug',
          in: 'body',
          type: 'string',
          required: true,
          description: 'Model slug from POST v2.api.gommo.net/ai/models?type=' + jobType,
          descriptionVi: 'Model slug từ POST v2.api.gommo.net/ai/models?type=' + jobType,
          example: '<from_catalog>',
        },
        {
          name: 'wait',
          in: 'body',
          type: 'boolean',
          required: false,
          description: 'Server polls upstream (3.5s × 80) when true.',
          descriptionVi: 'Server poll upstream (3.5s × 80) khi true.',
          example: 'false',
        },
        {
          name: 'fields',
          in: 'body',
          type: 'object',
          required: true,
          description: 'Prompt, ratio, mode, resolution, reference URLs — from model catalog only.',
          descriptionVi: 'Prompt, ratio, mode, resolution, URL tham chiếu — chỉ từ catalog model.',
          example: '{ "prompt": "…" }',
          dynamicCatalog: true,
        },
        {
          name: 'domain',
          in: 'body',
          type: 'string',
          required: false,
          description: 'Whitelisted app domain; gateway fills GOMMO_API_DOMAIN when omitted.',
          descriptionVi: 'Domain app được whitelist; gateway điền GOMMO_API_DOMAIN khi bỏ trống.',
          example: '79ai.net',
        },
      ],
      workflow: [
        'Submit POST v2.api.gommo.net/ai/jobs/' + jobType + '/{modelSlug} with domain and catalog fields.',
        'Capture public job id from id_base (or *Info.id_base in response).',
        'Poll POST v2.api.gommo.net/ai/jobs/{id_base}?media=' + pollMedia + ' until terminal status.',
        'Return resultUrl from response or handle structured error.',
        'Dev sandbox may use POST /gateway/jobs/' + jobType + ' (JSON) instead.',
      ],
      workflowVi: [
        'Gửi POST v2.api.gommo.net/ai/jobs/' + jobType + '/{modelSlug} với domain và fields catalog.',
        'Lấy job id public từ id_base (hoặc *Info.id_base trong response).',
        'Poll POST v2.api.gommo.net/ai/jobs/{id_base}?media=' + pollMedia + ' đến status terminal.',
        'Trả resultUrl từ response hoặc xử lý lỗi có cấu trúc.',
        'Sandbox dev có thể dùng POST /gateway/jobs/' + jobType + ' (JSON) thay thế.',
      ],
      pollMedia,
      aiPurpose: {
        en: `Create an asynchronous ${jobType} job from a selected model and supported inputs.`,
        vi: `Tạo job ${jobType} bất đồng bộ từ model đã chọn và input được hỗ trợ.`,
      },
    };
  }

  const ENDPOINTS = [
    {
      id: 'list-models',
      name: { en: 'Model catalog', vi: 'Catalog model' },
      method: 'GET',
      path: '/gateway/models?type={type}',
      upstreamPath: 'POST /v2/ai/models?type={type}',
      group: 'catalog',
      async: false,
      contentTypes: ['application/json'],
      auth: false,
      summary: {
        en: 'Browse models, prices, and capabilities — POST v2.api.gommo.net/ai/models?type=…',
        vi: 'Xem model, giá và capability — POST v2.api.gommo.net/ai/models?type=…',
      },
      overview: {
        en: 'Public model catalog for a job type on v2.api.gommo.net. Bearer optional when browsing. Dev proxy: GET /gateway/models?type=…',
        vi: 'Catalog model theo loại job trên v2.api.gommo.net. Bearer tùy chọn khi browse. Proxy dev: GET /gateway/models?type=…',
      },
      parameters: [
        {
          name: 'type',
          in: 'query',
          type: 'string',
          required: true,
          description: 'image | video | music | tts | tool types',
          descriptionVi: 'image | video | music | tts | tool types',
          example: 'image',
        },
        {
          name: 'lang',
          in: 'query',
          type: 'string',
          required: false,
          description: 'en merges EN descriptions from cache.',
          descriptionVi: 'en gộp mô tả EN từ cache.',
          example: 'en',
        },
      ],
      workflow: [
        'POST v2.api.gommo.net/ai/models?type=… before any create job.',
        'Read slug, ratios, modes, prices from response.',
        'Playground/dev may call GET /gateway/models?type=… via local proxy.',
      ],
      workflowVi: [
        'POST v2.api.gommo.net/ai/models?type=… trước mọi create job.',
        'Đọc slug, ratios, modes, prices từ response.',
        'Playground/dev có thể gọi GET /gateway/models?type=… qua proxy local.',
      ],
    },
    createJobEndpoint(
      'image',
      { en: 'Create AI image', vi: 'Tạo ảnh AI' },
      {
        en: 'Create an AI image job on v2.api.gommo.net.',
        vi: 'Tạo job ảnh AI trên v2.api.gommo.net.',
      },
    ),
    createJobEndpoint(
      'video',
      { en: 'Create AI video', vi: 'Tạo video AI' },
      {
        en: 'Create an AI video job on v2.api.gommo.net.',
        vi: 'Tạo job video AI trên v2.api.gommo.net.',
      },
    ),
    createJobEndpoint(
      'avatar-lipsync',
      { en: 'Create face sync', vi: 'Tạo face sync' },
      {
        en: 'Create a face-sync / lipsync job on v2.api.gommo.net.',
        vi: 'Tạo job face-sync / lipsync trên v2.api.gommo.net.',
      },
    ),
    createJobEndpoint(
      'music',
      { en: 'Create AI music', vi: 'Tạo nhạc AI' },
      {
        en: 'Create an AI music job on v2.api.gommo.net.',
        vi: 'Tạo job nhạc AI trên v2.api.gommo.net.',
      },
    ),
    createJobEndpoint(
      'tts',
      { en: 'Create text-to-speech', vi: 'Tạo text-to-speech' },
      {
        en: 'Create a text-to-speech job on v2.api.gommo.net.',
        vi: 'Tạo job text-to-speech trên v2.api.gommo.net.',
      },
    ),
    {
      id: 'create-tool-job',
      jobType: 'image-upscale',
      name: { en: 'Tool jobs', vi: 'Tool jobs' },
      method: 'POST',
      path: '/gateway/jobs/{tool-type}',
      group: 'create',
      async: true,
      contentTypes: ['application/json'],
      auth: true,
      summary: {
        en: 'Upscale, remove background, VFX, and other tool-type jobs.',
        vi: 'Upscale, xóa nền, VFX và các tool job khác.',
      },
      overview: {
        en: 'Upscale, remove-bg, video-vfx, avatar-lipsync, etc. Same body shape as media jobs.',
        vi: 'Upscale, remove-bg, video-vfx, avatar-lipsync, v.v. Cùng shape body với media jobs.',
      },
      parameters: createJobEndpoint('image-upscale', { en: '', vi: '' }).parameters,
      workflow: createJobEndpoint('image-upscale', { en: '', vi: '' }).workflow,
      workflowVi: createJobEndpoint('image-upscale', { en: '', vi: '' }).workflowVi,
      pollMedia: 'image',
      aiPurpose: {
        en: 'Run a tool-type job (upscale, remove background, lipsync, …).',
        vi: 'Chạy tool job (upscale, xóa nền, lipsync, …).',
      },
    },
    {
      id: 'poll-job',
      name: { en: 'Poll generic job', vi: 'Poll job' },
      method: 'GET',
      path: '/gateway/jobs/:id?media={media}',
      upstreamPath: 'POST /v2/ai/jobs/{id}?media={media}',
      group: 'status',
      async: false,
      contentTypes: ['application/json'],
      auth: true,
      summary: {
        en: 'Poll async job status until success or failure.',
        vi: 'Poll trạng thái job async đến khi xong hoặc lỗi.',
      },
      overview: {
        en: 'Poll async job status on v2.api.gommo.net. Use id_base from create response, not internal task id. Dev proxy: GET /gateway/jobs/{id}?media=…',
        vi: 'Poll trạng thái job async trên v2.api.gommo.net. Dùng id_base từ create, không dùng task id nội bộ. Proxy dev: GET /gateway/jobs/{id}?media=…',
      },
      parameters: [
        {
          name: 'id',
          in: 'path',
          type: 'string',
          required: true,
          description: 'Public job id (id_base).',
          descriptionVi: 'Job id public (id_base).',
          example: 'abc123…',
        },
        {
          name: 'media',
          in: 'query',
          type: 'enum',
          required: true,
          description: 'image | video | music',
          descriptionVi: 'image | video | music',
          example: 'image',
        },
      ],
      workflow: [
        'Poll POST v2.api.gommo.net/ai/jobs/{id_base}?media=… every 3.5s, max 80 attempts (~5 min).',
        'Stop on success URL or terminal failure.',
        'Dev sandbox may use GET /gateway/jobs/{id}?media=… instead.',
      ],
      workflowVi: [
        'Poll POST v2.api.gommo.net/ai/jobs/{id_base}?media=… mỗi 3.5s, tối đa 80 lần (~5 phút).',
        'Dừng khi có URL thành công hoặc thất bại terminal.',
        'Sandbox dev có thể dùng GET /gateway/jobs/{id}?media=… thay thế.',
      ],
    },
    {
      id: 'info-image',
      name: { en: 'Image info', vi: 'Info ảnh' },
      method: 'POST',
      path: '/ai/info/image/{id}',
      group: 'status',
      async: false,
      contentTypes: ['application/x-www-form-urlencoded'],
      auth: true,
      overview: {
        en: 'Gommo platform proxy — check image job status by id_base.',
        vi: 'Proxy platform Gommo — kiểm tra trạng thái job ảnh theo id_base.',
      },
      parameters: [
        {
          name: 'id_base',
          in: 'body',
          type: 'string',
          required: true,
          description: 'Image job id_base.',
          descriptionVi: 'id_base job ảnh.',
          example: '…',
        },
      ],
      workflow: ['POST form with access_token and domain.', 'Read result_url and status from response.'],
      workflowVi: ['POST form với access_token và domain.', 'Đọc result_url và status từ response.'],
    },
    {
      id: 'info-video',
      name: { en: 'Video info', vi: 'Info video' },
      method: 'POST',
      path: '/ai/info/video/{id}',
      group: 'status',
      async: false,
      contentTypes: ['application/x-www-form-urlencoded'],
      auth: true,
      overview: {
        en: 'Gommo platform proxy — check video job status.',
        vi: 'Proxy platform Gommo — kiểm tra trạng thái job video.',
      },
      parameters: [
        {
          name: 'video_id',
          in: 'body',
          type: 'string',
          required: true,
          description: 'Video job id.',
          descriptionVi: 'Video job id.',
          example: '…',
        },
      ],
      workflow: ['POST form with access_token and domain.'],
      workflowVi: ['POST form với access_token và domain.'],
    },
    {
      id: 'info-music',
      name: { en: 'Music info', vi: 'Info nhạc' },
      method: 'POST',
      path: '/ai/info/music/{id}',
      group: 'status',
      async: false,
      contentTypes: ['application/x-www-form-urlencoded'],
      auth: true,
      overview: {
        en: 'Gommo platform proxy — check music job status.',
        vi: 'Proxy platform Gommo — kiểm tra trạng thái job nhạc.',
      },
      parameters: [
        {
          name: 'id_base',
          in: 'body',
          type: 'string',
          required: true,
          description: 'Music job id_base.',
          descriptionVi: 'id_base job nhạc.',
          example: '…',
        },
        {
          name: 'project_id',
          in: 'body',
          type: 'string',
          required: false,
          description: 'Project id when required by upstream.',
          descriptionVi: 'project_id khi upstream yêu cầu.',
          example: 'default',
        },
      ],
      workflow: ['POST form with access_token and domain.'],
      workflowVi: ['POST form với access_token và domain.'],
    },
    {
      id: 'library-images',
      name: { en: 'Image library', vi: 'Danh sách ảnh' },
      method: 'POST',
      path: '/ai/library/images',
      group: 'library',
      async: false,
      contentTypes: ['application/x-www-form-urlencoded'],
      auth: true,
      overview: {
        en: 'List account images with optional filters.',
        vi: 'Liệt kê ảnh tài khoản với bộ lọc tuỳ chọn.',
      },
      parameters: [
        {
          name: 'limit',
          in: 'body',
          type: 'number',
          required: false,
          description: 'Page size.',
          descriptionVi: 'Kích thước trang.',
          example: '30',
        },
      ],
      workflow: ['POST form with access_token and domain.'],
      workflowVi: ['POST form với access_token và domain.'],
    },
    {
      id: 'library-videos',
      name: { en: 'Video library', vi: 'Danh sách video' },
      method: 'POST',
      path: '/ai/library/videos',
      group: 'library',
      async: false,
      contentTypes: ['application/x-www-form-urlencoded'],
      auth: true,
      overview: {
        en: 'List account videos with optional filters.',
        vi: 'Liệt kê video tài khoản với bộ lọc tuỳ chọn.',
      },
      parameters: [
        {
          name: 'limit',
          in: 'body',
          type: 'number',
          required: false,
          description: 'Page size.',
          descriptionVi: 'Kích thước trang.',
          example: '30',
        },
      ],
      workflow: ['POST form with access_token and domain.'],
      workflowVi: ['POST form với access_token và domain.'],
    },
    {
      id: 'library-musics',
      name: { en: 'Music library', vi: 'Thư viện nhạc' },
      method: 'POST',
      path: '/ai/library/musics',
      group: 'library',
      async: false,
      contentTypes: ['application/x-www-form-urlencoded'],
      auth: true,
      overview: {
        en: 'Logical alias for the canonical music library; gateway does not publish a separate album-musics path.',
        vi: 'Bí danh logic dùng canonical music library; gateway không công bố path album-musics riêng.',
      },
      parameters: [
        {
          name: 'project_id',
          in: 'body',
          type: 'string',
          required: false,
          description: 'Project id when required by upstream.',
          descriptionVi: 'project_id khi upstream yêu cầu.',
          example: 'default',
        },
        {
          name: 'limit',
          in: 'body',
          type: 'number',
          required: false,
          description: 'Page size.',
          descriptionVi: 'Kích thước trang.',
          example: '30',
        },
      ],
      workflow: ['POST form with access_token and domain.'],
      workflowVi: ['POST form với access_token và domain.'],
    },
    {
      id: 'library-audios',
      name: { en: 'Audio library', vi: 'Thư viện audio' },
      method: 'POST',
      path: '/ai/library/audios',
      group: 'library',
      async: false,
      contentTypes: ['application/x-www-form-urlencoded'],
      auth: true,
      overview: {
        en: 'Logical alias for the canonical audio library; no separate album-audios path is published.',
        vi: 'Bí danh logic dùng canonical audio library; không có path album-audios riêng được công bố.',
      },
      parameters: [
        {
          name: 'limit',
          in: 'body',
          type: 'number',
          required: false,
          description: 'Page size.',
          descriptionVi: 'Kích thước trang.',
          example: '30',
        },
      ],
      workflow: ['POST form with access_token and domain.'],
      workflowVi: ['POST form với access_token và domain.'],
    },
    {
      id: 'library-album-images',
      name: { en: 'Image album', vi: 'Album ảnh' },
      method: 'POST',
      path: '/ai/library/album-images',
      group: 'library',
      async: false,
      contentTypes: ['application/x-www-form-urlencoded'],
      auth: true,
      overview: {
        en: 'List images inside an album (Gommo platform library; same payload as list images).',
        vi: 'Liệt kê ảnh trong album (library platform Gommo; cùng payload với list images).',
      },
      parameters: [
        {
          name: 'project_id',
          in: 'body',
          type: 'string',
          required: false,
          description: 'Project slug.',
          descriptionVi: 'Project slug.',
          example: 'default',
        },
        {
          name: 'limit',
          in: 'body',
          type: 'number',
          required: false,
          description: 'Page size.',
          descriptionVi: 'Kích thước trang.',
          example: '30',
        },
        {
          name: 'order_by',
          in: 'body',
          type: 'string',
          required: false,
          description: 'Sort field (e.g. index, id).',
          descriptionVi: 'Trường sắp xếp (vd. index, id).',
          example: 'index',
        },
        {
          name: 'sort_by',
          in: 'body',
          type: 'string',
          required: false,
          description: 'asc or desc.',
          descriptionVi: 'asc hoặc desc.',
          example: 'desc',
        },
      ],
      workflow: ['POST form with access_token, domain, project_id, limit, order_by, sort_by.'],
      workflowVi: ['POST form với access_token, domain, project_id, limit, order_by, sort_by.'],
    },
    {
      id: 'library-album-videos',
      name: { en: 'Video album', vi: 'Album video' },
      method: 'POST',
      path: '/ai/library/album-videos',
      group: 'library',
      async: false,
      contentTypes: ['application/x-www-form-urlencoded'],
      auth: true,
      overview: {
        en: 'List videos inside an album (Gommo platform library).',
        vi: 'Liệt kê video trong album (library platform Gommo).',
      },
      parameters: [
        {
          name: 'project_id',
          in: 'body',
          type: 'string',
          required: false,
          description: 'Project slug.',
          descriptionVi: 'Project slug.',
          example: 'default',
        },
        {
          name: 'limit',
          in: 'body',
          type: 'number',
          required: false,
          description: 'Page size.',
          descriptionVi: 'Kích thước trang.',
          example: '30',
        },
        {
          name: 'order_by',
          in: 'body',
          type: 'string',
          required: false,
          description: 'Sort field (e.g. index, id).',
          descriptionVi: 'Trường sắp xếp (vd. index, id).',
          example: 'index',
        },
        {
          name: 'sort_by',
          in: 'body',
          type: 'string',
          required: false,
          description: 'asc or desc.',
          descriptionVi: 'asc hoặc desc.',
          example: 'desc',
        },
      ],
      workflow: ['POST form with access_token, domain, project_id, limit, order_by, sort_by.'],
      workflowVi: ['POST form với access_token, domain, project_id, limit, order_by, sort_by.'],
    },
    {
      id: 'health',
      name: { en: 'Health', vi: 'Health' },
      method: 'GET',
      path: '/health',
      group: 'system',
      async: false,
      contentTypes: ['application/json'],
      auth: false,
      overview: {
        en: 'Gateway liveness check. Returns data.ok when running.',
        vi: 'Kiểm tra gateway hoạt động. Trả data.ok khi chạy.',
      },
      parameters: [],
      workflow: ['GET /health — no auth required.'],
      workflowVi: ['GET /health — không cần auth.'],
    },
    {
      id: 'chat',
      name: { en: 'Chat', vi: 'Chat' },
      method: 'POST',
      path: '/gateway/chat',
      upstreamPath: 'POST /api/v2/chat',
      group: 'platform',
      async: true,
      contentTypes: ['application/json', 'text/event-stream'],
      auth: true,
      overview: {
        en: 'Chat, stream, set_model, or agent actions. Stream when action=stream.',
        vi: 'Chat, stream, set_model hoặc agent. Stream khi action=stream.',
      },
      parameters: [
        {
          name: 'action',
          in: 'body',
          type: 'enum',
          required: true,
          description: 'chat | stream | set_model | agent',
          descriptionVi: 'chat | stream | set_model | agent',
          example: 'chat',
        },
        {
          name: 'messages',
          in: 'body',
          type: 'array',
          required: true,
          description: 'OpenAI-style messages when action=chat|stream.',
          descriptionVi: 'Messages kiểu OpenAI khi action=chat|stream.',
          example: '[{ "role": "user", "content": "…" }]',
        },
      ],
      workflow: [
        'Send POST api.gommo.net/api/v2/chat with action and messages.',
        'Handle JSON or SSE stream response.',
        'Dev proxy: POST /gateway/chat (optional).',
      ],
      workflowVi: [
        'Gửi POST api.gommo.net/api/v2/chat với action và messages.',
        'Xử lý response JSON hoặc SSE stream.',
        'Proxy dev: POST /gateway/chat (tùy chọn).',
      ],
      auth: true,
    },
    {
      id: 'upload-image',
      name: { en: 'Upload image', vi: 'Upload ảnh' },
      method: 'POST',
      path: '/gateway/upload/image',
      upstreamPath: 'POST /v2/ai/upload/image',
      group: 'upload',
      async: false,
      contentTypes: ['multipart/form-data'],
      auth: true,
      overview: {
        en: 'Upload reference image on v2.api.gommo.net (POST /ai/upload/image); use returned URL in job fields.',
        vi: 'Upload ảnh tham chiếu trên v2.api.gommo.net (POST /ai/upload/image); dùng URL trả về trong fields job.',
      },
      parameters: [
        {
          name: 'file',
          in: 'body',
          type: 'file',
          required: true,
          description: 'Multipart field name: file',
          descriptionVi: 'Tên field multipart: file',
          example: '@reference.jpg',
        },
      ],
      workflow: ['Upload file via multipart.', 'Use returned CDN URL in job fields.references or images.'],
      workflowVi: ['Upload file qua multipart.', 'Dùng URL CDN trả về trong fields job.'],
      auth: true,
    },
    {
      id: 'upload-video',
      name: { en: 'Upload video', vi: 'Upload video' },
      method: 'POST',
      path: '/gateway/upload/video',
      upstreamPath: 'POST /v2/ai/upload/video',
      group: 'upload',
      async: false,
      contentTypes: ['multipart/form-data'],
      auth: true,
      overview: {
        en: 'Upload video on v2.api.gommo.net (POST /ai/upload/video); multipart field video_file or file.',
        vi: 'Upload video trên v2.api.gommo.net (POST /ai/upload/video); field multipart video_file hoặc file.',
      },
      parameters: [
        {
          name: 'video_file',
          in: 'body',
          type: 'file',
          required: true,
          description: 'Multipart field: video_file or file',
          descriptionVi: 'Field multipart: video_file hoặc file',
          example: '@clip.mp4',
        },
      ],
      workflow: ['Upload video via multipart.', 'Use returned URL in motion or extend fields.'],
      workflowVi: ['Upload video qua multipart.', 'Dùng URL trả về trong motion hoặc extend fields.'],
      auth: true,
    },
    {
      id: 'upload-audio',
      name: { en: 'Upload audio', vi: 'Upload audio' },
      method: 'POST',
      path: '/gateway/upload/audio',
      upstreamPath: 'POST /v2/ai/upload/audio',
      group: 'upload',
      async: false,
      contentTypes: ['multipart/form-data'],
      auth: true,
      overview: {
        en: 'Upload reference audio on v2.api.gommo.net (POST /ai/upload/audio) for avatar lip-sync and similar jobs.',
        vi: 'Upload audio tham chiếu trên v2.api.gommo.net (POST /ai/upload/audio) cho avatar lip-sync và job tương tự.',
      },
      parameters: [
        {
          name: 'audio_file',
          in: 'body',
          type: 'file',
          required: true,
          description: 'Multipart field: audio_file or file',
          descriptionVi: 'Field multipart: audio_file hoặc file',
          example: '@voice.mp3',
        },
      ],
      workflow: ['Upload audio via multipart.', 'Use returned CDN URL in reference_audio / audio_file fields.'],
      workflowVi: ['Upload audio qua multipart.', 'Dùng URL CDN trong reference_audio / audio_file.'],
      auth: true,
    },
    {
      id: 'audio-tts',
      name: { en: 'Audio TTS', vi: 'Audio TTS' },
      method: 'POST',
      path: '/gateway/audio/tts',
      upstreamPath: 'POST /ai/audio',
      group: 'audio',
      async: false,
      contentTypes: ['application/json'],
      auth: true,
      overview: {
        en: 'Platform TTS on api.gommo.net (POST /ai/audio). Returns audio file URL. Dev proxy: POST /gateway/audio/tts.',
        vi: 'TTS platform trên api.gommo.net (POST /ai/audio). Trả URL file audio. Proxy dev: POST /gateway/audio/tts.',
      },
      parameters: [
        {
          name: 'text',
          in: 'body',
          type: 'string',
          required: true,
          description: 'Text to speak.',
          descriptionVi: 'Văn bản cần đọc.',
          example: 'Hello',
        },
        {
          name: 'voice_id',
          in: 'body',
          type: 'string',
          required: true,
          description: 'From POST api.gommo.net/ai/audio/voices (dev: POST /gateway/audio/voices)',
          descriptionVi: 'Từ POST api.gommo.net/ai/audio/voices (dev: POST /gateway/audio/voices)',
          example: '…',
        },
        {
          name: 'server',
          in: 'body',
          type: 'string',
          required: true,
          description: 'Voice provider',
          descriptionVi: 'Nhà cung cấp voice',
          example: 'elevenlabs_cheap',
        },
        {
          name: 'model',
          in: 'body',
          type: 'string',
          required: true,
          description: 'TTS model id',
          descriptionVi: 'TTS model id',
          example: '…',
        },
      ],
      workflow: ['List voices first.', 'POST text + voice_id; returns audio URL.'],
      workflowVi: ['Liệt kê voices trước.', 'POST text + voice_id; trả URL audio.'],
      auth: true,
    },
    {
      id: 'audio-lists',
      name: { en: 'Audio lists', vi: 'Danh sách audio' },
      method: 'GET',
      path: '/gateway/audio/lists',
      group: 'audio',
      async: false,
      contentTypes: ['application/json'],
      auth: true,
      overview: {
        en: 'TTS generation history for a project.',
        vi: 'Lịch sử TTS theo project.',
      },
      parameters: [
        {
          name: 'projectId',
          in: 'query',
          type: 'string',
          required: false,
          description: 'Project id',
          descriptionVi: 'Project id',
          example: 'default',
        },
      ],
      workflow: ['GET history for optional projectId filter.'],
      workflowVi: ['GET lịch sử, lọc theo projectId tùy chọn.'],
      auth: true,
    },
    {
      id: 'auth-login',
      name: { en: 'Login', vi: 'Đăng nhập' },
      method: 'POST',
      path: '/gateway/auth/login',
      group: 'auth',
      async: false,
      contentTypes: ['application/json'],
      auth: false,
      overview: {
        en: 'Exchange email/password for access_token on api.gommo.net. Dev proxy: POST /gateway/auth/login.',
        vi: 'Đổi email/password lấy access_token trên api.gommo.net. Proxy dev: POST /gateway/auth/login.',
      },
      parameters: [
        {
          name: 'email',
          in: 'body',
          type: 'string',
          required: true,
          description: 'Account email',
          descriptionVi: 'Email tài khoản',
          example: 'user@example.com',
        },
        {
          name: 'password',
          in: 'body',
          type: 'string',
          required: true,
          description: 'Password',
          descriptionVi: 'Mật khẩu',
          example: '••••••',
        },
        {
          name: 'domain',
          in: 'body',
          type: 'string',
          required: false,
          description: 'Registration domain',
          descriptionVi: 'Domain đăng ký',
          example: '79ai.net',
        },
      ],
      workflow: [
        'POST credentials to api.gommo.net/api/apps/go-mmo/auth/login; save access_token.',
        'Use token as Bearer on v2.api.gommo.net and api.gommo.net.',
      ],
      workflowVi: [
        'POST credentials tới api.gommo.net/api/apps/go-mmo/auth/login; lưu access_token.',
        'Dùng token làm Bearer trên v2.api.gommo.net và api.gommo.net.',
      ],
      auth: false,
    },
    {
      id: 'me-credits',
      name: { en: 'Me / credits', vi: 'Me / credits' },
      method: 'POST',
      path: '/ai/me',
      upstreamPath: 'POST /api/apps/go-mmo/ai/me',
      group: 'auth',
      async: false,
      contentTypes: ['application/x-www-form-urlencoded'],
      auth: true,
      overview: {
        en: 'Account profile and credits_ai via platform proxy.',
        vi: 'Hồ sơ tài khoản và credits_ai qua platform proxy.',
      },
      parameters: [
        {
          name: 'access_token',
          in: 'body',
          type: 'string',
          required: true,
          description: 'User token',
          descriptionVi: 'User token',
          example: '…',
        },
        {
          name: 'domain',
          in: 'body',
          type: 'string',
          required: true,
          description: 'App domain',
          descriptionVi: 'Domain app',
          example: '79ai.net',
        },
      ],
      workflow: ['POST form body with access_token and domain.', 'Read credits_ai from response.'],
      workflowVi: ['POST form body với access_token và domain.', 'Đọc credits_ai từ response.'],
      auth: true,
    },
  ];

  function getById(id) {
    return ENDPOINTS.find((e) => e.id === id) || null;
  }

  /** @returns {'v2' | 'auth' | 'local'} */
  function inferPublicHost(ep) {
    if (ep?.publicHost) return ep.publicHost;
    const id = ep?.id || '';
    if (id === 'health') return 'local';
    if (
      id === 'list-models' ||
      id === 'poll-job' ||
      id === 'create-tool-job' ||
      id.startsWith('create-') ||
      id.startsWith('upload-') ||
      id.startsWith('library-')
    ) {
      return 'v2';
    }
    if (id === 'chat' || id === 'auth-login' || id.startsWith('audio-') || id === 'me-credits') {
      return 'auth';
    }
    if (ep?.path?.startsWith('/gateway/')) return 'auth';
    if (ep?.path?.startsWith('/ai/')) return 'auth';
    return 'auth';
  }

  function applyPublicPathTokens(path, ep, ctx = {}) {
    const jt = ep?.jobType || ctx.jobType || 'image';
    const slug = ctx.modelSlug || '{model_id}';
    const media =
      ep?.pollMedia ||
      (jt === 'music' ? 'music' : jt === 'video' || jt.startsWith('video-') ? 'video' : 'image');
    return String(path || '')
      .replaceAll('{type}', jt)
      .replaceAll('{tool-type}', jt)
      .replaceAll('{modelSlug}', slug)
      .replaceAll('{model_id}', slug)
      .replaceAll('{id}', '{id_base}')
      .replaceAll('{media}', media);
  }

  function resolvePublicPath(ep, ctx = {}) {
    if (ep?.publicPath) return applyPublicPathTokens(ep.publicPath, ep, ctx);
    const id = ep?.id || '';
    const jt = ep?.jobType || ctx.jobType || 'image';
    const slug = ctx.modelSlug || '{model_id}';

    if (id === 'list-models') return `/ai/models?type=${encodeURIComponent(jt)}`;
    if (id === 'poll-job') {
      const media =
        ep.pollMedia ||
        (jt === 'music' ? 'music' : jt === 'video' || jt.startsWith('video-') ? 'video' : 'image');
      return `/ai/jobs/{id_base}?media=${encodeURIComponent(media)}`;
    }
    if (id?.startsWith('create-') || id === 'create-tool-job') {
      return `/ai/jobs/${jt}/${slug}`;
    }
    if (id === 'upload-image') return '/ai/upload/image';
    if (id === 'upload-video') return '/ai/upload/video';
    if (id === 'upload-audio') return '/ai/upload/audio';
    if (id === 'chat') return '/api/v2/chat';
    if (id === 'audio-tts') return '/ai/audio';
    if (id === 'audio-lists') {
      const pid = ctx.projectId?.trim();
      return pid ? `/ai/audio/lists?projectId=${encodeURIComponent(pid)}` : '/ai/audio/lists';
    }
    if (id === 'auth-login') return '/api/apps/go-mmo/auth/login';
    if (id === 'me-credits') return '/ai/me';
    if (id === 'health') return '/health';
    return applyPublicPathTokens(ep?.path || '', ep, ctx);
  }

  function resolvePublicApi(ep, ctx = {}) {
    const host = inferPublicHost(ep);
    const path = resolvePublicPath(ep, ctx);
    if (host === 'local') {
      const base = String(ctx.baseUrl || '').replace(/\/$/, '');
      const url = `${base}${path.startsWith('/') ? path : `/${path}`}`;
      return { host, base, path, url };
    }
    const base = global.PortalGommoApi?.resolvePublicBase(host) || '';
    const url = global.PortalGommoApi?.buildPublicUrl(host, path) || `${base}${path}`;
    return { host, base, path, url };
  }

  function publicHostLabel(host, isVi) {
    if (host === 'v2') return isVi ? 'v2.api.gommo.net' : 'v2.api.gommo.net';
    if (host === 'auth') return isVi ? 'api.gommo.net' : 'api.gommo.net';
    return isVi ? 'Gateway (local)' : 'Gateway (local)';
  }

  global.GatewayEndpointRegistry = {
    ENDPOINTS,
    POLL_POLICY,
    ERROR_REFERENCE,
    ENVELOPE_META,
    VALIDATION_CHECKLIST,
    AUTH_HEADERS,
    RECOVERY_STRATEGY,
    pickLocale,
    localizeParam,
    localizeWorkflow,
    localizeAuthHeader,
    getById,
    inferPublicHost,
    resolvePublicPath,
    resolvePublicApi,
    publicHostLabel,
  };
})(typeof window !== 'undefined' ? window : globalThis);
