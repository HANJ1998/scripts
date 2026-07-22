// ==UserScript==
// @name         双随机脚本
// @namespace    https://github.com/hanj1998
// @version      0.5
// @description  导入企业名单Excel，自动执行抽取、比对
// @author       You
// @match        http*://scjg.hubei.gov.cn/hbssj/meta/HBSSJ/analyses/CSTM-17956/*
// @grant        none
// @require      https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js
// @updateURL    https://jsd.onmicrosoft.cn/gh/HANJ1998/scripts@main/双随机脚本.js
// @downloadURL  https://jsd.onmicrosoft.cn/gh/HANJ1998/scripts@main/双随机脚本.js
// @license      MIT
// ==/UserScript==

// ============================================================
// Changelog
// 0.5 - 2026-07-22: 替换失效CDN(cdnjs.webstatic.cn→jsDelivr)
// ============================================================

(function () {
  "use strict";

  let targetCompanies = [];

  // 解析 Excel，自动识别代码列和企业名称列
  function parseExcel(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = function (e) {
        try {
          const data = new Uint8Array(e.target.result);
          const workbook = XLSX.read(data, { type: "array" });
          const sheet = workbook.Sheets[workbook.SheetNames[0]];
          const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 });

          if (rows.length < 2) {
            reject(new Error("Excel 数据不足两行"));
            return;
          }

          // 尝试从表头识别列
          const headers = rows[0].map((h) => String(h || "").trim());
          let codeIdx = -1;
          let nameIdx = -1;

          headers.forEach((h, i) => {
            if (/统一|代码|证号|信用/.test(h)) codeIdx = i;
            if (/名称|企业|单位/.test(h)) nameIdx = i;
          });

          // 没识别到则默认第1列=代码，第2列=名称
          if (codeIdx === -1) codeIdx = 0;
          if (nameIdx === -1) nameIdx = 1;

          const companies = [];
          for (let i = 1; i < rows.length; i++) {
            const row = rows[i];
            if (!row || row.length === 0) continue;
            const code = String(row[codeIdx] || "").trim();
            const name = String(row[nameIdx] || "").trim();
            if (code && name) {
              companies.push({ code, name });
            }
          }

          if (companies.length === 0) {
            reject(new Error("Excel 中未解析到有效企业数据"));
            return;
          }

          resolve(companies);
        } catch (err) {
          reject(new Error("解析 Excel 失败: " + err.message));
        }
      };
      reader.onerror = () => reject(new Error("读取文件失败"));
      reader.readAsArrayBuffer(file);
    });
  }

  // --- UI ---
  const panel = document.createElement("div");
  panel.style.cssText =
    "position:fixed;top:10px;left:10px;z-index:9999;display:flex;gap:8px;align-items:center;background:#fff;padding:8px 12px;border-radius:6px;box-shadow:0 2px 8px rgba(0,0,0,.15);font:14px sans-serif;";

  const fileLabel = document.createElement("label");
  fileLabel.textContent = "选择企业名单";
  fileLabel.style.cssText =
    "padding:6px 14px;background:#2196F3;color:#fff;border-radius:4px;cursor:pointer;font-size:13px;white-space:nowrap;";

  const fileInput = document.createElement("input");
  fileInput.type = "file";
  fileInput.accept = ".xlsx,.xls";
  fileInput.style.display = "none";

  const statusEl = document.createElement("span");
  statusEl.textContent = "未加载";
  statusEl.style.cssText = "color:#999;font-size:12px;white-space:nowrap;";

  const execButton = document.createElement("button");
  execButton.textContent = "自动操作";
  execButton.disabled = true;
  execButton.style.cssText =
    "padding:6px 14px;background:#4CAF50;color:#fff;border:none;border-radius:4px;cursor:pointer;font-size:13px;white-space:nowrap;";

  execButton.disabled && (execButton.style.opacity = "0.5");

  fileLabel.appendChild(fileInput);
  panel.appendChild(fileLabel);
  panel.appendChild(statusEl);
  panel.appendChild(execButton);
  document.body.appendChild(panel);

  // 文件选择事件
  fileInput.addEventListener("change", async function () {
    const file = this.files[0];
    if (!file) return;

    statusEl.textContent = "解析中...";
    statusEl.style.color = "#FF9800";

    try {
      targetCompanies = await parseExcel(file);
      statusEl.textContent = `已加载 ${targetCompanies.length} 家企业`;
      statusEl.style.color = "#4CAF50";
      execButton.disabled = false;
      execButton.style.opacity = "1";
      console.log("企业名单已加载:", targetCompanies);
    } catch (err) {
      statusEl.textContent = "加载失败";
      statusEl.style.color = "#f44336";
      console.error(err.message);
    }
  });

  // --- 自动操作逻辑（不变） ---
  let shouldContinue = true;

  execButton.addEventListener("click", async function () {
    if (targetCompanies.length === 0) {
      alert("请先选择企业名单 Excel 文件");
      return;
    }
    console.log("开始执行自动操作流程");
    shouldContinue = true;
    await startProcess();
  });

  async function startProcess() {
    while (shouldContinue) {
      try {
        // 步骤1: 点击按钮1
        console.log("步骤1: 点击重新摇号按钮");
        const button1 = document.evaluate(
          '//*[@id="tsk4_btn_cxyh"]',
          document,
          null,
          XPathResult.FIRST_ORDERED_NODE_TYPE,
          null,
        ).singleNodeValue;
        if (button1) {
          button1.click();
        } else {
          throw new Error("未找到重新摇号按钮");
        }

        // 等待25秒
        console.log("等待25秒...");
        await new Promise((resolve) => setTimeout(resolve, 25000));

        // 步骤2: 点击按钮2
        console.log("步骤2: 点击第一个确认按钮");
        const button2 = document.evaluate(
          '//*[@id="ok"]/button',
          document,
          null,
          XPathResult.FIRST_ORDERED_NODE_TYPE,
          null,
        ).singleNodeValue;
        if (button2) {
          button2.click();
        } else {
          throw new Error("未找到第一个确认按钮");
        }

        // 等待3秒
        console.log("等待3秒...");
        await new Promise((resolve) => setTimeout(resolve, 3000));

        // 步骤3: 点击按钮3
        console.log("步骤3: 点击第二个确认按钮");
        const button3 = document.evaluate(
          "/html/body/div[4]/div/div/div[3]/div[1]/div[1]/span[1]/button",
          document,
          null,
          XPathResult.FIRST_ORDERED_NODE_TYPE,
          null,
        ).singleNodeValue;
        if (button3) {
          button3.click();
        } else {
          throw new Error("未找到第二个确认按钮");
        }

        // 等待30秒
        console.log("等待30秒...");
        await new Promise((resolve) => setTimeout(resolve, 30000));

        // 步骤4: 获取并比对表格内容
        console.log("步骤4: 提取并比对表格内容");
        const tableBody = document.evaluate(
          '//*[@id="table2"]/div[1]/div[4]/div/div/table/tbody',
          document,
          null,
          XPathResult.FIRST_ORDERED_NODE_TYPE,
          null,
        ).singleNodeValue;
        if (tableBody) {
          const rows = tableBody.querySelectorAll("tr");
          const tableData = [];
          const matchedCompanies = [];

          // 处理首字重复的函数
          function fixDuplicateFirstChar(str) {
            if (!str || str.length < 2) return str;
            // 检查前两个字符是否相同
            if (str[0] === str[1]) {
              // 去掉第一个重复字符
              return str.substring(1);
            }
            return str;
          }

          rows.forEach((row, rowIndex) => {
            const cells = row.querySelectorAll("td");
            const rowData = [];

            // 只提取对象名称列(第2列，索引1)和统一社会信用代码/其他证号列(第4列，索引3)
            if (cells.length >= 4) {
              // 处理对象名称列
              let objectName = cells[1].textContent.trim();
              // 处理统一社会信用代码/其他证号列
              let creditCode = cells[3].textContent.trim();

              // 应用首字重复处理
              objectName = fixDuplicateFirstChar(objectName);
              creditCode = fixDuplicateFirstChar(creditCode);

              // 跳过表头行
              if (rowIndex > 0) {
                rowData.push(objectName);
                rowData.push(creditCode);

                // 比对企业数据
                const matchedCompany = targetCompanies.find(
                  (company) => company.code === creditCode,
                );
                if (matchedCompany) {
                  matchedCompanies.push({
                    code: creditCode,
                    name: objectName,
                    matchedName: matchedCompany.name,
                  });
                }
              }
            }

            if (rowData.length > 0) {
              tableData.push(rowData);
            }
          });

          console.log("展示抽取结果(对象名称丨统一社会信用代码):");
          console.table(tableData);

          // 打印匹配结果
          if (matchedCompanies.length > 0) {
            console.log(`找到 ${matchedCompanies.length} 个匹配的企业:`);
            matchedCompanies.forEach((company, index) => {
              console.log(
                `${index + 1}. 统一代码: ${company.code}, 企业名称: ${company.name}`,
              );
            });
          } else {
            console.log("未找到匹配的企业");
          }

          // 检查是否达到停止条件
          if (matchedCompanies.length >= 4) {
            // 点击"对象配发"按钮
            const button4 = document.evaluate(
              '//*[@id="tsk4_btn_end"]',
              document,
              null,
              XPathResult.FIRST_ORDERED_NODE_TYPE,
              null,
            ).singleNodeValue;
            if (button4) {
              console.log('达到阈值:4,点击"对象配发"按钮');
              button4.click();
            } else {
              console.error('未找到"对象配发"按钮');
            }

            console.log("程序已终止");
            shouldContinue = false;
            return;
          } else {
            console.log("未达到阈值:4,继续抽取");
          }
        } else {
          throw new Error("未找到抽取内容");
        }

        console.log("当前循环执行完毕");

        // 等待5秒后继续
        if (shouldContinue) {
          console.log("等待5秒后开始下一次循环...");
          await new Promise((resolve) => setTimeout(resolve, 5000));
        }
      } catch (error) {
        console.error("操作过程中出错:", error.message);
        // 出错时也等待5秒后重试
        console.log("等待5秒后重试...");
        await new Promise((resolve) => setTimeout(resolve, 5000));
      }
    }
  }

  console.log("双随机脚本已加载，请选择企业名单 Excel 文件后点击自动操作");
})();
