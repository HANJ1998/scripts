$lat = 30.82
$lon = 111.78

# Fetch sunrise/sunset from Open-Meteo
$url = "https://api.open-meteo.com/v1/forecast?latitude=$lat&longitude=$lon&daily=sunrise,sunset&timezone=Asia/Shanghai&forecast_days=1"
$data = Invoke-RestMethod -Uri $url -Method Get

$sunrise = [datetime]::Parse($data.daily.sunrise[0])
$sunset  = [datetime]::Parse($data.daily.sunset[0])
$now     = [datetime]::Now

$isDaytime = $now -ge $sunrise -and $now -lt $sunset
$target    = if ($isDaytime) { 1 } else { 0 }

# Skip if already in the right mode
$current = (Get-ItemProperty 'HKCU:\Software\Microsoft\Windows\CurrentVersion\Themes\Personalize').AppsUseLightTheme
if ($current -eq $target) { exit }

Set-ItemProperty 'HKCU:\Software\Microsoft\Windows\CurrentVersion\Themes\Personalize' AppsUseLightTheme $target
Set-ItemProperty 'HKCU:\Software\Microsoft\Windows\CurrentVersion\Themes\Personalize' SystemUsesLightTheme $target

# Broadcast theme change
Add-Type -TypeDefinition @'
using System;
using System.Runtime.InteropServices;
public class ThemeRefresh {
    [DllImport("user32.dll", CharSet = CharSet.Auto)]
    public static extern bool SendNotifyMessage(IntPtr hWnd, uint Msg, IntPtr wParam, string lParam);
    public static void Notify() {
        SendNotifyMessage((IntPtr)0xffff, 0x001A, IntPtr.Zero, "ImmersiveColorSet");
    }
}
'@
[ThemeRefresh]::Notify()
