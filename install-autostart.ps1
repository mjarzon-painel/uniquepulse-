# UniquePulse — registra o auto-start (Tarefa Agendada no logon)
$root = Join-Path $env:USERPROFILE 'uniquepulse'

# Baixa o script de inicializacao mais recente
Invoke-WebRequest 'https://raw.githubusercontent.com/mjarzon-painel/uniquepulse-/main/start-vps.ps1' -OutFile "$root\start-vps.ps1" -UseBasicParsing

$action = New-ScheduledTaskAction -Execute 'powershell.exe' `
  -Argument "-WindowStyle Hidden -ExecutionPolicy Bypass -File `"$root\start-vps.ps1`""
$trigger = New-ScheduledTaskTrigger -AtLogOn
$settings = New-ScheduledTaskSettingsSet -StartWhenAvailable -MultipleInstances IgnoreNew

Register-ScheduledTask -TaskName 'UniquePulse' -Action $action -Trigger $trigger -Settings $settings -Force | Out-Null

Write-Host ''
Write-Host '==================================================' -ForegroundColor Green
Write-Host 'AUTO-START CONFIGURADO!' -ForegroundColor Green
Write-Host 'Tarefa "UniquePulse" vai iniciar o backend + tunel' -ForegroundColor Green
Write-Host 'automaticamente sempre que o servidor ligar/logar.' -ForegroundColor Green
Write-Host '(O backend que ja esta rodando agora NAO foi mexido.)' -ForegroundColor Green
Write-Host '==================================================' -ForegroundColor Green
