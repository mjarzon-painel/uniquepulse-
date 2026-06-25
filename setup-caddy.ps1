# setup-caddy.ps1 — coloca HTTPS no backend (reverse proxy Caddy -> localhost:3001)
# Roda no VPS. Domínio: uniqueautomoveis.api.br (já apontando pro IP do VPS).
$ErrorActionPreference = 'Stop'
$DOMAIN = 'uniqueautomoveis.api.br'
$base = Join-Path $env:USERPROFILE 'caddy'
New-Item -ItemType Directory -Force -Path $base | Out-Null

Write-Host "== Baixando Caddy =="
$caddyExe = Join-Path $base 'caddy.exe'
if (-not (Test-Path $caddyExe)) {
  $ver = 'v2.8.4'
  $url = "https://github.com/caddyserver/caddy/releases/download/$ver/caddy_2.8.4_windows_amd64.zip"
  $zip = Join-Path $base 'caddy.zip'
  Invoke-WebRequest -Uri $url -OutFile $zip
  Expand-Archive -Path $zip -DestinationPath $base -Force
  Remove-Item $zip -Force
}

Write-Host "== Escrevendo Caddyfile =="
$cfg = Join-Path $base 'Caddyfile'
"$DOMAIN {`r`n  reverse_proxy localhost:3001`r`n}" | Out-File -Encoding ascii $cfg

Write-Host "== Abrindo portas 80/443 no firewall (best-effort) =="
try { New-NetFirewallRule -DisplayName 'HTTP-80' -Direction Inbound -Protocol TCP -LocalPort 80 -Action Allow -ErrorAction Stop | Out-Null } catch { Write-Host "  (firewall 80: $($_.Exception.Message))" }
try { New-NetFirewallRule -DisplayName 'HTTPS-443' -Direction Inbound -Protocol TCP -LocalPort 443 -Action Allow -ErrorAction Stop | Out-Null } catch { Write-Host "  (firewall 443: $($_.Exception.Message))" }

Write-Host "== Reiniciando Caddy =="
Get-Process caddy -ErrorAction SilentlyContinue | Stop-Process -Force
Start-Sleep -Seconds 1
Start-Process -FilePath $caddyExe -ArgumentList "run --config `"$cfg`"" -WorkingDirectory $base -WindowStyle Hidden

Write-Host ""
Write-Host "Caddy iniciado: https://$DOMAIN  ->  localhost:3001"
Write-Host "O certificado Let's Encrypt leva ~10-30s pra ser emitido na 1a vez."
