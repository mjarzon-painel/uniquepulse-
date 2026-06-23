# UniquePulse — instalacao no VPS Windows (rodar no PowerShell do servidor)
$ErrorActionPreference = 'Stop'
$root = 'C:\uniquepulse'
New-Item -ItemType Directory -Force $root | Out-Null

Write-Host '== 1/5 Baixando Node.js (portatil) ==' -ForegroundColor Cyan
if (-not (Test-Path "$root\node\node.exe")) {
  Invoke-WebRequest 'https://nodejs.org/dist/v20.18.1/node-v20.18.1-win-x64.zip' -OutFile "$root\node.zip" -UseBasicParsing
  Expand-Archive "$root\node.zip" -DestinationPath $root -Force
  Rename-Item "$root\node-v20.18.1-win-x64" 'node' -Force
  Remove-Item "$root\node.zip" -Force
}
$env:Path = "$root\node;" + $env:Path
Write-Host ('Node ' + (& "$root\node\node.exe" -v)) -ForegroundColor Green

Write-Host '== 2/5 Baixando o projeto UniquePulse ==' -ForegroundColor Cyan
if (Test-Path "$root\app") { Remove-Item "$root\app" -Recurse -Force }
Invoke-WebRequest 'https://github.com/mjarzon-painel/uniquepulse-/archive/refs/heads/main.zip' -OutFile "$root\app.zip" -UseBasicParsing
Expand-Archive "$root\app.zip" -DestinationPath $root -Force
Rename-Item "$root\uniquepulse--main" 'app' -Force
Remove-Item "$root\app.zip" -Force

Write-Host '== 3/5 Instalando dependencias (demora ~3-5 min, baixa o Chromium) ==' -ForegroundColor Cyan
Set-Location "$root\app"
& "$root\node\npm.cmd" install --no-audit --no-fund

Write-Host '== 4/5 Baixando cloudflared (tunel) ==' -ForegroundColor Cyan
if (-not (Test-Path "$root\cloudflared.exe")) {
  Invoke-WebRequest 'https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-windows-amd64.exe' -OutFile "$root\cloudflared.exe" -UseBasicParsing
}

Write-Host '== 5/5 Iniciando backend + tunel ==' -ForegroundColor Cyan
Start-Process "$root\node\node.exe" -ArgumentList 'server/index.js' -WorkingDirectory "$root\app" -WindowStyle Minimized
Start-Sleep 4
if (Test-Path "$root\tunnel.log") { Remove-Item "$root\tunnel.log" -Force }
Start-Process "$root\cloudflared.exe" -ArgumentList 'tunnel --url http://localhost:3001 --no-autoupdate --logfile C:\uniquepulse\tunnel.log' -WindowStyle Minimized
Write-Host 'Aguardando o tunel gerar a URL...' -ForegroundColor Cyan
Start-Sleep 10
$u = (Select-String -Path "$root\tunnel.log" -Pattern 'https://[a-z0-9-]+\.trycloudflare\.com' -ErrorAction SilentlyContinue | Select-Object -Last 1).Matches.Value
Write-Host ''
Write-Host '==================================================' -ForegroundColor Green
if ($u) { Write-Host "URL DO BACKEND: $u" -ForegroundColor Green }
else { Write-Host 'Tunel ainda subindo. Rode:  Get-Content C:\uniquepulse\tunnel.log | Select-String trycloudflare' -ForegroundColor Yellow }
Write-Host 'Copie essa URL e mande no chat.' -ForegroundColor Green
Write-Host '==================================================' -ForegroundColor Green
