# Test REST gateway — upload / chat / audio
# Yêu cầu: npm run dev đang chạy; set $token (Gommo user access_token)

param(
  [string]$BaseUrl = 'http://localhost:3001',
  [string]$Token = $env:GOMMO_USER_TOKEN,
  [string]$Domain = $(if ($env:GOMMO_API_DOMAIN) { $env:GOMMO_API_DOMAIN } else { '79ai.net' })
)

if (-not $Token) {
  Write-Error 'Set $env:GOMMO_USER_TOKEN hoặc truyền -Token'
  exit 1
}

$headers = @{
  Authorization = "Bearer $Token"
  'Content-Type' = 'application/json'
}

Write-Host "`n==> POST /gateway/audio/voices"
$voicesBody = @{
  server = 'elevenlabs_cheap'
  page = 0
  domain = $Domain
} | ConvertTo-Json
$voicesResp = Invoke-RestMethod -Method POST -Uri "$BaseUrl/gateway/audio/voices" -Headers $headers -Body $voicesBody
$voicesResp | ConvertTo-Json -Depth 4
$firstVoice = $voicesResp.data.voices[0]
if ($firstVoice) {
  Write-Host "First voice: $($firstVoice.name) ($($firstVoice.voice_id))" -ForegroundColor Cyan
}

Write-Host "`n==> POST /gateway/chat action=chat"
$chatBody = @{
  action = 'chat'
  query = 'Xin chao, tra loi mot cau ngan bang tieng Viet.'
  domain = $Domain
} | ConvertTo-Json
try {
  $chatResp = Invoke-RestMethod -Method POST -Uri "$BaseUrl/gateway/chat" -Headers $headers -Body $chatBody
  $chatResp | ConvertTo-Json -Depth 6
} catch {
  Write-Warning "Chat response (có thể là stream/text): $($_.Exception.Message)"
}

# Upload — dùng curl.exe (Invoke-RestMethod multipart khó hơn trên Windows):
# curl.exe -X POST "$BaseUrl/gateway/upload/image" `
#   -H "Authorization: Bearer $Token" `
#   -F "file=@C:\path\to\image.png" `
#   -F "domain=$Domain"
#
# curl.exe -X POST "$BaseUrl/gateway/upload/video" `
#   -H "Authorization: Bearer $Token" `
#   -F "video_file=@C:\path\to\clip.mp4" `
#   -F "domain=$Domain"

Write-Host "`nDone. Upload: xem comment curl.exe ở cuối script." -ForegroundColor Green
