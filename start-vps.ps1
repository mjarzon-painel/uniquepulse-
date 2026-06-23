# UniquePulse — inicia backend + tunel (usado pela tarefa agendada no boot/logon)
$root = Join-Path $env:USERPROFILE 'uniquepulse'

# Encerra instancias antigas para nao duplicar
Get-Process node, cloudflared -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
Start-Sleep -Seconds 2

# Backend
Start-Process "$root\node\node.exe" -ArgumentList 'server/index.js' -WorkingDirectory "$root\app" -WindowStyle Hidden
Start-Sleep -Seconds 4

# Tunel
if (Test-Path "$root\tunnel.log") { Remove-Item "$root\tunnel.log" -Force -ErrorAction SilentlyContinue }
Start-Process "$root\cloudflared.exe" -ArgumentList "tunnel --url http://localhost:3001 --no-autoupdate --logfile `"$root\tunnel.log`"" -WindowStyle Hidden
