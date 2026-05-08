// ==UserScript==
// @name         投资项目入库审核平台填写信息
// @namespace    https://github.com/hanj1998
// @version      0.4
// @description  自动填写区县现场核实人及时间
// @author       hanj1998@foxmail.com
// @match        *://10.42.181.70/*
// @grant        none
// @require      https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js
// @updateURL    https://raw.githubusercontent.com/hanj1998/MyScript/main/投资项目入库审核平台填写信息.js
// @downloadURL  https://raw.githubusercontent.com/hanj1998/MyScript/main/投资项目入库审核平台填写信息.js
// ==/UserScript==

(async function () {
  "use strict";

  if (typeof XLSX === "undefined") {
    console.log("等待 XLSX 库加载...");
    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  if (typeof XLSX === "undefined") {
    console.error("XLSX 库未加载，请检查 @require URL");
    return;
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }

  // 初始化脚本 UI：创建按钮和隐藏文件输入框
  function init() {
    // 添加按钮和隐藏文件输入
    const container = document.createElement("div");
    container.style.position = "fixed";
    container.style.top = "10px";
    container.style.right = "10px";
    container.style.zIndex = "9999";
    container.style.background = "white";
    container.style.border = "1px solid black";
    container.style.padding = "10px";

    const fileInput = document.createElement("input");
    fileInput.type = "file";
    fileInput.accept = ".xlsx";
    fileInput.style.display = "none";
    fileInput.onchange = () => {
      if (fileInput.files.length > 0) {
        processFile(fileInput.files[0]);
      }
    };

    const button = document.createElement("button");
    button.textContent = "填表";
    button.onclick = () => fileInput.click();

    container.appendChild(button);
    container.appendChild(fileInput);
    document.body.appendChild(container);
  }

  async function processFile(file) {
    console.log("开始处理文件");
    if (!file) {
      alert("请选择xlsx文件");
      return;
    }

    const reader = new FileReader();
    reader.onload = async function (e) {
      console.log("文件读取完成，解析ing");
      // 将读取到的二进制数据解析为 XLSX 工作簿对象
      const data = new Uint8Array(e.target.result);
      const workbook = XLSX.read(data, { type: "array" });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

      console.log("解析完毕，文件内容：", jsonData);

      // 第一行是表头，数据从第二行开始
      const headers = jsonData[0];
      const dataRows = jsonData.slice(1);

      // 找到 Excel 中目标列的索引位置，用于读取每行对应字段
      const codeIndex = headers.indexOf("项目代码");
      const personIndex = headers.indexOf("区县现场核实人");
      const timeIndex = headers.indexOf("区县现场核实时间");

      console.log(
        "文件列号 项目代码：",
        codeIndex + 1,
        "区县现场核实人：",
        personIndex + 1,
        "区县现场核实时间：",
        timeIndex + 1,
      );

      if (codeIndex === -1 || personIndex === -1 || timeIndex === -1) {
        alert(
          "文件格式不正确，表头应为:项目代码;区县现场核实人;区县现场核实时间",
        );
        return;
      }

      // 直接硬编码查找 tr 行，跳过 table 节点，按页面结构提取数据行
      const allRows = document.querySelectorAll(
        "#app > div > div > main > div:nth-child(2) > div > div > div:nth-child(2) > div > div > div > div:nth-child(2) > div:nth-child(1) > div tr",
      );
      const rows = Array.from(allRows).filter((tr) => tr.querySelector("td"));

      // rows 数组只保留包含 td 的数据行，排除表头和空行
      if (rows.length === 0) {
        alert("未找到待填充的行，请检查页面结构");
        return;
      }

      // 硬编码列索引
      const codeColIndex = 2; // 项目代码 td[3]
      const personColIndex = 62; // 区县现场核实人 td[63]
      const timeColIndex = 63; // 区县现场核实时间 td[64]

      console.log(
        "网页列号 项目代码：",
        codeColIndex,
        "区县现场核实人：",
        personColIndex,
        "区县现场核实时间：",
        timeColIndex,
      );

      console.log("当前页面预备填充行数：", rows.length);

      // 遍历xlsx数据，按项目代码查找页面对应行并填写字段
      for (const row of dataRows) {
        const code = row[codeIndex];
        const person = row[personIndex];
        const time = row[timeIndex];

        // 在页面表格行中匹配项目代码列，找到匹配后的行进行填写
        for (const tr of rows) {
          const cells = tr.querySelectorAll("td");
          if (
            cells.length > codeColIndex &&
            cells[codeColIndex].textContent.trim() === code.toString().trim()
          ) {
            // 填写核实人
            const personCell = cells[personColIndex];
            await fillEditableCell(personCell, person);

            // 填写时间
            const timeCell = cells[timeColIndex];
            await fillEditableCell(timeCell, time);

            console.log("写入：", code, person, time);

            // 等待页面保存完成再继续下一行
            await sleep(500);
            break;
          }
        }
      }

      console.log("填写完成");
      alert("填写完成");
    };
    reader.readAsArrayBuffer(file);
  }

  // 休眠辅助函数：等待指定毫秒数，用于页面操作间隔
  function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  // 等待输入框生成：在可编辑单元格中监听 input 元素出现
  function waitForInput(cell, timeout = 3000) {
    return new Promise((resolve) => {
      const check = () => {
        const input = cell.querySelector("input");
        if (input) {
          return resolve(input);
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

  // 填写单元格内容：支持可编辑触发、输入框、以及普通文本替换
  async function fillEditableCell(cell, value) {
    if (!cell) {
      return false;
    }

    // 优先尝试通过可编辑触发器进入编辑模式
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

    // 如果没有输入框，则尝试直接替换显示文本节点
    const span = cell.querySelector("span.n-ellipsis span");
    if (span) {
      span.textContent = value;
      await sleep(2000);
      return false;
    }

    // 如果 td 已有内容，先清空再写入新值
    while (cell.firstChild) {
      cell.removeChild(cell.firstChild);
    }
    cell.textContent = value;
    await sleep(2000);
    return false;
  }
})();
