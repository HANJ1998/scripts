// ==UserScript==
// @name         提取集思录
// @namespace    https://github.com/hanj1998
// @version      1.4
// @description  获取网页上的表格内容，并在新页面展示
// @author       hanj1998@foxmail.com
// @match        https://www.jisilu.cn/*
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_xmlhttpRequest
// @connect      www.jisilu.cn
// @updateURL    https://raw.githubusercontent.com/hanj1998/MyScript/main/提取集思录.js
// @downloadURL  https://raw.githubusercontent.com/hanj1998/MyScript/main/提取集思录.js
// @license      MIT
// ==/UserScript==

// 免责声明：
// 1. 本脚本仅用于学习、研究与非商业用途，严禁用于任何商业项目、盈利行为及违法违规场景。
// 2. 使用本脚本即表示您已充分阅读、理解并同意本协议，自愿承担所有使用风险。
// 3. 因违规使用、滥用或二次分发造成的一切法律责任与经济损失，均由使用者自行承担，作者不承担任何责任。

(function () {
  "use strict";
  const VERSION = GM_info.script.version;
  const ACTIVATION_KEY = "kezhuanzhai_activation_code";
  const VALID_DAYS = 30;
  const WAIT_MINUTES = 5;

  function generateActivationCode(date) {
    const d = date || new Date();
    const year = d.getFullYear();
    const month = d.getMonth() + 1;
    const day = d.getDate();

    const seed = 20241117;
    const base = year * 10000 + month * 100 + day;
    const code = ((base * seed) % 1000000).toString().padStart(6, "0");

    return code;
  }

  /**
   * 获取存储的激活码
   * @returns {string} 存储的激活码，若不存在则返回空字符串
   */
  function getStoredCode() {
    try {
      return GM_getValue(ACTIVATION_KEY) || "";
    } catch (e) {
      console.error("Failed to get stored activation code:", e);
      return "";
    }
  }

  /**
   * 存储激活码
   * @param {string} code - 激活码
   */
  function setStoredCode(code) {
    GM_setValue(ACTIVATION_KEY, code);
  }

  /**
   * 验证激活码是否有效
   * @returns {boolean} 激活码是否有效
   */
  function isValidActivation() {
    const storedCode = getStoredCode();
    if (!storedCode) return false;

    const today = new Date();
    // 检查过去 VALID_DAYS 天内生成的激活码
    for (let i = 0; i < VALID_DAYS; i++) {
      const checkDate = new Date(today);
      checkDate.setDate(checkDate.getDate() - i);
      if (generateActivationCode(checkDate) === storedCode) {
        return true;
      }
    }
    return false;
  }

  /**
   * 验证输入的激活码
   * @param {string} inputCode - 输入的激活码
   * @returns {boolean} 激活码是否正确
   */
  function verifyCode(inputCode) {
    const today = new Date();
    // 检查过去 VALID_DAYS 天内生成的激活码
    for (let i = 0; i < VALID_DAYS; i++) {
      const checkDate = new Date(today);
      checkDate.setDate(checkDate.getDate() - i);
      if (generateActivationCode(checkDate) === inputCode) {
        return true;
      }
    }
    return false;
  }

  /**
   * 显示激活码输入对话框
   * @param {Function} callback - 激活成功后的回调函数
   */
  function showActivationDialog(callback) {
    // 创建遮罩层
    const overlay = document.createElement("div");
    overlay.id = "activationOverlay";
    overlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.7);
            z-index: 999999;
            display: flex;
            align-items: center;
            justify-content: center;
        `;

    // 创建对话框
    const dialog = document.createElement("div");
    dialog.style.cssText = `
            background: white;
            padding: 30px;
            border-radius: 8px;
            text-align: center;
            box-shadow: 0 4px 20px rgba(0,0,0,0.3);
        `;

    // 设置对话框内容
    dialog.innerHTML = `
            <h3 style="margin: 0 0 20px 0; color: #333;">请输入激活码</h3>
            <input type="text" id="activationInput" maxlength="6" placeholder="6位激活码" 
                style="padding: 10px; font-size: 18px; width: 150px; text-align: center; letter-spacing: 5px; border: 2px solid #ddd; border-radius: 4px;">
            <br><br>
            <button id="activationBtn" style="padding: 10px 30px; font-size: 16px; background: #4CAF50; color: white; border: none; border-radius: 4px; cursor: pointer;">激活</button>
            <p id="activationMsg" style="margin: 15px 0 0 0; color: #f44336; font-size: 14px;"></p>
            <p id="activationTimer" style="margin: 10px 0 0 0; color: #666; font-size: 12px;"></p>
        `;

    overlay.appendChild(dialog);
    document.body.appendChild(overlay);

    // 获取DOM元素
    const input = document.getElementById("activationInput");
    const btn = document.getElementById("activationBtn");
    const msg = document.getElementById("activationMsg");
    const timer = document.getElementById("activationTimer");

    // 倒计时功能
    let remainingSeconds = WAIT_MINUTES * 60;
    const countdown = setInterval(() => {
      remainingSeconds--;
      const mins = Math.floor(remainingSeconds / 60);
      const secs = remainingSeconds % 60;
      timer.textContent = `剩余等待时间: ${mins}分${secs.toString().padStart(2, "0")}秒`;
      if (remainingSeconds <= 0) {
        clearInterval(countdown);
        msg.textContent = "等待时间已过，请刷新页面重试";
        msg.style.color = "#f44336";
        btn.disabled = true;
        btn.style.background = "#ccc";
      }
    }, 1000);

    /**
     * 处理激活按钮点击事件
     */
    function handleActivate() {
      const code = input.value.trim();
      if (code.length !== 6) {
        msg.textContent = "请输入6位激活码";
        return;
      }
      if (verifyCode(code)) {
        setStoredCode(code);
        clearInterval(countdown);
        msg.textContent = "激活成功！";
        msg.style.color = "#4CAF50";
        setTimeout(() => {
          overlay.remove();
          callback();
        }, 500);
      } else {
        msg.textContent = "激活码错误，请重试";
        input.value = "";
        input.focus();
      }
    }

    // 绑定事件
    btn.addEventListener("click", handleActivate);
    input.addEventListener("keypress", (e) => {
      if (e.key === "Enter") handleActivate();
    });
    input.focus();
  }

  /**
   * 检查激活状态
   * @param {Function} callback - 激活成功后的回调函数
   */
  function checkActivation(callback) {
    if (isValidActivation()) {
      callback();
    } else {
      showActivationDialog(callback);
    }
  }

  /**
   * 创建提取表格按钮
   */
  function createExtractButton() {
    // 创建按钮元素
    const button = document.createElement("button");
    button.textContent = `提取可转债v${VERSION}`;
    // 设置按钮样式
    button.style.cssText = `
            position: fixed;
            top: 10px;
            right: 10px;
            z-index: 9999;
            padding: 8px 16px;
            background: #4CAF50;
            color: white;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            font-size: 14px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.2);
        `;

    // 绑定点击事件：检查激活状态后提取表格
    button.addEventListener("click", () => {
      checkActivation(extractTables);
    });
    // 将按钮添加到页面
    document.body.appendChild(button);
  }

  /**
   * 提取页面所有表格数据（排除专属表头表）+ 拼接表头 + 展示
   */
  async function extractTables() {
    // ===================== 0. 检查当前网址 =====================
    const expectedUrl = "https://www.jisilu.cn/web/data/cb/list";
    if (window.location.href !== expectedUrl) {
      alert("请返回首页，依次点击：实时数据 → 可转债");
      return;
    }

    // ===================== 1. 请求redeem接口获取强赎天计数数据 =====================
    let redeemDataMap = {};
    try {
      const redeemResponse = await new Promise((resolve, reject) => {
        GM_xmlhttpRequest({
          method: "GET",
          url: "https://www.jisilu.cn/webapi/cb/redeem/",
          headers: {
            Referer: "https://www.jisilu.cn/",
            "User-Agent": navigator.userAgent,
          },
          onload: (res) => {
            try {
              const data = JSON.parse(res.responseText);
              resolve(data);
              console.log("强赎响应：", data);
            } catch (e) {
              reject(e);
            }
          },
          onerror: reject,
        });
      });

      if (redeemResponse && redeemResponse.data) {
        redeemResponse.data.forEach((item) => {
          redeemDataMap[item.bond_id] = item.redeem_status || "";
        });
      }
    } catch (e) {
      console.error("解析强赎天计数失败:", e);
    }

    // ===================== 1. 提取专属表头（常量声明，避免重复赋值） =====================
    const headerTable = document.querySelector("table.jsl-table-header");
    let headers = headerTable
      ? Array.from(headerTable.querySelectorAll("th"), (th) =>
          th.textContent.trim(),
        )
      : [];

    // ===================== 2. 确定转债名称列的索引 =====================
    const zhuanZhaiIndex = headers.findIndex((h) => h.includes("转债名称"));
    const daiMaIndex = headers.findIndex((h) => h.includes("代码"));

    // ===================== 3. 强赎状态映射 =====================
    const getQiangShuStatus = (td) => {
      const span = td.querySelector("span.jisilu-icons");
      if (!span) return "";

      const classList = span.className;
      if (classList.includes("color-buy")) {
        return "已公告强赎/临近到期";
      } else if (classList.includes("color-darkgray")) {
        return "公告不强赎";
      } else if (classList.includes("color-primary")) {
        return "已满足强赎条件";
      } else if (classList.includes("color-gold")) {
        return "公告要强赎";
      }
      return "";
    };

    // ===================== 3.5 解析title属性提取详细信息 =====================
    const parseTitleInfo = (td) => {
      const span = td.querySelector("span.jisilu-icons");
      if (!span || !span.title) {
        return {
          zuiHouJiaoYiRi: "",
          zuiHouZhuanGuRi: "",
          zhaiQuanDaoQiRi: "",
          daoQiShuHuiJia: "",
          shuHuiJia: "",
        };
      }

      const title = span.title;
      const result = {
        zuiHouJiaoYiRi: "",
        zuiHouZhuanGuRi: "",
        zhaiQuanDaoQiRi: "",
        daoQiShuHuiJia: "",
        shuHuiJia: "",
      };

      // 统一日期格式为 YYYY-MM-DD
      const formatDate = (dateStr) => {
        if (!dateStr) return "";
        // 匹配 "2026年3月31日" 格式
        const chineseMatch = dateStr.match(/(\d{4})年(\d{1,2})月(\d{1,2})日/);
        if (chineseMatch) {
          const [, year, month, day] = chineseMatch;
          return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
        }
        // 已经是 "2026-04-07" 格式，直接返回
        const isoMatch = dateStr.match(/(\d{4})-(\d{2})-(\d{2})/);
        if (isoMatch) {
          return isoMatch[0];
        }
        return dateStr.trim();
      };

      // 提取数值部分
      const extractNumber = (str) => {
        if (!str) return "";
        const match = str.match(/(\d+\.?\d*)/);
        return match ? match[1] : "";
      };

      const jiaoYiRiMatch = title.match(/最后交易日[：:]\s*([^\n]+)/);
      if (jiaoYiRiMatch) result.zuiHouJiaoYiRi = formatDate(jiaoYiRiMatch[1]);

      const zhuanGuRiMatch = title.match(/最后转股日[：:]\s*([^\n]+)/);
      if (zhuanGuRiMatch)
        result.zuiHouZhuanGuRi = formatDate(zhuanGuRiMatch[1]);

      const daoQiRiMatch = title.match(/债券到期日[：:]\s*([^\n]+)/);
      if (daoQiRiMatch) result.zhaiQuanDaoQiRi = formatDate(daoQiRiMatch[1]);

      const shuHuiJiaMatch = title.match(/到期赎回价[：:]\s*([^\n]+)/);
      if (shuHuiJiaMatch)
        result.daoQiShuHuiJia = extractNumber(shuHuiJiaMatch[1]);

      // 匹配"赎回价"但排除"到期赎回价"
      const shuHuiJia2Match = title.match(/(?<!到期)赎回价[：:]\s*([^\n]+)/);
      if (shuHuiJia2Match) result.shuHuiJia = extractNumber(shuHuiJia2Match[1]);

      return result;
    };

    // ===================== 4. 工具函数：提取单张表格的有效数据 =====================
    const getValidTableData = (table, zhuanZhaiIdx, daiMaIdx, redeemMap) => {
      return Array.from(table.querySelectorAll("tr"), (tr) => {
        const tds = tr.querySelectorAll("td");
        const rowData = Array.from(tds, (td) => td.textContent.trim());

        // 从转债名称列提取强赎状态和详细信息
        let qiangShuStatus = "";
        let titleInfo = {
          zuiHouJiaoYiRi: "",
          zuiHouZhuanGuRi: "",
          zhaiQuanDaoQiRi: "",
          daoQiShuHuiJia: "",
          shuHuiJia: "",
        };
        let insertIndex = -1;

        if (zhuanZhaiIdx !== -1 && tds[zhuanZhaiIdx]) {
          qiangShuStatus = getQiangShuStatus(tds[zhuanZhaiIdx]);
          titleInfo = parseTitleInfo(tds[zhuanZhaiIdx]);
          insertIndex = zhuanZhaiIdx + 1;
        } else {
          for (let i = 0; i < tds.length; i++) {
            const status = getQiangShuStatus(tds[i]);
            if (status) {
              qiangShuStatus = status;
              titleInfo = parseTitleInfo(tds[i]);
              insertIndex = i + 1;
              break;
            }
          }
        }

        // 将强赎状态和详细信息插入到转债名称后面（只有在找到插入位置时才插入）
        if (insertIndex > 0 && rowData.length >= insertIndex - 1) {
          rowData.splice(
            insertIndex,
            0,
            qiangShuStatus,
            titleInfo.zuiHouJiaoYiRi,
            titleInfo.zuiHouZhuanGuRi,
            titleInfo.zhaiQuanDaoQiRi,
            titleInfo.daoQiShuHuiJia,
            titleInfo.shuHuiJia,
          );
        }

        // 添加redeem_status列（在强赎状态后面）
        // 注意：此时rowData已经插入了强赎状态等6列
        // 如果zhuanZhaiIdx !== -1，强赎状态在zhuanZhaiIdx + 1位置
        if (zhuanZhaiIdx !== -1 && redeemMap) {
          const bondCode = rowData[daiMaIdx];
          const redeemStatus = redeemMap[bondCode] || "";
          // 在强赎状态列后面插入（强赎状态在zhuanZhaiIdx + 1位置）
          const insertPos = zhuanZhaiIdx + 2;
          if (rowData.length >= insertPos - 1) {
            rowData.splice(insertPos, 0, redeemStatus);
          }
        }

        return rowData;
      }).filter((row) => row.length > 0);
    };

    // ===================== 5. 收集所有数据表格（排除表头表，避免重复） =====================
    const allData = Array.from(
      document.querySelectorAll("table:not(.jsl-table-header)"),
      (table) =>
        getValidTableData(table, zhuanZhaiIndex, daiMaIndex, redeemDataMap),
    ).flat();

    // ===================== 6. 空数据校验 =====================
    if (allData.length === 0) {
      alert("没有找到有效表格数据");
      return;
    }

    // ===================== 7. 在表头"转债名称"后插入新列 =====================
    if (zhuanZhaiIndex !== -1) {
      headers.splice(
        zhuanZhaiIndex + 1,
        0,
        "强赎状态",
        "强赎天计数",
        "最后交易日",
        "最后转股日",
        "债券到期日",
        "到期赎回价（元/张）",
        "赎回价（元/张）",
      );
    }

    // ===================== 8. 拼接表头 + 输出 =====================
    if (headers.length) {
      allData.unshift(headers);
    }

    console.log("提取的表格数据：", allData);

    // ===================== 9. 容错调用展示函数 =====================
    if (typeof openTableViewer === "function") {
      openTableViewer(allData);
    } else {
      console.warn("未找到 openTableViewer 展示函数，数据已打印到控制台");
    }
  }
  /**
   * 在新页面显示表格
   * @param {Array} data - 表格数据，包含表头和数据行
   */
  function openTableViewer(data) {
    const newWindow = window.open("", "_blank", "width=1000,height=800");

    if (!newWindow) {
      alert("无法打开新窗口，请检查浏览器设置");
      return;
    }

    /**
     * 清理单元格内容，提取数字部分
     * @param {string} text - 单元格文本
     * @returns {string} 清理后的文本
     */
    function cleanCell(text) {
      const trimmed = text.trim();
      const match = trimmed.match(/^(\d+\.?\d*)/);
      if (match) {
        return match[1];
      }
      return trimmed;
    }

    // 找到"转股价"列的索引并处理数据
    const headerRow = data[0] || [];
    const zhuanGuJiaIndex = headerRow.findIndex((h) => h.includes("转股价"));

    // 预处理数据：对转股价列执行cleanCell
    const processedData = data.map((row, index) => {
      if (index === 0) return row; // 表头不处理
      return row.map((cell, colIndex) => {
        if (colIndex === zhuanGuJiaIndex) {
          return cleanCell(cell);
        }
        return cell;
      });
    });

    const html = `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <title>可转债数据</title>
            <style>
                body {
                    font-family: Arial, sans-serif;
                    margin: 20px;
                    background: #f5f5f5;
                }
                .container {
                    width: 100%;
                    margin: 0;
                    padding: 10px;
                }
                h1 {
                    color: #333;
                    text-align: center;
                    font-size: 18px;
                    margin: 10px 0;
                }
                .filter-panel {
                    background: white;
                    border-radius: 8px;
                    box-shadow: 0 2px 4px rgba(0,0,0,0.1);
                    padding: 15px;
                    margin-bottom: 15px;
                }
                .filter-row {
                    display: flex;
                    flex-wrap: wrap;
                    gap: 10px;
                    margin-bottom: 10px;
                    align-items: center;
                }
                .filter-item {
                    display: flex;
                    align-items: center;
                    gap: 5px;
                }
                .filter-item label {
                    font-size: 12px;
                    color: #666;
                    white-space: nowrap;
                }
                .filter-item input, .filter-item select {
                    padding: 4px 8px;
                    border: 1px solid #ddd;
                    border-radius: 4px;
                    font-size: 12px;
                    width: 80px;
                }
                .filter-item select {
                    width: auto;
                    min-width: 100px;
                }
                .btn-row {
                    display: flex;
                    gap: 10px;
                    margin-top: 10px;
                }
                .btn {
                    padding: 8px 16px;
                    border: none;
                    border-radius: 4px;
                    cursor: pointer;
                    font-size: 14px;
                }
                .btn-primary {
                    background: #4CAF50;
                    color: white;
                }
                .btn-primary:hover {
                    background: #45a049;
                }
                .btn-secondary {
                    background: #2196F3;
                    color: white;
                }
                .btn-secondary:hover {
                    background: #1976D2;
                }
                .btn-reset {
                    background: #f44336;
                    color: white;
                }
                .btn-reset:hover {
                    background: #da190b;
                }
                .stats {
                    font-size: 13px;
                    color: #333;
                    margin-left: auto;
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    color: white;
                    padding: 6px 14px;
                    border-radius: 20px;
                    font-weight: 500;
                    box-shadow: 0 2px 6px rgba(102, 126, 234, 0.3);
                }
                .stats .count {
                    font-weight: 700;
                    font-size: 15px;
                }
                .btn-small {
                    padding: 4px 10px;
                    font-size: 12px;
                    background: #4CAF50;
                    color: white;
                    border: none;
                    border-radius: 4px;
                    cursor: pointer;
                }
                .btn-small:hover {
                    background: #45a049;
                }
                .btn-small.btn-reset {
                    background: #f44336;
                }
                .btn-small.btn-reset:hover {
                    background: #da190b;
                }
                .preset-row {
                    align-items: center;
                    gap: 8px;
                }
                .preset-row input[type="text"] {
                    padding: 4px 6px;
                    border: 1px solid #ddd;
                    border-radius: 4px;
                    font-size: 12px;
                }
                .toast-container {
                    position: fixed;
                    top: 20px;
                    right: 20px;
                    z-index: 10000;
                }
                .toast {
                    padding: 10px 16px;
                    margin-bottom: 8px;
                    border-radius: 4px;
                    color: white;
                    font-size: 13px;
                    animation: slideIn 0.3s ease;
                    box-shadow: 0 2px 8px rgba(0,0,0,0.2);
                }
                .toast.success { background: #4CAF50; }
                .toast.error { background: #f44336; }
                .toast.info { background: #2196F3; }
                @keyframes slideIn {
                    from { transform: translateX(100%); opacity: 0; }
                    to { transform: translateX(0); opacity: 1; }
                }
                @keyframes slideOut {
                    from { transform: translateX(0); opacity: 1; }
                    to { transform: translateX(100%); opacity: 0; }
                }
                .sort-label {
                    font-size: 12px;
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    gap: 4px;
                }
                .sort-label input {
                    cursor: pointer;
                }
                .rating-dropdown {
                    position: relative;
                    min-width: 100px;
                }
                .rating-selected {
                    padding: 4px 8px;
                    border: 1px solid #ddd;
                    border-radius: 4px;
                    font-size: 12px;
                    cursor: pointer;
                    background: white;
                    min-height: 18px;
                }
                .rating-options {
                    display: none;
                    position: absolute;
                    top: 100%;
                    left: 0;
                    background: white;
                    border: 1px solid #ddd;
                    border-radius: 4px;
                    padding: 5px;
                    z-index: 1000;
                    box-shadow: 0 2px 4px rgba(0,0,0,0.1);
                }
                .rating-options.show {
                    display: block;
                }
                .rating-options label {
                    display: block;
                    font-size: 12px;
                    padding: 2px 0;
                    cursor: pointer;
                }
                .rating-options label:hover {
                    background: #f5f5f5;
                }
                .table-container {
                    margin: 10px 0;
                    background: white;
                    border-radius: 8px;
                    box-shadow: 0 2px 4px rgba(0,0,0,0.1);
                    padding: 10px;
                    overflow-x: auto;
                    max-height: calc(100vh - 250px);
                    overflow-y: auto;
                }
                table {
                    border-collapse: collapse;
                    margin-top: 5px;
                    font-size: 12px;
                }
                th, td {
                    border: 1px solid #ddd;
                    padding: 4px 6px;
                    text-align: left;
                    white-space: nowrap;
                }
                th {
                    background-color: #4CAF50;
                    color: white;
                    font-weight: bold;
                    position: sticky;
                    top: 0;
                    z-index: 10;
                }
                tr:nth-child(even) {
                    background-color: #f9f9f9;
                }
                tr:hover {
                    background-color: #f1f1f1;
                }
            </style>
        </head>
        <body>
            <div class="toast-container" id="toastContainer"></div>
            <div class="container">
                <h1>可转债数据</h1>
                <div class="filter-panel">
                    <div class="filter-row">
                        <div class="filter-item">
                            <label>现价:</label>
                            <input type="number" id="filterPriceMin" placeholder="≥">
                            <span>~</span>
                            <input type="number" id="filterPriceMax" placeholder="≤">
                        </div>
                        <div class="filter-item">
                            <label>转股溢价率(%):</label>
                            <input type="number" id="filterPremiumMin" placeholder="≥">
                            <span>~</span>
                            <input type="number" id="filterPremiumMax" placeholder="≤">
                        </div>
                        <div class="filter-item">
                            <label>剩余年限(年):</label>
                            <input type="number" id="filterYearsMin" placeholder="≥">
                            <span>~</span>
                            <input type="number" id="filterYearsMax" placeholder="≤">
                        </div>
                        <div class="filter-item">
                            <label>剩余规模(亿):</label>
                            <input type="number" id="filterScaleMin" placeholder="≥">
                            <span>~</span>
                            <input type="number" id="filterScaleMax" placeholder="≤">
                        </div>
                    </div>
                    <div class="filter-row">
                        <div class="filter-item">
                            <label>强赎状态:</label>
                            <div id="qiangShuDropdown" class="rating-dropdown">
                                <div class="rating-selected" onclick="toggleQiangShuDropdown()">选择状态</div>
                                <div class="rating-options" id="qiangShuOptions"></div>
                            </div>
                        </div>
                        <div class="filter-item">
                            <label>最后交易日(天):</label>
                            <input type="number" id="filterDueDaysMin" placeholder="≥">
                            <span>~</span>
                            <input type="number" id="filterDueDaysMax" placeholder="≤">
                        </div>
                        <div class="filter-item">
                            <label>评级:</label>
                            <div id="ratingDropdown" class="rating-dropdown">
                                <div class="rating-selected" onclick="toggleRatingDropdown()">选择评级</div>
                                <div class="rating-options" id="ratingOptions"></div>
                            </div>
                        </div>
                        <div class="filter-item">
                            <label>正股名称:</label>
                            <input type="text" id="filterStockName" placeholder="包含文本" style="width: 70px;">
                            <input type="text" id="filterStockNameExclude" placeholder="不包含" style="width: 70px;">
                        </div>
                        <div class="filter-item">
                            <label>正股价(元):</label>
                            <input type="number" id="filterStockPriceMin" placeholder="≥">
                            <span>~</span>
                            <input type="number" id="filterStockPriceMax" placeholder="≤">
                        </div>
                        <div class="filter-item">
                            <label>代码筛选:</label>
                            <button class="btn btn-small" onclick="showCodeFilterModal()">批量筛选</button>
                        </div>
                    </div>
                    <div class="filter-row preset-row">
                        <div class="filter-item">
                            <label>预设条件:</label>
                            <select id="presetSelect" onchange="loadPreset()">
                                <option value="">选择预设</option>
                            </select>
                        </div>
                        <input type="text" id="presetName" placeholder="预设名称" style="width: 100px;">
                        <button class="btn btn-small" onclick="savePreset()">保存</button>
                        <button class="btn btn-small btn-reset" onclick="deletePreset()">删除</button>
                        <div class="filter-item" style="margin-left: 20px;">
                            <label>评分:</label>
                            <select id="scoreSelect" onchange="toggleScore()">
                                <option value="">无</option>
                                <option value="scoreA">评分A: 现价+溢价率×100+规模×10</option>
                            </select>
                        </div>
                        <label class="sort-label" id="sortScoreLabel" style="display:none;">
                            <input type="checkbox" id="sortScoreAsc" onchange="applyScoreSort()"> 升序排列
                        </label>
                    </div>
                    <div class="btn-row">
                        <button class="btn btn-primary" onclick="applyFilter()">筛选</button>
                        <button class="btn btn-reset" onclick="resetFilter()">重置</button>
                        <button class="btn btn-secondary" onclick="exportToCSV()">导出CSV</button>
                        <button class="btn btn-secondary" onclick="compareScoreHistory()">对比评分A</button>
                        <span class="stats" id="stats"></span>
                    </div>
                </div>
                <div class="table-container">
                    <table id="dataTable">
                        <thead id="tableHead"></thead>
                        <tbody id="tableBody"></tbody>
                    </table>
                </div>
            </div>
        </body>
        </html>
        `;

    newWindow.document.write(html);
    newWindow.document.close();

    // 注入数据和函数到新窗口
    const win = newWindow;
    win.tableData = processedData;
    win.filteredData = processedData;
    win.headerRow = headerRow;

    // 列索引映射
    win.colIndex = {
      daiMa: headerRow.findIndex((h) => h.includes("代码")),
      xianJia: headerRow.findIndex((h) => h.includes("现价")),
      zhuanGuYiJiaLv: headerRow.findIndex((h) => h.includes("转股溢价率")), //单元格内容自带%
      shengYuNianXian: headerRow.findIndex((h) => h.includes("剩余年限")),
      shengYuGuiMo: headerRow.findIndex((h) => h.includes("剩余规模")),
      qiangShuZhuangTai: headerRow.findIndex((h) => h.includes("强赎状态")),
      zhaiQuanDaoQiRi: headerRow.findIndex((h) => h.includes("债券到期日")),
      zuiHouJiaoYiRi: headerRow.findIndex((h) => h.includes("最后交易日")),
      pingJia: headerRow.findIndex((h) => h.includes("评级")),
      zhengGuMingCheng: headerRow.findIndex((h) => h.includes("正股名称")),
      zhengGuJia: headerRow.findIndex((h) => h.includes("正股价")),
      daoQiShiJian: headerRow.findIndex((h) => h.includes("到期时间")),
      zhuanZhaiMingCheng: headerRow.findIndex((h) => h.includes("转债名称")),
    };

    // 从数据中提取去重选项
    win.extractUniqueValues = function (colIndex) {
      const values = new Set();
      processedData.slice(1).forEach((row) => {
        const val = row[colIndex];
        if (val && val.trim()) {
          values.add(val.trim());
        }
      });
      return Array.from(values).sort();
    };

    // 动态生成下拉选项
    win.generateDropdownOptions = function () {
      // 生成评级选项
      const ratings = win.extractUniqueValues(win.colIndex.pingJia);
      const ratingOptions = win.document.getElementById("ratingOptions");
      ratingOptions.innerHTML = ratings
        .map(
          (r) =>
            `<label><input type="checkbox" value="${r}" onchange="updateRatingDisplay()"> ${r}</label>`,
        )
        .join("");

      // 生成强赎状态选项（包含"-"代表空值）
      const qiangShuStatuses = win.extractUniqueValues(
        win.colIndex.qiangShuZhuangTai,
      );
      const qiangShuOptions = win.document.getElementById("qiangShuOptions");
      let optionsHtml =
        '<label><input type="checkbox" value="-" onchange="updateQiangShuDisplay()"> -（空）</label>';
      optionsHtml += qiangShuStatuses
        .map(
          (s) =>
            `<label><input type="checkbox" value="${s}" onchange="updateQiangShuDisplay()"> ${s}</label>`,
        )
        .join("");
      qiangShuOptions.innerHTML = optionsHtml;
    };

    // Toast 通知
    win.showToast = function (message, type = "info") {
      const container = win.document.getElementById("toastContainer");
      const toast = win.document.createElement("div");
      toast.className = "toast " + type;
      toast.textContent = message;
      container.appendChild(toast);
      setTimeout(() => {
        toast.style.animation = "slideOut 0.3s ease forwards";
        setTimeout(() => toast.remove(), 300);
      }, 2000);
    };

    // 解析剩余年限（支持"0.74年"、"22天"、"-"等格式）
    win.parseYears = function (str) {
      if (!str || str === "-") return -1;
      const yearMatch = String(str).match(/(\d+\.?\d*)\s*年/);
      if (yearMatch) return parseFloat(yearMatch[1]);
      const dayMatch = String(str).match(/(\d+)\s*天/);
      if (dayMatch) return parseInt(dayMatch[1]) / 365;
      return -1;
    };

    // 解析最后交易日并计算距离今天的天数
    win.parseDaysToDue = function (str) {
      if (!str) return Infinity;
      const dateStr = String(str).trim();
      const match = dateStr.match(/(\d{4})-(\d{2})-(\d{2})/);
      if (!match) return Infinity;
      const date = new Date(
        parseInt(match[1]),
        parseInt(match[2]) - 1,
        parseInt(match[3]),
      );
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const diff = Math.ceil((date - today) / (1000 * 60 * 60 * 24));
      return diff;
    };

    // 渲染表格
    win.renderTable = function (data) {
      const thead = win.document.getElementById("tableHead");
      const tbody = win.document.getElementById("tableBody");
      const stats = win.document.getElementById("stats");

      if (data.length === 0) {
        thead.innerHTML = "";
        tbody.innerHTML =
          '<tr><td style="text-align:center;padding:20px;">没有符合条件的数据</td></tr>';
        stats.innerHTML = '共 <span class="count">0</span> 行数据';
        return;
      }

      let displayData = data;
      const score = win.document.getElementById("scoreSelect").value;

      if (score === "scoreA") {
        displayData = win.addScoreAColumn(data);
      }

      thead.innerHTML = `<tr>${displayData[0].map((cell) => `<th>${cell}</th>`).join("")}</tr>`;
      tbody.innerHTML = displayData
        .slice(1)
        .map(
          (row) => `<tr>${row.map((cell) => `<td>${cell}</td>`).join("")}</tr>`,
        )
        .join("");
      stats.innerHTML = `共 <span class="count">${displayData.length - 1}</span> 行数据`;
    };

    // 计算评分A值
    win.calcScoreA = function (row) {
      const xianJia =
        win.colIndex.xianJia >= 0
          ? parseFloat(row[win.colIndex.xianJia]) || 0
          : 0;
      const yiJiaLv =
        win.colIndex.zhuanGuYiJiaLv >= 0
          ? parseFloat(row[win.colIndex.zhuanGuYiJiaLv]) || 0
          : 0;
      const guiMo =
        win.colIndex.shengYuGuiMo >= 0
          ? parseFloat(row[win.colIndex.shengYuGuiMo]) || 0
          : 0;
      return (xianJia + yiJiaLv + guiMo * 10).toFixed(2);
    };

    // 添加评分A列
    win.addScoreAColumn = function (data) {
      const result = data.map((row, index) => {
        if (index === 0) {
          return [...row, "评分A"];
        }
        return [...row, win.calcScoreA(row)];
      });
      return result;
    };

    // 切换评分
    win.toggleScore = function () {
      const score = win.document.getElementById("scoreSelect").value;
      const sortLabel = win.document.getElementById("sortScoreLabel");

      if (score) {
        sortLabel.style.display = "flex";
        // 选择评分时自动按升序排序
        const data = win.filteredData;
        const header = data[0];
        const rows = data.slice(1);
        rows.sort((a, b) => {
          const valA = parseFloat(win.calcScoreA(a)) || 0;
          const valB = parseFloat(win.calcScoreA(b)) || 0;
          return valA - valB;
        });
        win.filteredData = [header, ...rows];
      } else {
        sortLabel.style.display = "none";
        win.document.getElementById("sortScoreAsc").checked = false;
      }

      win.renderTable(win.filteredData);
    };

    // 应用评分排序
    win.applyScoreSort = function () {
      const asc = win.document.getElementById("sortScoreAsc").checked;
      const data = win.filteredData;

      // 分离表头和数据行
      const header = data[0];
      const rows = data.slice(1);

      if (asc) {
        rows.sort((a, b) => {
          const valA = parseFloat(win.calcScoreA(a)) || 0;
          const valB = parseFloat(win.calcScoreA(b)) || 0;
          return valA - valB;
        });
      } else {
        rows.sort((a, b) => {
          const valA = parseFloat(win.calcScoreA(a)) || 0;
          const valB = parseFloat(win.calcScoreA(b)) || 0;
          return valB - valA;
        });
      }

      // 重新组合：表头 + 排序后的数据行
      win.filteredData = [header, ...rows];
      win.renderTable(win.filteredData);
    };

    // 应用筛选
    win.applyFilter = function () {
      const priceMinVal = win.document.getElementById("filterPriceMin").value;
      const priceMaxVal = win.document.getElementById("filterPriceMax").value;
      const priceMin = priceMinVal !== "" ? parseFloat(priceMinVal) : -Infinity;
      const priceMax = priceMaxVal !== "" ? parseFloat(priceMaxVal) : Infinity;
      const premiumMinVal =
        win.document.getElementById("filterPremiumMin").value;
      const premiumMaxVal =
        win.document.getElementById("filterPremiumMax").value;
      const premiumMin =
        premiumMinVal !== "" ? parseFloat(premiumMinVal) : -Infinity;
      const premiumMax =
        premiumMaxVal !== "" ? parseFloat(premiumMaxVal) : Infinity;
      const yearsMinVal = win.document.getElementById("filterYearsMin").value;
      const yearsMaxVal = win.document.getElementById("filterYearsMax").value;
      const yearsMin = yearsMinVal !== "" ? parseFloat(yearsMinVal) : -Infinity;
      const yearsMax = yearsMaxVal !== "" ? parseFloat(yearsMaxVal) : Infinity;
      const scaleMinVal = win.document.getElementById("filterScaleMin").value;
      const scaleMaxVal = win.document.getElementById("filterScaleMax").value;
      const scaleMin = scaleMinVal !== "" ? parseFloat(scaleMinVal) : -Infinity;
      const scaleMax = scaleMaxVal !== "" ? parseFloat(scaleMaxVal) : Infinity;
      const dueDaysMinVal =
        win.document.getElementById("filterDueDaysMin").value;
      const dueDaysMaxVal =
        win.document.getElementById("filterDueDaysMax").value;
      const dueDaysMin =
        dueDaysMinVal !== "" ? parseFloat(dueDaysMinVal) : -Infinity;
      const dueDaysMax =
        dueDaysMaxVal !== "" ? parseFloat(dueDaysMaxVal) : Infinity;
      const stockName = win.document
        .getElementById("filterStockName")
        .value.trim();
      const stockNameExclude = win.document
        .getElementById("filterStockNameExclude")
        .value.trim();
      const stockPriceMinVal = win.document.getElementById(
        "filterStockPriceMin",
      ).value;
      const stockPriceMaxVal = win.document.getElementById(
        "filterStockPriceMax",
      ).value;
      const stockPriceMin =
        stockPriceMinVal !== "" ? parseFloat(stockPriceMinVal) : -Infinity;
      const stockPriceMax =
        stockPriceMaxVal !== "" ? parseFloat(stockPriceMaxVal) : Infinity;

      // 获取选中的评级
      const selectedRatings = [];
      win.document
        .querySelectorAll("#ratingOptions input:checked")
        .forEach((cb) => {
          selectedRatings.push(cb.value);
        });

      // 获取选中的强赎状态
      const selectedQiangShu = [];
      win.document
        .querySelectorAll("#qiangShuOptions input:checked")
        .forEach((cb) => {
          selectedQiangShu.push(cb.value);
        });

      const filtered = win.tableData.filter((row, index) => {
        if (index === 0) return true;

        const xianJia =
          win.colIndex.xianJia >= 0
            ? parseFloat(row[win.colIndex.xianJia]) || 0
            : 0;
        const yiJiaLv =
          win.colIndex.zhuanGuYiJiaLv >= 0
            ? parseFloat(row[win.colIndex.zhuanGuYiJiaLv]) || 0
            : 0;
        const nianXian =
          win.colIndex.shengYuNianXian >= 0
            ? win.parseYears(row[win.colIndex.shengYuNianXian])
            : -1;
        const guiMo =
          win.colIndex.shengYuGuiMo >= 0
            ? parseFloat(row[win.colIndex.shengYuGuiMo]) || 0
            : 0;
        const qiangShuZhuangTai =
          win.colIndex.qiangShuZhuangTai >= 0
            ? row[win.colIndex.qiangShuZhuangTai] || ""
            : "";
        const zuiHouJiaoYiRi =
          win.colIndex.zuiHouJiaoYiRi >= 0
            ? win.parseDaysToDue(row[win.colIndex.zuiHouJiaoYiRi])
            : -1;
        const pingJia =
          win.colIndex.pingJia >= 0 ? row[win.colIndex.pingJia] || "" : "";
        const zhengGu =
          win.colIndex.zhengGuMingCheng >= 0
            ? row[win.colIndex.zhengGuMingCheng] || ""
            : "";
        const zhengGuJia =
          win.colIndex.zhengGuJia >= 0
            ? parseFloat(row[win.colIndex.zhengGuJia]) || 0
            : 0;

        if (xianJia < priceMin || xianJia > priceMax) return false;
        if (yiJiaLv < premiumMin || yiJiaLv > premiumMax) return false;
        // 剩余年限筛选：如果设置了筛选条件，先过滤掉"-"的格子
        const hasYearsFilter = yearsMinVal !== "" || yearsMaxVal !== "";
        if (hasYearsFilter && nianXian < 0) return false;
        if (nianXian >= 0 && (nianXian < yearsMin || nianXian > yearsMax))
          return false;
        if (guiMo < scaleMin || guiMo > scaleMax) return false;
        // 强赎状态筛选：支持"-"匹配空值
        if (selectedQiangShu.length > 0) {
          const actualStatus =
            qiangShuZhuangTai.trim() === "" ? "-" : qiangShuZhuangTai;
          if (!selectedQiangShu.includes(actualStatus)) return false;
        }
        if (zuiHouJiaoYiRi < dueDaysMin || zuiHouJiaoYiRi > dueDaysMax)
          return false;
        if (selectedRatings.length > 0 && !selectedRatings.includes(pingJia))
          return false;
        if (stockName && !zhengGu.includes(stockName)) return false;
        if (stockNameExclude && zhengGu.includes(stockNameExclude))
          return false;
        if (zhengGuJia < stockPriceMin || zhengGuJia > stockPriceMax)
          return false;

        return true;
      });

      win.filteredData = filtered;

      // 如果选择了评分A且勾选了升序，则排序
      const score = win.document.getElementById("scoreSelect").value;
      const asc = win.document.getElementById("sortScoreAsc").checked;
      if (score === "scoreA" && asc) {
        const header = filtered[0];
        const rows = filtered.slice(1);
        rows.sort((a, b) => {
          const valA = parseFloat(win.calcScoreA(a)) || 0;
          const valB = parseFloat(win.calcScoreA(b)) || 0;
          return valA - valB;
        });
        win.filteredData = [header, ...rows];
      }

      win.renderTable(win.filteredData);
    };

    // 评级下拉框切换
    win.toggleRatingDropdown = function () {
      const options = win.document.getElementById("ratingOptions");
      options.classList.toggle("show");
    };

    // 强赎状态下拉框切换
    win.toggleQiangShuDropdown = function () {
      const options = win.document.getElementById("qiangShuOptions");
      options.classList.toggle("show");
    };

    // 更新评级显示
    win.updateRatingDisplay = function () {
      const selected = [];
      win.document
        .querySelectorAll("#ratingOptions input:checked")
        .forEach((cb) => {
          selected.push(cb.value);
        });
      const display = win.document.querySelector(
        "#ratingDropdown .rating-selected",
      );
      display.textContent =
        selected.length > 0 ? selected.join(", ") : "选择评级";
    };

    // 更新强赎状态显示
    win.updateQiangShuDisplay = function () {
      const selected = [];
      win.document
        .querySelectorAll("#qiangShuOptions input:checked")
        .forEach((cb) => {
          selected.push(cb.value);
        });
      const display = win.document.querySelector(
        "#qiangShuDropdown .rating-selected",
      );
      display.textContent =
        selected.length > 0 ? selected.join(", ") : "选择状态";
    };

    // 点击其他地方关闭下拉框
    win.document.addEventListener("click", function (e) {
      if (!e.target.closest(".rating-dropdown")) {
        win.document.querySelectorAll(".rating-options").forEach((opt) => {
          opt.classList.remove("show");
        });
      }
    });

    // 重置筛选
    win.resetFilter = function () {
      win.document.getElementById("filterPriceMin").value = "";
      win.document.getElementById("filterPriceMax").value = "";
      win.document.getElementById("filterPremiumMin").value = "";
      win.document.getElementById("filterPremiumMax").value = "";
      win.document.getElementById("filterYearsMin").value = "";
      win.document.getElementById("filterYearsMax").value = "";
      win.document.getElementById("filterScaleMin").value = "";
      win.document.getElementById("filterScaleMax").value = "";
      win.document.getElementById("filterDueDaysMin").value = "";
      win.document.getElementById("filterDueDaysMax").value = "";
      win.document.getElementById("filterStockName").value = "";
      win.document.getElementById("filterStockNameExclude").value = "";
      win.document.getElementById("filterStockPriceMin").value = "";
      win.document.getElementById("filterStockPriceMax").value = "";
      win.document
        .querySelectorAll("#ratingOptions input")
        .forEach((cb) => (cb.checked = false));
      win.document
        .querySelectorAll("#qiangShuOptions input")
        .forEach((cb) => (cb.checked = false));
      win.document.querySelector(
        "#ratingDropdown .rating-selected",
      ).textContent = "选择评级";
      win.document.querySelector(
        "#qiangShuDropdown .rating-selected",
      ).textContent = "选择状态";
      win.document.getElementById("presetSelect").value = "";
      win.document.getElementById("scoreSelect").value = "";
      win.document.getElementById("sortScoreAsc").checked = false;
      win.document.getElementById("sortScoreLabel").style.display = "none";
      win.filteredData = win.tableData;
      win.renderTable(win.tableData);
    };

    // 获取当前筛选条件
    win.getCurrentFilter = function () {
      const selectedRatings = [];
      win.document
        .querySelectorAll("#ratingOptions input:checked")
        .forEach((cb) => {
          selectedRatings.push(cb.value);
        });
      const selectedQiangShu = [];
      win.document
        .querySelectorAll("#qiangShuOptions input:checked")
        .forEach((cb) => {
          selectedQiangShu.push(cb.value);
        });
      return {
        priceMin: win.document.getElementById("filterPriceMin").value,
        priceMax: win.document.getElementById("filterPriceMax").value,
        premiumMin: win.document.getElementById("filterPremiumMin").value,
        premiumMax: win.document.getElementById("filterPremiumMax").value,
        yearsMin: win.document.getElementById("filterYearsMin").value,
        yearsMax: win.document.getElementById("filterYearsMax").value,
        scaleMin: win.document.getElementById("filterScaleMin").value,
        scaleMax: win.document.getElementById("filterScaleMax").value,
        dueDaysMin: win.document.getElementById("filterDueDaysMin").value,
        dueDaysMax: win.document.getElementById("filterDueDaysMax").value,
        stockName: win.document.getElementById("filterStockName").value,
        stockNameExclude: win.document.getElementById("filterStockNameExclude")
          .value,
        stockPriceMin: win.document.getElementById("filterStockPriceMin").value,
        stockPriceMax: win.document.getElementById("filterStockPriceMax").value,
        ratings: selectedRatings,
        qiangShu: selectedQiangShu,
      };
    };

    // 应用筛选条件
    win.applyFilterValues = function (filter) {
      win.document.getElementById("filterPriceMin").value =
        filter.priceMin || "";
      win.document.getElementById("filterPriceMax").value =
        filter.priceMax || "";
      win.document.getElementById("filterPremiumMin").value =
        filter.premiumMin || "";
      win.document.getElementById("filterPremiumMax").value =
        filter.premiumMax || "";
      win.document.getElementById("filterYearsMin").value =
        filter.yearsMin || "";
      win.document.getElementById("filterYearsMax").value =
        filter.yearsMax || "";
      win.document.getElementById("filterScaleMin").value =
        filter.scaleMin || "";
      win.document.getElementById("filterScaleMax").value =
        filter.scaleMax || "";
      win.document.getElementById("filterDueDaysMin").value =
        filter.dueDaysMin || "";
      win.document.getElementById("filterDueDaysMax").value =
        filter.dueDaysMax || "";
      win.document.getElementById("filterStockName").value =
        filter.stockName || "";
      win.document.getElementById("filterStockNameExclude").value =
        filter.stockNameExclude || "";
      win.document.getElementById("filterStockPriceMin").value =
        filter.stockPriceMin || "";
      win.document.getElementById("filterStockPriceMax").value =
        filter.stockPriceMax || "";

      win.document.querySelectorAll("#ratingOptions input").forEach((cb) => {
        cb.checked = filter.ratings && filter.ratings.includes(cb.value);
      });
      win.document.querySelectorAll("#qiangShuOptions input").forEach((cb) => {
        cb.checked = filter.qiangShu && filter.qiangShu.includes(cb.value);
      });

      win.updateRatingDisplay();
      win.updateQiangShuDisplay();
    };

    // 获取预设列表存储键
    win.getStorageKey = function () {
      return "kezhuanzhai_filter_presets";
    };

    // 加载预设列表
    win.loadPresetList = function () {
      const presets = JSON.parse(GM_getValue(win.getStorageKey()) || "{}");
      const select = win.document.getElementById("presetSelect");
      select.innerHTML = '<option value="">选择预设</option>';
      Object.keys(presets)
        .sort()
        .forEach((name) => {
          const option = win.document.createElement("option");
          option.value = name;
          option.textContent = name;
          select.appendChild(option);
        });
    };

    // 保存预设
    win.savePreset = function () {
      const name = win.document.getElementById("presetName").value.trim();
      if (!name) {
        win.showToast("请输入预设名称", "error");
        return;
      }
      const presets = JSON.parse(GM_getValue(win.getStorageKey()) || "{}");
      presets[name] = win.getCurrentFilter();
      GM_setValue(win.getStorageKey(), JSON.stringify(presets));
      win.loadPresetList();
      win.document.getElementById("presetSelect").value = name;
      win.showToast('预设 "' + name + '" 已保存', "success");
    };

    // 加载预设
    win.loadPreset = function () {
      const name = win.document.getElementById("presetSelect").value;
      if (!name) return;
      const presets = JSON.parse(GM_getValue(win.getStorageKey()) || "{}");
      if (presets[name]) {
        win.applyFilterValues(presets[name]);
        win.document.getElementById("presetName").value = name;
      }
    };

    // 删除预设
    win.deletePreset = function () {
      const name =
        win.document.getElementById("presetSelect").value ||
        win.document.getElementById("presetName").value.trim();
      if (!name) {
        win.showToast("请选择或输入要删除的预设名称", "error");
        return;
      }
      if (!win.confirm('确定要删除预设 "' + name + '" 吗？')) return;
      try {
        const presets = JSON.parse(GM_getValue(win.getStorageKey()) || "{}");
        delete presets[name];
        GM_setValue(win.getStorageKey(), JSON.stringify(presets));
        win.loadPresetList();
        win.document.getElementById("presetName").value = "";
        win.showToast('预设 "' + name + '" 已删除', "success");
      } catch (e) {
        win.showToast("删除失败: " + e.message, "error");
      }
    };

    // 导出CSV
    win.exportToCSV = function () {
      let data = win.filteredData;

      // 如果选择了评分，添加评分列
      const score = win.document.getElementById("scoreSelect").value;
      if (score === "scoreA") {
        data = win.addScoreAColumn(data);
      }

      const csvContent = data
        .map((row, rowIndex) =>
          row
            .map((cell, colIndex) => {
              let cellStr = String(cell).replace(/"/g, '""');
              if (colIndex === win.colIndex.daoQiShiJian && rowIndex > 0) {
                cellStr = "'" + cellStr;
              }
              return '"' + cellStr + '"';
            })
            .join(","),
        )
        .join("\n");

      const BOM = "\uFEFF";
      const blob = new Blob([BOM + csvContent], {
        type: "text/csv;charset=utf-8;",
      });
      const link = win.document.createElement("a");
      const url = URL.createObjectURL(blob);
      link.setAttribute("href", url);
      link.setAttribute(
        "download",
        "可转债数据_" + new Date().toISOString().slice(0, 10) + ".csv",
      );
      link.style.visibility = "hidden";
      win.document.body.appendChild(link);
      link.click();
      win.document.body.removeChild(link);
    };

    // 获取评分历史存储键
    win.getScoreHistoryKey = function () {
      return "kezhuanzhai_score_history";
    };

    // 保存当前数据为基准
    win.saveScoreBaseline = function () {
      const data = win.filteredData;
      if (data.length <= 1) {
        win.showToast("没有数据可保存", "error");
        return;
      }

      const rows = data.slice(1);
      const currentScores = rows
        .map((row) => ({
          code: win.colIndex.daiMa >= 0 ? row[win.colIndex.daiMa] || "" : "",
          name:
            win.colIndex.zhuanZhaiMingCheng >= 0
              ? row[win.colIndex.zhuanZhaiMingCheng] || ""
              : "",
          score: parseFloat(win.calcScoreA(row)) || 0,
        }))
        .sort((a, b) => a.score - b.score);

      const saveData = {
        timestamp: new Date().toISOString(),
        scores: currentScores,
      };
      GM_setValue(win.getScoreHistoryKey(), JSON.stringify(saveData));
      win.showToast("已保存基准数据", "success");
    };

    // 对比评分历史
    win.compareScoreHistory = function () {
      // 获取当前数据并计算评分
      const data = win.filteredData;
      if (data.length <= 1) {
        win.showToast("没有数据可对比", "error");
        return;
      }

      const rows = data.slice(1);

      // 计算每行的评分并排序
      const currentScores = rows
        .map((row) => ({
          code: win.colIndex.daiMa >= 0 ? row[win.colIndex.daiMa] || "" : "",
          name:
            win.colIndex.zhuanZhaiMingCheng >= 0
              ? row[win.colIndex.zhuanZhaiMingCheng] || ""
              : "",
          score: parseFloat(win.calcScoreA(row)) || 0,
        }))
        .sort((a, b) => a.score - b.score);

      // 获取上次保存的数据
      let historyData = null;
      try {
        historyData = JSON.parse(GM_getValue(win.getScoreHistoryKey()));
      } catch (e) {
        console.error("对比评分历史时出错:", e);
        historyData = null;
      }

      // 如果没有历史数据，保存当前数据作为基准
      if (!historyData || !historyData.scores) {
        const saveData = {
          timestamp: new Date().toISOString(),
          scores: currentScores,
        };
        GM_setValue(win.getScoreHistoryKey(), JSON.stringify(saveData));
        win.showToast("已保存基准数据，下次可对比", "success");
        return;
      }

      // 构建历史评分映射
      const historyMap = {};
      historyData.scores.forEach((item, index) => {
        historyMap[item.code] = {
          score: item.score,
          rank: index + 1,
          name: item.name,
        };
      });

      // 构建对比结果（取全部数据）
      const compareResults = currentScores.map((item, index) => {
        const currentRank = index + 1;
        const history = historyMap[item.code];

        if (!history) {
          return {
            code: item.code,
            name: item.name,
            currentScore: item.score,
            currentRank: currentRank,
            prevScore: null,
            prevRank: null,
            scoreChange: null,
            rankChange: null,
            status: "新增",
          };
        }

        const scoreChange = item.score - history.score;
        const rankChange = history.rank - currentRank; // 正数表示排名上升

        return {
          code: item.code,
          name: item.name,
          currentScore: item.score,
          currentRank: currentRank,
          prevScore: history.score,
          prevRank: history.rank,
          scoreChange: scoreChange,
          rankChange: rankChange,
          status: "已存在",
        };
      });

      // 显示对比结果
      win.showCompareResult(compareResults, historyData.timestamp);
    };

    // 显示对比结果弹窗
    win.showCompareResult = function (results, historyTime) {
      // 移除已存在的弹窗
      const existingModal = win.document.getElementById("compareModal");
      if (existingModal) existingModal.remove();

      const modalHtml = `
                <div id="compareModal" style="position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.5);z-index:1000;display:flex;align-items:center;justify-content:center;">
                    <div style="background:white;border-radius:8px;max-width:900px;max-height:80vh;overflow:auto;box-shadow:0 4px 20px rgba(0,0,0,0.3);">
                        <div style="padding:15px 20px;background:linear-gradient(135deg, #667eea 0%, #764ba2 100%);color:white;display:flex;justify-content:space-between;align-items:center;">
                            <div>
                                <h3 style="margin:0;">评分A对比结果</h3>
                                <small>基准时间: ${new Date(historyTime).toLocaleString()}</small>
                            </div>
                            <div style="display:flex;align-items:center;gap:10px;">
                                <button onclick="copyCompareCodes()" style="padding:6px 12px;background:white;color:#667eea;border:none;border-radius:4px;cursor:pointer;font-size:13px;font-weight:bold;">复制代码</button>
                                <button onclick="updateBaselineAndClose()" style="padding:6px 12px;background:#ff9800;color:white;border:none;border-radius:4px;cursor:pointer;font-size:13px;font-weight:bold;">更新基准</button>
                                <button onclick="showHistoryData()" style="padding:6px 12px;background:#2196f3;color:white;border:none;border-radius:4px;cursor:pointer;font-size:13px;font-weight:bold;">显示历史数据</button>
                                <button onclick="analyzeData()" style="padding:6px 12px;background:#4caf50;color:white;border:none;border-radius:4px;cursor:pointer;font-size:13px;font-weight:bold;">数据分析</button>
                                <button onclick="closeCompareModal()" style="background:none;border:none;color:white;font-size:24px;cursor:pointer;">&times;</button>
                            </div>
                        </div>
                        <div style="padding:10px 20px;border-bottom:1px solid #eee;display:flex;justify-content:space-between;align-items:center;">
                            <div style="display:flex;align-items:center;gap:10px;">
                                <span style="font-size:13px;color:#666;">显示条数：</span>
                                <select id="comparePageSize" style="padding:4px 8px;border:1px solid #ddd;border-radius:4px;font-size:13px;">
                                    <option value="20">20条</option>
                                    <option value="50">50条</option>
                                    <option value="100">100条</option>
                                    <option value="300">300条</option>
                                </select>
                            </div>
                            <div id="comparePagination" style="display:flex;align-items:center;gap:5px;">
                                <span style="font-size:13px;color:#666;">共 ${results.length} 条</span>
                            </div>
                        </div>
                        <table id="compareTable" style="width:100%;border-collapse:collapse;font-size:13px;">
                            <thead>
                                <tr style="background:#f5f5f5;">
                                    <th style="padding:10px;border-bottom:2px solid #ddd;text-align:center;">排名</th>
                                    <th style="padding:10px;border-bottom:2px solid #ddd;">代码</th>
                                    <th style="padding:10px;border-bottom:2px solid #ddd;">转债名称</th>
                                    <th style="padding:10px;border-bottom:2px solid #ddd;text-align:right;">当前评分</th>
                                    <th style="padding:10px;border-bottom:2px solid #ddd;text-align:right;">上次评分</th>
                                    <th style="padding:10px;border-bottom:2px solid #ddd;text-align:right;">评分变化</th>
                                    <th style="padding:10px;border-bottom:2px solid #ddd;text-align:right;">上次排名</th>
                                    <th style="padding:10px;border-bottom:2px solid #ddd;text-align:right;">排名变化</th>
                                </tr>
                            </thead>
                            <tbody id="compareTableBody">
                            </tbody>
                        </table>
                        <div style="padding:15px;text-align:center;color:#666;font-size:12px;border-top:1px solid #eee;">
                            排名变化：↑表示排名上升，↓表示排名下降 | 评分变化：正数表示评分增加，负数表示评分减少
                        </div>
                    </div>
                </div>
            `;

      // 保存结果供复制使用
      win._compareResults = results;
      win._currentPage = 1;
      win._pageSize = 20;

      win.document.body.insertAdjacentHTML("beforeend", modalHtml);

      // 添加分页大小变更事件监听器
      const pageSizeSelect = win.document.getElementById("comparePageSize");
      if (pageSizeSelect) {
        pageSizeSelect.addEventListener("change", win.updateComparePagination);
      }

      // 初始化分页
      win.updateComparePagination();
    };

    // 更新对比结果分页
    win.updateComparePagination = function () {
      const pageSizeSelect = win.document.getElementById("comparePageSize");
      win._pageSize = parseInt(pageSizeSelect.value);
      win._currentPage = 1;
      win.renderComparePage();
    };

    // 渲染对比结果页面
    win.renderComparePage = function () {
      const results = win._compareResults;
      const pageSize = win._pageSize;
      const currentPage = win._currentPage;
      const startIndex = (currentPage - 1) * pageSize;
      const endIndex = startIndex + pageSize;
      const pageResults = results.slice(startIndex, endIndex);

      const tbody = win.document.getElementById("compareTableBody");
      tbody.innerHTML = pageResults
        .map((r) => {
          const scoreChangeColor =
            r.scoreChange > 0
              ? "#f44336"
              : r.scoreChange < 0
                ? "#4CAF50"
                : "#666";
          const scoreChangeText =
            r.scoreChange === null
              ? "-"
              : r.scoreChange > 0
                ? "+" + r.scoreChange.toFixed(2)
                : r.scoreChange.toFixed(2);
          const rankChangeColor =
            r.rankChange > 0
              ? "#4CAF50"
              : r.rankChange < 0
                ? "#f44336"
                : "#666";
          const rankChangeText =
            r.rankChange === null
              ? "-"
              : r.rankChange > 0
                ? "↑" + r.rankChange
                : r.rankChange < 0
                  ? "↓" + Math.abs(r.rankChange)
                  : "-";
          const prevScoreText =
            r.prevScore === null ? "-" : r.prevScore.toFixed(2);
          const prevRankText = r.prevRank === null ? "-" : r.prevRank;
          return `
              <tr style="border-bottom:1px solid #eee;">
                  <td style="padding:10px;text-align:center;font-weight:bold;">${r.currentRank}</td>
                  <td style="padding:10px;">${r.code}</td>
                  <td style="padding:10px;">${r.name}</td>
                  <td style="padding:10px;text-align:right;font-weight:bold;">${r.currentScore.toFixed(2)}</td>
                  <td style="padding:10px;text-align:right;color:#666;">${prevScoreText}</td>
                  <td style="padding:10px;text-align:right;color:${scoreChangeColor};font-weight:bold;">${scoreChangeText}</td>
                  <td style="padding:10px;text-align:right;color:#666;">${prevRankText}</td>
                  <td style="padding:10px;text-align:right;color:${rankChangeColor};font-weight:bold;">${rankChangeText}</td>
              </tr>
          `;
        })
        .join("");

      // 更新分页控件
      const pagination = win.document.getElementById("comparePagination");
      const totalPages = Math.ceil(results.length / pageSize);

      // 清空分页控件
      pagination.innerHTML = `<span style="font-size:13px;color:#666;">共 ${results.length} 条</span>`;

      if (totalPages > 1) {
        // 首页按钮
        const firstBtn = win.document.createElement("button");
        firstBtn.textContent = "首页";
        firstBtn.style.cssText =
          "padding:4px 8px;border:1px solid #ddd;border-radius:4px;background:white;cursor:pointer;font-size:12px;";
        if (currentPage === 1) {
          firstBtn.disabled = true;
          firstBtn.style.opacity = "0.5";
          firstBtn.style.cursor = "not-allowed";
        } else {
          firstBtn.onclick = function () {
            win._currentPage = 1;
            win.renderComparePage();
          };
        }
        pagination.appendChild(firstBtn);

        // 上一页按钮
        const prevBtn = win.document.createElement("button");
        prevBtn.textContent = "上一页";
        prevBtn.style.cssText =
          "padding:4px 8px;border:1px solid #ddd;border-radius:4px;background:white;cursor:pointer;font-size:12px;margin-left:8px;";
        if (currentPage === 1) {
          prevBtn.disabled = true;
          prevBtn.style.opacity = "0.5";
          prevBtn.style.cursor = "not-allowed";
        } else {
          prevBtn.onclick = function () {
            win._currentPage--;
            win.renderComparePage();
          };
        }
        pagination.appendChild(prevBtn);

        // 下一页按钮
        const nextBtn = win.document.createElement("button");
        nextBtn.textContent = "下一页";
        nextBtn.style.cssText =
          "padding:4px 8px;border:1px solid #ddd;border-radius:4px;background:white;cursor:pointer;font-size:12px;margin-left:8px;";
        if (currentPage === totalPages) {
          nextBtn.disabled = true;
          nextBtn.style.opacity = "0.5";
          nextBtn.style.cursor = "not-allowed";
        } else {
          nextBtn.onclick = function () {
            win._currentPage++;
            win.renderComparePage();
          };
        }
        pagination.appendChild(nextBtn);

        // 末页按钮
        const lastBtn = win.document.createElement("button");
        lastBtn.textContent = "末页";
        lastBtn.style.cssText =
          "padding:4px 8px;border:1px solid #ddd;border-radius:4px;background:white;cursor:pointer;font-size:12px;margin-left:8px;";
        if (currentPage === totalPages) {
          lastBtn.disabled = true;
          lastBtn.style.opacity = "0.5";
          lastBtn.style.cursor = "not-allowed";
        } else {
          lastBtn.onclick = function () {
            win._currentPage = totalPages;
            win.renderComparePage();
          };
        }
        pagination.appendChild(lastBtn);
      }
    };

    // 复制对比结果中的代码（只复制当前显示的）
    win.copyCompareCodes = function () {
      const results = win._compareResults;
      const pageSize = win._pageSize;
      const currentPage = win._currentPage;
      const startIndex = (currentPage - 1) * pageSize;
      const endIndex = startIndex + pageSize;
      const pageResults = results.slice(startIndex, endIndex);

      const codes = pageResults.map((r) => r.code).join("\n");
      win.navigator.clipboard
        .writeText(codes)
        .then(() => {
          win.showToast("已复制 " + pageResults.length + " 个代码", "success");
        })
        .catch(() => {
          // 降级方案
          const textarea = win.document.createElement("textarea");
          textarea.value = codes;
          win.document.body.appendChild(textarea);
          textarea.select();
          win.document.execCommand("copy");
          win.document.body.removeChild(textarea);
          win.showToast("已复制 " + pageResults.length + " 个代码", "success");
        });
    };

    // 关闭对比弹窗
    win.closeCompareModal = function () {
      const modal = win.document.getElementById("compareModal");
      if (modal) modal.remove();
    };

    // 显示历史数据
    win.showHistoryData = function () {
      // 获取历史数据
      let historyData = null;
      try {
        historyData = JSON.parse(GM_getValue(win.getScoreHistoryKey()));
      } catch (e) {
        console.error("获取历史数据时出错:", e);
        win.showToast("没有历史数据", "error");
        return;
      }

      if (!historyData || !historyData.scores) {
        win.showToast("没有历史数据", "error");
        return;
      }

      // 格式化时间戳
      const formattedTime = new Date(historyData.timestamp).toLocaleString();
      const scoreCount = historyData.scores.length;

      // 显示历史数据弹窗
      const modalHtml = `
                <div id="historyModal" style="position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.5);z-index:1001;display:flex;align-items:center;justify-content:center;">
                    <div style="background:white;border-radius:8px;max-width:600px;max-height:80vh;overflow:auto;box-shadow:0 4px 20px rgba(0,0,0,0.3);">
                        <div style="padding:15px 20px;background:linear-gradient(135deg, #667eea 0%, #764ba2 100%);color:white;display:flex;justify-content:space-between;align-items:center;">
                            <div>
                                <h3 style="margin:0;">历史评分数据</h3>
                                <small>基准时间: ${formattedTime}</small>
                            </div>
                            <button onclick="closeHistoryModal()" style="background:none;border:none;color:white;font-size:24px;cursor:pointer;">&times;</button>
                        </div>
                        <table id="historyTable" style="width:100%;border-collapse:collapse;font-size:13px;">
                            <thead>
                                <tr style="background:#f5f5f5;">
                                    <th style="padding:10px;border-bottom:2px solid #ddd;text-align:center;">排名</th>
                                    <th style="padding:10px;border-bottom:2px solid #ddd;">代码</th>
                                    <th style="padding:10px;border-bottom:2px solid #ddd;">转债名称</th>
                                    <th style="padding:10px;border-bottom:2px solid #ddd;text-align:right;">评分A</th>
                                </tr>
                            </thead>
                            <tbody id="historyTableBody">
                            </tbody>
                        </table>
                        <div style="padding:15px;text-align:center;color:#666;font-size:12px;border-top:1px solid #eee;">
                            共 ${scoreCount} 条历史数据
                        </div>
                    </div>
                </div>
            `;

      win.document.body.insertAdjacentHTML("beforeend", modalHtml);

      // 渲染历史数据
      const tbody = win.document.getElementById("historyTableBody");
      tbody.innerHTML = historyData.scores
        .map((item, index) => {
          return `
                    <tr>
                        <td style="padding:8px;border-bottom:1px solid #eee;text-align:center;">${index + 1}</td>
                        <td style="padding:8px;border-bottom:1px solid #eee;">${item.code}</td>
                        <td style="padding:8px;border-bottom:1px solid #eee;">${item.name}</td>
                        <td style="padding:8px;border-bottom:1px solid #eee;text-align:right;">${item.score.toFixed(2)}</td>
                    </tr>
                `;
        })
        .join("");
    };

    // 关闭历史数据弹窗
    win.closeHistoryModal = function () {
      const modal = win.document.getElementById("historyModal");
      if (modal) modal.remove();
    };

    // 数据分析
    win.analyzeData = function () {
      // 获取对比结果数据
      const results = win._compareResults;
      if (!results || results.length === 0) {
        win.showToast("没有对比数据可分析", "error");
        return;
      }

      // 获取历史数据
      let historyData = null;
      try {
        historyData = JSON.parse(GM_getValue(win.getScoreHistoryKey()));
      } catch (e) {
        console.error("获取历史数据时出错:", e);
        win.showToast("没有历史数据可分析", "error");
        return;
      }

      if (!historyData || !historyData.scores) {
        win.showToast("没有历史数据可分析", "error");
        return;
      }

      // 分析数据
      const top20Threshold = 20;

      // 构建历史数据映射
      const historyMap = {};
      historyData.scores.forEach((item, index) => {
        historyMap[item.code] = {
          name: item.name,
          rank: index + 1,
          score: item.score,
        };
      });

      // 构建当前数据映射
      const currentMap = {};
      results.forEach((item, index) => {
        currentMap[item.code] = {
          name: item.name,
          rank: index + 1,
          score: item.currentScore,
        };
      });

      // 找出历史前20的转债
      const historyTop20 = historyData.scores
        .slice(0, top20Threshold)
        .map((item) => item.code);

      // 找出当前前20的转债
      const currentTop20 = results
        .slice(0, top20Threshold)
        .map((item) => item.code);

      // 找出掉出前20的转债
      const droppedOut = [];
      historyTop20.forEach((code) => {
        if (!currentTop20.includes(code) && currentMap[code]) {
          droppedOut.push({
            code: code,
            name: historyMap[code].name,
            oldRank: historyMap[code].rank,
            oldScore: historyMap[code].score,
            newRank: currentMap[code].rank,
            newScore: currentMap[code].score,
          });
        }
      });

      // 找出进入前20的转债
      const newIn = [];
      currentTop20.forEach((code) => {
        if (!historyTop20.includes(code)) {
          newIn.push({
            code: code,
            name: currentMap[code].name,
            oldRank: historyMap[code] ? historyMap[code].rank : "-",
            oldScore: historyMap[code] ? historyMap[code].score : "-",
            newRank: currentMap[code].rank,
            newScore: currentMap[code].score,
          });
        }
      });

      // 找出消失的转债（历史中有但当前没有的）
      const historyCodes = new Set(historyData.scores.map((item) => item.code));
      const currentCodes = new Set(results.map((item) => item.code));
      const disappeared = [];
      historyCodes.forEach((code) => {
        if (!currentCodes.has(code)) {
          disappeared.push(historyMap[code].name);
        }
      });

      // 生成掉出前二十的转债列表HTML
      const droppedOutHtml =
        droppedOut.length > 0
          ? droppedOut
              .map(
                (item) =>
                  `${item.name}（历史：排名${item.oldRank}，评分${item.oldScore.toFixed(2)}；现在：排名${item.newRank}，评分${item.newScore.toFixed(2)}）`,
              )
              .join("<br>")
          : "无";

      // 生成进入前二十的转债列表HTML
      const newInHtml =
        newIn.length > 0
          ? newIn
              .map(
                (item) =>
                  `${item.name}（历史：排名${item.oldRank}，评分${item.oldScore === "-" ? "-" : item.oldScore.toFixed(2)}；现在：排名${item.newRank}，评分${item.newScore.toFixed(2)}）`,
              )
              .join("<br>")
          : "无";

      // 生成消失的转债列表HTML
      const disappearedHtml =
        disappeared.length > 0 ? disappeared.join("、") : "无";

      // 显示分析结果弹窗
      const modalHtml = `
                <div id="analysisModal" style="position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.5);z-index:1001;display:flex;align-items:center;justify-content:center;">
                    <div style="background:white;border-radius:8px;max-width:700px;max-height:80vh;overflow:auto;box-shadow:0 4px 20px rgba(0,0,0,0.3);">
                        <div style="padding:15px 20px;background:linear-gradient(135deg, #667eea 0%, #764ba2 100%);color:white;display:flex;justify-content:space-between;align-items:center;">
                            <div>
                                <h3 style="margin:0;">数据分析结果</h3>
                            </div>
                            <button onclick="closeAnalysisModal()" style="background:none;border:none;color:white;font-size:24px;cursor:pointer;">&times;</button>
                        </div>
                        <div style="padding:20px;">
                            <div style="margin-bottom:20px;">
                                <h4 style="margin:0 0 10px 0;color:#333;">掉出前二十的转债</h4>
                                <div style="padding:10px;background:#f5f5f5;border-radius:4px;line-height:1.5;">
                                    ${droppedOutHtml}
                                </div>
                            </div>
                            <div style="margin-bottom:20px;">
                                <h4 style="margin:0 0 10px 0;color:#333;">进入前二十的转债</h4>
                                <div style="padding:10px;background:#f5f5f5;border-radius:4px;line-height:1.5;">
                                    ${newInHtml}
                                </div>
                            </div>
                            <div style="margin-bottom:20px;">
                                <h4 style="margin:0 0 10px 0;color:#333;">消失的转债</h4>
                                <div style="padding:10px;background:#f5f5f5;border-radius:4px;">
                                    ${disappearedHtml}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            `;

      win.document.body.insertAdjacentHTML("beforeend", modalHtml);
    };

    // 关闭数据分析弹窗
    win.closeAnalysisModal = function () {
      const modal = win.document.getElementById("analysisModal");
      if (modal) modal.remove();
    };

    // 更新基准并关闭弹窗
    win.updateBaselineAndClose = function () {
      win.saveScoreBaseline();
      win.closeCompareModal();
    };

    // 显示筛选代码弹窗
    win.showCodeFilterModal = function () {
      const existingModal = win.document.getElementById("codeFilterModal");
      if (existingModal) existingModal.remove();

      const modalHtml = `
                <div id="codeFilterModal" style="position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.5);z-index:1000;display:flex;align-items:center;justify-content:center;">
                    <div style="background:white;border-radius:8px;width:400px;box-shadow:0 4px 20px rgba(0,0,0,0.3);">
                        <div style="padding:15px 20px;background:linear-gradient(135deg, #667eea 0%, #764ba2 100%);color:white;display:flex;justify-content:space-between;align-items:center;border-radius:8px 8px 0 0;">
                            <h3 style="margin:0;">筛选代码</h3>
                            <button onclick="closeCodeFilterModal()" style="background:none;border:none;color:white;font-size:24px;cursor:pointer;">&times;</button>
                        </div>
                        <div style="padding:20px;">
                            <p style="margin:0 0 10px 0;color:#666;font-size:13px;">请输入代码，每行一个：</p>
                            <textarea id="codeFilterInput" style="width:100%;height:200px;border:1px solid #ddd;border-radius:4px;padding:10px;font-size:13px;resize:vertical;box-sizing:border-box;" placeholder="110048&#10;113025&#10;128040&#10;..."></textarea>
                        </div>
                        <div style="padding:15px 20px;border-top:1px solid #eee;text-align:right;">
                            <button onclick="closeCodeFilterModal()" style="padding:8px 16px;margin-right:10px;border:1px solid #ddd;background:white;border-radius:4px;cursor:pointer;">取消</button>
                            <button onclick="applyCodeFilter()" style="padding:8px 16px;background:linear-gradient(135deg, #667eea 0%, #764ba2 100%);color:white;border:none;border-radius:4px;cursor:pointer;">筛选</button>
                        </div>
                    </div>
                </div>
            `;

      win.document.body.insertAdjacentHTML("beforeend", modalHtml);
    };

    // 关闭筛选代码弹窗
    win.closeCodeFilterModal = function () {
      const modal = win.document.getElementById("codeFilterModal");
      if (modal) modal.remove();
    };

    // 应用代码筛选
    win.applyCodeFilter = function () {
      const input = win.document.getElementById("codeFilterInput").value;
      const codes = input
        .split(/[\n,，\s]+/)
        .map((c) => c.trim())
        .filter((c) => c.length > 0);

      if (codes.length === 0) {
        win.showToast("请输入至少一个代码", "error");
        return;
      }

      const codeSet = new Set(codes);
      const filtered = win.tableData.filter((row, index) => {
        if (index === 0) return true; // 保留表头
        const code =
          win.colIndex.daiMa >= 0 ? row[win.colIndex.daiMa] || "" : "";
        return codeSet.has(code);
      });

      if (filtered.length <= 1) {
        win.showToast("未找到匹配的代码", "error");
        return;
      }

      win.filteredData = filtered;

      // 如果选择了评分A且勾选了升序，则排序
      const score = win.document.getElementById("scoreSelect").value;
      const asc = win.document.getElementById("sortScoreAsc").checked;
      if (score === "scoreA" && asc) {
        const header = filtered[0];
        const rows = filtered.slice(1);
        rows.sort((a, b) => {
          const valA = parseFloat(win.calcScoreA(a)) || 0;
          const valB = parseFloat(win.calcScoreA(b)) || 0;
          return valA - valB;
        });
        win.filteredData = [header, ...rows];
      }

      win.renderTable(win.filteredData);
      win.closeCodeFilterModal();
      win.showToast("已筛选出 " + (filtered.length - 1) + " 条数据", "success");
    };

    // 初始渲染
    win.generateDropdownOptions();
    win.loadPresetList();
    win.renderTable(win.tableData);
  }

  // ===================== 页面初始化 =====================
  // 页面加载完成后创建提取表格按钮
  if (document.readyState === "loading") {
    // 页面仍在加载中，等待DOM加载完成后创建按钮
    document.addEventListener("DOMContentLoaded", createExtractButton);
  } else {
    // 页面已经加载完成，直接创建按钮
    createExtractButton();
  }
})();
