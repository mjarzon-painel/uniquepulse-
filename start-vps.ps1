# UniquePulse — inicia backend + tunel FIXO (ngrok). Usado no boot/logon (auto-start).
$root = Join-Path $env:USERPROFILE 'uniquepulse'
$DOMAIN = 'swung-dig-chastity.ngrok-free.dev' # URL fixa do ngrok

# Encerra instancias antigas (inclui cloudflared, que foi substituido pelo ngrok)
Get-Process node, cloudflared, ngrok -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
Start-Sleep -Seconds 2

# Backend
Start-Process "$root\node\node.exe" -ArgumentList 'server/index.js' -WorkingDirectory "$root\app" -WindowStyle Hidden
Start-Sleep -Seconds 3

# Tunel fixo (ngrok) — authtoken ja configurado uma vez via 'ngrok config add-authtoken'
Start-Process "$root\ngrok.exe" -ArgumentList "http --domain=$DOMAIN 3001" -WindowStyle Hidden
