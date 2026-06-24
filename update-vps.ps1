# UniquePulse — atualiza o backend no VPS SEM trocar a URL do tunel
# (reinicia so o node; o ngrok de dominio fixo NAO e tocado, entao a URL publica continua a mesma)
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

# NAO mexe no tunel: o ngrok (dominio fixo swung-dig-chastity.ngrok-free.dev) e gerenciado
# pelo start-vps.ps1 / tarefa agendada. Como so reiniciamos o 'node', a URL publica continua a mesma.

Write-Host ''
Write-Host '==================================================' -ForegroundColor Green
Write-Host 'BACKEND ATUALIZADO (colaborativo)! Mesma URL do tunel.' -ForegroundColor Green
Write-Host '==================================================' -ForegroundColor Green
