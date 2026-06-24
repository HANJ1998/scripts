$taskName = 'AutoToggleTheme'
$scriptPath = "$PSScriptRoot\auto-toggle-theme.bat"

$action = New-ScheduledTaskAction -Execute $scriptPath
$triggerLogon = New-ScheduledTaskTrigger -AtLogOn
$triggerRepeat = New-ScheduledTaskTrigger -Daily -At '00:00'
$triggerRepeat.RepetitionInterval = (New-TimeSpan -Minutes 60)
$triggerRepeat.RepetitionDuration = [TimeSpan]::MaxValue
$settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -StartWhenAvailable
$principal = New-ScheduledTaskPrincipal -UserId "$env:USERDOMAIN\$env:USERNAME" -RunLevel Highest

Register-ScheduledTask -TaskName $taskName -Action $action -Trigger @($triggerLogon, $triggerRepeat) -Settings $settings -Principal $principal -Force
Write-Host "Task '$taskName' registered."
