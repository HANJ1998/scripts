// ==UserScript==
// @name         网页表格导出
// @namespace    http://tampermonkey.net/
// @version      1.3
// @description  在网页表格右上角添加导出按钮，支持导出为XLSX文件，处理长数字精度问题，监测网页实时变化
// @author       hanj-cn@qq.com
// @match        *://*/*
// @grant        GM_registerMenuCommand
// @grant        GM_setValue
// @grant        GM_getValue
// @require      https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js
// @updateURL    https://raw.githubusercontent.com/hanj2025/MyScript/main/网页表格导出.js
// @downloadURL  https://raw.githubusercontent.com/hanj2025/MyScript/main/网页表格导出.js
// @license      MIT

// ==/UserScript==


// 更新日志
// 20260314 v1.3
//  - 新增菜单：排除网站
//  - 新增功能：排除指定网站不显示导出按钮

(function () {
    'use strict';

    const author = GM_info.script.author;
    const version = GM_info.script.version;
    const EXCLUDE_SITES_KEY = 'excludeSites';

    function getExcludeSites() {
        const sites = GM_getValue(EXCLUDE_SITES_KEY, '');
        return sites.split('\n').filter(site => site.trim() !== '');
    }

    function saveExcludeSites(sites) {
        GM_setValue(EXCLUDE_SITES_KEY, sites.join('\n'));
    }

    function isSiteExcluded(currentUrl) {
        const excludeSites = getExcludeSites();
        for (let pattern of excludeSites) {
            const regexPattern = pattern.replace(/\*/g, '.*').replace(/\?/g, '.');
            const regex = new RegExp('^' + regexPattern);
            if (regex.test(currentUrl)) {
                return true;
            }
        }
        return false;
    }

    function setupExcludeMenu() {
        GM_registerMenuCommand('排除网站', function () {
            const currentSites = getExcludeSites();
            showExcludeDialog(currentSites);
        });
    }

    function showExcludeDialog(currentSites) {
        const dialog = document.createElement('div');
        dialog.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.5);z-index:10000;display:flex;justify-content:center;align-items:center;';

        const content = document.createElement('div');
        content.style.cssText = 'background:white;padding:20px;border-radius:8px;max-width:600px;width:90%;box-shadow:0 4px 20px rgba(0,0,0,0.3);';

        const title = document.createElement('h3');
        title.textContent = '排除网站设置';
        title.style.cssText = 'margin:0 0 15px 0;color:#333;';

        const description = document.createElement('p');
        description.textContent = '输入要排除的网址，每行一个，支持通配符*';
        description.style.cssText = 'margin:0 0 10px 0;color:#666;font-size:14px;';

        const example = document.createElement('p');
        example.textContent = '例如：https://github.com/*/script';
        example.style.cssText = 'margin:0 0 15px 0;color:#999;font-size:12px;';

        const textarea = document.createElement('textarea');
        textarea.value = currentSites.join('\n');
        textarea.style.cssText = 'width:100%;height:200px;padding:10px;border:1px solid #ddd;border-radius:4px;font-family:monospace;font-size:12px;resize:vertical;box-sizing:border-box;color:#333;background-color:#fff;';

        const buttonContainer = document.createElement('div');
        buttonContainer.style.cssText = 'display:flex;justify-content:flex-end;gap:10px;margin-top:15px;';

        const cancelButton = document.createElement('button');
        cancelButton.textContent = '取消';
        cancelButton.style.cssText = 'padding:8px 20px;border:1px solid #ccc;background:#f5f5f5;color:#333;border-radius:4px;cursor:pointer;transition:all 0.2s;';

        cancelButton.addEventListener('mouseover', function () {
            cancelButton.style.background = '#e8e8e8';
            cancelButton.style.borderColor = '#bbb';
        });

        cancelButton.addEventListener('mouseout', function () {
            cancelButton.style.background = '#f5f5f5';
            cancelButton.style.borderColor = '#ccc';
        });

        const saveButton = document.createElement('button');
        saveButton.textContent = '保存';
        saveButton.style.cssText = 'padding:8px 20px;border:none;background:#227447;color:white;border-radius:4px;cursor:pointer;transition:all 0.2s;';

        saveButton.addEventListener('mouseover', function () {
            saveButton.style.background = '#1a5c38';
        });

        saveButton.addEventListener('mouseout', function () {
            saveButton.style.background = '#227447';
        });

        const authorAndVersionInfo = document.createElement('span');
        authorAndVersionInfo.textContent = '版本：' + version + ' | ' + '作者：' + author;
        authorAndVersionInfo.style.cssText = 'color:#227447;font-size:12px;margin-right:auto;';

        buttonContainer.appendChild(authorAndVersionInfo);
        buttonContainer.appendChild(cancelButton);
        buttonContainer.appendChild(saveButton);

        content.appendChild(title);
        content.appendChild(description);
        content.appendChild(example);
        content.appendChild(textarea);
        content.appendChild(buttonContainer);
        dialog.appendChild(content);

        cancelButton.addEventListener('click', function () {
            document.body.removeChild(dialog);
        });

        saveButton.addEventListener('click', function () {
            const input = textarea.value;
            const sites = input.split('\n').filter(site => site.trim() !== '');
            saveExcludeSites(sites);
            document.body.removeChild(dialog);
            alert('已保存 ' + sites.length + ' 个排除网站');
        });

        dialog.addEventListener('click', function (e) {
            if (e.target === dialog) {
                document.body.removeChild(dialog);
            }
        });

        document.body.appendChild(dialog);
        textarea.focus();
    }

    // 等待XLSX库加载完成
    function waitForXLSX() {
        if (isSiteExcluded(window.location.href)) {
            console.log('当前网站在排除列表中，脚本不执行');
            return;
        }

        if (typeof XLSX !== 'undefined') {
            // XLSX库已加载，初始化脚本
            initScript();
        } else {
            // 等待100毫秒后重试
            setTimeout(waitForXLSX, 100);
        }
    }

    // 初始化脚本
    function initScript() {
        // 等待页面加载完成
        window.addEventListener('load', function () {
            // 查找所有表格
            const tables = document.querySelectorAll('table');

            tables.forEach(table => {
                // 为每个表格添加导出按钮
                addExportButton(table);
            });

            // 设置MutationObserver监测网页变化
            setupMutationObserver();
        });
    }

    // 设置MutationObserver监测网页变化
    function setupMutationObserver() {
        const observer = new MutationObserver(function (mutations) {
            mutations.forEach(function (mutation) {
                // 检查是否有新的表格添加
                if (mutation.type === 'childList') {
                    // 查找新添加的表格
                    const newTables = mutation.addedNodes;
                    newTables.forEach(function (node) {
                        if (node.nodeType === Node.ELEMENT_NODE) {
                            // 检查节点本身是否是表格
                            if (node.tagName === 'TABLE') {
                                addExportButton(node);
                            }
                            // 检查节点的子元素中是否有表格
                            const tablesInNode = node.querySelectorAll('table');
                            tablesInNode.forEach(function (table) {
                                addExportButton(table);
                            });
                        }
                    });
                }
            });
        });

        // 配置观察选项
        const config = {
            childList: true,
            subtree: true
        };

        // 开始观察文档根节点
        observer.observe(document.body, config);
    }

    // 添加导出按钮
    function addExportButton(table) {
        // 创建按钮
        const button = document.createElement('button');
        button.textContent = '导表';

        // 设置按钮样式
        button.style.position = 'absolute';
        button.style.top = '5px';
        button.style.right = '5px';
        button.style.zIndex = '1000';
        button.style.padding = '3px 6px';
        button.style.backgroundColor = 'rgba(34, 116, 71, 0.4)'; // xlsx绿色，更透明
        button.style.color = 'white';
        button.style.border = '1px solid rgba(34, 116, 71, 0.5)';
        button.style.borderRadius = '3px';
        button.style.cursor = 'pointer';
        button.style.fontSize = '10px';
        button.style.transition = 'all 0.3s';
        button.style.minWidth = '40px';
        button.style.textAlign = 'center';

        // 鼠标悬停时增加不透明度
        button.addEventListener('mouseover', function () {
            button.style.backgroundColor = 'rgba(34, 116, 71, 0.7)'; // 悬停时增加透明度
        });

        button.addEventListener('mouseout', function () {
            button.style.backgroundColor = 'rgba(34, 116, 71, 0.4)';
        });

        // 为表格的父元素设置相对定位
        const parent = table.parentElement;
        if (parent.style.position === '' || parent.style.position === 'static') {
            parent.style.position = 'relative';
        }

        // 将按钮添加到表格的父元素中
        parent.appendChild(button);

        // 点击按钮导出表格
        button.addEventListener('click', function () {
            exportTableToXLSX(table);
        });
    }

    /* 安全文件名：保留中文、字母、数字、部分符号，其余变 _，合并连续 _，去头尾，长度 30 */
    function safeFileName(rawTitle) {
        const txt = (rawTitle || 'table').replace(/&[a-zA-Z0-9#]+;/g, ' ').trim();
        let s = txt.replace(/[^\u4e00-\u9fa5\u3040-\u309f\u30a0-\u30ff\uac00-\ud7afa-zA-Z0-9\-_. ]/g, '_');
        s = s.replace(/_+/g, '_').replace(/^_|_$/g, '');
        if (!s) s = 'table';
        return s.substring(0, 30);
    }



    // 导出表格为XLSX
    function exportTableToXLSX(table) {
        // 检查XLSX库是否可用
        if (typeof XLSX === 'undefined') {
            alert('XLSX库未加载，请刷新页面重试');
            return;
        }

        try {
            // 预处理表格中的超长数字，将其转换为文本
            table.querySelectorAll('td, th').forEach(cell => {
                const text = cell.textContent.trim();
                if (/^\d+(\.\d+)?$/.test(text) && text.replace(/\./, '').length > 11) {
                    // 创建一个新的文本节点，替换原内容
                    const textNode = document.createTextNode(text);
                    cell.innerHTML = "'";
                    cell.appendChild(textNode);
                    // 添加数据属性标记为已处理
                    cell.dataset.processed = 'true';
                }
            });

            // 创建工作簿
            const wb = XLSX.utils.book_new();

            // 使用table_to_sheet方法创建工作表（自动处理合并单元格）
            const ws = XLSX.utils.table_to_sheet(table);

            // 将工作表添加到工作簿
            XLSX.utils.book_append_sheet(wb, ws, '数据');

            // 生成文件名
            const now = new Date();
            const date = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;

            // 获取网页标题
            let siteName = document.title.trim();

            // 尝试获取表格标题
            let tableTitle = '';
            // 查找表格附近的标题元素
            const possibleTitles = table.parentNode.querySelectorAll('h1, h2, h3, h4, h5, h6');
            if (possibleTitles.length > 0) {
                tableTitle = possibleTitles[0].textContent.trim();
            }
            // 如果没有找到标题，尝试查找表格的caption
            if (!tableTitle) {
                const caption = table.querySelector('caption');
                if (caption) {
                    tableTitle = caption.textContent.trim();
                }
            }

            const safeSiteName = safeFileName(siteName);
            const safeTableTitle = safeFileName(tableTitle);

            // 组合文件名
            let fileNameParts = [date, safeSiteName];
            if (safeTableTitle) {
                fileNameParts.push(safeTableTitle);
            }
            fileNameParts.push(now.getTime());

            const fileName = `${fileNameParts.join('_')}.xlsx`;

            // 导出文件
            XLSX.writeFile(wb, fileName);
        } catch (error) {
            console.error('导出失败:', error);
            alert('导出失败，请检查控制台错误信息');
        }
    }

    // 开始等待XLSX库加载
    setupExcludeMenu();
    waitForXLSX();
})();