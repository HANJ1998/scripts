@echo off
rem ================================================
rem 提取项目代码脚本 (Windows版)
rem 功能：遍历当前目录及其子目录，提取Word文档的文件名信息
rem 输出格式：FilePrefix,RemainingName,FullFilename,FolderPath
rem 时间：2026-03-27
rem ================================================

echo "FilePrefix","RemainingName","FullFilename","FolderPath" > output.csv

rem 遍历所有Word文档文件
for /r . %%f in (*.doc *.docx *.wps) do (
    set "name=%%~nf"           rem 获取文件名（不含扩展名）
    set "fullname=%%~nxf"      rem 获取完整文件名（含扩展名）
    set "folderpath=%%~dpf"     rem 获取文件所在目录路径
    setlocal enabledelayedexpansion
    if not "!name!"=="" (      rem 确保文件名不为空
        if not "!name:~18!"=="" (  rem 确保文件名长度超过18个字符
            set "folderpath=!folderpath:~0,-1!"  rem 移除路径末尾的反斜杠
            for %%I in (.) do set "current=%%~fI"  rem 获取当前工作目录
            set "relfolder=!folderpath:%current%\=!"  rem 计算相对路径
            echo "!name:~0,18!","'!name:~18!","!fullname!","!relfolder!" >> output.csv  rem 输出到CSV
        )
    )
    endlocal
)

echo Done! Check output.csv
pause