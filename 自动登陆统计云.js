// ==UserScript==
// @name         统计云自动登陆
// @namespace    http://tampermonkey.net/
// @version      3.6
// @description  自动处理网站登录流程，包括验证码识别、账号管理等
// @author       hanj-cn@qq.com
// @match        http://10.42.181.55:8800/dg/page.html*
// @match        https://tjyhome.stats.gov.cn/platform/page.html*
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_xmlhttpRequest
// @require      https://code.jquery.com/jquery-3.6.0.min.js
// @updateURL    https://raw.githubusercontent.com/hanj2025/MyScript/main/自动登陆统计云.js
// @downloadURL  https://raw.githubusercontent.com/hanj2025/MyScript/main/自动登陆统计云.js  
// @license      MIT
// ==/UserScript==

// 2026-03-17 v3.6
//  - ocr接口增加了语言自动识别参数，提升验证码识别准确率
//  - 修改了ocr引擎的版本参数，使用更先进的引擎

// 2026-03-17 v3.5
//  - 增加了ocr等待时间

// 2026-03-16 v3.4
//  - 修改了ocr api为ocr.space,并内置了一个密钥：helloworld

// 2026-03-11 v3.3
//  - 优化了控制面板3个checkbox的联动逻辑，增强用户体验
//  - 修改了配色

(function () {
    'use strict';

    // 读取脚本名
    const scriptName = GM_info.script.name
    // 读取版本号
    const version = GM_info.script.version;
    // 读取作者
    const author = GM_info.script.author;
    // 默认ocr api密钥
    const DEFAULT_OCR_API_KEY = 'helloworld';

    const CONFIG = {
        // DOM选择器配置（使用XPath）
        selectors: {
            usernameInput: '//*[@id="app"]/div/div/div[2]/div/div[3]/div[2]/div/form/div[1]/div/div/input',  // 用户名输入框XPath
            passwordInput: '/html/body/div/input',  // 密码输入框XPath
            captchaInput: '//*[@id="app"]/div/div/div[2]/div/div[3]/div[2]/div/form/div[3]/div/div/input',  // 验证码输入框XPath
            captchaImage: '//*[@id="app"]/div/div/div[2]/div/div[3]/div[2]/div/form/div[3]/div/div/div/img',  // 验证码图片XPath
            loginButton: '//*[@id="app"]/div/div/div[2]/div/div[3]/div[2]/div/form/button',  // 登录按钮XPath
        },
        // 延时配置（毫秒）
        delays: {
            pageLoad: 500,     // 页面加载等待时间
            captchaLoad: 300,  // 验证码图片加载等待时间
            ocrLoad: 1000, // ocr等待时间
        },
        // 开关控制
        enabled: true,  // 脚本总开关
        autoCaptcha: true, // 自动验证码开关
        autoLogin: true, // 自动登录开关
    };

    // 当前站点host，用于区分不同网站的存储
    const host = window.location.host;
    console.log('当前站点host:', host);

    // 从 Tampermonkey 存储中读取账号数据（按 host 区分）
    let accounts = GM_getValue('accounts_' + host, []);
    let defaultAccountIndex = GM_getValue('defaultAccountIndex_' + host, -1);
    console.log('加载账号数据:', accounts, '默认账号索引:', defaultAccountIndex);

    // ocr API 密钥
    let ocrApiKey = GM_getValue('ocrApiKey', '');
    console.log('加载ocr API密钥:', ocrApiKey);

    // 如果没有提供密钥，使用默认密钥
    if (!ocrApiKey || ocrApiKey.trim() === "") {
        ocrApiKey = DEFAULT_OCR_API_KEY;
        console.log('未提供ocr API密钥，使用默认密钥:', DEFAULT_OCR_API_KEY);
    }

    // 获取默认账号
    function getDefaultAccount() {
        if (defaultAccountIndex >= 0 && defaultAccountIndex < accounts.length) {
            console.log('使用默认账号:', accounts[defaultAccountIndex].username);
            return accounts[defaultAccountIndex];
        } else if (accounts.length > 0) {
            // 如果没有设置默认账号，使用第一个账号
            console.log('未设置默认账号，使用第一个账号:', accounts[0].username);
            return accounts[0];
        }
        return null;
    }

    // ocr接口
    async function ocrBase64(apiKey, base64) {
        try {
            const res = await fetch("https://api.ocr.space/parse/image", {
                method: "POST",
                headers: { "Content-Type": "application/x-www-form-urlencoded" },
                // 新增 OCREngine=2 和 language=auto 参数
                body: "apikey=" + apiKey
                    + "&base64Image=" + encodeURIComponent(base64)
                    + "&OCREngine=2"
                    + "&language=auto"
            });

            const data = await res.json();

            if (data.IsErroredOnProcessing) {
                console.error("ocr识别失败：", data.ErrorMessage);
                return;
            }
            console.log("ocr原始返回数据：", data);
            console.log("ocr识别结果：", data.ParsedResults[0]?.ParsedText);
            return data.ParsedResults[0]?.ParsedText;
        } catch (err) {
            console.error("ocr请求错误：", err);
        }
    }
    // 显示提示消息（支持多个消息堆叠）
    const activeToasts = [];
    function showToast(message, arg = "未传入参数") {
        const toast = document.createElement('div');
        toast.textContent = message;
        toast.style.cssText = `
            position: fixed; left: 50%; transform: translateX(-50%);
            background: #333; color: white; padding: 15px 25px; border-radius: 8px;
            z-index: 10001; font-size: 16px; opacity: 0.95; text-align: center;
            box-shadow: 0 4px 12px rgba(0,0,0,0.3);
            transition: top 0.3s ease;
        `;

        // 计算位置：第一个在屏幕中央，后续的依次向下排列
        const toastHeight = 60; // 估算每个toast的高度（包括间距）
        const index = activeToasts.length;
        const topPosition = 50 + (index * toastHeight);
        toast.style.top = `calc(${topPosition}px + 20%)`;

        document.body.appendChild(toast);
        activeToasts.push(toast);
        //arg判空
        if (arg == "未传入参数") {
            console.log(message);
        } else {
            console.log(message, arg);
        }

        setTimeout(() => {
            toast.remove();
            const idx = activeToasts.indexOf(toast);
            if (idx > -1) {
                activeToasts.splice(idx, 1);
                // 重新调整剩余toast的位置
                activeToasts.forEach((t, i) => {
                    const newTop = 50 + (i * toastHeight);
                    t.style.top = `calc(${newTop}px + 20%)`;
                });
            }
        }, 3000);
    }

    // 保存账号数据（按 host 区分）
    function saveAccounts() {
        GM_setValue('accounts_' + host, accounts);
        GM_setValue('defaultAccountIndex_' + host, defaultAccountIndex);
        console.log('账号数据已保存', accounts, '默认账号索引:', defaultAccountIndex);
    }

    // 辅助函数：延时
    function sleep(ms) {
        console.log(`等待 ${ms} 毫秒...`);
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    // 辅助函数：通过XPath获取元素，支持iframe
    function getElementByXPath(xpath, context = document) {
        try {
            console.log('正在通过XPath获取元素:', xpath);
            return context.evaluate(xpath, context, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
        } catch (e) {
            console.error("XPath获取错误:", xpath, e);
            return null;
        }
    }

    // 辅助函数：等待XPath元素出现，支持iframe
    async function waitForElementByXPath(xpath, timeout = 5000, context = document) {
        console.log('等待元素出现，XPath:', xpath);
        const startTime = Date.now();
        while (Date.now() - startTime < timeout) {
            const element = getElementByXPath(xpath, context);
            if (element) return element;
            await sleep(100);
        }
        console.error('等待元素超时:', xpath);
        return null;
    }

    // ==================== UI界面 ====================
    // 创建配置界面
    function createConfigUI() {
        const overlay = document.createElement('div');
        overlay.id = 'auto-login-config-overlay';
        overlay.style.cssText = `
            position: fixed; top: 0; left: 0; width: 100%; height: 100%;
            background: rgba(0,0,0,0.6); z-index: 10000;
            display: flex; justify-content: center; align-items: center;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        `;

        const panel = document.createElement('div');
        panel.style.cssText = `
            background: #ffffff; padding: 30px; border-radius: 12px;
            max-width: 550px; width: 90%; max-height: 85vh; overflow-y: auto;
            box-shadow: 0 10px 30px rgba(0,0,0,0.3);
            border: 1px solid #e0e0e0;
            color: #333;
        `;

        // 使用模板字符串构建HTML，增强可读性和维护性，显示网页标题和作者信息
        panel.innerHTML = `
            <h3 style="margin: 0 0 10px 0; font-size: 24px; text-align: center;">${scriptName} v${version}</h3>
            <p style="margin: 0 0 5px 0; color: #666; font-size: 14px; text-align: center;">当前网站: ${document.title}</p>
            <div id="accounts-list" style="margin-bottom: 20px;"></div>
            <button id="add-account-btn" style="
                background: #28a745; color: white; border: none; border-radius: 6px;
                padding: 10px 20px; font-size: 14px; cursor: pointer; width: 100%;
                transition: background 0.3s;
            " onmouseover="this.style.background='#1e7e34'" onmouseout="this.style.background='#28a745'">添加账号</button>
            <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
            <h4 style="margin: 0 0 15px 0; font-size: 18px;">脚本开关</h4>
            <div style="display: flex; flex-direction: column; gap: 10px;">
                <label style="display: flex; align-items: center; cursor: pointer;">
                    <input type="checkbox" id="enabled-toggle" style="margin-right: 10px; transform: scale(1.2);">
                    <span>启用脚本</span>
                </label>
                <label style="display: flex; align-items: center; cursor: pointer;">
                    <input type="checkbox" id="auto-captcha-toggle" style="margin-right: 10px; transform: scale(1.2);">
                    <span>自动识别验证码</span>
                </label>
                <label style="display: flex; align-items: center; cursor: pointer;">
                    <input type="checkbox" id="auto-login-toggle" style="margin-right: 10px; transform: scale(1.2);">
                    <span>自动点击登录</span>
                </label>
            </div>
            <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
            <div style="display: flex; flex-direction: column; gap: 15px;">
                <label style="display: flex; flex-direction: column;">
                    <span target="_blank" style="margin-bottom: 5px; font-weight: 500;">OCR API密钥 （本脚本已内置，<a href="https://ocr.space/OCRAPI" target="_blank">自行注册点此</a>）</span>
                    <input type="text" id="ocr-api-key" placeholder="输入您的OCR API密钥" style="
                        padding: 12px; border: 1px solid #ddd; border-radius: 6px;
                        font-size: 14px; outline: none; transition: border-color 0.3s;
                    " onfocus="this.style.borderColor='#28a745'" onblur="this.style.borderColor='#ddd'">
                </label>
            </div>
            <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
            <div style="display: flex; gap: 10px;">
                <button id="save-config-btn" style="
                    flex: 1; background: #28a745; color: white; border: none; border-radius: 6px;
                    padding: 12px; font-size: 14px; cursor: pointer; transition: background 0.3s;
                " onmouseover="this.style.background='#218838'" onmouseout="this.style.background='#28a745'">保存配置</button>
                <button id="close-config-btn" style="
                    flex: 1; background: #dc3545; color: white; border: none; border-radius: 6px;
                    padding: 12px; font-size: 14px; cursor: pointer; transition: background 0.3s;
                " onmouseover="this.style.background='#c82333'" onmouseout="this.style.background='#dc3545'">关闭</button>
            </div>
            <div>       
                <footer style="margin-top: 20px; color: #999; font-size: 12px; text-align: center;">
                <p style="margin: 0 0 20px 0; font-size: 12px; text-align: center;">作者: ${author}</p>    
            </div>
        `;

        overlay.appendChild(panel);
        document.body.appendChild(overlay);

        // 获取所有开关元素
        const enabledToggle = document.getElementById('enabled-toggle');
        const autoCaptchaToggle = document.getElementById('auto-captcha-toggle');
        const autoLoginToggle = document.getElementById('auto-login-toggle');

        // 总开关：关闭时 → 强制关闭两个子开关
        enabledToggle.addEventListener('change', () => {
            if (!enabledToggle.checked) {
                autoCaptchaToggle.checked = false;
                autoLoginToggle.checked = false;
            }
        });

        // 统一处理两个子开关的逻辑
        function handleSubToggleChange() {
            const hasAnySubEnabled = autoCaptchaToggle.checked || autoLoginToggle.checked;

            if (hasAnySubEnabled) {
                // 任意子开关开启 → 自动开启总开关
                enabledToggle.checked = true;
            } else {
                // 所有子开关关闭 → 自动关闭总开关
                enabledToggle.checked = false;
            }
        }

        // 给两个子开关绑定同一个处理函数
        autoCaptchaToggle.addEventListener('change', handleSubToggleChange);
        autoLoginToggle.addEventListener('change', handleSubToggleChange);

        // 其他按钮事件
        document.getElementById('add-account-btn').addEventListener('click', addAccountForm);
        document.getElementById('save-config-btn').addEventListener('click', saveConfig);
        document.getElementById('close-config-btn').addEventListener('click', () => overlay.remove());

        // 加载现有账号
        loadAccountsList();

        // 加载开关状态
        loadToggles();
    }

    // 加载账号列表
    function loadAccountsList() {
        const list = document.getElementById('accounts-list');
        list.innerHTML = `<h4 style="margin: 0 0 15px 0; font-size: 18px;">账号列表 (${host})</h4>`;
        if (accounts.length === 0) {
            list.innerHTML += '<p style="color: #999; text-align: center;">暂无账号，请添加账号</p>';
            return;
        }
        accounts.forEach((account, index) => {
            const item = document.createElement('div');
            item.style.cssText = `
                display: flex; justify-content: space-between; align-items: center;
                margin: 10px 0; padding: 15px; border: 1px solid #e0e0e0; border-radius: 8px;
                background: #f9f9f9; transition: background 0.3s;
            `;
            item.onmouseover = () => item.style.background = '#f0f0f0';
            item.onmouseout = () => item.style.background = '#f9f9f9';
            item.innerHTML = `
                <div style="flex: 1;">
                    <strong>${account.username}</strong>
                    ${index === defaultAccountIndex ? '<span style="color: #28a745; font-size: 12px; margin-left: 10px;">(默认)</span>' : ''}
                </div>
                <div style="display: flex; gap: 5px;">
                    <button class="set-default-btn" data-index="${index}" style="
                        background: #ffc107; color: #333; border: none; border-radius: 4px;
                        padding: 6px 12px; font-size: 12px; cursor: pointer;
                    ">设为默认</button>
                    <button class="delete-account-btn" data-index="${index}" style="
                        background: #dc3545; color: white; border: none; border-radius: 4px;
                        padding: 6px 12px; font-size: 12px; cursor: pointer;
                    ">删除</button>
                </div>
            `;
            list.appendChild(item);
        });

        // 绑定删除和设为默认按钮
        document.querySelectorAll('.delete-account-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
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

        document.querySelectorAll('.set-default-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                defaultAccountIndex = parseInt(e.target.dataset.index);
                saveAccounts();
                loadAccountsList();
                showToast('默认账号已切换！请刷新页面以应用更改。');
            });
        });
    }

    // 添加账号表单
    function addAccountForm() {
        const overlay = document.createElement('div');
        overlay.style.cssText = `
            position: fixed; top: 0; left: 0; width: 100%; height: 100%;
            background: rgba(0,0,0,0.6); z-index: 10001;
            display: flex; justify-content: center; align-items: center;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        `;

        const form = document.createElement('div');
        form.style.cssText = `
            background: #ffffff; padding: 30px; border-radius: 12px;
            max-width: 400px; width: 90%; box-shadow: 0 10px 30px rgba(0,0,0,0.3);
            color: #333;
        `;

        form.innerHTML = `
            <h4 style="margin: 0 0 20px 0; text-align: center;">添加新账号</h4>
            <div style="display: flex; flex-direction: column; gap: 15px;">
                <label style="display: flex; flex-direction: column;">
                    <span style="margin-bottom: 5px; font-weight: 500;">用户名</span>
                    <input type="text" id="new-username" placeholder="请输入用户名" style="
                        padding: 12px; border: 1px solid #ddd; border-radius: 6px;
                        font-size: 14px; outline: none; transition: border-color 0.3s;
                    " onfocus="this.style.borderColor='#007bff'" onblur="this.style.borderColor='#ddd'">
                </label>
                <label style="display: flex; flex-direction: column;">
                    <span style="margin-bottom: 5px; font-weight: 500;">密码</span>
                    <input type="password" id="new-password" placeholder="请输入密码" style="
                        padding: 12px; border: 1px solid #ddd; border-radius: 6px;
                        font-size: 14px; outline: none; transition: border-color 0.3s;
                    " onfocus="this.style.borderColor='#007bff'" onblur="this.style.borderColor='#ddd'">
                </label>
            </div>
            <div style="display: flex; gap: 10px; margin-top: 20px;">
                <button id="confirm-add" style="
                    flex: 1; background: #28a745; color: white; border: none; border-radius: 6px;
                    padding: 12px; font-size: 14px; cursor: pointer; transition: background 0.3s;
                " onmouseover="this.style.background='#218838'" onmouseout="this.style.background='#28a745'">添加</button>
                <button id="cancel-add" style="
                    flex: 1; background: #6c757d; color: white; border: none; border-radius: 6px;
                    padding: 12px; font-size: 14px; cursor: pointer; transition: background 0.3s;
                " onmouseover="this.style.background='#5a6268'" onmouseout="this.style.background='#6c757d'">取消</button>
            </div>
        `;

        overlay.appendChild(form);
        document.body.appendChild(overlay);

        document.getElementById('confirm-add').addEventListener('click', () => {
            const username = document.getElementById('new-username').value.trim();
            const password = document.getElementById('new-password').value.trim();
            if (!username || !password) {
                showToast('用户名和密码不能为空！');
                return;
            }
            accounts.push({ username, password });
            saveAccounts();
            loadAccountsList();
            overlay.remove();
            showToast('账号添加成功！');
        });
        document.getElementById('cancel-add').addEventListener('click', () => overlay.remove());
    }

    // 加载开关状态
    function loadToggles() {
        console.log('加载开关状态');
        document.getElementById('enabled-toggle').checked = CONFIG.enabled;
        document.getElementById('auto-captcha-toggle').checked = CONFIG.autoCaptcha;
        document.getElementById('auto-login-toggle').checked = CONFIG.autoLogin;
        document.getElementById('ocr-api-key').value = ocrApiKey;
    }

    // 保存配置
    function saveConfig() {
        console.log('开始保存配置');

        // 如果勾选了OCR识别，则检查OCR API密钥已填写
        if (document.getElementById('auto-captcha-toggle').checked && !document.getElementById('ocr-api-key').value.trim()) {
            showToast('未填写OCR API密钥，将使用默认密钥');
            // 使用默认密钥
            ocrApiKey = DEFAULT_OCR_API_KEY;
        } else {
            // 否则使用用户输入的密钥
            ocrApiKey = document.getElementById('ocr-api-key').value;
        }

        CONFIG.enabled = document.getElementById('enabled-toggle').checked;
        CONFIG.autoCaptcha = document.getElementById('auto-captcha-toggle').checked;
        CONFIG.autoLogin = document.getElementById('auto-login-toggle').checked;

        GM_setValue('config', CONFIG);
        GM_setValue('ocrApiKey', ocrApiKey);

        showToast('配置已保存', CONFIG);
    }

    // ==================== 自动登录逻辑 ====================
    // 填充账号信息
    async function fillAccount(account) {
        console.log('开始填充账号信息', account);
        const usernameInput = await waitForElementByXPath(CONFIG.selectors.usernameInput);

        // 等待iframe加载
        console.log('等待密码输入框iframe加载');
        const passwordIframe = await waitForElementByXPath('//iframe[@class="dsfa-password-iframe-input_input"]');
        let passwordInput = null;
        if (passwordIframe) {
            await new Promise(resolve => {
                if (passwordIframe.contentDocument && passwordIframe.contentDocument.readyState === 'complete') {
                    resolve();
                } else {
                    passwordIframe.onload = resolve;
                }
            });
            passwordInput = passwordIframe.contentDocument.querySelector('input[type="password"]');
        }

        console.log('填充账号:', account.username, account.password);
        console.log('用户名输入框:', usernameInput);
        console.log('密码输入框:', passwordInput);

        if (usernameInput) {
            usernameInput.value = account.username;
            usernameInput.dispatchEvent(new Event('input', { bubbles: true }));
            usernameInput.dispatchEvent(new Event('change', { bubbles: true }));
            console.log('用户名填充成功');
        } else {
            console.log('用户名输入框未找到');
        }

        if (passwordInput) {
            passwordInput.value = account.password;
            passwordInput.dispatchEvent(new Event('input', { bubbles: true }));
            passwordInput.dispatchEvent(new Event('change', { bubbles: true }));
            console.log('密码填充成功');
        } else {
            console.log('密码输入框未找到');
        }

        showToast('账号已填充');
    }

    // 处理验证码
    async function handleCaptcha() {
        console.log('开始处理验证码');
        const captchaImage = await waitForElementByXPath(CONFIG.selectors.captchaImage);
        const captchaInput = await waitForElementByXPath(CONFIG.selectors.captchaInput);

        if (!captchaImage || !captchaInput) {
            console.log('验证码图片或输入框未找到，跳过处理');
            return;
        }

        console.log('等待验证码图片加载');
        await sleep(CONFIG.delays.captchaLoad);

        const imageUrl = captchaImage.src;
        if (!imageUrl) {
            console.log('验证码图片URL为空，跳过处理');
            return;
        }

        console.log('开始识别验证码');
        const code = await ocrBase64(ocrApiKey, imageUrl);
        if (code) {
            //code要去除所有空格
            captchaInput.value = code.trim().split(' ').join('');
            captchaInput.dispatchEvent(new Event('input', { bubbles: true }));
            captchaInput.dispatchEvent(new Event('change', { bubbles: true }));
            showToast('验证码已自动填写', captchaInput.value);
            return "success";
        } else {
            showToast("ocr识别失败，如多次失败请更换默认密钥或者关闭自动验证码功能");
            return "fail";
        }
    }

    // 主函数
    async function main() {
        console.log('自动登录脚本主函数开始执行');
        try {
            // 加载配置
            const savedConfig = GM_getValue('config', {});
            Object.assign(CONFIG, savedConfig);

            if (!CONFIG.enabled) {
                console.log('脚本被禁用，退出');
                return;
            }

            // 等待页面加载
            console.log('等待页面加载...');
            await sleep(CONFIG.delays.pageLoad);

            // 自动填充默认账号
            const defaultAccount = getDefaultAccount();
            if (defaultAccount) {
                console.log('找到默认账号，开始填充');
                await fillAccount(defaultAccount);

                // 自动处理验证码
                if (CONFIG.autoCaptcha) {
                    console.log('启用自动验证码，开始处理');
                    let stats = await handleCaptcha();
                    if (stats == "fail") {
                        console.log('验证码处理失败，停止后续自动登录操作');
                        return;
                    }
                }

                // 自动点击登录按钮
                if (CONFIG.autoLogin) {
                    console.log('启用自动登录，检查验证码输入框内容后点击登录按钮');
                    // 如果启用了自动验证码但验证码输入框没有被正确填充，则不自动点击登录，避免登录失败
                    if (CONFIG.autoCaptcha) {
                        // 等待，确保验证码输入框被填充（如果有验证码的话）
                        await sleep(CONFIG.delays.ocrLoad);
                        const captchaInput = getElementByXPath(CONFIG.selectors.captchaInput);
                        if (captchaInput && captchaInput.value === '') {
                            console.log('验证码输入框未被填充，可能识别失败，暂不自动点击登录');
                            return;
                        }
                        console.log('验证码输入框内容:', captchaInput ? captchaInput.value : '未找到验证码输入框');
                        const loginBtn = getElementByXPath(CONFIG.selectors.loginButton);
                        if (loginBtn) {
                            loginBtn.click();
                            showToast('已自动点击登录');
                        } else {
                            console.log('登录按钮未找到，无法自动点击');
                        }
                    }
                }
            } else {
                showToast('无可用账号，请先配置账号');
            }

        } catch (error) {
            showToast('脚本执行失败，请检查控制台', error);
        }
        console.log('自动登录脚本主函数执行完毕');
    }

    // 添加配置按钮到页面
    function addConfigButton() {
        const button = document.createElement('button');
        button.textContent = '⚙️ 账号配置';
        button.style.cssText = `
            position: fixed; top: 20px; left: 20px; z-index: 9999;
            background: linear-gradient(135deg, #28a745, #1e7e34); color: white;
            border: none; border-radius: 50px; padding: 12px 20px;
            font-size: 14px; font-weight: 500; cursor: pointer;
            box-shadow: 0 4px 12px rgba(40,167,69,0.3);
            transition: all 0.3s ease; display: flex; align-items: center; gap: 8px;
        `;
        button.onmouseover = () => {
            button.style.transform = 'scale(1.05)';
            button.style.boxShadow = '0 6px 20px rgba(40,167,69,0.4)';
        };
        button.onmouseout = () => {
            button.style.transform = 'scale(1)';
            button.style.boxShadow = '0 4px 12px rgba(40,167,69,0.3)';
        };
        button.addEventListener('click', createConfigUI);
        document.body.appendChild(button);
    }

    // 初始化
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            if (window.location.href.includes('login')) {
                addConfigButton();
                main();
            }
        });
    } else {
        if (window.location.href.includes('login')) {
            addConfigButton();
            main();
        }
    }

})();