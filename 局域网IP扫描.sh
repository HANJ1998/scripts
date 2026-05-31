#!/bin/bash
clear
echo "===================================================="
echo "          统信UOS 局域网IP扫描工具（自选网卡）"
echo "===================================================="
echo ""

# 列出所有非虚拟网卡
echo "📶 检测到可用网卡列表："
echo "-----------------------------------------"
num=1
interfaces=()
while IFS= read -r line; do
    name=$(echo "$line" | awk '{print $1}')
    ip=$(ip -4 addr show "$name" | grep -oP '(?<=inet\s)\d+(\.\d+){3}' | head -n1)
    if [ -z "$ip" ]; then
        ip="无IP地址"
    fi
    echo "[$num] 网卡：$name  | IP：$ip"
    interfaces+=("$name")
    num=$((num+1))
done < <(ip -br link | grep -v LOOPBACK | grep -v virbr | grep -v docker)
echo "-----------------------------------------"

# 让用户选择网卡
read -p "请输入要使用的网卡序号：" choice
selected_interface=${interfaces[$((choice-1))]}

if [ -z "$selected_interface" ]; then
    echo "❌ 选择无效！"
    read -p "按回车退出"
    exit 1
fi

echo ""
echo "✅ 你选择了网卡：$selected_interface"

# 获取本机IP
local_ip=$(ip -4 addr show "$selected_interface" | grep -oP '(?<=inet\s)\d+(\.\d+){3}/\d+' | cut -d'/' -f1)
if [ -z "$local_ip" ]; then
    echo "❌ 该网卡没有获取到IP，请检查网络！"
    read -p "按回车退出"
    exit 1
fi

echo "✅ 本机IP：$local_ip"
net_pre=$(echo "$local_ip" | cut -d'.' -f1-3)
echo "✅ 扫描网段：${net_pre}.1 ~ ${net_pre}.254"
echo ""
echo "🔍 正在扫描在线设备，请稍候..."
echo "-----------------------------------------"

# 并发扫描
for i in {1..254}; do
    (ping -c 1 -W 0.1 "${net_pre}.$i" >/dev/null 2>&1 && echo "✅ 在线设备：${net_pre}.$i") &
done
wait

echo "-----------------------------------------"
echo "🎉 扫描完成！"
echo "===================================================="
read -p "按回车键关闭窗口..."