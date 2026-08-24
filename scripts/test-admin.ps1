# Test admin merchant routes (server-only)
# Yêu cầu: .env có GOMMO_ACCESS_TOKEN + ADMIN_API_KEY; npm run dev

param(
  [string]$BaseUrl = 'http://localhost:3001',
  [string]$AdminKey = $env:ADMIN_API_KEY
)

if (-not $AdminKey) {
  Write-Error 'Set $env:ADMIN_API_KEY hoặc truyền -AdminKey'
  exit 1
}

$headers = @{
  'x-admin-key' = $AdminKey
  'Content-Type' = 'application/json'
}

Write-Host "==> GET /admin/merchant/balance"
try {
  $bal = Invoke-RestMethod -Uri "$BaseUrl/admin/merchant/balance" -Headers $headers
  $bal | ConvertTo-Json -Depth 4
} catch {
  Write-Warning $_.Exception.Message
}

# POST /admin/credits/send — CHỈ test số nhỏ trên môi trường thật!
# Bỏ comment khi cần:
#
# $sendBody = @{
#   username = 'target_username'
#   value = 100
#   message = 'Test topup ai-gateway'
#   type = 'credits_ai'
# } | ConvertTo-Json
# Invoke-RestMethod -Method POST -Uri "$BaseUrl/admin/credits/send" -Headers $headers -Body $sendBody

Write-Host "`nDone. sendBalances: bỏ comment block trên, chỉ test value nhỏ." -ForegroundColor Green
