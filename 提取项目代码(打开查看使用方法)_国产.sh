#!/bin/bash


# 使用方法
#   首次使用：
#     将此代码粘贴到项目文件夹，在此文件夹内右键空白处点击“在终端中打开”，
#     在终端中输入“chmod +x 提取项目代码(打开查看使用方法)_国产.sh”，
#     按回车执行，关闭终端，双击此代码，点击“运行”或者“在终端中运行”即可。
#   非首次使用：
#     双击运行即可。


# 创建输出文件并写入标题
echo "\"FilePrefix\",\"RemainingName\",\"FullFilename\",\"FolderPath\"" > output.csv

# 使用find命令递归查找所有指定类型的文件
find . -type f \( -name "*.doc" -o -name "*.docx" -o -name "*.wps" \) | while read -r file; do
    # 获取文件名（不含扩展名）
    filename=$(basename -- "$file")
    name="${filename%.*}"
    fullname="$filename"
    
    # 获取目录路径
    folderpath=$(dirname -- "$file")
    
    if [ -n "$name" ]; then
        # 检查文件名长度是否大于18个字符
        if [ ${#name} -gt 18 ]; then
            # 获取相对路径（去掉开头的"./"）
            relfolder="${folderpath#./}"
            
            # 提取前18个字符作为前缀
            prefix="${name:0:18}"
            # 提取18个字符之后的部分
            remaining="${name:18}"
            
            # 输出到CSV文件
            echo "\"$prefix\",\"'$remaining\",\"$fullname\",\"$relfolder\"" >> output.csv
        fi
    fi
done

echo "Done! Check output.csv"
read -p "Press Enter to continue..."