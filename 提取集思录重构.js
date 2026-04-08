// ==UserScript==
// @name         提取集思录-双页面数据合并版
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  从集思录两个页面提取数据并合并，在iframe中展示，支持筛选和排序
// @author       佚名
// @match        https://www.jisilu.cn/web/data/cb/*
// @grant        none
// ==/UserScript==

/**
 * 集思录转债数据提取脚本
 * 功能：
 * 1. 从 https://www.jisilu.cn/web/data/cb/list 提取表1数据
 * 2. 从 https://www.jisilu.cn/web/data/cb/redeem 提取表2数据
 * 3. 合并数据，将表2的强赎天计数添加到表1
 * 4. 在iframe中展示数据，支持筛选和排序
 */

(function () {
  "use strict";

  // 全局变量，用于存储提取的数据
  let table1Data = [];
  let table2Data = [];
  let mergedData = [];

  /**
   * 清理单元格内容，提取数字部分
   * @param {string} text - 单元格文本内容
   * @returns {string} 清理后的数字字符串或原始文本
   */
  function cleanCell(text) {
    const trimmed = text.trim();
    // 匹配开头的数字部分，包括整数和小数
    const match = trimmed.match(/^(\d+\.?\d*)/);
    if (match) {
      return match[1];
    }
    return trimmed;
  }

  /**
   * 清理文本中的非文字部分
   * @param {string} name - 文本内容
   * @returns {string} 清理后的文本，只保留中文字符和数字
   */
  function cleanText(name) {
    if (!name) return name;
    // 只保留中文字符和数字，移除其他特殊字符
    return name.replace(/[^\u4e00-\u9fa5\d]/g, "");
  }

  /**
   * 统一日期格式为 YYYY-MM-DD
   * @param {string} dateStr - 日期字符串
   * @returns {string} 格式化后的日期字符串
   */
  function formatDate(dateStr) {
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
  }

  /**
   * 提取字符串中的数值部分
   * @param {string} str - 包含数值的字符串
   * @returns {string} 提取的数值字符串
   */
  function extractNumber(str) {
    if (!str) return "";
    const match = str.match(/(\d+\.?\d*)/);
    return match ? match[1] : "";
  }

  /**
   * 根据单元格中的图标获取强赎状态
   * @param {HTMLElement} td - 表格单元格元素
   * @returns {string} 强赎状态文本
   */
  function getQiangShuStatus(td) {
    // 查找包含强赎状态图标的span元素
    const span = td.querySelector("span.jisilu-icons");
    if (!span) return "";

    // 根据span的class判断强赎状态
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
  }

  /**
   * 从单元格的title属性中提取详细信息
   * @param {HTMLElement} td - 表格单元格元素
   * @returns {Object} 包含详细信息的对象
   */
  function parseTitleInfo(td) {
    const span = td.querySelector("span.jisilu-icons");
    if (!span || !span.title) {
      // 如果没有title属性，返回空对象
      return {
        zuiHouJiaoYiRi: "", // 最后交易日
        zuiHouZhuanGuRi: "", // 最后转股日
        zhaiQuanDaoQiRi: "", // 债券到期日
        daoQiShuHuiJia: "", // 到期赎回价
        shuHuiJia: "", // 赎回价
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

    // 从title属性中提取各种信息
    const jiaoYiRiMatch = title.match(/最后交易日[：:]\s*([^\n]+)/);
    if (jiaoYiRiMatch) result.zuiHouJiaoYiRi = formatDate(jiaoYiRiMatch[1]);

    const zhuanGuRiMatch = title.match(/最后转股日[：:]\s*([^\n]+)/);
    if (zhuanGuRiMatch) result.zuiHouZhuanGuRi = formatDate(zhuanGuRiMatch[1]);

    const daoQiRiMatch = title.match(/债券到期日[：:]\s*([^\n]+)/);
    if (daoQiRiMatch) result.zhaiQuanDaoQiRi = formatDate(daoQiRiMatch[1]);

    const shuHuiJiaMatch = title.match(/到期赎回价[：:]\s*([^\n]+)/);
    if (shuHuiJiaMatch)
      result.daoQiShuHuiJia = extractNumber(shuHuiJiaMatch[1]);

    // 匹配"赎回价"但排除"到期赎回价"
    const shuHuiJia2Match = title.match(/(?<!到期)赎回价[：:]\s*([^\n]+)/);
    if (shuHuiJia2Match) result.shuHuiJia = extractNumber(shuHuiJia2Match[1]);

    return result;
  }

  /**
   * 从单张表格中提取有效数据
   * @param {HTMLElement} table - 表格元素
   * @param {number} zhuanZhaiIdx - 转债名称列的索引
   * @param {number} zhuanGuJiaIdx - 转股价列的索引
   * @returns {Array} 提取的数据数组
   */
  function getValidTableData(table, zhuanZhaiIdx, zhuanGuJiaIdx) {
    return Array.from(table.querySelectorAll("tr"), (tr) => {
      // 获取当前行的所有单元格
      const tds = tr.querySelectorAll("td");
      // 提取单元格文本内容
      const rowData = Array.from(tds, (td) => td.textContent.trim());

      // 先处理转股价列，在添加和删除列之前
      if (zhuanGuJiaIdx !== -1 && rowData[zhuanGuJiaIdx]) {
        rowData[zhuanGuJiaIdx] = cleanCell(rowData[zhuanGuJiaIdx]);
      }

      // 从转债名称列提取强赎状态和详细信息
      let qiangShuStatus = "";
      let titleInfo = {
        zuiHouJiaoYiRi: "",
        zuiHouZhuanGuRi: "",
        zhaiQuanDaoQiRi: "",
        daoQiShuHuiJia: "",
        shuHuiJia: "",
      };
      let insertIndex = 1;

      if (zhuanZhaiIdx !== -1 && tds[zhuanZhaiIdx]) {
        // 从转债名称列获取强赎状态
        qiangShuStatus = getQiangShuStatus(tds[zhuanZhaiIdx]);
        // 从转债名称列获取详细信息
        titleInfo = parseTitleInfo(tds[zhuanZhaiIdx]);
        // 确定插入位置为转债名称列后面
        insertIndex = zhuanZhaiIdx + 1;

        // 清理转债名称中的非文字部分
        if (rowData[zhuanZhaiIdx]) {
          rowData[zhuanZhaiIdx] = cleanText(rowData[zhuanZhaiIdx]);
        }
      }

      // 将强赎状态和详细信息插入到转债名称后面
      if (rowData.length > insertIndex - 1) {
        rowData.splice(
          insertIndex,
          0,
          qiangShuStatus, // 强赎状态
          titleInfo.zuiHouJiaoYiRi, // 最后交易日
          titleInfo.zuiHouZhuanGuRi, // 最后转股日
          titleInfo.zhaiQuanDaoQiRi, // 债券到期日
          titleInfo.daoQiShuHuiJia, // 到期赎回价
          titleInfo.shuHuiJia, // 赎回价
        );
      }

      return rowData;
    }).filter((row) => row.length > 0); // 过滤空行
  }

  /**
   * 提取表1数据（https://www.jisilu.cn/web/data/cb/list）
   * @returns {Array} 提取的数据数组
   */
  function extractTable1Data() {
    // 提取专属表头
    const headerTable = document.querySelector("table.jsl-table-header");
    let headers = headerTable
      ? Array.from(headerTable.querySelectorAll("th"), (th) =>
          th.textContent.trim(),
        )
      : [];

    // 确定转债名称列的索引
    const zhuanZhaiIndex = headers.findIndex((h) => h.includes("转债名称"));

    // 找到行号、操作和转股价列的索引
    const rowNumberIndex = headers.findIndex((h) => h.includes("行号"));
    const operationIndex = headers.findIndex((h) => h.includes("操作"));
    const zhuanGuJiaIndex = headers.findIndex((h) => h.includes("转股价"));

    // 收集所有数据表格（排除表头表，避免重复）
    let allData = Array.from(
      document.querySelectorAll("table:not(.jsl-table-header)"),
      (table) => getValidTableData(table, zhuanZhaiIndex, zhuanGuJiaIndex),
    ).flat();

    // 空数据校验
    if (allData.length === 0) {
      console.log("没有找到有效表格数据");
      return [];
    }

    // 处理数据：去掉行号和操作列
    if (allData.length > 0) {
      // 处理表头
      if (rowNumberIndex !== -1) {
        headers.splice(rowNumberIndex, 1);
        // 如果操作列索引大于行号列，需要调整索引
        if (operationIndex !== -1 && operationIndex > rowNumberIndex) {
          headers.splice(operationIndex - 1, 1);
        } else if (operationIndex !== -1) {
          headers.splice(operationIndex, 1);
        }
      } else if (operationIndex !== -1) {
        // 只去掉操作列
        headers.splice(operationIndex, 1);
      }

      // 处理每一行数据
      allData = allData.map((row) => {
        // 去掉行号列
        if (rowNumberIndex !== -1) {
          row.splice(rowNumberIndex, 1);
          // 如果操作列索引大于行号列，需要调整索引
          if (operationIndex !== -1 && operationIndex > rowNumberIndex) {
            row.splice(operationIndex - 1, 1);
          } else if (operationIndex !== -1) {
            row.splice(operationIndex, 1);
          }
        } else if (operationIndex !== -1) {
          // 只去掉操作列
          row.splice(operationIndex, 1);
        }

        return row;
      });
    }

    // 在表头"转债名称"后插入新列
    if (zhuanZhaiIndex !== -1) {
      headers.splice(
        zhuanZhaiIndex + 1,
        0,
        "强赎状态",
        "最后交易日",
        "最后转股日",
        "债券到期日",
        "到期赎回价（元/张）",
        "赎回价（元/张）",
        "强赎天计数", // 添加强赎天计数列
      );
    }

    // 拼接表头
    if (headers.length) {
      allData.unshift(headers);
    }

    return allData;
  }

  /**
   * 提取表2数据（https://www.jisilu.cn/web/data/cb/redeem）
   * @returns {Array} 提取的数据数组
   */
  function extractTable2Data() {
    // 提取专属表头
    const headerTable = document.querySelector("table.jsl-table-header");
    let headers = headerTable
      ? Array.from(headerTable.querySelectorAll("th"), (th) =>
          th.textContent.trim(),
        )
      : [];

    // 收集所有数据表格（排除表头表，避免重复）
    let allData = Array.from(
      document.querySelectorAll("table:not(.jsl-table-header)"),
      (table) => {
        return Array.from(table.querySelectorAll("tr"), (tr) => {
          const tds = tr.querySelectorAll("td");
          return Array.from(tds, (td) => td.textContent.trim());
        }).filter((row) => row.length > 0);
      },
    ).flat();

    // 空数据校验
    if (allData.length === 0) {
      console.log("没有找到有效表格数据");
      return [];
    }

    // 拼接表头
    if (headers.length) {
      allData.unshift(headers);
    }

    return allData;
  }

  /**
   * 合并表1和表2数据
   * @param {Array} table1 - 表1数据
   * @param {Array} table2 - 表2数据
   * @returns {Array} 合并后的数据
   */
  function mergeData(table1, table2) {
    if (!table1 || !table2 || table1.length < 2 || table2.length < 2) {
      return [];
    }

    // 获取表头
    const table1Headers = table1[0];
    const table2Headers = table2[0];

    // 找到表1的代码列和表2的转债代码列
    const table1CodeIndex = table1Headers.findIndex((h) => h.includes("代码"));
    const table2CodeIndex = table2Headers.findIndex((h) =>
      h.includes("转债代码"),
    );
    const table2CountIndex = table2Headers.findIndex((h) =>
      h.includes("强赎天计数"),
    );

    if (
      table1CodeIndex === -1 ||
      table2CodeIndex === -1 ||
      table2CountIndex === -1
    ) {
      console.log("找不到代码列或强赎天计数列");
      return [];
    }

    // 创建表2数据的映射，以转债代码为键
    const table2Map = {};
    for (let i = 1; i < table2.length; i++) {
      const row = table2[i];
      const code = row[table2CodeIndex];
      const count = row[table2CountIndex];
      table2Map[code] = count;
    }

    // 合并数据
    const merged = [table1Headers]; // 表头
    for (let i = 1; i < table1.length; i++) {
      const row = [...table1[i]];
      const code = row[table1CodeIndex];

      // 找到转债名称列的索引
      const zhuanZhaiIndex = table1Headers.findIndex((h) =>
        h.includes("转债名称"),
      );
      if (zhuanZhaiIndex !== -1) {
        // 在转债名称列后面插入强赎天计数
        const insertIndex = zhuanZhaiIndex + 7; // 强赎状态等6列之后
        row[insertIndex] = table2Map[code] || "";
      }

      merged.push(row);
    }

    return merged;
  }

  /**
   * 在iframe中展示数据
   * @param {Array} data - 要展示的数据
   */
  function showDataInIframe(data) {
    if (!data || data.length < 2) {
      console.log("没有数据可展示");
      return;
    }

    // 创建iframe
    const iframe = document.createElement("iframe");
    iframe.style.cssText = `
      position: fixed;
      top: 60px;
      left: 10px;
      width: calc(100% - 20px);
      height: calc(100vh - 80px);
      border: 1px solid #ccc;
      z-index: 9999;
    `;
    document.body.appendChild(iframe);

    // 获取iframe的document
    const iframeDoc = iframe.contentDocument || iframe.contentWindow.document;

    // 构建HTML内容
    let html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>集思录转债数据</title>
        <link rel="stylesheet" href="https://cdn.datatables.net/1.11.5/css/jquery.dataTables.min.css">
        <style>
          body {
            font-family: Arial, sans-serif;
            padding: 10px;
          }
          table {
            width: 100%;
            border-collapse: collapse;
          }
          th, td {
            padding: 8px;
            text-align: left;
            border-bottom: 1px solid #ddd;
          }
          th {
            background-color: #f2f2f2;
          }
          tr:hover {
            background-color: #f5f5f5;
          }
        </style>
      </head>
      <body>
        <h1>集思录转债数据</h1>
        <table id="dataTable">
          <thead>
            <tr>
    `;

    // 添加表头
    const headers = data[0];
    headers.forEach((header) => {
      html += `<th>${header}</th>`;
    });
    html += `
            </tr>
          </thead>
          <tbody>
    `;

    // 添加数据行
    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      html += `<tr>`;
      row.forEach((cell) => {
        html += `<td>${cell}</td>`;
      });
      html += `</tr>`;
    }

    html += `
          </tbody>
        </table>
        <script src="https://code.jquery.com/jquery-3.6.0.min.js"></script>
        <script src="https://cdn.datatables.net/1.11.5/js/jquery.dataTables.min.js"></script>
        <script>
          $(document).ready(function() {
            $('#dataTable').DataTable({
              "paging": true,
              "lengthChange": true,
              "searching": true,
              "ordering": true,
              "info": true,
              "autoWidth": false
            });
          });
        </script>
      </body>
      </html>
    `;

    // 写入iframe内容
    iframeDoc.open();
    iframeDoc.write(html);
    iframeDoc.close();
  }

  /**
   * 创建操作按钮
   */
  function createButtons() {
    // 创建按钮容器
    const buttonContainer = document.createElement("div");
    buttonContainer.style.cssText = `
      position: fixed;
      top: 10px;
      right: 10px;
      z-index: 9999;
      display: flex;
      gap: 10px;
      background: white;
      padding: 10px;
      border-radius: 4px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.2);
    `;

    // 创建提取可转债按钮
    const extractTable1Button = document.createElement("button");
    extractTable1Button.textContent = "提取可转债数据";
    extractTable1Button.style.cssText = `
      padding: 8px 16px;
      background: #4CAF50;
      color: white;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      font-size: 14px;
    `;
    extractTable1Button.addEventListener("click", () => {
      // 判断当前网址是否正确
      if (!window.location.href.includes("/web/data/cb/list")) {
        alert("请先点击可转债！");
        return;
      }
      table1Data = extractTable1Data();
      console.log("可转债数据提取完成：", table1Data);
      alert("可转债数据提取完成！");
    });

    // 创建提取强赎数据按钮
    const extractTable2Button = document.createElement("button");
    extractTable2Button.textContent = "提取强赎数据";
    extractTable2Button.style.cssText = `
      padding: 8px 16px;
      background: #2196F3;
      color: white;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      font-size: 14px;
    `;
    extractTable2Button.addEventListener("click", () => {
      // 判断当前网址是否正确
      if (!window.location.href.includes("/web/data/cb/redeem")) {
        alert("请先点击强赎！");
        return;
      }
      table2Data = extractTable2Data();
      console.log("强赎数据提取完成：", table2Data);
      alert("强赎数据提取完成！");
    });

    // 创建合并数据按钮
    const mergeButton = document.createElement("button");
    mergeButton.textContent = "合并数据";
    mergeButton.style.cssText = `
      padding: 8px 16px;
      background: #ff9800;
      color: white;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      font-size: 14px;
    `;
    mergeButton.addEventListener("click", () => {
      mergedData = mergeData(table1Data, table2Data);
      console.log("数据合并完成：", mergedData);
      alert("数据合并完成！");
    });

    // 创建展示数据按钮
    const showButton = document.createElement("button");
    showButton.textContent = "展示数据";
    showButton.style.cssText = `
      padding: 8px 16px;
      background: #9c27b0;
      color: white;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      font-size: 14px;
    `;
    showButton.addEventListener("click", () => {
      showDataInIframe(mergedData);
    });

    // 添加按钮到容器
    buttonContainer.appendChild(extractTable1Button);
    buttonContainer.appendChild(extractTable2Button);
    buttonContainer.appendChild(mergeButton);
    buttonContainer.appendChild(showButton);

    // 添加容器到页面
    document.body.appendChild(buttonContainer);
  }

  // 页面加载完成后创建按钮
  if (document.readyState === "loading") {
    // 页面正在加载中，等待DOM加载完成
    document.addEventListener("DOMContentLoaded", createButtons);
  } else {
    // 页面已经加载完成，直接创建按钮
    createButtons();
  }
})();
