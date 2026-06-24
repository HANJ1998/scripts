import json
import ctypes
import winreg
from datetime import datetime, timezone, timedelta
from urllib.request import urlopen

LAT = 30.82
LON = 111.78

URL = f"https://api.open-meteo.com/v1/forecast?latitude={LAT}&longitude={LON}&daily=sunrise,sunset&timezone=Asia/Shanghai&forecast_days=1"
REG_PATH = r"Software\Microsoft\Windows\CurrentVersion\Themes\Personalize"


def fetch_sun_times():
    with urlopen(URL, timeout=10) as resp:
        data = json.loads(resp.read().decode())
    sunrise_str = data["daily"]["sunrise"][0]  # "2026-06-24T05:30"
    sunset_str = data["daily"]["sunset"][0]    # "2026-06-24T19:39"
    sunrise = datetime.fromisoformat(sunrise_str)
    sunset = datetime.fromisoformat(sunset_str)
    return sunrise, sunset


def get_current_theme():
    with winreg.OpenKey(winreg.HKEY_CURRENT_USER, REG_PATH) as key:
        return winreg.QueryValueEx(key, "AppsUseLightTheme")[0]


def set_theme(value):
    with winreg.OpenKey(winreg.HKEY_CURRENT_USER, REG_PATH, 0, winreg.KEY_SET_VALUE) as key:
        winreg.SetValueEx(key, "AppsUseLightTheme", 0, winreg.REG_DWORD, value)
        winreg.SetValueEx(key, "SystemUsesLightTheme", 0, winreg.REG_DWORD, value)


def notify_theme_change():
    user32 = ctypes.windll.user32
    user32.SendNotifyMessageW(0xFFFF, 0x001A, 0, "ImmersiveColorSet")


def main():
    sunrise, sunset = fetch_sun_times()
    now = datetime.now(timezone(timedelta(hours=8))).replace(tzinfo=None)
    is_daytime = sunrise <= now < sunset
    target = 1 if is_daytime else 0

    if get_current_theme() == target:
        return

    set_theme(target)
    notify_theme_change()


if __name__ == "__main__":
    main()
