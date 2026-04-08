// ==UserScript==
// @name         提取集思录-双页面数据合并版
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  从集思录两个页面提取数据并合并，在iframe中展示，支持筛选和排序
// @author       佚名
// @match        https://www.jisilu.cn/web/data/cb/*
// @grant        GM_getValue
// @grant        GM_setValue
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
   * @param {Array} headers - 表头数组
   * @param {number} zhuanZhaiIdx - 转债名称列的索引
   * @param {number} zhuanGuJiaIdx - 转股价列的索引
   * @param {number} rowNumberIdx - 行号列的索引
   * @param {number} operationIdx - 操作列的索引
   * @returns {Array} 提取的数据数组
   */
  function getValidTableData(
    table,
    headers,
    zhuanZhaiIdx,
    zhuanGuJiaIdx,
    rowNumberIdx,
    operationIdx,
  ) {
    return Array.from(table.querySelectorAll("tr"), (tr) => {
      // 获取当前行的所有单元格
      const tds = tr.querySelectorAll("td");
      // 提取单元格文本内容
      const rowData = Array.from(tds, (td) => td.textContent.trim());

      // 先删除行号和操作列
      if (rowNumberIdx !== -1) {
        rowData.splice(rowNumberIdx, 1);
        // 如果操作列索引大于行号列，需要调整索引
        if (operationIdx !== -1 && operationIdx > rowNumberIdx) {
          rowData.splice(operationIdx - 1, 1);
        } else if (operationIdx !== -1) {
          rowData.splice(operationIdx, 1);
        }
      } else if (operationIdx !== -1) {
        // 只去掉操作列
        rowData.splice(operationIdx, 1);
      }

      // 重新计算转债名称列和转股价列的索引（因为删除了列）
      let adjustedZhuanZhaiIdx = zhuanZhaiIdx;
      let adjustedZhuanGuJiaIdx = zhuanGuJiaIdx;

      if (rowNumberIdx !== -1) {
        if (adjustedZhuanZhaiIdx > rowNumberIdx) adjustedZhuanZhaiIdx--;
        if (adjustedZhuanGuJiaIdx > rowNumberIdx) adjustedZhuanGuJiaIdx--;
      }

      if (operationIdx !== -1) {
        if (rowNumberIdx === -1 || operationIdx < rowNumberIdx) {
          if (adjustedZhuanZhaiIdx > operationIdx) adjustedZhuanZhaiIdx--;
          if (adjustedZhuanGuJiaIdx > operationIdx) adjustedZhuanGuJiaIdx--;
        } else {
          if (adjustedZhuanZhaiIdx > operationIdx - 1) adjustedZhuanZhaiIdx--;
          if (adjustedZhuanGuJiaIdx > operationIdx - 1) adjustedZhuanGuJiaIdx--;
        }
      }

      // 处理转股价列
      if (adjustedZhuanGuJiaIdx !== -1 && rowData[adjustedZhuanGuJiaIdx]) {
        rowData[adjustedZhuanGuJiaIdx] = cleanCell(
          rowData[adjustedZhuanGuJiaIdx],
        );
      }

      // 处理转股溢价率列，去除百分号
      const zhuanGuYiJiaLvIndex = headers.findIndex((h) =>
        h.includes("转股溢价率"),
      );
      let adjustedZhuanGuYiJiaLvIndex = zhuanGuYiJiaLvIndex;
      // 调整索引（因为删除了列）
      if (rowNumberIdx !== -1 && adjustedZhuanGuYiJiaLvIndex > rowNumberIdx)
        adjustedZhuanGuYiJiaLvIndex--;
      if (operationIdx !== -1) {
        if (rowNumberIdx === -1 || operationIdx < rowNumberIdx) {
          if (adjustedZhuanGuYiJiaLvIndex > operationIdx)
            adjustedZhuanGuYiJiaLvIndex--;
        } else {
          if (adjustedZhuanGuYiJiaLvIndex > operationIdx - 1)
            adjustedZhuanGuYiJiaLvIndex--;
        }
      }
      if (
        adjustedZhuanGuYiJiaLvIndex !== -1 &&
        rowData[adjustedZhuanGuYiJiaLvIndex]
      ) {
        // 去除百分号和其他非数字字符，保留负号和小数点
        let cleanedValue = rowData[adjustedZhuanGuYiJiaLvIndex].replace(
          /[^-+\d.]/g,
          "",
        );
        // 把"-"替换为空
        if (cleanedValue === "-") {
          cleanedValue = "";
        }
        rowData[adjustedZhuanGuYiJiaLvIndex] = cleanedValue;
      }

      // 处理剩余年限列，去掉"年"字
      const shengYuNianXianIndex = headers.findIndex((h) =>
        h.includes("剩余年限"),
      );
      let adjustedShengYuNianXianIndex = shengYuNianXianIndex;
      // 调整索引（因为删除了列）
      if (rowNumberIdx !== -1 && adjustedShengYuNianXianIndex > rowNumberIdx)
        adjustedShengYuNianXianIndex--;
      if (operationIdx !== -1) {
        if (rowNumberIdx === -1 || operationIdx < rowNumberIdx) {
          if (adjustedShengYuNianXianIndex > operationIdx)
            adjustedShengYuNianXianIndex--;
        } else {
          if (adjustedShengYuNianXianIndex > operationIdx - 1)
            adjustedShengYuNianXianIndex--;
        }
      }
      if (
        adjustedShengYuNianXianIndex !== -1 &&
        rowData[adjustedShengYuNianXianIndex]
      ) {
        // 去除"年"和其他非数字字符，保留负号和小数点
        let cleanedValue = rowData[adjustedShengYuNianXianIndex].replace(
          /[^-+\d.]/g,
          "",
        );
        // 把"-"替换为空
        if (cleanedValue === "-") {
          cleanedValue = "";
        }
        rowData[adjustedShengYuNianXianIndex] = cleanedValue;
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

      if (adjustedZhuanZhaiIdx !== -1 && tds[zhuanZhaiIdx]) {
        // 从转债名称列获取强赎状态
        qiangShuStatus = getQiangShuStatus(tds[zhuanZhaiIdx]);
        // 从转债名称列获取详细信息
        titleInfo = parseTitleInfo(tds[zhuanZhaiIdx]);
        // 确定插入位置为转债名称列后面
        insertIndex = adjustedZhuanZhaiIdx + 1;

        // 清理转债名称中的非文字部分
        if (rowData[adjustedZhuanZhaiIdx]) {
          rowData[adjustedZhuanZhaiIdx] = cleanText(
            rowData[adjustedZhuanZhaiIdx],
          );
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
      (table) =>
        getValidTableData(
          table,
          headers,
          zhuanZhaiIndex,
          zhuanGuJiaIndex,
          rowNumberIndex,
          operationIndex,
        ),
    ).flat();

    // 空数据校验
    if (allData.length === 0) {
      console.log("没有找到有效表格数据");
      return [];
    }

    // 处理表头：去掉行号和操作列
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

    // 在表头"转债名称"后插入新列
    if (zhuanZhaiIndex !== -1) {
      // 重新计算转债名称列的索引（因为删除了列）
      let adjustedZhuanZhaiIndex = zhuanZhaiIndex;
      if (rowNumberIndex !== -1 && adjustedZhuanZhaiIndex > rowNumberIndex)
        adjustedZhuanZhaiIndex--;
      if (operationIndex !== -1) {
        if (rowNumberIndex === -1 || operationIndex < rowNumberIndex) {
          if (adjustedZhuanZhaiIndex > operationIndex) adjustedZhuanZhaiIndex--;
        } else {
          if (adjustedZhuanZhaiIndex > operationIndex - 1)
            adjustedZhuanZhaiIndex--;
        }
      }

      headers.splice(
        adjustedZhuanZhaiIndex + 1,
        0,
        "强赎状态",
        "最后交易日",
        "最后转股日",
        "债券到期日",
        "到期赎回价（元/张）",
        "赎回价（元/张）",
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
    const table2QiangShuTianIndex = table2Headers.findIndex((h) =>
      h.includes("强赎天计数"),
    );

    if (
      table1CodeIndex === -1 ||
      table2CodeIndex === -1 ||
      table2QiangShuTianIndex === -1
    ) {
      console.log("找不到代码列或强赎天计数列");
      return [];
    }

    // 在表1的转债名称列后添加强赎天计数列
    const mergedHeaders = [...table1Headers];
    const zhuanZhaiIndex = mergedHeaders.findIndex((h) =>
      h.includes("转债名称"),
    );

    if (zhuanZhaiIndex !== -1) {
      // 在强赎状态后面插入强赎天计数列（转债名称后第1列）
      mergedHeaders.splice(zhuanZhaiIndex + 2, 0, "强赎天计数");
    }

    // 创建表2数据的映射，以转债代码为键
    const table2Map = {};
    for (let i = 1; i < table2.length; i++) {
      const row = table2[i];
      const code = row[table2CodeIndex];
      const qiangShuTian = row[table2QiangShuTianIndex];
      table2Map[code] = qiangShuTian;
    }

    // 找到现价、转股溢价率和剩余规模列的索引
    const xianJiaIndex = table1Headers.findIndex((h) => h.includes("现价"));
    const zhuanGuYiJiaLvIndex = table1Headers.findIndex((h) =>
      h.includes("转股溢价率"),
    );
    const shengYuGuiMoIndex = table1Headers.findIndex((h) =>
      h.includes("剩余规模"),
    );

    // 在表头最后添加评分A列
    mergedHeaders.push("评分A");

    // 合并数据
    const merged = [mergedHeaders]; // 表头
    for (let i = 1; i < table1.length; i++) {
      const row = [...table1[i]];
      const code = row[table1CodeIndex];
      const qiangShuTian = table2Map[code] || "";

      // 找到转债名称列的索引
      const zhuanZhaiIndex = table1Headers.findIndex((h) =>
        h.includes("转债名称"),
      );
      if (zhuanZhaiIndex !== -1) {
        // 在强赎状态后面插入强赎天计数（转债名称后第1列）
        row.splice(zhuanZhaiIndex + 2, 0, qiangShuTian);
      }

      // 计算评分A：现价 + 转股溢价率 + 剩余规模(亿元)*10
      let pingFenA = "";
      if (
        xianJiaIndex !== -1 &&
        zhuanGuYiJiaLvIndex !== -1 &&
        shengYuGuiMoIndex !== -1
      ) {
        const xianJia = parseFloat(row[xianJiaIndex]) || 0;
        const zhuanGuYiJiaLv = parseFloat(row[zhuanGuYiJiaLvIndex]) || 0;
        const shengYuGuiMo = parseFloat(row[shengYuGuiMoIndex]) || 0;
        pingFenA = (xianJia + zhuanGuYiJiaLv + shengYuGuiMo * 10).toFixed(2);
      }

      // 在最后一列添加评分A
      row.push(pingFenA);

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
    iframe.id = "dataIframe";
    iframe.style.cssText = `
      position: fixed;
      top: 60px;
      left: 10px;
      width: calc(100% - 20px);
      height: calc(100vh - 80px);
      border: 1px solid #ccc;
      z-index: 9999;
      border-radius: 4px;
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
            margin: 0;
            background-color: #f8f9fa;
          }
          .header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 15px;
          }
          h1 {
            margin: 0;
            font-size: 18px;
            font-weight: bold;
          }
          .close-button {
            background: #f44336;
            color: white;
            border: none;
            border-radius: 4px;
            padding: 4px 8px;
            cursor: pointer;
            font-size: 14px;
          }
          .close-button:hover {
            background: #d32f2f;
          }
          .filter-container {
            background-color: #f8f9fa;
            padding: 10px;
            margin-bottom: 10px;
            border-radius: 4px;
            border: 1px solid #ddd;
            display: flex;
            align-items: center;
            gap: 20px;
            flex-wrap: wrap;
          }
          .filter-item {
            display: flex;
            align-items: center;
            gap: 10px;
          }
          .filter-item label {
            font-weight: bold;
            font-size: 12px;
            white-space: nowrap;
          }
          .dropdown-filter {
            position: relative;
            min-width: 120px;
          }
          .filter-button {
            padding: 6px 16px;
            border: 1px solid #ddd;
            border-radius: 3px;
            background-color: #f8f9fa;
            font-size: 12px;
            cursor: pointer;
            min-width: 80px;
            text-align: center;
            user-select: none;
          }
          .filter-button:hover {
            background-color: #e3f2fd;
          }
          .filter-button:active {
            background-color: #bbdefb;
          }
          .filter-options {
            position: absolute;
            top: 100%;
            left: 0;
            right: 0;
            background-color: white;
            border: 1px solid #ddd;
            border-radius: 0 0 3px 3px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            max-height: 200px;
            overflow-y: auto;
            z-index: 1000;
            display: none;
          }
          .filter-options.show {
            display: block;
          }
          #optionsList {
            padding: 5px;
          }
          .option-item {
            padding: 4px 8px;
            cursor: pointer;
            font-size: 12px;
            border-radius: 2px;
          }
          .option-item:hover {
            background-color: #f0f0f0;
          }
          .option-item.selected {
            background-color: #e3f2fd;
            font-weight: bold;
          }
          .filter-actions {
            border-top: 1px solid #eee;
            padding: 5px;
            margin-top: 5px;
            text-align: right;
          }
          .filter-action-button {
            padding: 4px 12px;
            border: 1px solid #ddd;
            border-radius: 3px;
            background-color: #f8f9fa;
            font-size: 11px;
            cursor: pointer;
          }
          .filter-action-button:hover {
            background-color: #e3f2fd;
          }
          .filter-select {
            padding: 6px 12px;
            border: 1px solid #ddd;
            border-radius: 3px;
            font-size: 12px;
            min-width: 100px;
          }
          .filter-input {
            padding: 6px 12px;
            border: 1px solid #ddd;
            border-radius: 3px;
            font-size: 12px;
            width: 80px;
          }
          /* 移动端触摸优化 */
          @media (max-width: 768px) {
            .filter-item {
              flex-direction: column;
              align-items: flex-start;
              gap: 8px;
            }
            .dropdown-filter {
              min-width: 100%;
            }
            .filter-button {
              padding: 8px 20px;
              min-width: 100px;
              width: 100%;
            }
            .filter-options {
              left: 0;
              right: 0;
            }
          }
          #dataTable {
            width: 100% !important;
            border-collapse: collapse !important;
            font-size: 12px !important;
          }
          #dataTable th, #dataTable td {
            padding: 4px 6px !important;
            text-align: left !important;
            border-bottom: 1px solid #ddd !important;
            white-space: nowrap !important;
          }
          #dataTable th {
            padding-right: 20px !important; /* 为排序按钮留出空间 */
          }
          #dataTable th.sorting, #dataTable th.sorting_asc, #dataTable th.sorting_desc {
            background-position: right 5px center !important; /* 调整排序按钮位置 */
          }
          #dataTable th select {
            width: 100% !important;
            padding: 2px 4px !important;
            border: 1px solid #ddd !important;
            border-radius: 3px !important;
            background-color: white !important;
            font-size: 11px !important;
          }
          #dataTable th {
            background-color: #4CAF50 !important;
            color: white !important;
            font-weight: bold !important;
            position: sticky !important;
            top: 0 !important;
            z-index: 10 !important;
          }
          #dataTable tbody tr:nth-child(even) {
            background-color: #f8f9fa !important;
          }
          #dataTable tbody tr:nth-child(odd) {
            background-color: #ffffff !important;
          }
          #dataTable tbody tr:hover {
            background-color: #e3f2fd !important;
          }
          .dataTables_wrapper {
            font-size: 12px;
          }
          .dataTables_length select {
            font-size: 12px;
            padding: 2px;
          }
          .dataTables_filter input {
            font-size: 12px;
            padding: 2px;
          }
          .dataTables_paginate {
            font-size: 12px;
          }
          .dataTables_info {
            font-size: 12px;
          }
          .filter-actions {
            display: flex;
            gap: 10px;
            align-items: center;
            padding: 10px;
            background-color: #f5f5f5;
            border-bottom: 1px solid #ddd;
          }
          .action-button {
            padding: 6px 12px;
            font-size: 12px;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            transition: background-color 0.2s;
          }
          .reset-button {
            background-color: #ff6b6b;
            color: white;
          }
          .reset-button:hover {
            background-color: #ff5252;
          }
          .save-button {
            background-color: #4CAF50;
            color: white;
          }
          .save-button:hover {
            background-color: #45a049;
          }
          .delete-button {
            background-color: #ff9800;
            color: white;
          }
          .delete-button:hover {
            background-color: #f57c00;
          }
          .preset-select {
            min-width: 120px;
          }
        </style>
      </head>
      <body>
        <div class="header">
        <h3>集思录可转债数据</h3>
        <button class="close-button" onclick="window.parent.document.getElementById('dataIframe').remove()">×</button>
      </div>
      <div class="filter-container">
        <div class="filter-item">
          <label>强赎状态：</label>
          <div class="dropdown-filter">
            <button id="filterToggle" class="filter-button">选择状态</button>
            <div id="filterOptions" class="filter-options">
              <div id="optionsList"></div>
            </div>
          </div>
        </div>
        <div class="filter-item">
          <label>评级：</label>
          <div class="dropdown-filter">
            <button id="ratingFilterToggle" class="filter-button">选择评级</button>
            <div id="ratingFilterOptions" class="filter-options">
              <div id="ratingOptionsList"></div>
            </div>
          </div>
        </div>
        <div class="filter-item">
          <label>现价：</label>
          <select id="priceOperator" class="filter-select">
            <option value="">选择操作</option>
            <option value="gte">大于等于</option>
            <option value="lte">小于等于</option>
            <option value="between">区间</option>
          </select>
          <input type="number" id="priceValue1" placeholder="价格" step="0.01" class="filter-input">
          <input type="number" id="priceValue2" placeholder="到" step="0.01" class="filter-input" style="display: none;">
        </div>
        <div class="filter-item">
          <label>转股溢价率：</label>
          <select id="premiumOperator" class="filter-select">
            <option value="">选择操作</option>
            <option value="gte">大于等于</option>
            <option value="lte">小于等于</option>
            <option value="between">区间</option>
          </select>
          <input type="number" id="premiumValue1" placeholder="百分比" step="0.01" class="filter-input">
          <input type="number" id="premiumValue2" placeholder="到" step="0.01" class="filter-input" style="display: none;">
        </div>
        <div class="filter-item">
          <label>剩余年限：</label>
          <select id="yearsOperator" class="filter-select">
            <option value="">选择操作</option>
            <option value="gte">大于等于</option>
            <option value="lte">小于等于</option>
            <option value="between">区间</option>
          </select>
          <input type="number" id="yearsValue1" placeholder="年" step="0.01" class="filter-input">
          <input type="number" id="yearsValue2" placeholder="到" step="0.01" class="filter-input" style="display: none;">
        </div>
        <div class="filter-item">
          <label>剩余规模：</label>
          <select id="scaleOperator" class="filter-select">
            <option value="">选择操作</option>
            <option value="gte">大于等于</option>
            <option value="lte">小于等于</option>
            <option value="between">区间</option>
          </select>
          <input type="number" id="scaleValue1" placeholder="亿元" step="0.01" class="filter-input">
          <input type="number" id="scaleValue2" placeholder="到" step="0.01" class="filter-input" style="display: none;">
        </div>
        <div class="filter-item">
          <label>正股价：</label>
          <select id="stockPriceOperator" class="filter-select">
            <option value="">选择操作</option>
            <option value="gte">大于等于</option>
            <option value="lte">小于等于</option>
            <option value="between">区间</option>
          </select>
          <input type="number" id="stockPriceValue1" placeholder="价格" step="0.01" class="filter-input">
          <input type="number" id="stockPriceValue2" placeholder="到" step="0.01" class="filter-input" style="display: none;">
        </div>
        <div class="filter-item">
          <label>正股名称：</label>
          <select id="stockNameOperator" class="filter-select">
            <option value="">选择操作</option>
            <option value="contains">包含</option>
            <option value="not_contains">不包含</option>
          </select>
          <input type="text" id="stockNameValue" placeholder="正股名称" class="filter-input">
        </div>
      </div>
      <div class="filter-actions">
          <button id="resetFilters" class="action-button reset-button">重置条件</button>
          <button id="applyFilters" class="action-button save-button">执行筛选</button>
          <button id="savePreset" class="action-button save-button">保存预设</button>
          <select id="presetSelect" class="filter-select preset-select">
            <option value="">选择预设</option>
          </select>
          <button id="deletePreset" class="action-button delete-button">删除预设</button>
        </div>
      <div class="content">
        <table id="dataTable">
          <thead>
            <tr>
              ${data[0].map((header) => `<th>${header}</th>`).join("")}
            </tr>
          </thead>
          <tbody>
            ${data
              .slice(1)
              .map((row) => {
                return `
                  <tr>
                    ${row.map((cell) => `<td>${cell}</td>`).join("")}
                  </tr>
                `;
              })
              .join("")}
          </tbody>
        </table>
        <script src="https://code.jquery.com/jquery-3.6.0.min.js"></script>
        <script src="https://cdn.datatables.net/1.11.5/js/jquery.dataTables.min.js"></script>
        <script>
          $(document).ready(function() {
            // 查找强赎状态列的索引
            let qiangShuStatusIndex = 0;
            // 查找评级列的索引
            let ratingIndex = 0;
            
            $('#dataTable th').each(function(index) {
              if ($(this).text().includes('强赎状态')) {
                qiangShuStatusIndex = index;
              }
              if ($(this).text().includes('评级')) {
                ratingIndex = index;
              }
            });
            
            // 保存原始数据到全局变量
            window.originalData = [];
            $('#dataTable tbody tr').each(function() {
              const row = [];
              $(this).find('td').each(function() {
                row.push($(this).text());
              });
              window.originalData.push(row);
            });
            
            const table = $('#dataTable').DataTable({
              "paging": false,
              "lengthChange": false,
              "searching": false,
              "ordering": true,
              "info": true,
              "autoWidth": false,
              "pageLength": 10000, // 设置一个较大的值，确保显示全部数据
              "order": [[qiangShuStatusIndex, "desc"]], // 默认按强赎状态降序排序
              "language": {
                "sProcessing": "处理中...",
                "sLengthMenu": "显示 _MENU_ 条记录",
                "sZeroRecords": "没有匹配结果",
                "sInfo": "显示第 _START_ 至 _END_ 条记录，共 _TOTAL_ 条",
                "sInfoEmpty": "显示第 0 至 0 条记录，共 0 条",
                "sInfoFiltered": "(由 _MAX_ 条记录过滤)",
                "sInfoPostFix": "",
                "sSearch": "搜索:",
                "sUrl": "",
                "sEmptyTable": "表中数据为空",
                "sLoadingRecords": "载入中...",
                "sInfoThousands": ",",
                "oPaginate": {
                  "sFirst": "首页",
                  "sPrevious": "上页",
                  "sNext": "下页",
                  "sLast": "末页"
                },
                "oAria": {
                  "sSortAscending": ": 以升序排列此列",
                  "sSortDescending": ": 以降序排列此列"
                }
              }
            });
            
            // 存储选中的强赎状态
            let selectedStatuses = [];
            // 存储选中的评级
            let selectedRatings = [];
            
            // 填充强赎状态筛选选项
            if (qiangShuStatusIndex > 0) {
              const qiangShuValues = table.column(qiangShuStatusIndex).data().unique().sort();
              const optionsList = $('#optionsList');
              
              qiangShuValues.each(function(value) {
                if (value) {
                  const optionItem = $('<div class="option-item" data-value="' + value + '">' + value + '</div>');
                  optionItem.on('click', function() {
                    const val = $(this).data('value');
                    const index = selectedStatuses.indexOf(val);
                    
                    if (index > -1) {
                      // 取消选择
                      selectedStatuses.splice(index, 1);
                      $(this).removeClass('selected');
                    } else {
                      // 选择
                      selectedStatuses.push(val);
                      $(this).addClass('selected');
                    }
                  });
                  optionsList.append(optionItem);
                }
              });
            }
            
            // 填充评级筛选选项
            if (ratingIndex > 0) {
              const ratingValues = table.column(ratingIndex).data().unique().sort();
              const ratingOptionsList = $('#ratingOptionsList');
              
              ratingValues.each(function(value) {
                if (value) {
                  const optionItem = $('<div class="option-item" data-value="' + value + '">' + value + '</div>');
                  optionItem.on('click', function() {
                    const val = $(this).data('value');
                    const index = selectedRatings.indexOf(val);
                    
                    if (index > -1) {
                      // 取消选择
                      selectedRatings.splice(index, 1);
                      $(this).removeClass('selected');
                    } else {
                      // 选择
                      selectedRatings.push(val);
                      $(this).addClass('selected');
                    }
                  });
                  ratingOptionsList.append(optionItem);
                }
              });
            }
            
            // 切换强赎状态筛选选项显示/隐藏
            $('#filterToggle').on('click', function() {
              $('#filterOptions').toggleClass('show');
              $('#ratingFilterOptions').removeClass('show');
            });
            
            // 切换评级筛选选项显示/隐藏
            $('#ratingFilterToggle').on('click', function() {
              $('#ratingFilterOptions').toggleClass('show');
              $('#filterOptions').removeClass('show');
            });
            
            // 点击其他地方关闭筛选选项
            $(document).on('click', function(event) {
              if (!$(event.target).closest('.dropdown-filter').length) {
                $('#filterOptions').removeClass('show');
                $('#ratingFilterOptions').removeClass('show');
              }
            });
            

            

            
            // 现价筛选逻辑
            let priceIndex = 0;
            // 查找现价列的索引
            $('#dataTable th').each(function(index) {
              if ($(this).text().includes('现价')) {
                priceIndex = index;
              }
            });
            
            // 监听操作符变化，控制第二个输入框的显示
            $('#priceOperator').on('change', function() {
              if ($(this).val() === 'between') {
                $('#priceValue2').show();
              } else {
                $('#priceValue2').hide();
              }
            });
            
            // 转股溢价率筛选逻辑
            let premiumIndex = 0;
            // 查找转股溢价率列的索引
            $('#dataTable th').each(function(index) {
              if ($(this).text().includes('转股溢价率')) {
                premiumIndex = index;
              }
            });
            
            // 剩余年限筛选逻辑
            let yearsIndex = 0;
            // 查找剩余年限列的索引
            $('#dataTable th').each(function(index) {
              if ($(this).text().includes('剩余年限')) {
                yearsIndex = index;
              }
            });
            
            // 剩余规模筛选逻辑
            let scaleIndex = 0;
            // 查找剩余规模列的索引
            $('#dataTable th').each(function(index) {
              if ($(this).text().includes('剩余规模')) {
                scaleIndex = index;
              }
            });
            
            // 正股价筛选逻辑
            let stockPriceIndex = 0;
            // 查找正股价列的索引
            $('#dataTable th').each(function(index) {
              if ($(this).text().includes('正股价')) {
                stockPriceIndex = index;
              }
            });
            
            // 正股名称筛选逻辑
            let stockNameIndex = 0;
            // 查找正股名称列的索引
            $('#dataTable th').each(function(index) {
              if ($(this).text().includes('正股名称')) {
                stockNameIndex = index;
              }
            });
            
            // 统一应用所有筛选器
            function applyAllFilters() {
              // 获取所有列的索引
              let priceIndex = 0;
              let premiumIndex = 0;
              let yearsIndex = 0;
              let scaleIndex = 0;
              let stockPriceIndex = 0;
              let stockNameIndex = 0;
              let qiangShuStatusColIndex = 0;
              let ratingColIndex = 0;
              
              $('#dataTable th').each(function(index) {
                const text = $(this).text();
                if (text.includes('现价')) priceIndex = index;
                else if (text.includes('转股溢价率')) premiumIndex = index;
                else if (text.includes('剩余年限')) yearsIndex = index;
                else if (text.includes('剩余规模')) scaleIndex = index;
                else if (text.includes('正股价')) stockPriceIndex = index;
                else if (text.includes('正股名称')) stockNameIndex = index;
                else if (text.includes('强赎状态')) qiangShuStatusColIndex = index;
                else if (text.includes('评级')) ratingColIndex = index;
              });
              
              // 获取筛选值
              const priceOperator = $('#priceOperator').val();
              const priceValue1 = parseFloat($('#priceValue1').val()) || 0;
              const priceValue2 = parseFloat($('#priceValue2').val()) || 0;
              
              const premiumOperator = $('#premiumOperator').val();
              const premiumValue1 = parseFloat($('#premiumValue1').val()) || 0;
              const premiumValue2 = parseFloat($('#premiumValue2').val()) || 0;
              
              const yearsOperator = $('#yearsOperator').val();
              const yearsValue1 = parseFloat($('#yearsValue1').val()) || 0;
              const yearsValue2 = parseFloat($('#yearsValue2').val()) || 0;
              
              const scaleOperator = $('#scaleOperator').val();
              const scaleValue1 = parseFloat($('#scaleValue1').val()) || 0;
              const scaleValue2 = parseFloat($('#scaleValue2').val()) || 0;
              
              const stockPriceOperator = $('#stockPriceOperator').val();
              const stockPriceValue1 = parseFloat($('#stockPriceValue1').val()) || 0;
              const stockPriceValue2 = parseFloat($('#stockPriceValue2').val()) || 0;
              
              const stockNameOperator = $('#stockNameOperator').val();
              const stockNameValue = $('#stockNameValue').val().trim();
              
              const currentSelectedStatuses = selectedStatuses;
              const currentSelectedRatings = selectedRatings;
              
              // 使用保存的原始数据进行筛选
              const originalData = window.originalData;
              
              // 过滤数据
              const filteredData = originalData.filter(function(row) {
                // 正股名称筛选
                if (stockNameOperator && stockNameValue) {
                  const stockName = row[stockNameIndex] || '';
                  if (stockNameOperator === 'contains' && !stockName.includes(stockNameValue)) return false;
                  if (stockNameOperator === 'not_contains' && stockName.includes(stockNameValue)) return false;
                }
                
                // 现价筛选
                if (priceOperator) {
                  const price = parseFloat(row[priceIndex]);
                  if (isNaN(price)) return false;
                  if (priceOperator === 'gte' && price < priceValue1) return false;
                  if (priceOperator === 'lte' && price > priceValue1) return false;
                  if (priceOperator === 'between' && (price < priceValue1 || price > priceValue2)) return false;
                }
                
                // 转股溢价率筛选
                if (premiumOperator) {
                  const premiumText = row[premiumIndex];
                  if (premiumText === '' || premiumText === '-') return false;
                  const premium = parseFloat(premiumText);
                  if (isNaN(premium)) return false;
                  if (premiumOperator === 'gte' && premium < premiumValue1) return false;
                  if (premiumOperator === 'lte' && premium > premiumValue1) return false;
                  if (premiumOperator === 'between' && (premium < premiumValue1 || premium > premiumValue2)) return false;
                }
                
                // 剩余年限筛选
                if (yearsOperator) {
                  const yearsText = row[yearsIndex];
                  if (yearsText === '' || yearsText === '-') return false;
                  const years = parseFloat(yearsText);
                  if (isNaN(years)) return false;
                  if (yearsOperator === 'gte' && years < yearsValue1) return false;
                  if (yearsOperator === 'lte' && years > yearsValue1) return false;
                  if (yearsOperator === 'between' && (years < yearsValue1 || years > yearsValue2)) return false;
                }
                
                // 剩余规模筛选
                if (scaleOperator) {
                  const scale = parseFloat(row[scaleIndex]);
                  if (isNaN(scale)) return false;
                  if (scaleOperator === 'gte' && scale < scaleValue1) return false;
                  if (scaleOperator === 'lte' && scale > scaleValue1) return false;
                  if (scaleOperator === 'between' && (scale < scaleValue1 || scale > scaleValue2)) return false;
                }
                
                // 正股价筛选
                if (stockPriceOperator) {
                  const stockPrice = parseFloat(row[stockPriceIndex]);
                  if (isNaN(stockPrice)) return false;
                  if (stockPriceOperator === 'gte' && stockPrice < stockPriceValue1) return false;
                  if (stockPriceOperator === 'lte' && stockPrice > stockPriceValue1) return false;
                  if (stockPriceOperator === 'between' && (stockPrice < stockPriceValue1 || stockPrice > stockPriceValue2)) return false;
                }
                
                // 强赎状态筛选
                if (currentSelectedStatuses.length > 0) {
                  const qiangShuStatus = row[qiangShuStatusColIndex] || '';
                  if (!currentSelectedStatuses.includes(qiangShuStatus)) return false;
                }
                
                // 评级筛选
                if (currentSelectedRatings.length > 0) {
                  const rating = row[ratingColIndex] || '';
                  if (!currentSelectedRatings.includes(rating)) return false;
                }
                
                return true;
              });
              
              // 清除表格并重新加载过滤后的数据
              table.clear().rows.add(filteredData).draw();
              
              // 更新记录数量
              $('#recordCount').text('记录数量: ' + filteredData.length);
            }
            
            // 监听操作符变化，控制第二个输入框的显示
            $('#priceOperator, #premiumOperator, #yearsOperator, #scaleOperator, #stockPriceOperator').on('change', function() {
              const id = $(this).attr('id');
              const value2Id = id.replace('Operator', 'Value2');
              if ($(this).val() === 'between') {
                $('#' + value2Id).show();
              } else {
                $('#' + value2Id).hide();
              }
            });
            
            // 点击筛选按钮执行所有筛选
            $('#applyFilters').on('click', function() {
              console.log('执行筛选');
              applyAllFilters();
            });
            
            // 重置所有筛选条件
            function resetAllFilters() {
              // 重置强赎状态
              selectedStatuses = [];
              $('#optionsList .option-item').removeClass('selected');
              $('#filterToggle').text('选择状态');
              
              // 重置评级
              selectedRatings = [];
              $('#ratingOptionsList .option-item').removeClass('selected');
              $('#ratingFilterToggle').text('选择评级');
              
              // 重置所有操作符和输入框
              $('#priceOperator, #premiumOperator, #yearsOperator, #scaleOperator, #stockPriceOperator, #stockNameOperator').val('');
              $('#priceValue1, #priceValue2, #premiumValue1, #premiumValue2, #yearsValue1, #yearsValue2, #scaleValue1, #scaleValue2, #stockPriceValue1, #stockPriceValue2, #stockNameValue').val('');
              $('#priceValue2, #premiumValue2, #yearsValue2, #scaleValue2, #stockPriceValue2').hide();
              
              // 重置预设选择
              $('#presetSelect').val('');
              
              // 重新加载原始数据
              table.clear().rows.add(window.originalData).draw();
              
              // 更新记录数量
              $('#recordCount').text('记录数量: ' + window.originalData.length);
            }
            
            // 获取当前筛选条件
            function getCurrentFilters() {
              return {
                selectedStatuses: selectedStatuses,
                selectedRatings: selectedRatings,
                priceOperator: $('#priceOperator').val(),
                priceValue1: $('#priceValue1').val(),
                priceValue2: $('#priceValue2').val(),
                premiumOperator: $('#premiumOperator').val(),
                premiumValue1: $('#premiumValue1').val(),
                premiumValue2: $('#premiumValue2').val(),
                yearsOperator: $('#yearsOperator').val(),
                yearsValue1: $('#yearsValue1').val(),
                yearsValue2: $('#yearsValue2').val(),
                scaleOperator: $('#scaleOperator').val(),
                scaleValue1: $('#scaleValue1').val(),
                scaleValue2: $('#scaleValue2').val(),
                stockPriceOperator: $('#stockPriceOperator').val(),
                stockPriceValue1: $('#stockPriceValue1').val(),
                stockPriceValue2: $('#stockPriceValue2').val(),
                stockNameOperator: $('#stockNameOperator').val(),
                stockNameValue: $('#stockNameValue').val()
              };
            }
            
            // 应用筛选条件
            function applyFilters(filterData) {
              // 应用强赎状态
              selectedStatuses = filterData.selectedStatuses || [];
              $('#optionsList .option-item').removeClass('selected');
              selectedStatuses.forEach(function(status) {
                $('#optionsList .option-item[data-value="' + status + '"]').addClass('selected');
              });
              $('#filterToggle').text(selectedStatuses.length > 0 ? '已选择' + selectedStatuses.length + '项' : '选择状态');
              
              // 应用评级
              selectedRatings = filterData.selectedRatings || [];
              $('#ratingOptionsList .option-item').removeClass('selected');
              selectedRatings.forEach(function(rating) {
                $('#ratingOptionsList .option-item[data-value="' + rating + '"]').addClass('selected');
              });
              $('#ratingFilterToggle').text(selectedRatings.length > 0 ? '已选择' + selectedRatings.length + '项' : '选择评级');
              
              // 应用数值筛选
              $('#priceOperator').val(filterData.priceOperator || '');
              $('#priceValue1').val(filterData.priceValue1 || '');
              $('#priceValue2').val(filterData.priceValue2 || '');
              if (filterData.priceOperator === 'between') {
                $('#priceValue2').show();
              } else {
                $('#priceValue2').hide();
              }
              
              $('#premiumOperator').val(filterData.premiumOperator || '');
              $('#premiumValue1').val(filterData.premiumValue1 || '');
              $('#premiumValue2').val(filterData.premiumValue2 || '');
              if (filterData.premiumOperator === 'between') {
                $('#premiumValue2').show();
              } else {
                $('#premiumValue2').hide();
              }
              
              $('#yearsOperator').val(filterData.yearsOperator || '');
              $('#yearsValue1').val(filterData.yearsValue1 || '');
              $('#yearsValue2').val(filterData.yearsValue2 || '');
              if (filterData.yearsOperator === 'between') {
                $('#yearsValue2').show();
              } else {
                $('#yearsValue2').hide();
              }
              
              $('#scaleOperator').val(filterData.scaleOperator || '');
              $('#scaleValue1').val(filterData.scaleValue1 || '');
              $('#scaleValue2').val(filterData.scaleValue2 || '');
              if (filterData.scaleOperator === 'between') {
                $('#scaleValue2').show();
              } else {
                $('#scaleValue2').hide();
              }
              
              $('#stockPriceOperator').val(filterData.stockPriceOperator || '');
              $('#stockPriceValue1').val(filterData.stockPriceValue1 || '');
              $('#stockPriceValue2').val(filterData.stockPriceValue2 || '');
              if (filterData.stockPriceOperator === 'between') {
                $('#stockPriceValue2').show();
              } else {
                $('#stockPriceValue2').hide();
              }
              
              // 应用正股名称筛选
              $('#stockNameOperator').val(filterData.stockNameOperator || '');
              $('#stockNameValue').val(filterData.stockNameValue || '');
              
              applyAllFilters();
            }
            
            // 从父页面加载预设列表
            function loadPresets(selectedName) {
              // 发送消息给父页面，请求预设列表
              window.parent.postMessage({ 
                type: 'jisilu_get_presets' 
              }, '*');
            }
            
            // 保存预设
            function savePreset() {
              const name = prompt('请输入预设名称：');
              if (!name || name.trim() === '') {
                return;
              }
              
              // 发送消息给父页面，保存预设
              window.parent.postMessage({ 
                type: 'jisilu_save_preset', 
                name: name.trim(),
                filters: getCurrentFilters() 
              }, '*');
            }
            
            // 删除预设
            function deletePreset() {
              const name = $('#presetSelect').val();
              if (!name) {
                alert('请先选择一个预设！');
                return;
              }
              
              if (!confirm('确定要删除预设"' + name + '"吗？')) {
                return;
              }
              
              // 发送消息给父页面，删除预设
              window.parent.postMessage({ 
                type: 'jisilu_delete_preset', 
                name: name 
              }, '*');
            }
            
            // 使用预设
            function usePreset() {
              const name = $('#presetSelect').val();
              if (!name) {
                return;
              }
              
              // 发送消息给父页面，获取预设详情
              window.parent.postMessage({ 
                type: 'jisilu_get_preset', 
                name: name 
              }, '*');
            }
            
            // 接收父页面的消息
            window.addEventListener('message', function(event) {
              if (event.data.type === 'jisilu_presets_list') {
                // 接收到预设列表
                const presets = event.data.presets || {};
                const selectedName = event.data.selectedName;
                const $select = $('#presetSelect');
                $select.html('<option value="">选择预设</option>');
                
                Object.keys(presets).forEach(function(name) {
                  $select.append('<option value="' + name + '">' + name + '</option>');
                });
                
                // 如果有指定选中的预设，则选中它
                if (selectedName) {
                  $select.val(selectedName);
                }
              } else if (event.data.type === 'jisilu_preset_saved') {
                // 预设保存成功
                alert('预设已保存！');
                // 重新加载预设列表并选中新保存的预设
                loadPresets(event.data.name);
              } else if (event.data.type === 'jisilu_preset_deleted') {
                // 预设删除成功
                alert('预设已删除！');
                // 重新加载预设列表
                loadPresets();
                $('#presetSelect').val('');
              } else if (event.data.type === 'jisilu_preset_data') {
                // 接收到预设详情
                const preset = event.data.preset;
                if (preset) {
                  applyFilters(preset);
                }
              }
            });
            
            // 绑定按钮事件
            $('#resetFilters').on('click', resetAllFilters);
            $('#savePreset').on('click', savePreset);
            $('#deletePreset').on('click', deletePreset);
            $('#presetSelect').on('change', usePreset);
            
            // 加载预设列表
            loadPresets();

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
      if (table1Data.length === 0 || table2Data.length === 0) {
        alert("请先提取可转债数据和强赎数据！");
        return;
      }
      // 自动合并数据
      mergedData = mergeData(table1Data, table2Data);
      if (mergedData.length === 0) {
        alert("数据合并失败！");
        return;
      }
      showDataInIframe(mergedData);
    });

    // 添加按钮到容器
    buttonContainer.appendChild(extractTable1Button);
    buttonContainer.appendChild(extractTable2Button);
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

  // 监听来自iframe的消息
  window.addEventListener("message", function (event) {
    // 处理预设相关的消息
    if (event.data.type === "jisilu_get_presets") {
      // 获取预设列表
      const presets = GM_getValue("jisilu_filter_presets", {});
      // 发送预设列表给iframe
      event.source.postMessage(
        {
          type: "jisilu_presets_list",
          presets: presets,
        },
        "*",
      );
    } else if (event.data.type === "jisilu_save_preset") {
      // 保存预设
      const name = event.data.name;
      const filters = event.data.filters;
      const presets = GM_getValue("jisilu_filter_presets", {});
      presets[name] = filters;
      GM_setValue("jisilu_filter_presets", presets);
      // 发送保存成功消息给iframe
      event.source.postMessage(
        {
          type: "jisilu_preset_saved",
          name: name,
        },
        "*",
      );
    } else if (event.data.type === "jisilu_delete_preset") {
      // 删除预设
      const name = event.data.name;
      const presets = GM_getValue("jisilu_filter_presets", {});
      delete presets[name];
      GM_setValue("jisilu_filter_presets", presets);
      // 发送删除成功消息给iframe
      event.source.postMessage(
        {
          type: "jisilu_preset_deleted",
        },
        "*",
      );
    } else if (event.data.type === "jisilu_get_preset") {
      // 获取预设详情
      const name = event.data.name;
      const presets = GM_getValue("jisilu_filter_presets", {});
      const preset = presets[name];
      // 发送预设详情给iframe
      event.source.postMessage(
        {
          type: "jisilu_preset_data",
          preset: preset,
        },
        "*",
      );
    }
  });
})();
