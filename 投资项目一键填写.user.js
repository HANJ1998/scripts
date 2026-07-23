// ==UserScript==
// @name         投资项目一键填写
// @namespace    https://workbuddy.local/投资项目一键填写
// @version      2.1.4
// @description  自动填写投资项目入库审核平台数据，记录和导出审核错误
// @match        http://10.42.31.22:7443/stat/collect/InputOrganForm*
// @grant        none
// @require      https://cdn.bootcdn.net/ajax/libs/xlsx/0.18.5/xlsx.full.min.js
// @run-at       document-idle
// @updateURL    https://jsd.onmicrosoft.cn/gh/HANJ1998/scripts@v2.1.4/投资项目一键填写.user.js
// @downloadURL  https://jsd.onmicrosoft.cn/gh/HANJ1998/scripts@v2.1.4/投资项目一键填写.user.js
// ==/UserScript==

// ============================================================
// Changelog
// 2.1.4 - 2026-07-23: 记录所有A类错误(不限强制性); 改用Git标签分发(@main→@v2.1.4)
// 2.1.3 - 2026-07-22: CDN切换到国内BootCDN
// 2.1.2 - 2026-07-22: 移除噪音日志屏蔽，所有页面日志放行
// 2.1.1 - 2026-07-22: 空值自动填0; 替换失效CDN(cdnjs.webstatic.cn→jsDelivr)
// ============================================================

(function () {
    "use strict";

    // ============================================================
    // 防止脚本重复注入（油猴可能因页面切换重复执行）
    // ============================================================
    if (window.__xlsxUploaderLoaded__) return;
    window.__xlsxUploaderLoaded__ = true;

    // ============================================================
    // 全局变量：存储从 xlsx 读取的数据（SheetJS 解析结果）
    // 结构：{ fileName, sheetName, headers: string[], rows: object[], raw: Workbook }
    // ============================================================
    window.__xlsxData__ = null;

    // ============================================================
    // 带颜色的控制台输出
    // 统一前缀 [WB] + 颜色，和页面自身的日志区分
    // ============================================================
    const LOG_COLORS = {
        info: '#409eff',    // 蓝色 — 一般信息
        ok: '#67c23a',      // 绿色 — 成功
        warn: '#e6a23c',    // 橙色 — 警告
        err: '#f56c6c',     // 红色 — 错误
        title: '#909399',   // 灰色 — 标题/分隔
    };
    function _log(colorKey, ...args) {
        const color = LOG_COLORS[colorKey] || '#409eff';
        console.log(`%c[WB] ${args[0]}`, `color:${color};font-weight:bold;`, ...args.slice(1));
    }

    // ============================================================
    // Hook console.log 捕获 spreadsheet 实例
    //
    // thtf-spreadsheet 组件的数据操作不通过 DOM 编辑，
    // 单元格数据在组件内部实例 e 上（用 e.rows._[行号].cells[列号] 读写）。
    // 该实例 e 在每次双击单元格时通过 console.log("[ data ]-1238", e) 暴露。
    //
    // 本 hook 拦截 console.log，捕获 e 存到 window.__ssInstance__，
    // 当检测到 pending autoFill 时，自动执行 executeFill()。
    // ============================================================
    window.__ssInstance__ = null;
    (function installHook() {
        if (window.__consoleHookInstalled__) return;
        window.__consoleHookInstalled__ = true;

        // 创建隐藏 iframe 获取原生 console.log 引用，避免 hook 自身递归
        const _iframe = document.createElement("iframe");
        _iframe.style.display = "none";
        document.body.appendChild(_iframe);
        const _rawLog = _iframe.contentWindow.console.log.bind(console);

        console.log = function (...args) {
            try {
                const tag = String(args[0] || '');

                // ---------- 捕获 [ data ] 打印的实例 e ----------
                // 格式: [ data ]-1238 e {rows, cols, settings, ...}
                if (tag.includes('[ data ]') && args[1] && typeof args[1] === 'object') {
                    const wasNull = !window.__ssInstance__;
                    window.__ssInstance__ = args[1]; // 存到全局

                    // 如果有 pending 的一键填写，实例就绪后自动执行
                    if (wasNull && window.__pendingAutoFill__) {
                        window.__pendingAutoFill__ = false; // 清除标记
                        setTimeout(() => {
                            // 从新实例读取项目代码(XMDM)和名称(XMMC)
                            const info = readProjectInfoFromInstance();
                            let code = info.code;
                            let name = info.name;
                            // 实例读不到时回退到按钮点击时记录的
                            if (!code) {
                                code = window.__currentProjectCode__ || '';
                                name = window.__currentProjectName__ || '';
                            }
                            if (code) {
                                window.__currentProjectCode__ = code;
                                window.__currentProjectName__ = name;
                                _log('ok', `开始填值 ${name}`);
                                executeFill(code, name);
                            } else {
                                _log('err', "无法获取项目代码");
                                toast('无法获取项目代码，请先点"下一个不通过"或在列表页双击');
                            }
                        }, 300); // 等 300ms 确保实例完全就绪
                    }
                }

            } catch (e) { /* hook 内异常不抛到页面 */ }
            // 所有页面日志照常转发
            return _rawLog(...args);
        };
    })();

    // ============================================================
    // 隐藏的文件选择器
    // "一键填写"时如果未导表，自动弹出此选择器
    // ============================================================
    const fileInput = document.createElement("input");
    fileInput.type = "file";
    fileInput.accept = ".xlsx";
    fileInput.style.display = "none";

    fileInput.addEventListener("change", (e) => {
        const file = e.target.files && e.target.files[0];
        if (!file) return;
        readFile(file);
        fileInput.value = ""; // 允许重复选同一文件
    });

    // ============================================================
    // xlsx 文件读取逻辑（SheetJS）
    // 默认读取活动 sheet，第一行作为表头
    // ============================================================
    function readFile(file) {
        const reader = new FileReader();
        reader.onload = (ev) => {
            try {
                const data = new Uint8Array(ev.target.result);
                const wb = XLSX.read(data, { type: "array" });

                // 优先取 Excel 的活动 sheet（用户当前看到的标签页）
                let activeIdx = 0;
                if (wb.Workbook && wb.Workbook.WBProps && typeof wb.Workbook.WBProps.activeTab === "number") {
                    activeIdx = wb.Workbook.WBProps.activeTab;
                }
                const sheetName = wb.SheetNames[activeIdx] || wb.SheetNames[0];
                const sheet = wb.Sheets[sheetName];
                if (!sheet) throw new Error("未找到活动 sheet");

                // 第一行作表头 → 对象数组
                // [{ "项目代码": "xxx", "指标": "核实数", "本年完成投资;1—本月": "123", ... }, ...]
                const rows = XLSX.utils.sheet_to_json(sheet, { defval: null });
                const headers = rows.length ? Object.keys(rows[0]) : [];

                window.__xlsxData__ = {
                    fileName: file.name,
                    sheetName,
                    headers,
                    rows,
                    raw: wb,
                };

                toast(`读取成功：${file.name} / ${sheetName}（${rows.length} 行 × ${headers.length} 列）`);
            } catch (err) {
                _log('err', "读取失败", err);
                toast("读取失败：" + err.message);
            }
        };
        reader.onerror = () => toast("文件读取错误");
        reader.readAsArrayBuffer(file);
    }

    // ============================================================
    // Element UI el-select 下拉框操作
    // ============================================================

    /** 通用 XPath 查询 */
    function findByXPath(xpath) {
        const r = document.evaluate(xpath, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null);
        return r.singleNodeValue || null;
    }

    /** 找到当前可见的下拉菜单（Element UI 的 dropdown 是 teleport 到 body 的） */
    function findVisibleDropdown() {
        const all = document.querySelectorAll(".el-select-dropdown");
        for (const d of all) {
            if (d.offsetParent === null) continue; // 跳过隐藏的
            return d;
        }
        return null;
    }

    /** 展开下拉框并点击第 n 项（Promise 形式，可 await） */
    function selectDropdownNth(xpath, n) {
        return new Promise((resolve) => {
            const input = findByXPath(xpath);
            if (!input) { toast("未找到下拉框 input"); resolve(false); return; }

            input.scrollIntoView({ block: "center", behavior: "smooth" });

            // Element UI 的 el-select 监听 mousedown 触发展开
            const select = input.closest(".el-select") || input;
            select.dispatchEvent(new MouseEvent("mousedown", { bubbles: true }));
            select.click();
            input.focus();

            // 轮询等待下拉菜单渲染后点击第 n 项
            let tries = 0;
            const timer = setInterval(() => {
                tries++;
                const dd = findVisibleDropdown();
                const items = dd ? dd.querySelectorAll(".el-select-dropdown__item:not(.is-disabled)") : [];
                if (items.length >= n) {
                    clearInterval(timer);
                    items[n - 1].click();
                    resolve(true);
                }
                if (tries >= 20) { // 1 秒超时
                    clearInterval(timer);
                    toast(`选项不足（当前 ${items.length} 项）`);
                    resolve(false);
                }
            }, 50);
        });
    }

    /** 初始化页面：设置每页1000条 */
    async function initPage() {
        toast("初始化：设置每页1000条...");
        await selectDropdownNth(
            '//*[@class="el-pagination__sizes"]//div/div/input',
            7
        );
        toast("初始化完成");
    }

    // ============================================================
    // 顶部 toast 提示（自动 2.5 秒消失）
    // ============================================================
    function toast(msg) {
        const existing = document.querySelector('#__wb_toast__');
        if (existing) existing.remove();
        const t = document.createElement("div");
        t.id = "__wb_toast__";
        t.textContent = msg;
        Object.assign(t.style, {
            position: "fixed", left: "50%", top: "50px", transform: "translateX(-50%)",
            zIndex: "2147483647", padding: "10px 16px", background: "rgba(0,0,0,.82)",
            color: "#fff", fontSize: "13px", borderRadius: "6px",
            fontFamily: "system-ui, -apple-system, sans-serif",
            boxShadow: "0 2px 10px rgba(0,0,0,.3)", transition: "opacity .3s",
        });
        document.body.appendChild(t);
        setTimeout(() => {
            t.style.opacity = "0";
            setTimeout(() => t.remove(), 300);
        }, 2500);
    }

    // ============================================================
    // "下一条" — 按顺序遍历，可选按状态筛选
    // ============================================================
    window.__currentProjectCode__ = '';   // 当前处理的项目代码（主键）
    window.__currentProjectName__ = '';   // 当前处理的项目名称（toast 用）
    window.__lastClickedRowIndex__ = -1;  // 上次点击在 trList 中的索引

    /** 筛选下拉框 */
    const filterSelect = document.createElement("select");
    filterSelect.style.cssText = "padding:4px 6px;border:1px solid #dcdfe6;border-radius:4px;font-size:13px;cursor:pointer;outline:none;background:#fff;";
    ['全部', '未录入', '暂存', '已上报', '验收通过', '验收不通过', '重新上报'].forEach(v => {
        const opt = document.createElement("option");
        opt.value = v === '全部' ? '' : v;
        opt.textContent = v;
        filterSelect.appendChild(opt);
    });

    /** 从 spreadsheet 实例读取 XMDM（项目代码）和 XMMC（项目名称） */
    function readProjectInfoFromInstance() {
        const inst = window.__ssInstance__;
        if (!inst) return { code: '', name: '' };
        const rowsObj = inst.rows._;
        let code = '', name = '';
        Object.keys(rowsObj).filter(k => /^\d+$/.test(k)).forEach(rk => {
            const row = rowsObj[rk];
            if (!row || !row.cells) return;
            Object.keys(row.cells).filter(k => /^\d+$/.test(k)).forEach(ck => {
                const c = row.cells[ck];
                if (c && c.fieldCode === 'XMDM') code = c.value || c.text || '';
                if (c && c.fieldCode === 'XMMC') name = c.value || c.text || '';
            });
        });
        return { code, name };
    }

    /** 点击表格中的下一行，可选按状态筛选 */
    function clickNextRow(filterKeyword) {
        const trList = [...document.querySelectorAll(".el-table__body-wrapper tbody tr.el-table__row")];
        if (!trList.length) { toast("列表未加载"); return false; }

        // ---- 阶段 1：如果当前在填报页，先读当前项目代码 ----
        if (window.__ssInstance__) {
            const info = readProjectInfoFromInstance();
            if (info.code) {
                window.__currentProjectCode__ = info.code;
                window.__currentProjectName__ = info.name;
            }
            window.__ssInstance__ = null;
            window.__lastClickedRowIndex__ = -1;
        }

        // ---- 阶段 2：按项目代码定位当前行 ----
        if (window.__currentProjectCode__ && window.__lastClickedRowIndex__ < 0) {
            const idx = trList.findIndex(tr => {
                const cells = tr.querySelectorAll("td .cell");
                return cells[0] && cells[0].textContent.trim() === window.__currentProjectCode__;
            });
            if (idx >= 0) window.__lastClickedRowIndex__ = idx;
        }

        // ---- 阶段 3：从下一行开始找匹配的行 ----
        const startIdx = window.__lastClickedRowIndex__ + 1;
        for (let i = startIdx; i < trList.length; i++) {
            const tr = trList[i];
            const cells = tr.querySelectorAll("td .cell");
            if (cells.length < 2) continue;

            // 如果设了筛选，检查状态列是否匹配
            if (filterKeyword) {
                const status = cells[2]?.textContent.replace(/\s+/g, " ").trim() || '';
                if (!status.includes(filterKeyword)) continue;
            }

            const projectCode = cells[0].textContent.trim();
            const projectName = cells[1].textContent.trim();

            window.__currentProjectCode__ = projectCode;
            window.__currentProjectName__ = projectName;
            window.__lastClickedRowIndex__ = i;
            window.__ssInstance__ = null;

            tr.scrollIntoView({ block: "center", behavior: "smooth" });
            setTimeout(() => {
                tr.dispatchEvent(new MouseEvent("mousedown", { bubbles: true }));
                tr.dispatchEvent(new MouseEvent("click", { bubbles: true }));
                toast(`已点击：${projectName}`);
            }, 350);
            return true;
        }

        // ---- 处理完了 ----
        const label = filterKeyword || '全部';
        toast(`已处理完所有"${label}"的项目`);
        window.__lastClickedRowIndex__ = -1;
        return false;
    }

    // 生成"下一条"按钮
    const btnNext = document.createElement("button");
    btnNext.textContent = "下一条";
    btnNext.style.cssText = "padding:6px 12px;background:#f56c6c;color:#fff;border:none;border-radius:4px;font-size:13px;cursor:pointer;font-weight:bold;";
    btnNext.addEventListener("mouseenter", () => (btnNext.style.opacity = "0.85"));
    btnNext.addEventListener("mouseleave", () => (btnNext.style.opacity = "1"));
    btnNext.addEventListener("click", () => {
        const keyword = filterSelect.value;
        const found = clickNextRow(keyword);
        if (found) {
            setTimeout(() => {
                if (!window.__xlsxData__) {
                    toast("请先选择 xlsx 文件");
                    fileInput.click();
                    return;
                }
                window.__pendingAutoFill__ = true;
                toast("下一条已就绪，请双击报表任一单元格");
            }, 1000);
        }
    });

    // ============================================================
    // "一键填写" 按钮
    //
    // 点击后统一流程：
    // 1. 检查是否已导入 xlsx，没有则弹出文件选择器
    // 2. 清空旧实例（__ssInstance__）
    // 3. 设置 pending=true
    // 4. 提示用户双击任一单元格
    // 5. 双击后 hook 自动捕获新实例并调用 executeFill()
    // ============================================================
    window.__pendingAutoFill__ = false; // true = 等待双击后自动填值

    function autoFill() {
        if (!window.__xlsxData__) {
            toast("请先选择 xlsx 文件");
            fileInput.click();
            return false;
        }
        window.__ssInstance__ = null;
        window.__pendingAutoFill__ = true;
        toast("请双击报表任一单元格");
        return false;
    }

    // 生成"自动填"按钮
    const btnAutoFill = document.createElement("button");
    btnAutoFill.textContent = "自动填";
    btnAutoFill.style.cssText = "padding:6px 12px;background:#67c23a;color:#fff;border:none;border-radius:4px;font-size:13px;cursor:pointer;font-weight:bold;";
    btnAutoFill.addEventListener("mouseenter", () => (btnAutoFill.style.opacity = "0.85"));
    btnAutoFill.addEventListener("mouseleave", () => (btnAutoFill.style.opacity = "1"));
    btnAutoFill.addEventListener("click", () => autoFill());

    // ============================================================
    // executeFill() —— 实际填值逻辑
    //
    // 由 hook 在捕获实例后自动调用（或双击触发 pending 后调用）。
    //
    // 流程：
    // 1. 从实例收集所有 fieldCode 以 ;1 结尾的数据单元格
    // 2. 建立 fieldName → {ri, ci} 映射
    // 3. 用 xlsx headers 精确匹配 spreadsheet fieldName
    // 4. 用项目代码匹配 xlsx 中"指标"含"核实数"的行
    // 5. 逐项调用 manualSetCellText(ri, ci, val) 写入
    // 6. 打印变更明细
    // 7. 点击 overlayer 触发渲染刷新
    // ============================================================
    async function executeFill(projectCode, projectName) {
        const currentPageCode = projectCode;
        const currentPageName = projectName || window.__currentProjectName__ || '';
        if (!currentPageCode || !window.__ssInstance__) {
            toast("填值失败：实例未就绪或缺少项目代码");
            return false;
        }

        // 同步项目信息到全局
        window.__currentProjectCode__ = currentPageCode;
        window.__currentProjectName__ = currentPageName;
        const displayName = currentPageName || currentPageCode;
        toast(`${displayName}：正在填值`);

        const inst = window.__ssInstance__;

        // ---- 步骤 1：收集数据单元格 ----
        // fieldCode 以 ;1 结尾的是数据列（如 "107;1" = 本年完成投资）
        // 跳过 ;甲/;乙/;丙（表头列）和 B109/XMDM 等基本信息字段
        const rowsObj = inst.rows._;
        const cellMap = new Map();
        Object.keys(rowsObj).filter(k => /^\d+$/.test(k)).forEach(rk => {
            const row = rowsObj[rk];
            if (!row || !row.cells) return;
            Object.keys(row.cells).filter(k => /^\d+$/.test(k)).forEach(ck => {
                const cell = row.cells[ck];
                if (cell && cell.fieldCode && cell.fieldCode.endsWith(';1')) {
                    cellMap.set(cell.fieldCode, {
                        ri: parseInt(rk, 10), ci: parseInt(ck, 10),
                        fieldName: cell.fieldName || '', type: cell.type,
                    });
                }
            });
        });
        if (!cellMap.size) { toast("未收集到数据单元格"); return false; }

        // ---- 步骤 2：建立 fieldName 快速查找索引 ----
        const fieldNameMap = new Map();
        for (const [fc, info] of cellMap.entries()) {
            if (info.fieldName) fieldNameMap.set(info.fieldName, { fieldCode: fc, ...info });
        }

        // ---- 步骤 3：匹配 xlsx 列 → spreadsheet 单元格 ----
        const xlsxHeaders = window.__xlsxData__.headers;
        const xlsxRows = window.__xlsxData__.rows;

        const fillColumns = [];
        // 跳过基本信息列和自动校验列
        const skipCols = ['项目代码', '项目名称', '单位详细名称', '期别', '指标',
                          '自开始累计校验', '本年完成投资校验', '本年到位资金校验'];
        xlsxHeaders.forEach((h, i) => {
            if (skipCols.includes(h)) return;
            // 精确匹配：xlsx 列名 === spreadsheet fieldName
            const target = fieldNameMap.get(h);
            if (target) fillColumns.push({ xlsxCol: i, header: h, fieldCode: target.fieldCode, target });
        });
        if (!fillColumns.length) {
            toast("xlsx 和报表字段无法匹配");
            _log('warn', "字段匹配失败", "xlsx headers:", xlsxHeaders, "spreadsheet fieldNames:", [...fieldNameMap.keys()]);
            return false;
        }
        if (xlsxHeaders.indexOf('项目代码') < 0) { toast('xlsx 缺少"项目代码"列'); return false; }
        if (xlsxHeaders.indexOf('指标') < 0) { toast('xlsx 缺少"指标"列'); return false; }

        // ---- 步骤 4：从 xlsx 找当前项目的核实数行 ----
        const candidates = xlsxRows.filter(r => String(r['指标'] || '').includes('核实数'));
        const targetRow = candidates.find(r => String(r['项目代码'] || '') === String(currentPageCode));
        if (!targetRow) {
            toast(`${displayName}：未找到核实数行`);
            _log('warn', `未找到项目代码=${currentPageCode} 的核实数行`);
            return false;
        }

        // ---- 步骤 5：逐项填值 ----
        const rowData = targetRow;
        let filledCount = 0;
        const errors = [];
        const changeLog = [];

        fillColumns.forEach(({ header, fieldCode, target }) => {
            let val = rowData[header];
            // 空值自动转为0
            if (val === undefined || val === null || val === '') {
                val = 0;
            }

            try {
                const strVal = String(val);

                // number 类型的单元格只能填数字，非数字跳过（避免组件清空单元格）
                if (target.type === 'number' && strVal && isNaN(Number(strVal))) {
                    errors.push(`${fieldCode}: 非数字值 "${strVal}"`);
                    return;
                }

                // 读取旧值用于对比
                const oldCell = inst.rows._[target.ri]?.cells?.[target.ci];
                const oldVal = oldCell?.value ?? oldCell?.text ?? '';

                // 用正式 API 写入（直接改 cell.value/text 组件不认）
                // manualSetCellText 会自动触发 change/validate/refresh
                inst.manualSetCellText(target.ri, target.ci, strVal);
                filledCount++;

                changeLog.push({
                    指标: target.fieldName || fieldCode,
                    fieldCode,
                    旧值: String(oldVal),
                    新值: strVal,
                });
            } catch (e) {
                errors.push(`${fieldCode}: ${e.message}`);
            }
        });

        // ---- 步骤 6：输出变更明细 ----
        if (changeLog.length) {
            _log('title', `变更明细（${displayName}）:`);
            console.table(changeLog);
        }

        // ---- 步骤 7：触发渲染刷新 ----
        // 模拟点击 spreadsheet 空白区域，让组件重绘
        document.querySelector(".thtf-spreadsheet-overlayer")?.click();

        toast(`${displayName}：已填 ${filledCount} 个单元格${errors.length ? '，' + errors.length + ' 个失败' : ''}`);
        _log('ok', `填值完成 ${displayName}：${filledCount} 成功${errors.length ? '，' + errors.length + ' 失败' : ''}`);
        if (errors.length) _log('warn', "错误:", errors);

        // 自动填入审核说明
        setTimeout(async () => {
            const clicked = await clickAuditBtn();
            if (clicked) {
                fillAuditInputs();
                toast(`${displayName}：已自动填入审核说明`);
            }
        }, 800);

        return true;
    }

    // ============================================================
    // 审核错误收集 & 导出
    // ============================================================
    window.__auditErrors__ = []; // { projectCode, projectName, errors: [{code, desc, severity}] }

    /** 从 pane-shcw 表格读取审核错误 */
    function scrapeAuditTable() {
        const tbl = document.evaluate(
            '//*[@id="pane-shcw"]/div/div[2]/div[3]/table/tbody',
            document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null
        ).singleNodeValue;
        if (!tbl) { toast("未找到审核表格"); return []; }

        const rows = [];
        tbl.querySelectorAll('tr').forEach(tr => {
            const cells = tr.querySelectorAll('td, th');
            if (cells.length < 3) return;
            const code = cells[0].textContent.trim();
            const desc = cells[1].textContent.trim();
            const severity = cells[2].textContent.trim();
            rows.push({ code, desc, severity });
        });
        return rows;
    }

    /** 点击审核按钮并等待表格出现 */
    function clickAuditBtn() {
        return new Promise((resolve) => {
            const btn = document.evaluate(
                '//*[@class="flex-row border-t border-solid border-[#dbdbdb] el-row is-justify-center is-align-middle el-row--flex"]//div[6]/button',
                document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null
            ).singleNodeValue;
            if (!btn) { resolve(false); return; }
            btn.click();
            // 轮询等待 pane-shcw 表格有行，最多等 8 秒
            let tries = 0;
            const timer = setInterval(() => {
                tries++;
                const tbl = document.evaluate(
                    '//*[@id="pane-shcw"]/div/div[2]/div[3]/table/tbody',
                    document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null
                ).singleNodeValue;
                const hasRows = tbl && tbl.querySelectorAll('tr').length > 0;
                if (hasRows || tries >= 80) {
                    clearInterval(timer);
                    resolve(hasRows);
                }
            }, 100);
        });
    }

    /** 记录当前项目的 A 类强制性审核错误 */
    async function storeAudit() {
        const projectCode = window.__currentProjectCode__ || '';
        const projectName = window.__currentProjectName__ || '';
        if (!projectCode) { toast('无项目代码，请先点"下一条"'); return; }

        // 先点击审核按钮刷新数据，等 1s
        const clicked = await clickAuditBtn();
        if (!clicked) { toast("未找到审核按钮"); return; }

        const allRows = scrapeAuditTable();
        const aRows = allRows.filter(r => r.code.startsWith('A'));
        if (!aRows.length) { toast(`${projectName}：无 A 类强制性审核错误`); return; }

        // 覆盖已有记录
        const idx = window.__auditErrors__.findIndex(e => e.projectCode === projectCode);
        if (idx >= 0) window.__auditErrors__.splice(idx, 1);
        window.__auditErrors__.push({ projectCode, projectName, errors: aRows });

        toast(`${projectName}：已记录 ${aRows.length} 条 A 类强制性错误`);
        _log('ok', `记录审核错误 ${projectName}：${aRows.length} 条`);
    }

    /** 导出所有审核错误 */
    function exportAudit() {
        const data = window.__auditErrors__;
        if (!data.length) { toast("无审核数据"); return; }

        // 控制台打印
        console.log('%c[WB] 审核错误汇总', 'color:#f56c6c;font-weight:bold;font-size:14px');
        data.forEach(item => {
            console.log(`%c${item.projectName}（${item.projectCode}）`, 'color:#e6a23c;font-weight:bold');
            console.table(item.errors);
        });

        // 生成 CSV 下载
        const lines = ['项目代码,项目名称,审核代码,审核说明'];
        data.forEach(item => {
            item.errors.forEach(e => {
                lines.push(`"${item.projectCode}","${item.projectName}","${e.code}","${e.desc}"`);
            });
        });
        const csv = lines.join('\n');
        const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' }); // BOM for Excel
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `审核错误_${new Date().toISOString().slice(0, 10)}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        toast(`已导出 ${data.length} 个项目`);
        _log('ok', `导出审核：${data.length} 个项目，共 ${lines.length - 1} 条错误`);
    }

    /** 在审核错误列表中填入"已核实修正数据" */
    function fillAuditInputs() {
        const container = document.querySelector('#pane-shcw');
        if (!container) { toast("未找到审核面板"); return; }
        // 审核说明用的是 textarea 不是 input
        const targets = container.querySelectorAll('textarea, input');
        if (!targets.length) { toast("未找到可输入的审核项"); return; }
        let count = 0;
        targets.forEach(el => {
            el.value = '已核实修正数据';
            el.dispatchEvent(new Event('input', { bubbles: true }));
            el.dispatchEvent(new Event('change', { bubbles: true }));
            count++;
        });
        toast(`已填入 ${count} 个审核项`);
        _log('ok', `填入审核修正说明：${count} 项`);
    }

    // 生成"导出错误"按钮
    const btnExportAudit = document.createElement("button");
    btnExportAudit.textContent = "导出错误";
    btnExportAudit.style.cssText = "padding:6px 12px;background:#ff9800;color:#fff;border:none;border-radius:4px;font-size:13px;cursor:pointer;font-weight:bold;";
    btnExportAudit.addEventListener("mouseenter", () => (btnExportAudit.style.opacity = "0.85"));
    btnExportAudit.addEventListener("mouseleave", () => (btnExportAudit.style.opacity = "1"));
    btnExportAudit.addEventListener("click", exportAudit);

    // 生成"记录"按钮
    const btnRefreshAudit = document.createElement("button");
    btnRefreshAudit.textContent = "记录";
    btnRefreshAudit.style.cssText = "padding:6px 12px;background:#607d8b;color:#fff;border:none;border-radius:4px;font-size:13px;cursor:pointer;font-weight:bold;";
    btnRefreshAudit.addEventListener("mouseenter", () => (btnRefreshAudit.style.opacity = "0.85"));
    btnRefreshAudit.addEventListener("mouseleave", () => (btnRefreshAudit.style.opacity = "1"));
    btnRefreshAudit.addEventListener("click", storeAudit);

    // ============================================================
    // 按钮挂载——顶部居中一行
    // ============================================================
    const btnContainer = document.createElement("div");
    Object.assign(btnContainer.style, {
        position: "fixed", top: "0", left: "50%", transform: "translateX(-50%)",
        zIndex: "2147483647",
        display: "flex", flexWrap: "wrap", gap: "6px", padding: "6px 10px",
        background: "rgba(255,255,255,0.9)", borderRadius: "0 0 8px 8px",
        boxShadow: "0 2px 12px rgba(0,0,0,.15)",
        fontFamily: "system-ui, -apple-system, sans-serif",
    });
    // 筛选 → 下一条 → 自动填 → 记录 → 导出
    btnContainer.appendChild(filterSelect);
    btnContainer.appendChild(btnNext);
    btnContainer.appendChild(btnAutoFill);
    btnContainer.appendChild(btnRefreshAudit);
    btnContainer.appendChild(btnExportAudit);
    btnContainer.appendChild(fileInput);

    let mounted = false;
    function mount(force) {
        if (!document.body) { setTimeout(() => mount(force), 100); return; }
        const stillThere = btnContainer.isConnected;
        if (mounted && stillThere && !force) return;
        if (!stillThere) document.body.appendChild(btnContainer);
        mounted = true;
    }
    mount(true);

    const obs = new MutationObserver(() => {
        if (!btnContainer.isConnected) { mount(true); }
    });
    function startObserver() {
        if (!document.body) { setTimeout(startObserver, 100); return; }
        obs.observe(document.body, { childList: true });
    }
    startObserver();

    // 控制台确认脚本已加载
    _log('ok', "上传读取器已加载 @ " + location.href);

    // 脚本加载后自动设置每页1000条
    setTimeout(() => { initPage(); }, 3000);

})();
