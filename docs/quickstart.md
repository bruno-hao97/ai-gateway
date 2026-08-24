# Quickstart

Login → lấy models → tạo **1 image job** (có `ratio` từ catalog).

Gateway chạy tại `http://localhost:3001`. Domain Gommo lấy từ **`GOMMO_API_DOMAIN`** (`.env`, default `79ai.net`).

## 1. Login

::: code-group

```bash [curl]
curl.exe -X POST "http://localhost:3001/api/apps/go-mmo/auth/login" ^
  -H "Content-Type: application/x-www-form-urlencoded" ^
  -d "email=YOU@example.com&password=YOUR_PASSWORD&domain=%GOMMO_API_DOMAIN%"
```

```powershell [PowerShell]
$domain = if ($env:GOMMO_API_DOMAIN) { $env:GOMMO_API_DOMAIN } else { '79ai.net' }
$loginBody = "email=YOU@example.com&password=YOUR_PASSWORD&domain=$domain"
$login = Invoke-RestMethod -Method POST `
  -Uri "http://localhost:3001/api/apps/go-mmo/auth/login" `
  -ContentType "application/x-www-form-urlencoded" `
  -Body $loginBody
$env:TOKEN = $login.access_token
```

:::

## 2. Lấy models (không đoán ratio)

::: code-group

```bash [curl — REST]
curl.exe "http://localhost:3001/gateway/models?type=image" ^
  -H "Authorization: Bearer %TOKEN%"
```

```powershell [PowerShell — REST]
$h = @{ Authorization = "Bearer $env:TOKEN" }
$models = Invoke-RestMethod `
  -Uri "http://localhost:3001/gateway/models?type=image" `
  -Headers $h
$m = $models.data[0]
$slug = $m.model
if (-not $slug) { $slug = $m.slug }
$ratio = $m.ratios[0]
if ($ratio -is [pscustomobject]) { $ratio = $ratio.value }
Write-Host "model=$slug ratio=$ratio"
```

:::

Lưu `$slug` và `$ratio` — **chỉ dùng giá trị có trong response**.

## 3. Tạo image job (wait = poll tới xong)

::: code-group

```bash [curl]
curl.exe -X POST "http://localhost:3001/gateway/jobs/image" ^
  -H "Authorization: Bearer %TOKEN%" ^
  -H "Content-Type: application/json" ^
  -d "{\"modelSlug\":\"MODEL_SLUG\",\"wait\":true,\"fields\":{\"prompt\":\"A cute cat, studio photo\",\"ratio\":\"RATIO_FROM_MODELS\"}}"
```

```powershell [PowerShell]
$jobBody = @{
  modelSlug = $slug
  wait = $true
  fields = @{
    prompt = 'A cute cat, studio photo'
    ratio = $ratio
  }
} | ConvertTo-Json -Depth 5

$job = Invoke-RestMethod -Method POST `
  -Uri "http://localhost:3001/gateway/jobs/image" `
  -Headers (@{ Authorization = "Bearer $env:TOKEN"; 'Content-Type' = 'application/json' }) `
  -Body $jobBody
$job.data.resultUrl
```

:::

## 4. Cùng flow qua proxy (Mode C)

```powershell
$domain = if ($env:GOMMO_API_DOMAIN) { $env:GOMMO_API_DOMAIN } else { '79ai.net' }
$form = "type=image&domain=$domain"
Invoke-RestMethod -Method POST `
  -Uri "http://localhost:3001/v2/ai/models?type=image" `
  -Headers @{ Authorization = "Bearer $env:TOKEN" } `
  -ContentType "application/x-www-form-urlencoded" `
  -Body $form
```

## Health check

```powershell
Invoke-RestMethod http://localhost:3001/health
```

## Scripts

- `scripts/test-image-job.ps1`
- `scripts/test-gateway.ps1`
- `scripts/test-admin.ps1`

## Tiếp theo

- [Authentication](./authentication.md)
- [Media reference](./reference/media.md)
