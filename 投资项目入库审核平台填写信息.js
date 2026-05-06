// ==UserScript==
// @name         投资项目入库审核平台填写信息
// @namespace    https://github.com/hanj1998
// @version      0.1
// @description  自动填写区县现场核实人及时间
// @author       hanj1998@foxmail.com
// @match        *://10.42.181.70/#/preset/query-data-report-4*
// @grant        none
// @updateURL    https://raw.githubusercontent.com/hanj1998/MyScript/main/投资项目入库审核平台填写信息.js
// @downloadURL  https://raw.githubusercontent.com/hanj1998/MyScript/main/投资项目入库审核平台填写信息.js
// ==/UserScript==

(function () {
  "use strict";

  console.log("脚本加载");

  // 加载xlsx库
  const script = document.createElement("script");
  script.src = "https://cdn.staticfile.net/xlsx/0.18.5/xlsx.full.min.js";
  script.onload = () => {
    console.log("xlsx库加载完成");
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", init);
    } else {
      init();
    }
  };
  document.head.appendChild(script);

  function init() {
    console.log("初始化UI");

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

    console.log("UI元素已添加到页面");
  }

  async function processFile(file) {
    console.log("开始处理文件");
    if (!file) {
      alert("请选择xlsx文件");
      return;
    }

    const reader = new FileReader();
    reader.onload = async function (e) {
      console.log("文件读取完成，解析xlsx");
      const data = new Uint8Array(e.target.result);
      const workbook = XLSX.read(data, { type: "array" });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

      // 假设第一行是表头，数据从第二行开始
      const headers = jsonData[0];
      const dataRows = jsonData.slice(1);

      // 找到列索引
      const codeIndex = headers.indexOf("项目代码");
      const personIndex = headers.indexOf("区县现场核实人");
      const timeIndex = headers.indexOf("区县现场核实时间");

      console.log("列索引：", codeIndex, personIndex, timeIndex);

      if (codeIndex === -1 || personIndex === -1 || timeIndex === -1) {
        alert("xlsx文件格式不正确，缺少必要列");
        return;
      }

      // 找到网页表格，使用XPath
      const table = document.evaluate(
        '//*[@id="app"]/div/div/main/div[2]/div/div/div[2]/div/div/div/div[2]/div[1]/div/table',
        document,
        null,
        XPathResult.FIRST_ORDERED_NODE_TYPE,
        null,
      ).singleNodeValue;
      if (!table) {
        alert("未找到表格，请检查页面结构");
        return;
      }

      console.log("找到表格");

      // 硬编码列索引
      const codeColIndex = 2; // 项目代码 td[3]
      const personColIndex = 62; // 区县现场核实人 td[63]
      const timeColIndex = 63; // 区县现场核实时间 td[64]

      console.log(
        "列索引：项目代码",
        codeColIndex,
        "核实人",
        personColIndex,
        "时间",
        timeColIndex,
      );

      const tbody = table.querySelector("tbody");
      let rows;
      if (tbody) {
        rows = tbody.querySelectorAll("tr");
      } else {
        // 如果没有tbody，直接找table下的所有tr，并过滤出有td的行（排除表头）
        const allRows = table.querySelectorAll("tr");
        rows = Array.from(allRows).filter((tr) => tr.querySelector("td"));
      }

      if (rows.length === 0) {
        alert("表格无数据行");
        return;
      }

      console.log("找到数据行数量：", rows.length);

      // 遍历xlsx数据
      for (const row of dataRows) {
        const code = row[codeIndex];
        const person = row[personIndex];
        const time = row[timeIndex];

        console.log("处理项目代码：", code);

        // 在表格中找到匹配的项目代码
        for (const tr of rows) {
          const cells = tr.querySelectorAll("td");
          if (
            cells.length > codeColIndex &&
            cells[codeColIndex].textContent.trim() === code.toString().trim()
          ) {
            console.log("找到匹配行，填写数据");
            // 填写核实人
            const personCell = cells[personColIndex];
            await fillEditableCell(personCell, person);

            // 填写时间
            const timeCell = cells[timeColIndex];
            await fillEditableCell(timeCell, time);

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

  function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

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

    cell.textContent = value;
    await sleep(2000);
    return false;
  }
})();
