// ==UserScript==
// @name         名录库助手贸易专版
// @namespace    https://gitee.com/hanj1998
// @version      1.2
// @description  贸易问题专版 - 自动处理主要业务活动
// @author       GOD
// @match        *://tjymlk.stats.gov.cn/*
// @updateURL    https://raw.githubusercontent.com/hanj1998/MyScript/main/MLK贸易问题.js
// @downloadURL  https://raw.githubusercontent.com/hanj1998/MyScript/main/MLK贸易问题.js
// @license      MIT

// ==/UserScript==

(function () {
  "use strict";
  // 统一的XPath评估函数，减少代码重复
  function evaluateXPath(xpath) {
    try {
      return document.evaluate(
        xpath,
        document,
        null,
        XPathResult.FIRST_ORDERED_NODE_TYPE,
        null,
      ).singleNodeValue;
    } catch (error) {
      console.error(`XPath评估失败: ${xpath} - ${error.message}`);
      return null;
    }
  }

  // 统一日志函数
  function log(message, level = "info") {
    console[level === "error" ? "error" : level === "warning" ? "warn" : "log"](
      message,
    );
  }

  // 通过xpath获取值
  function getValueByXpath(xpath) {
    const element = evaluateXPath(xpath);
    return element ? element.textContent : null;
  }

  // 通过xpath设置值
  function setValueByXpath(xpath, value) {
    const element = evaluateXPath(xpath);

    if (!element) {
      log(`未找到元素: ${xpath}`, "warning");
      return false;
    }

    try {
      element.value = value;
      // 触发输入事件，确保表单验证和数据绑定正常工作
      element.dispatchEvent(new Event("input", { bubbles: true }));
      element.dispatchEvent(new Event("change", { bubbles: true }));
      return true;
    } catch (error) {
      log(`设置值失败: ${xpath} - ${error.message}`, "error");
      return false;
    }
  }

  // 等待随机的时间 - 返回Promise以便正确等待
  function waitRandomTime(min = 2000, max = 4000) {
    return new Promise((resolve) => {
      const randomTime = Math.floor(Math.random() * (max - min + 1)) + min;
      setTimeout(resolve, randomTime);
    });
  }

  // 查找复选框
  function checkbox() {
    return evaluateXPath(
      '//*[starts-with(@id, "mat-mdc-checkbox-") and substring(@id, string-length(@id) - string-length("-input") + 1) = "-input"]',
    );
  }

  // 查找保存按钮
  function saveButton() {
    return (
      evaluateXPath(
        '//*[@id="content"]/section[2]/common-project-bill/common-bill/div/div[2]/div[2]',
      )?.lastElementChild || null
    );
  }

  function nextButton() {
    return evaluateXPath(
      '//*[@id="content"]/section[2]/common-project-bill/common-bill/div/div[1]/common-sequence/div[1]/button[3]',
    );
  }
  // 主处理函数 - 使用async以支持await
  async function processMainBusinessActivity() {
    try {
      // 获取元素文本
      const mainBusinessActivity = getValueByXpath("//*[@id='txtHYDM']");

      if (!mainBusinessActivity) {
        log("未找到主要业务活动元素或值为空", "warning");
        return;
      }

      //如果文本包含“贸易代理”，则点击下一个按钮，进入下一个循环
      if (mainBusinessActivity.includes("贸易代理")) {
        const nextBtn = nextButton();
        // 添加空值检查
        if (nextBtn) {
          nextBtn.click();
        } else {
          log("未找到下一个按钮元素", "error");
        }
        return;
      }

      // 安全提取第一个空格后的所有文本（不包含空格）
      const mainBusinessActivityName = mainBusinessActivity.split(" ")[1] || "";

      if (!mainBusinessActivityName) {
        log("无法提取主要业务活动名称", "warning");
        return;
      }

      // 设置主要业务活动名称
      const setResult = setValueByXpath(
        "//*[@id='zyywhd1']/input",
        mainBusinessActivityName,
      );

      if (!setResult) {
        return;
      }

      // 等待随机时间后执行点击操作
      await waitRandomTime();

      // 点击强制保存按钮
      const ckbox = checkbox();

      //点击复选框（添加空值检查）
      if (ckbox) {
        ckbox.click();
      } else {
        log("未找到复选框元素", "error");
        return;
      }

      // 等待随机时间后点击保存按钮
      await waitRandomTime();

      const saveBtn = saveButton();
      // 添加空值检查
      if (saveBtn) {
        saveBtn.click();
      } else {
        log("未找到保存按钮元素", "error");
        return;
      }
    } catch (error) {
      log(`处理失败: ${error.message}`, "error");
    }
  }

  // 创建控制按钮
  const controlContainer = document.createElement("div");
  controlContainer.style.cssText = `
        position: fixed;
        top: 10px;
        right: 10px;
        z-index: 9999;
        background: #fff;
        padding: 10px;
        border: 1px solid #ddd;
        border-radius: 5px;
        box-shadow: 0 2px 10px rgba(0,0,0,0.1);
    `;

  // 创建开始按钮
  const startButton = document.createElement("button");
  startButton.textContent = "开始处理";
  startButton.style.cssText = `
        background: #4CAF50;
        color: white;
        border: none;
        padding: 8px 16px;
        margin-right: 5px;
        cursor: pointer;
        border-radius: 3px;
        font-size: 14px;
    `;

  // 创建停止按钮
  const stopButton = document.createElement("button");
  stopButton.textContent = "停止处理";
  stopButton.style.cssText = `
        background: #f44336;
        color: white;
        border: none;
        padding: 8px 16px;
        cursor: pointer;
        border-radius: 3px;
        font-size: 14px;
    `;
  stopButton.disabled = true;

  // 全局变量存储interval ID
  let intervalId = null;

  // 开始处理函数
  function startProcessing() {
    if (intervalId) {
      log("处理已在运行中", "warning");
      return;
    }

    log("开始处理主要业务活动");
    intervalId = setInterval(processMainBusinessActivity, 5000);
    startButton.disabled = true;
    stopButton.disabled = false;
  }

  // 停止处理函数
  function stopProcessing() {
    if (!intervalId) {
      log("处理未在运行中", "warning");
      return;
    }

    log("停止处理主要业务活动");
    clearInterval(intervalId);
    intervalId = null;
    startButton.disabled = false;
    stopButton.disabled = true;
  }

  // 添加事件监听器
  startButton.addEventListener("click", startProcessing);
  stopButton.addEventListener("click", stopProcessing);

  // 添加按钮到容器
  controlContainer.appendChild(startButton);
  controlContainer.appendChild(stopButton);

  // 添加容器到页面
  document.body.appendChild(controlContainer);

  // 添加清理机制，防止内存泄漏
  window.addEventListener("beforeunload", () => {
    if (intervalId) {
      clearInterval(intervalId);
    }
  });
})();
