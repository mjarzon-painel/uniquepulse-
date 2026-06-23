# UniquePulse — atualiza o backend no VPS SEM trocar a URL do tunel
# (reinicia so o node; mantem o cloudflared rodando, entao a URL publica continua a mesma)
$ErrorActionPreference = 'Stop'
$root = Join-Path $env:USERPROFILE 'uniquepulse'

Write-Host '== Parando o backend (node) ==' -ForegroundColor Cyan
Get-Process node -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
Start-Sleep -Seconds 2

Write-Host '== Baixando versao nova do projeto ==' -ForegroundColor Cyan
$tmp = Join-Path $root 'tmp_update'
if (Test-Path $tmp) { Remove-Item $tmp -Recurse -Force }
Invoke-WebRequest 'https://github.com/mjarzon-painel/uniquepulse-/archive/refs/heads/main.zip' -OutFile "$root\app.zip" -UseBasicParsing
Expand-Archive "$root\app.zip" -DestinationPath $tmp -Force
Remove-Item "$root\app.zip" -Force
$src = Join-Path $tmp 'uniquepulse--main'

# Copia o codigo novo por cima, PRESERVANDO node_modules (nao re-baixa o Chromium)
if (-not (Test-Path "$root\app")) { New-Item -ItemType Directory -Force "$root\app" | Out-Null }
robocopy $src "$root\app" /E /XD node_modules /NFL /NDL /NJH /NJS /NC /NS /NP | Out-Null
Remove-Item $tmp -Recurse -Force

Write-Host '== Conferindo dependencias ==' -ForegroundColor Cyan
Set-Location "$root\app"
& "$root\node\npm.cmd" install --no-audit --no-fund

Write-Host '== Iniciando backend novo ==' -ForegroundColor Cyan
Start-Process "$root\node\node.exe" -ArgumentList 'server/index.js' -WorkingDirectory "$root\app" -WindowStyle Hidden

# Garante o tunel rodando (se ja estiver, NAO mexe -> URL continua a mesma)
if (-not (Get-Process cloudflared -ErrorAction SilentlyContinue)) {
  Start-Process "$root\cloudflared.exe" -ArgumentList "tunnel --url http://localhost:3001 --no-autoupdate --logfile `"$root\tunnel.log`"" -WindowStyle Hidden
  Write-Host '(tunel reiniciado — a URL pode ter mudado; rode: Get-Content "$root\tunnel.log" | Select-String trycloudflare)' -ForegroundColor Yellow
}

Write-Host ''
Write-Host '==================================================' -ForegroundColor Green
Write-Host 'BACKEND ATUALIZADO (colaborativo)! Mesma URL do tunel.' -ForegroundColor Green
Write-Host '==================================================' -ForegroundColor Green
