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
      recovery: 'Reload GET /gateway/models and use supported fields/enums only.',
      recoveryVi: 'Gọi lại GET /gateway/models và chỉ dùng field/enum được catalog hỗ trợ.',
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
      'Model id and options came from one fresh GET /gateway/models record.',
      'Required user confirmation was captured before credit-consuming jobs.',
    ],
    vi: [
      'Method/path và field bắt buộc khớp endpoint record.',
      'Auth chỉ ở headers và request dùng HTTPS.',
      'Content-Type và serialization khớp transport đã chọn.',
      'Phân loại response theo HTTP status, success/ok, error_code — không parse text.',
      'Model id và option lấy từ một bản ghi GET /gateway/models mới.',
      'Đã xác nhận với user trước job tốn credits.',
    ],
  };

  const AUTH_HEADERS = [
    {
      name: 'Authorization',
      type: 'string',
      required: true,
      source: 'header',
      description: 'Bearer access token from POST /gateway/auth/login.',
      descriptionVi: 'Bearer access token từ POST /gateway/auth/login.',
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

  function createJobEndpoint(jobType, labels) {
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
      overview: {
        en: `Create an asynchronous ${jobType} generation job via gateway REST. Model slug and catalog fields go in JSON body.`,
        vi: `Tạo job ${jobType} bất đồng bộ qua gateway REST. modelSlug và fields catalog nằm trong JSON body.`,
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
          description: 'Model slug from GET /gateway/models?type=' + jobType,
          descriptionVi: 'Model slug từ GET /gateway/models?type=' + jobType,
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
        'Submit POST /gateway/jobs/' + jobType + ' with modelSlug and fields.',
        'Capture public job id from data.id_base (or raw.*Info.id_base).',
        'Poll GET /gateway/jobs/{id}?media=' + pollMedia + ' until terminal status.',
        'Return resultUrl from data or handle structured error.',
      ],
      workflowVi: [
        'Gửi POST /gateway/jobs/' + jobType + ' với modelSlug và fields.',
        'Lấy job id public từ data.id_base (hoặc raw.*Info.id_base).',
        'Poll GET /gateway/jobs/{id}?media=' + pollMedia + ' đến status terminal.',
        'Trả resultUrl từ data hoặc xử lý lỗi có cấu trúc.',
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
      name: { en: 'List models', vi: 'Danh sách models' },
      method: 'GET',
      path: '/gateway/models?type={type}',
      upstreamPath: 'POST /v2/ai/models?type={type}',
      group: 'catalog',
      async: false,
      contentTypes: ['application/json'],
      auth: false,
      overview: {
        en: 'Public model catalog for a job type. Bearer optional when browsing.',
        vi: 'Catalog model theo loại job. Bearer tùy chọn khi browse.',
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
      workflow: ['Call before any create job.', 'Read slug, ratios, modes, prices from response.'],
      workflowVi: ['Gọi trước mọi create job.', 'Đọc slug, ratios, modes, prices từ response.'],
    },
    createJobEndpoint('image', { en: 'Create image job', vi: 'Tạo hình ảnh AI' }),
    createJobEndpoint('video', { en: 'Create video job', vi: 'Tạo video AI' }),
    createJobEndpoint('music', { en: 'Create music job', vi: 'Tạo nhạc AI' }),
    createJobEndpoint('tts', { en: 'Create TTS job', vi: 'Tạo TTS job' }),
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
      name: { en: 'Poll job', vi: 'Poll job' },
      method: 'GET',
      path: '/gateway/jobs/:id?media={media}',
      upstreamPath: 'POST /v2/ai/jobs/{id}?media={media}',
      group: 'status',
      async: false,
      contentTypes: ['application/json'],
      auth: true,
      overview: {
        en: 'Poll async job status. Use id_base from create response, not internal task id.',
        vi: 'Poll trạng thái job async. Dùng id_base từ create, không dùng task id nội bộ.',
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
        'Poll every 3.5s, max 80 attempts (~5 min).',
        'Stop on success URL or terminal failure.',
      ],
      workflowVi: [
        'Poll mỗi 3.5s, tối đa 80 lần (~5 phút).',
        'Dừng khi có URL thành công hoặc thất bại terminal.',
      ],
      auth: true,
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
      workflow: ['Send POST /gateway/chat with action and messages.', 'Handle JSON or SSE stream response.'],
      workflowVi: ['Gửi POST /gateway/chat với action và messages.', 'Xử lý response JSON hoặc SSE stream.'],
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
        en: 'Upload reference image; use returned URL in job fields.',
        vi: 'Upload ảnh tham chiếu; dùng URL trả về trong fields job.',
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
        en: 'Upload video file; multipart field video_file or file.',
        vi: 'Upload video; field multipart video_file hoặc file.',
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
        en: 'Platform TTS (not media job). Returns audio file URL.',
        vi: 'TTS platform (không phải media job). Trả URL file audio.',
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
          description: 'From POST /gateway/audio/voices',
          descriptionVi: 'Từ POST /gateway/audio/voices',
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
        en: 'Exchange email/password for access_token.',
        vi: 'Đổi email/password lấy access_token.',
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
      workflow: ['POST credentials; save access_token from response.', 'Use token as Bearer for gateway calls.'],
      workflowVi: ['POST credentials; lưu access_token từ response.', 'Dùng token làm Bearer cho gateway.'],
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
  };
})(typeof window !== 'undefined' ? window : globalThis);
