@echo off
chcp 936 >nul
mode con cols=100 lines=30 >nul

title 网络适配器切换工具

:main
cls
echo ========================================
echo       网络适配器切换工具 (Windows 11)
echo ========================================
echo.
echo 1. 启用有线网络，禁用无线网络
echo 2. 启用无线网络，禁用有线网络
echo 3. 查看详细网络适配器信息
echo 4. 退出
echo ========================================
echo.
set "choice="
set /p choice=请输入选项编号: 

:: 处理用户选择
if "%choice%"=="1" goto enable_wired
if "%choice%"=="2" goto enable_wifi
if "%choice%"=="3" goto show_detail
if "%choice%"=="4" goto exit

echo 无效选项，请重新输入
echo.
pause
cls
goto main

:: 启用有线网络，禁用无线网络
:enable_wired
cls
echo 正在启用有线网络，禁用无线网络...
echo.

:: 禁用无线网络
netsh interface set interface "Wi-Fi" admin=disable 2>nul
netsh interface set interface "无线网络连接" admin=disable 2>nul
netsh interface set interface "WLAN" admin=disable 2>nul

:: 启用有线网络
netsh interface set interface "以太网" admin=enable 2>nul
netsh interface set interface "本地连接" admin=enable 2>nul

echo 操作完成！
echo.
echo 按任意键返回主菜单...
pause >nul
goto main

:: 启用无线网络，禁用有线网络
:enable_wifi
cls
echo 正在启用无线网络，禁用有线网络...
echo.

:: 禁用有线网络
netsh interface set interface "以太网" admin=disable 2>nul
netsh interface set interface "本地连接" admin=disable 2>nul

:: 启用无线网络
netsh interface set interface "Wi-Fi" admin=enable 2>nul
netsh interface set interface "无线网络连接" admin=enable 2>nul
netsh interface set interface "WLAN" admin=enable 2>nul

echo 操作完成！
echo.
echo 按任意键返回主菜单...
pause >nul
goto main

:: 查看详细网络适配器信息
:show_detail
cls
mode con cols=100 lines=30 >nul
echo.
echo          详细网络适配器信息
echo ========================================
netsh interface show interface
echo ========================================
echo.
echo 按任意键返回主菜单...
pause >nul
goto main

:: 退出
:exit
exit