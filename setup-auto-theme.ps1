$scriptPath = "$PSScriptRoot\auto-toggle-theme.ps1"
$action = New-ScheduledTaskAction -Execute 'powershell.exe' -Argument "-NoProfile -ExecutionPolicy Bypass -File `"$scriptPath`""

$triggerLogon = New-ScheduledTaskTrigger -AtLogOn
$triggerRepeat = New-ScheduledTaskTrigger -Daily -At '00:00'
$triggerRepeat.RepetitionInterval = (New-TimeSpan -Minutes 60)
$triggerRepeat.RepetitionDuration = [TimeSpan]::MaxValue

$settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -StartWhenAvailable
$principal = New-ScheduledTaskPrincipal -UserId "$env:USERDOMAIN\$env:USERNAME" -RunLevel Highest

Register-ScheduledTask -TaskName 'AutoToggleTheme' -Action $action -Trigger @($triggerLogon, $triggerRepeat) -Settings $settings -Principal $principal -Force
Write-Host 'Scheduled task AutoToggleTheme created.'
