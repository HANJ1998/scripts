// ==UserScript==
// @name         统计云自动登陆
// @namespace    http://tampermonkey.net/
// @version      4.7
// @description  自动处理网站登录流程，包括账号管理等
// @author       hanj1998@foxmail.com
// @match        *://*/*
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_xmlhttpRequest
// @grant        GM_registerMenuCommand
// @require      https://code.jquery.com/jquery-3.6.0.min.js
// @updateURL    https://raw.githubusercontent.com/hanj1998/MyScript/main/自动登陆统计云.js
// @downloadURL  https://raw.githubusercontent.com/hanj1998/MyScript/main/自动登陆统计云.js
// @license      MIT
// ==/UserScript==

// 2026-04-07 v4.7
//  - 填充次数直接显示在脚本菜单文本中
// 2026-04-07 v4.6
//  - 填充时间记录功能按网站区分
// 2026-04-07 v4.5
//  - 添加了填充时间记录功能
//  - 填充成功后显示上一次填充时间
// 2026-04-07 v4.4
//  - 添加了填充统计功能，记录账号填充次数
//  - 在脚本菜单中添加了"查看填充统计"选项
//  - 在脚本菜单中添加了"重置填充计数器"选项
// 2026-04-07 v4.3
//  - 将菜单中的"添加网址"改为"添加当前网址"
//  - 添加当前网址时检查是否包含login，否则提示添加失败
//  - 简化了网址匹配逻辑，只检查当前网址是否在列表中
//  - 初始化时不再检查是否包含login，因为添加时已经检查
// 2026-04-07 v4.2
//  - 优化了初始化流程，先检查网址是否匹配，再执行后续操作
//  - 调整了代码结构，将非方法代码提取到初始化函数中
//  - 提高了脚本执行效率，减少了不必要的操作
// 2026-04-07 v4.1
//  - 优化了打印和弹窗文本，统一了日志格式
//  - 调整了添加账号界面输入框的宽度，使其更加紧凑
//  - 添加了脚本管理器菜单项，支持添加、查看和清空自定义网址
//  - 修改了匹配模式为*://*/*，使脚本在所有网址上运行
//  - 去除了默认网址，只使用用户添加的自定义网址
//  - 添加了自定义网址列表长度检查，为空时不运行脚本
//  - 修复了URL匹配逻辑的安全风险，防止正则表达式注入攻击
// 2026-04-06 v4.0
//  - 改用placeholder定位用户名和密码输入框
//  - 删除了验证码和OCR相关代码
//  - 删除了自动点击登录的代码
//  - 重构并优化了所有逻辑
//  - 引入了Bootstrap 5作为UI库

(function () {
  "use strict";

  // 读取脚本名
  const scriptName = GM_info.script.name;
  // 读取版本号
  const version = GM_info.script.version;
  // 读取作者
  const author = GM_info.script.author;

  // 添加自定义样式
  function addCustomStyles() {
    const style = document.createElement("style");
    style.textContent = `
      /* 配置界面样式 */
      #config-overlay {
        position: fixed; top: 0; left: 0; width: 100%; height: 100%;
        background: rgba(0,0,0,0.6); z-index: 10000;
        display: flex; justify-content: center; align-items: center;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      }
      
      #config-panel {
        background: #ffffff; border-radius: 8px;
        width: 280px; max-height: 85vh; overflow-y: auto;
        box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        border: 1px solid #e0e0e0;
        color: #333;
      }
      
      #config-header {
        background: #28a745; color: white; padding: 8px 12px;
        border-top-left-radius: 8px; border-top-right-radius: 8px;
        display: flex; justify-content: space-between; align-items: center;
      }
      
      #config-header h3 {
        margin: 0; font-size: 14px; font-weight: bold;
      }
      
      #config-header .close-btn {
        background: none; border: none; color: white; cursor: pointer;
        font-size: 18px; line-height: 1;
      }
      
      #config-body {
        padding: 10px;
      }
      
      #config-body p {
        margin: 6px 0; font-size: 12px; text-align: center; color: #666;
      }
      
      #accounts-list {
        margin-bottom: 10px;
      }
      
      #accounts-list h4 {
        margin: 6px 0; font-size: 13px; font-weight: bold;
      }
      
      #accounts-list p {
        margin: 6px 0; font-size: 12px; text-align: center; color: #999;
      }
      
      .account-item {
        display: flex; justify-content: space-between; align-items: center;
        margin: 6px 0; padding: 6px; border: 1px solid #e0e0e0; border-radius: 4px;
        background: #f9f9f9;
      }
      
      .account-item:hover {
        background: #f0f0f0;
      }
      
      .account-info {
        flex: 1;
      }
      
      .account-username {
        font-size: 13px; font-weight: 500;
      }
      
      .default-badge {
        font-size: 10px; color: #28a745; margin-left: 6px;
      }
      
      .account-actions {
        display: flex; gap: 6px;
      }
      
      .account-btn {
        font-size: 11px; padding: 3px 8px; border: none; border-radius: 3px;
        cursor: pointer; transition: all 0.2s ease;
      }
      
      .set-default-btn {
        background: #ffc107; color: #333;
      }
      
      .delete-account-btn {
        background: #dc3545; color: white;
      }
      
      .add-account-btn {
        width: 100%; background: #28a745; color: white;
        border: none; border-radius: 4px; padding: 6px;
        font-size: 13px; cursor: pointer;
        margin-bottom: 10px;
      }
      
      .divider {
        height: 1px; background: #e0e0e0; margin: 10px 0;
      }
      
      .script-toggle {
        margin: 10px 0;
      }
      
      .script-toggle label {
        display: flex; align-items: center; cursor: pointer;
        font-size: 13px;
      }
      
      .script-toggle input {
        margin-right: 8px;
      }
      
      #config-footer {
        padding: 10px; border-top: 1px solid #e0e0e0;
        display: flex; gap: 6px;
      }
      
      #config-footer button {
        flex: 1; border: none; border-radius: 4px; padding: 6px;
        font-size: 13px; cursor: pointer;
      }
      
      #save-config-btn {
        background: #28a745; color: white;
      }
      
      #close-config-btn {
        background: #dc3545; color: white;
      }
      
      #config-author {
        padding: 6px; border-top: 1px solid #e0e0e0;
        text-align: center;
      }
      
      #config-author p {
        margin: 0; font-size: 10px; color: #999;
      }
      
      /* 添加账号表单样式 */
      #add-account-overlay {
        position: fixed; top: 0; left: 0; width: 100%; height: 100%;
        background: rgba(0,0,0,0.6); z-index: 10001;
        display: flex; justify-content: center; align-items: center;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      }
      
      #add-account-form {
        background: #ffffff; border-radius: 8px;
        width: 260px; box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        border: 1px solid #e0e0e0;
        color: #333;
      }
      
      #add-account-header {
        padding: 8px 12px; border-bottom: 1px solid #e0e0e0;
        display: flex; justify-content: space-between; align-items: center;
      }
      
      #add-account-header h4 {
        margin: 0; font-size: 14px; font-weight: bold;
      }
      
      #add-account-header .close-btn {
        background: none; border: none; color: #333; cursor: pointer;
        font-size: 18px; line-height: 1;
      }
      
      #add-account-body {
        padding: 10px;
      }
      
      .form-group {
        margin-bottom: 10px;
      }
      
      .form-group label {
        display: block; font-size: 13px; margin-bottom: 4px;
      }
      
      .form-group input {
        width: 100%; max-width: 220px; padding: 6px; border: 1px solid #ddd;
        border-radius: 4px; font-size: 13px;
      }
      
      #add-account-footer {
        padding: 10px; border-top: 1px solid #e0e0e0;
        display: flex; gap: 6px;
      }
      
      #add-account-footer button {
        flex: 1; border: none; border-radius: 4px; padding: 6px;
        font-size: 13px; cursor: pointer;
      }
      
      #confirm-add {
        background: #28a745; color: white;
      }
      
      #cancel-add {
        background: #6c757d; color: white;
      }
      
      /* 配置按钮样式 */
      #config-button {
        position: fixed; top: 10px; left: 10px; z-index: 9999;
        background: #28a745; color: white; border: none;
        border-radius: 20px; padding: 8px 14px;
        font-size: 12px; font-weight: 500; cursor: pointer;
        box-shadow: 0 2px 6px rgba(40,167,69,0.3);
        transition: all 0.3s ease;
      }
      
      #config-button:hover {
        transform: scale(1.05);
        box-shadow: 0 4px 8px rgba(40,167,69,0.4);
      }
      
      /* 提示消息样式 */
      .toast {
        position: fixed; left: 50%; transform: translateX(-50%);
        background: #333; color: white; padding: 10px 20px;
        border-radius: 4px; z-index: 10001; font-size: 14px;
        opacity: 0.95; text-align: center;
        box-shadow: 0 2px 6px rgba(0,0,0,0.3);
        transition: top 0.3s ease;
      }
    `;
    document.head.appendChild(style);
  }

  const CONFIG = {
    // DOM选择器配置
    selectors: {
      usernameInput: 'input[placeholder="请输入用户名"]', // 用户名输入框（通过placeholder定位）
      passwordInput: 'input[placeholder="请输入密码"]', // 密码输入框（通过placeholder定位）
    },
    // 延时配置（毫秒）
    delays: {
      pageLoad: 500, // 页面加载等待时间
    },
    // 开关控制
    enabled: true, // 脚本总开关
  };

  // 当前站点host，用于区分不同网站的存储
  let host;
  // 账号数据
  let accounts = [];
  let defaultAccountIndex = -1;

  // 获取默认账号
  function getDefaultAccount() {
    if (defaultAccountIndex >= 0 && defaultAccountIndex < accounts.length) {
      console.log(
        `[${scriptName}] 使用默认账号: ${accounts[defaultAccountIndex].username}`,
      );
      return accounts[defaultAccountIndex];
    } else if (accounts.length > 0) {
      // 如果没有设置默认账号，使用第一个账号
      console.log(
        `[${scriptName}] 未设置默认账号，使用第一个账号: ${accounts[0].username}`,
      );
      return accounts[0];
    }
    return null;
  }
  // 显示提示消息（支持多个消息堆叠）
  const activeToasts = [];
  function showToast(message, arg = null) {
    const toast = document.createElement("div");
    toast.className = "toast";
    toast.textContent = message;

    // 计算位置：第一个在屏幕中央，后续的依次向下排列
    const toastHeight = 40; // 估算每个toast的高度（包括间距）
    const index = activeToasts.length;
    const topPosition = 50 + index * toastHeight;
    toast.style.top = `calc(${topPosition}px + 10%)`;

    document.body.appendChild(toast);
    activeToasts.push(toast);

    // 打印日志
    if (arg) {
      console.log(`[${scriptName}] ${message}`, arg);
    } else {
      console.log(`[${scriptName}] ${message}`);
    }

    setTimeout(() => {
      toast.remove();
      const idx = activeToasts.indexOf(toast);
      if (idx > -1) {
        activeToasts.splice(idx, 1);
        // 重新调整剩余toast的位置
        activeToasts.forEach((t, i) => {
          const newTop = 50 + i * toastHeight;
          t.style.top = `calc(${newTop}px + 10%)`;
        });
      }
    }, 3000);
  }

  // 保存账号数据（按 host 区分）
  function saveAccounts() {
    GM_setValue("accounts_" + host, accounts);
    GM_setValue("defaultAccountIndex_" + host, defaultAccountIndex);
    console.log(
      `[${scriptName}] 账号数据已保存: ${accounts.length} 个账号, 默认账号索引: ${defaultAccountIndex}`,
    );
  }

  // 辅助函数：延时
  function sleep(ms) {
    console.log(`[${scriptName}] 等待 ${ms} 毫秒...`);
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  // 辅助函数：转义正则表达式特殊字符
  function escapeRegex(str) {
    return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }

  // 辅助函数：获取元素（支持CSS选择器）
  function getElement(selector, context = document) {
    try {
      console.log(`[${scriptName}] 获取元素: ${selector}`);
      return context.querySelector(selector);
    } catch (e) {
      console.error(`[${scriptName}] 获取元素错误: ${selector}`, e);
      return null;
    }
  }

  // 辅助函数：等待元素出现（支持CSS选择器）
  async function waitForElement(selector, timeout = 5000, context = document) {
    console.log(`[${scriptName}] 等待元素出现: ${selector}`);
    const startTime = Date.now();
    while (Date.now() - startTime < timeout) {
      const element = getElement(selector, context);
      if (element) return element;
      await sleep(100);
    }
    console.error(`[${scriptName}] 等待元素超时: ${selector}`);
    return null;
  }

  // ==================== UI界面 ====================
  // 创建配置界面
  function createConfigUI() {
    // 创建配置界面HTML
    const configHTML = `
      <div id="config-overlay">
        <div id="config-panel">
          <div id="config-header">
            <h3>${scriptName} v${version}</h3>
            <button class="close-btn" id="header-close-btn">&times;</button>
          </div>
          <div id="config-body">
            <p>当前网站: ${document.title}</p>
            <div id="accounts-list"></div>
            <button id="add-account-btn" class="add-account-btn">添加账号</button>
            <div class="divider"></div>
            <div class="script-toggle">
              <label>
                <input type="checkbox" id="enabled-toggle">
                开启填充
              </label>
            </div>
          </div>
          <div id="config-footer">
            <button id="save-config-btn">保存</button>
            <button id="footer-close-btn">关闭</button>
          </div>
          <div id="config-author">
            <p>作者: ${author}</p>
          </div>
        </div>
      </div>
    `;

    // 插入配置界面到页面
    document.body.insertAdjacentHTML("beforeend", configHTML);

    // 其他按钮事件
    document
      .getElementById("add-account-btn")
      .addEventListener("click", addAccountForm);
    document.getElementById("save-config-btn").addEventListener("click", () => {
      saveConfig();
      document.getElementById("config-overlay").remove();
    });
    document
      .getElementById("header-close-btn")
      .addEventListener("click", () => {
        document.getElementById("config-overlay").remove();
      });
    document
      .getElementById("footer-close-btn")
      .addEventListener("click", () => {
        document.getElementById("config-overlay").remove();
      });

    // 加载现有账号
    loadAccountsList();

    // 加载开关状态
    loadToggles();
  }

  // 加载账号列表
  function loadAccountsList() {
    const list = document.getElementById("accounts-list");
    list.innerHTML = `<h4>账号列表 (${host})</h4>`;
    if (accounts.length === 0) {
      list.innerHTML += "<p>暂无账号，请添加账号</p>";
      return;
    }

    accounts.forEach((account, index) => {
      const accountItem = document.createElement("div");
      accountItem.className = "account-item";
      accountItem.innerHTML = `
        <div class="account-info">
          <span class="account-username">${account.username}</span>
          ${index === defaultAccountIndex ? '<span class="default-badge">(默认)</span>' : ""}
        </div>
        <div class="account-actions">
          <button class="account-btn set-default-btn" data-index="${index}">设为默认</button>
          <button class="account-btn delete-account-btn" data-index="${index}">删除</button>
        </div>
      `;
      list.appendChild(accountItem);
    });

    // 绑定删除和设为默认按钮
    document.querySelectorAll(".delete-account-btn").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        const index = parseInt(e.target.dataset.index);
        accounts.splice(index, 1);
        if (defaultAccountIndex === index) {
          defaultAccountIndex = -1;
        } else if (defaultAccountIndex > index) {
          defaultAccountIndex--;
        }
        saveAccounts();
        loadAccountsList();
      });
    });

    document.querySelectorAll(".set-default-btn").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        defaultAccountIndex = parseInt(e.target.dataset.index);
        saveAccounts();
        loadAccountsList();
        showToast("默认账号已切换！请刷新页面以应用更改。");
      });
    });
  }

  // 添加账号表单
  function addAccountForm() {
    // 创建添加账号表单HTML
    const formHTML = `
      <div id="add-account-overlay">
        <div id="add-account-form">
          <div id="add-account-header">
            <h4>添加新账号</h4>
            <button class="close-btn" id="header-cancel-btn">&times;</button>
          </div>
          <div id="add-account-body">
            <form id="account-form">
              <div class="form-group">
                <label for="new-username">用户名</label>
                <input type="text" id="new-username" placeholder="请输入用户名" required>
              </div>
              <div class="form-group">
                <label for="new-password">密码</label>
                <input type="password" id="new-password" placeholder="请输入密码" required>
              </div>
            </form>
          </div>
          <div id="add-account-footer">
            <button id="confirm-add">添加</button>
            <button id="footer-cancel-btn">取消</button>
          </div>
        </div>
      </div>
    `;

    // 插入表单到页面
    document.body.insertAdjacentHTML("beforeend", formHTML);

    // 绑定事件
    document.getElementById("confirm-add").addEventListener("click", () => {
      const username = document.getElementById("new-username").value.trim();
      const password = document.getElementById("new-password").value.trim();
      if (!username || !password) {
        showToast("用户名和密码不能为空！");
        return;
      }
      accounts.push({ username, password });
      saveAccounts();
      loadAccountsList();
      document.getElementById("add-account-overlay").remove();
      showToast("账号添加成功！");
    });

    document
      .getElementById("header-cancel-btn")
      .addEventListener("click", () => {
        document.getElementById("add-account-overlay").remove();
      });

    document
      .getElementById("footer-cancel-btn")
      .addEventListener("click", () => {
        document.getElementById("add-account-overlay").remove();
      });
  }

  // 加载开关状态
  function loadToggles() {
    console.log(`[${scriptName}] 加载开关状态`);
    document.getElementById("enabled-toggle").checked = CONFIG.enabled;
  }

  // 保存配置
  function saveConfig() {
    console.log(`[${scriptName}] 保存配置`);

    CONFIG.enabled = document.getElementById("enabled-toggle").checked;

    GM_setValue("config", CONFIG);
    GM_setValue("accounts_" + host, accounts);
    GM_setValue("defaultAccountIndex_" + host, defaultAccountIndex);

    showToast("配置已保存");
    console.log(`[${scriptName}] 配置保存成功`);
  }

  // ==================== 自动登录逻辑 ====================
  // 填充账号信息
  async function fillAccount(account) {
    console.log(`[${scriptName}] 开始填充账号信息: ${account.username}`);
    const usernameInput = await waitForElement(CONFIG.selectors.usernameInput);

    const passwordIframe = await waitForElement("iframe");
    let passwordInput = null;
    if (passwordIframe) {
      await new Promise((resolve) => {
        if (
          passwordIframe.contentDocument &&
          passwordIframe.contentDocument.readyState === "complete"
        ) {
          resolve();
        } else {
          passwordIframe.onload = resolve;
        }
      });
      // 在iframe中查找密码输入框
      passwordInput = passwordIframe.contentDocument.querySelector(
        CONFIG.selectors.passwordInput,
      );
    }

    console.log(
      `[${scriptName}] 用户名输入框: ${usernameInput ? "找到" : "未找到"}`,
    );
    console.log(
      `[${scriptName}] 密码输入框: ${passwordInput ? "找到" : "未找到"}`,
    );

    if (usernameInput) {
      usernameInput.value = account.username;
      usernameInput.dispatchEvent(new Event("input", { bubbles: true }));
      usernameInput.dispatchEvent(new Event("change", { bubbles: true }));
      console.log(`[${scriptName}] 用户名填充成功`);
    } else {
      console.log(`[${scriptName}] 用户名输入框未找到`);
    }

    if (passwordInput) {
      passwordInput.value = account.password;
      passwordInput.dispatchEvent(new Event("input", { bubbles: true }));
      passwordInput.dispatchEvent(new Event("change", { bubbles: true }));
      console.log(`[${scriptName}] 密码填充成功`);
    } else {
      console.log(`[${scriptName}] 密码输入框未找到`);
    }

    // 增加填充计数器
    let fillCount = GM_getValue("fillCount", 0);
    fillCount++;
    GM_setValue("fillCount", fillCount);
    console.log(`[${scriptName}] 填充次数: ${fillCount}`);

    // 记录本次填充时间（按网站区分）
    const lastFillTimeKey = "lastFillTime_" + host;
    const lastFillTime = GM_getValue(lastFillTimeKey, null);
    const currentTime = new Date();
    GM_setValue(lastFillTimeKey, currentTime.getTime());

    // 显示提醒，包括上一次填充时间
    if (lastFillTime) {
      const lastTime = new Date(lastFillTime);
      const formattedLastTime = lastTime.toLocaleString();
      showToast(`账号已填充\n上一次填充时间: ${formattedLastTime}`);
    } else {
      showToast("账号已填充");
    }
    console.log(
      `[${scriptName}] 本次填充时间: ${currentTime.toLocaleString()}`,
    );
    if (lastFillTime) {
      const lastTime = new Date(lastFillTime);
      console.log(
        `[${scriptName}] 上一次填充时间: ${lastTime.toLocaleString()}`,
      );
    }
  }

  // 主函数
  async function main() {
    console.log(`[${scriptName}] 主函数开始执行`);
    try {
      // 加载配置
      const savedConfig = GM_getValue("config", {});
      Object.assign(CONFIG, savedConfig);

      if (!CONFIG.enabled) {
        console.log(`[${scriptName}] 脚本被禁用，退出`);
        return;
      }

      // 等待页面加载
      console.log(`[${scriptName}] 等待页面加载...`);
      await sleep(CONFIG.delays.pageLoad);

      // 自动填充默认账号
      const defaultAccount = getDefaultAccount();
      if (defaultAccount) {
        console.log(`[${scriptName}] 找到默认账号，开始填充`);
        await fillAccount(defaultAccount);
      } else {
        showToast("无可用账号，请先配置账号");
      }
    } catch (error) {
      console.error(`[${scriptName}] 脚本执行失败:`, error);
      showToast("脚本执行失败，请检查控制台");
    }
    console.log(`[${scriptName}] 主函数执行完毕`);
  }

  // 添加配置按钮到页面
  function addConfigButton() {
    const button = document.createElement("button");
    button.id = "config-button";
    button.textContent = "⚙️ 账号配置";
    button.addEventListener("click", createConfigUI);
    document.body.appendChild(button);
  }

  // 注册脚本菜单项
  function registerMenuCommands() {
    // 获取当前填充次数
    const fillCount = GM_getValue("fillCount", 0);

    // 添加当前网址菜单项
    GM_registerMenuCommand("添加当前网址", () => {
      const currentUrl = window.location.href;
      // 检查当前网址是否包含login
      if (!currentUrl.includes("login")) {
        showToast("添加失败：当前网址不包含login！");
        return;
      }
      // 获取现有的自定义网址列表
      let customUrls = GM_getValue("customUrls", []);
      // 检查是否已存在
      if (!customUrls.includes(currentUrl)) {
        customUrls.push(currentUrl);
        GM_setValue("customUrls", customUrls);
        showToast("当前网址添加成功！");
      } else {
        showToast("该网址已存在！");
      }
    });

    // 查看自定义网址菜单项
    GM_registerMenuCommand("查看自定义网址", () => {
      const customUrls = GM_getValue("customUrls", []);
      if (customUrls.length > 0) {
        const urlsList = customUrls.join("\n");
        alert("自定义网址列表:\n" + urlsList);
      } else {
        showToast("暂无自定义网址！");
      }
    });

    // 清空自定义网址菜单项
    GM_registerMenuCommand("清空自定义网址", () => {
      if (confirm("确定要清空所有自定义网址吗？")) {
        GM_setValue("customUrls", []);
        showToast("自定义网址已清空！");
      }
    });

    // 显示填充次数菜单项（直接显示在菜单文本中）
    GM_registerMenuCommand(`填充次数: ${fillCount}次`, () => {
      const fillCount = GM_getValue("fillCount", 0);
      alert(`填充统计信息\n\n总填充次数: ${fillCount}次`);
    });

    // 重置填充计数器菜单项
    GM_registerMenuCommand("重置填充计数器", () => {
      if (confirm("确定要重置填充计数器吗？")) {
        GM_setValue("fillCount", 0);
        showToast("填充计数器已重置！");
      }
    });
  }

  // 检查当前网址是否在允许列表中
  function isUrlAllowed() {
    // 检查自定义网址
    const customUrls = GM_getValue("customUrls", []);
    // 检查当前网址是否在列表中
    return customUrls.includes(window.location.href);
  }

  // 初始化函数
  function initializeScript() {
    addCustomStyles();
    registerMenuCommands();

    // 检查自定义网址列表长度
    const customUrls = GM_getValue("customUrls", []);
    if (customUrls.length === 0) {
      console.log(`[${scriptName}] 自定义网址列表为空，脚本未运行`);
      return;
    }

    // 检查当前网址是否在允许列表中
    if (!isUrlAllowed()) {
      console.log(`[${scriptName}] 网址不匹配，脚本未运行`);
      return;
    }

    // 初始化站点信息和账号数据
    host = window.location.host;
    console.log(`[${scriptName}] 当前站点: ${host}`);

    // 从 Tampermonkey 存储中读取账号数据（按 host 区分）
    accounts = GM_getValue("accounts_" + host, []);
    defaultAccountIndex = GM_getValue("defaultAccountIndex_" + host, -1);
    console.log(
      `[${scriptName}] 加载账号数据: ${accounts.length} 个账号, 默认账号索引: ${defaultAccountIndex}`,
    );

    addConfigButton();
    main();
  }

  // 初始化
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initializeScript);
  } else {
    initializeScript();
  }
})();
