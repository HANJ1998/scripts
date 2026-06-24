$path = 'HKCU:\Software\Microsoft\Windows\CurrentVersion\Themes\Personalize'
$current = (Get-ItemProperty -Path $path).AppsUseLightTheme

$newValue = if ($current -eq 1) { 0 } else { 1 }

Set-ItemProperty -Path $path -Name AppsUseLightTheme -Value $newValue
Set-ItemProperty -Path $path -Name SystemUsesLightTheme -Value $newValue

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
