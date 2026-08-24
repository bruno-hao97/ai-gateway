# Test image job qua REST gateway (PowerShell)
# Yêu cầu: npm run dev hoặc npm start đang chạy; có Gommo access_token user.

param(
  [string]$BaseUrl = 'http://localhost:3001',
  [string]$Token = $env:GOMMO_USER_TOKEN,
  [string]$Domain = $(if ($env:GOMMO_API_DOMAIN) { $env:GOMMO_API_DOMAIN } else { '79ai.net' }),
  [string]$Prompt = 'A cute cat wearing sunglasses, studio photo'
)

if (-not $Token) {
  Write-Error @"
Thiếu access token. Set biến môi trường GOMMO_USER_TOKEN hoặc truyền -Token.

Ví dụ lấy token qua proxy login (thay email/password):
  `$body = @{ email='you@example.com'; password='***'; domain='$Domain' } | ConvertTo-Json
  Invoke-RestMethod -Method POST -Uri '$BaseUrl/api/apps/go-mmo/auth/login' -ContentType 'application/json' -Body `$body
"@
  exit 1
}

$headers = @{
  Authorization = "Bearer $Token"
}

Write-Host "==> GET /gateway/models?type=image&domain=$Domain"
$modelsResp = Invoke-RestMethod -Uri "$BaseUrl/gateway/models?type=image&domain=$Domain" -Headers $headers
$models = @()
if ($modelsResp.data -is [System.Array]) {
  $models = $modelsResp.data
} elseif ($modelsResp.data.models) {
  $models = $modelsResp.data.models
}

if (-not $models -or $models.Count -eq 0) {
  Write-Error 'Không có model image trong catalog.'
  exit 1
}

$model = $models[0]
$slug = $model.model
if (-not $slug) { $slug = $model.slug }
if (-not $slug) { $slug = $model.model_id }
if (-not $slug) { $slug = $model.id }

$ratio = $null
if ($model.ratios -and $model.ratios.Count -gt 0) {
  $r0 = $model.ratios[0]
  if ($r0 -is [string]) { $ratio = $r0 }
  elseif ($r0.value) { $ratio = $r0.value }
  elseif ($r0.ratio) { $ratio = $r0.ratio }
}

Write-Host "Model: $slug  Ratio: $ratio"

$fields = @{
  prompt = $Prompt
  language = 'VI'
}
if ($ratio) { $fields.ratio = $ratio }

$jobBody = @{
  modelSlug = $slug
  fields = $fields
  wait = $true
  domain = $Domain
} | ConvertTo-Json -Depth 6

Write-Host "==> POST /gateway/jobs/image (wait=true)"
$jobResp = Invoke-RestMethod -Method POST -Uri "$BaseUrl/gateway/jobs/image" -Headers $headers -ContentType 'application/json' -Body $jobBody

$jobResp | ConvertTo-Json -Depth 8
$resultUrl = $jobResp.data.resultUrl
if ($resultUrl) {
  Write-Host "`nResult URL: $resultUrl" -ForegroundColor Green
} else {
  Write-Warning 'Chưa có resultUrl — xem pollResult / createEnvelope trong response.'
}
