// ==UserScript==
// @name         投资项目入库审核平台填写信息
// @namespace    https://github.com/hanj1998
// @version      1.0.1
// @description  自动填写区县/地市现场核实人及时间
// @author       hanj1998@foxmail.com
// @match        *://10.42.181.70/*
// @grant        none
// @require      https://cdn.bootcdn.net/ajax/libs/xlsx/0.18.5/xlsx.full.min.js
// @updateURL    https://jsd.onmicrosoft.cn/gh/HANJ1998/scripts@main/投资项目入库审核平台填写信息.js
// @downloadURL  https://jsd.onmicrosoft.cn/gh/HANJ1998/scripts@main/投资项目入库审核平台填写信息.js
// ==/UserScript==

(async function () {
  "use strict";

  const FILE_ACCEPT = ".xlsx";
  const PRIMARY_HEADER = "项目代码";
  const ROW_SELECTOR =
    "#app > div > div > main > div:nth-child(2) > div > div > div:nth-child(2) > div > div > div > div:nth-child(2) > div:nth-child(1) > div tr";
  const PROJECT_CODE_COLUMN = 2; // 项目代码 td[3]

  const FIELD_CONFIGS = [
    { header: "区县现场核实人", pageIndex: 62 }, // td[63]
    { header: "区县现场核实时间", pageIndex: 63 }, // td[64]
    { header: "地市现场核实人", pageIndex: 64 }, // td[65]
    { header: "地市现场核实时间", pageIndex: 65 }, // td[66]
  ];

  const DEBUG = true;
  function logDebug(...args) {
    if (DEBUG) {
      console.log("[调试]", ...args);
    }
  }

  await ensureXlsxLoaded();
  attachInitListener();

  function attachInitListener() {
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", init);
    } else {
      init();
    }
  }

  async function ensureXlsxLoaded() {
    if (typeof XLSX !== "undefined") {
      return;
    }
    console.log("等待 XLSX 库加载...");
    await new Promise((resolve) => setTimeout(resolve, 500));
    if (typeof XLSX === "undefined") {
      console.error("XLSX 库未加载，请检查 @require URL");
      throw new Error("XLSX 未加载");
    }
  }

  function init() {
    const container = document.createElement("div");
    container.style.position = "fixed";
    container.style.top = "10px";
    container.style.right = "10px";
    container.style.zIndex = "9999";
    container.style.background = "white";
    container.style.border = "1px solid black";
    container.style.padding = "10px";

    const fileInput = createFileInput();
    const button = createButton("填表", () => {
      fileInput.value = "";
      fileInput.click();
    });

    container.appendChild(button);
    container.appendChild(fileInput);
    document.body.appendChild(container);
  }

  function createFileInput() {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = FILE_ACCEPT;
    input.style.display = "none";
    input.addEventListener("change", () => {
      if (input.files && input.files.length > 0) {
        processFile(input.files[0]);
      }
    });
    return input;
  }

  function createButton(label, onClick) {
    const button = document.createElement("button");
    button.textContent = label;
    button.addEventListener("click", onClick);
    return button;
  }

  async function processFile(file) {
    console.log("开始处理文件");
    logDebug("processFile 开始", {
      fileName: file?.name,
      fileSize: file?.size,
      fileType: file?.type,
    });
    if (!file) {
      alert("请选择xlsx文件");
      return;
    }

    const workbook = await readWorkbook(file);
    logDebug("加载成功，工作簿名称", workbook.SheetNames);
    const jsonData = readSheetAsJson(workbook);
    logDebug("解析后行数", jsonData.length);

    if (!Array.isArray(jsonData) || jsonData.length < 2) {
      alert("文件内容不正确，请检查xlsx格式");
      return;
    }

    const headers = Array.isArray(jsonData[0]) ? jsonData[0] : [];
    const dataRows = jsonData.slice(1);
    const headerMap = buildHeaderMap(headers);
    logDebug("文件表头", headers);
    logDebug("表头映射", headerMap);

    const projectCodeIndex = headerMap[PRIMARY_HEADER];
    const activeFields = FIELD_CONFIGS.map((field) => ({
      ...field,
      sourceIndex: headerMap[field.header],
    })).filter((field) => field.sourceIndex !== undefined);
    logDebug(
      "激活字段",
      activeFields.map((field) => field.header),
    );

    if (projectCodeIndex === undefined || activeFields.length === 0) {
      alert(
        `文件格式不正确，表头应包含：${PRIMARY_HEADER}，以及至少一个数据列：${FIELD_CONFIGS.map(
          (field) => field.header,
        ).join("、")}`,
      );
      return;
    }

    const rows = queryDataRows();
    logDebug("查询页面数据行数", rows.length);
    if (rows.length === 0) {
      alert("未找到任何数据行，请检查页面结构");
      return;
    }

    console.log("页面总数据行数：", rows.length);
    console.log(
      "激活指标：",
      activeFields.map((field) => field.header),
    );

    const matchedPageCodes = new Set();

    for (const row of dataRows) {
      const code = normalizeValue(row[projectCodeIndex]);
      if (!code) {
        continue;
      }

      console.log("正在处理项目代码：", code);
      const targetRow = findRowByProjectCode(rows, code);
      if (!targetRow) {
        console.log("未找到对应页面行，跳过项目代码：", code);
        continue;
      }

      matchedPageCodes.add(code);
      const cells = targetRow.querySelectorAll("td");
      await fillRow(cells, row, activeFields);
      await sleep(500);
    }

    console.log("页面中匹配到文件的行数：", matchedPageCodes.size);
    console.log("填写完成");
    alert("填写完成");
  }

  async function readWorkbook(file) {
    const data = await readFileAsArrayBuffer(file);
    return XLSX.read(data, { type: "array" });
  }

  function readFileAsArrayBuffer(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(reader.error);
      reader.readAsArrayBuffer(file);
    });
  }

  function readSheetAsJson(workbook) {
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    return XLSX.utils.sheet_to_json(worksheet, { header: 1 });
  }

  function buildHeaderMap(headers) {
    return headers.reduce((map, header, index) => {
      if (header !== undefined && header !== null) {
        map[String(header).trim()] = index;
      }
      return map;
    }, {});
  }

  function queryDataRows() {
    const allRows = document.querySelectorAll(ROW_SELECTOR);
    return Array.from(allRows).filter((tr) => tr.querySelector("td"));
  }

  function findRowByProjectCode(rows, code) {
    return rows.find((tr) => {
      const cells = tr.querySelectorAll("td");
      return (
        cells.length > PROJECT_CODE_COLUMN &&
        normalizeValue(cells[PROJECT_CODE_COLUMN].textContent) === code
      );
    });
  }

  async function fillRow(cells, dataRow, fields) {
    for (const field of fields) {
      await writeFieldIfNeeded(cells, field, dataRow[field.sourceIndex]);
    }
  }

  async function writeFieldIfNeeded(cells, field, value) {
    if (!field) {
      logDebug("跳过写入：字段配置不存在", field);
      return false;
    }
    if (value === undefined || value === null) {
      logDebug("跳过写入：值为空", field.header);
      return false;
    }

    const cell = cells[field.pageIndex];
    if (!cell) {
      logDebug("跳过写入：目标单元格缺失", {
        header: field.header,
        pageIndex: field.pageIndex,
      });
      return false;
    }

    const newValue = normalizeValue(value);
    if (!newValue) {
      logDebug("跳过写入：新值为空字符串", {
        header: field.header,
        value,
      });
      return false;
    }

    const existingValue = normalizeValue(cell.textContent);
    if (existingValue === newValue) {
      logDebug("跳过写入：已有内容相同", {
        header: field.header,
        existingValue,
        newValue,
      });
      return false;
    }

    logDebug("开始写入字段", {
      header: field.header,
      pageIndex: field.pageIndex,
      existingValue,
      newValue,
    });
    return fillEditableCell(cell, newValue);
  }

  function normalizeValue(value) {
    return value === undefined || value === null ? "" : String(value).trim();
  }

  function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  function waitForInput(cell, timeout = 3000) {
    return new Promise((resolve) => {
      const check = () => {
        const input = cell.querySelector("input");
        if (input) {
          resolve(input);
          return true;
        }
        return false;
      };

      if (check()) {
        return;
      }

      const observer = new MutationObserver(() => {
        if (check()) {
          observer.disconnect();
          clearTimeout(timer);
        }
      });

      observer.observe(cell, {
        childList: true,
        subtree: true,
        attributes: true,
      });

      const timer = setTimeout(() => {
        observer.disconnect();
        resolve(null);
      }, timeout);
    });
  }

  async function fillEditableCell(cell, value) {
    if (!cell) {
      return false;
    }

    const trigger = cell.querySelector(".table-edit-cell-trigger");
    if (trigger) {
      trigger.click();
      await sleep(2000);
      const input = await waitForInput(cell, 3000);
      if (input) {
        input.focus();
        input.value = "";
        input.value = value;
        input.dispatchEvent(new Event("input", { bubbles: true }));
        input.dispatchEvent(new Event("change", { bubbles: true }));
        input.blur();
        await sleep(2000);
        return true;
      }
    }

    const span = cell.querySelector("span.n-ellipsis span");
    if (span) {
      span.textContent = value;
      await sleep(2000);
      return false;
    }

    while (cell.firstChild) {
      cell.removeChild(cell.firstChild);
    }
    cell.textContent = value;
    await sleep(2000);
    return false;
  }
})();
