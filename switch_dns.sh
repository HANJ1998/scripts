#!/bin/bash
# 统信系统 有线网络DNS切换脚本
# 授权：chmod +x switch_dns.sh
# 1.办公平台：10.19.240.240,10.42.1.54
# 2.统计云：10.42.1.54,10.19.240.240

# 作者邮箱：hanj1998@foxmail.com

# 目标DNS（逗号标准格式）
WORK_DNS="10.19.240.240,10.42.1.54"
STAT_DNS="10.42.1.54,10.19.240.240"
CUSTOM_DEV=""

# DNS标准化函数（统一转为空格分隔，去除首尾空格）
normalize_dns() {
    if [ -z "$1" ] || [ "$1" = "--" ]; then
        echo ""
        return
    fi
    echo "$1" | tr ',' ' ' | tr -s ' ' | sed 's/^ //;s/ $//'
}

# 清理DNS字符串（去除多余空格和换行）
clean_dns() {
    echo "$1" | tr -d '\n' | sed 's/^[[:space:]]*//;s/[[:space:]]*$//' | tr -s ' '
}

echo "=============================="
echo "    统信DNS切换工具（菜单版）"
echo "=============================="
echo " 1. 办公平台"
echo " 2. 统计云"
echo "=============================="
read -p "请输入序号 1/2：" CHOICE
echo ""

# 自动获取有线网卡
if [ -z "$CUSTOM_DEV" ]; then
    DEV_NAME=$(nmcli device status | grep -E 'ethernet|有线' | grep -v wifi | awk 'NR==1{print $1}')
else
    DEV_NAME="$CUSTOM_DEV"
fi

if [ -z "$DEV_NAME" ]; then
    echo "错误：未检测到有线网卡"
    read -p "按回车退出"
    exit 1
fi

# 精确获取对应的网络连接名
CONN_NAME=$(nmcli -t -f NAME,DEVICE connection show | grep ":${DEV_NAME}$" | cut -d: -f1)
if [ -z "$CONN_NAME" ]; then
    # 备用方案：使用旧方法尝试
    CONN_NAME=$(nmcli connection show | grep "$DEV_NAME" | awk 'NR==1{print $1}')
fi

if [ -z "$CONN_NAME" ]; then
    echo "错误：未找到网络连接"
    read -p "按回车退出"
    exit 1
fi

# 获取当前DNS配置（清理格式）
CURRENT_DNS_RAW=$(nmcli connection show "$CONN_NAME" | grep '^ipv4.dns:' | awk -F': ' '{print $2}' | head -1)
CURRENT_DNS=$(clean_dns "$CURRENT_DNS_RAW")

# 标准化当前DNS和目标DNS
CURRENT_NORM=$(normalize_dns "$CURRENT_DNS")

# 预检判断（完全精准）
if [ "$CHOICE" == "1" ]; then
    TARGET="$WORK_DNS"
    TARGET_NORM=$(normalize_dns "$WORK_DNS")
    echo "已选择：办公平台"
    
    if [ -n "$CURRENT_NORM" ] && [ "$CURRENT_NORM" = "$TARGET_NORM" ]; then
        echo "✅ 当前已是办公DNS，无需修改"
        # 美化显示当前DNS
        IFS=',' read -ra DNS_ARRAY <<< "$CURRENT_DNS"
        echo "当前DNS: ${DNS_ARRAY[0]}, ${DNS_ARRAY[1]}"
        read -p "按回车退出"
        exit 0
    fi
    
    if [ -z "$CURRENT_NORM" ]; then
        echo "⚠️  当前未设置DNS，将进行配置"
    else
        # 美化显示
        IFS=',' read -ra DNS_ARRAY <<< "$CURRENT_DNS"
        echo "当前DNS: ${DNS_ARRAY[0]}, ${DNS_ARRAY[1]}"
        echo "目标DNS: ${TARGET}"
    fi

elif [ "$CHOICE" == "2" ]; then
    TARGET="$STAT_DNS"
    TARGET_NORM=$(normalize_dns "$STAT_DNS")
    echo "已选择：统计云平台"
    
    if [ -n "$CURRENT_NORM" ] && [ "$CURRENT_NORM" = "$TARGET_NORM" ]; then
        echo "✅ 当前已是统计云DNS，无需修改"
        # 美化显示当前DNS
        IFS=',' read -ra DNS_ARRAY <<< "$CURRENT_DNS"
        echo "当前DNS: ${DNS_ARRAY[0]}, ${DNS_ARRAY[1]}"
        read -p "按回车退出"
        exit 0
    fi
    
    if [ -z "$CURRENT_NORM" ]; then
        echo "⚠️  当前未设置DNS，将进行配置"
    else
        # 美化显示
        IFS=',' read -ra DNS_ARRAY <<< "$CURRENT_DNS"
        echo "当前DNS: ${DNS_ARRAY[0]}, ${DNS_ARRAY[1]}"
        echo "目标DNS: ${TARGET}"
    fi

else
    echo "❌ 输入错误，请选择 1 或 2"
    read -p "按回车退出"
    exit 1
fi

# 仅DNS不一致或未设置时才修改+重启
echo ""
echo "正在更新DNS配置..."
nmcli connection modify "$CONN_NAME" ipv4.dns "$TARGET"

echo "正在重启网络生效..."
nmcli connection down "$CONN_NAME" &> /dev/null
sleep 1
nmcli connection up "$CONN_NAME" &> /dev/null

# 等待网络稳定
sleep 2

# 展示结果（美化版）
echo "------------------------------"
NEW_DNS_RAW=$(nmcli connection show "$CONN_NAME" | grep '^ipv4.dns:' | awk -F': ' '{print $2}' | head -1)
NEW_DNS=$(clean_dns "$NEW_DNS_RAW")

if [ -z "$NEW_DNS" ]; then
    echo "⚠️  警告：DNS配置可能未生效"
    echo "请手动检查：nmcli connection show \"$CONN_NAME\" | grep ipv4.dns"
else
    # 将逗号分隔转为数组显示（美化格式）
    IFS=',' read -ra ARR <<< "$NEW_DNS"
    echo "✅ DNS配置完成！当前顺序："
    
    # 显示第一个DNS（去除空格）
    if [ ${#ARR[@]} -ge 1 ]; then
        DNS1=$(echo "${ARR[0]}" | sed 's/^[[:space:]]*//;s/[[:space:]]*$//')
        echo "  ❶ ${DNS1}"
    fi
    # 显示第二个DNS（去除空格）
    if [ ${#ARR[@]} -ge 2 ]; then
        DNS2=$(echo "${ARR[1]}" | sed 's/^[[:space:]]*//;s/[[:space:]]*$//')
        echo "  ❷ ${DNS2}"
    fi
fi

echo ""
echo "=============================="
echo "作者邮箱：hanj1998@foxmail.com"
echo "=============================="
read -p "操作结束，按回车键关闭窗口"