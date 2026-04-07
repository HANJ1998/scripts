// ==UserScript==
// @name         提取集思录-按钮版
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  在集思录转债页面添加提取表格按钮
// @author       佚名
// @match        https://www.jisilu.cn/web/data/cb/*
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    // 提取表格数据的方法
    function extractTables() {
        // 清理单元格内容，提取数字部分
        function cleanCell(text) {
            const trimmed = text.trim();
            const match = trimmed.match(/^(\d+\.?\d*)/);
            if (match) {
                return match[1];
            }
            return trimmed;
        }

        // ===================== 1. 提取专属表头（常量声明，避免重复赋值） =====================
        const headerTable = document.querySelector('table.jsl-table-header');
        let headers = headerTable
            ? Array.from(headerTable.querySelectorAll('th'), th => th.textContent.trim())
            : [];

        // ===================== 2. 确定转债名称列的索引 =====================
        const zhuanZhaiIndex = headers.findIndex(h => h.includes('转债名称'));

        // ===================== 3. 强赎状态映射 =====================
        const getQiangShuStatus = (td) => {
            const span = td.querySelector('span.jisilu-icons');
            if (!span) return '';

            const classList = span.className;
            if (classList.includes('color-buy')) {
                return '已公告强赎/临近到期';
            } else if (classList.includes('color-darkgray')) {
                return '公告不强赎';
            } else if (classList.includes('color-primary')) {
                return '已满足强赎条件';
            } else if (classList.includes('color-gold')) {
                return '公告要强赎';
            }
            return '';
        };

        // ===================== 4. 解析title属性提取详细信息 =====================
        const parseTitleInfo = (td) => {
            const span = td.querySelector('span.jisilu-icons');
            if (!span || !span.title) {
                return { zuiHouJiaoYiRi: '', zuiHouZhuanGuRi: '', zhaiQuanDaoQiRi: '', daoQiShuHuiJia: '', shuHuiJia: '' };
            }

            const title = span.title;
            const result = {
                zuiHouJiaoYiRi: '',
                zuiHouZhuanGuRi: '',
                zhaiQuanDaoQiRi: '',
                daoQiShuHuiJia: '',
                shuHuiJia: ''
            };

            // 统一日期格式为 YYYY-MM-DD
            const formatDate = (dateStr) => {
                if (!dateStr) return '';
                // 匹配 "2026年3月31日" 格式
                const chineseMatch = dateStr.match(/(\d{4})年(\d{1,2})月(\d{1,2})日/);
                if (chineseMatch) {
                    const [, year, month, day] = chineseMatch;
                    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
                }
                // 已经是 "2026-04-07" 格式，直接返回
                const isoMatch = dateStr.match(/(\d{4})-(\d{2})-(\d{2})/);
                if (isoMatch) {
                    return isoMatch[0];
                }
                return dateStr.trim();
            };

            // 提取数值部分
            const extractNumber = (str) => {
                if (!str) return '';
                const match = str.match(/(\d+\.?\d*)/);
                return match ? match[1] : '';
            };

            const jiaoYiRiMatch = title.match(/最后交易日[：:]\s*([^\n]+)/);
            if (jiaoYiRiMatch) result.zuiHouJiaoYiRi = formatDate(jiaoYiRiMatch[1]);

            const zhuanGuRiMatch = title.match(/最后转股日[：:]\s*([^\n]+)/);
            if (zhuanGuRiMatch) result.zuiHouZhuanGuRi = formatDate(zhuanGuRiMatch[1]);

            const daoQiRiMatch = title.match(/债券到期日[：:]\s*([^\n]+)/);
            if (daoQiRiMatch) result.zhaiQuanDaoQiRi = formatDate(daoQiRiMatch[1]);

            const shuHuiJiaMatch = title.match(/到期赎回价[：:]\s*([^\n]+)/);
            if (shuHuiJiaMatch) result.daoQiShuHuiJia = extractNumber(shuHuiJiaMatch[1]);

            // 匹配"赎回价"但排除"到期赎回价"
            const shuHuiJia2Match = title.match(/(?<!到期)赎回价[：:]\s*([^\n]+)/);
            if (shuHuiJia2Match) result.shuHuiJia = extractNumber(shuHuiJia2Match[1]);

            return result;
        };

        // ===================== 5. 工具函数：提取单张表格的有效数据 =====================
        const getValidTableData = (table, zhuanZhaiIdx) => {
            return Array.from(table.querySelectorAll('tr'), tr => {
                const tds = tr.querySelectorAll('td');
                const rowData = Array.from(tds, td => td.textContent.trim());

                // 从转债名称列提取强赎状态和详细信息
                let qiangShuStatus = '';
                let titleInfo = { zuiHouJiaoYiRi: '', zuiHouZhuanGuRi: '', zhaiQuanDaoQiRi: '', daoQiShuHuiJia: '', shuHuiJia: '' };
                let insertIndex = 1;

                if (zhuanZhaiIdx !== -1 && tds[zhuanZhaiIdx]) {
                    qiangShuStatus = getQiangShuStatus(tds[zhuanZhaiIdx]);
                    titleInfo = parseTitleInfo(tds[zhuanZhaiIdx]);
                    insertIndex = zhuanZhaiIdx + 1;
                    
                    // 当强赎状态不为空时，去掉转债名称的最后一个字符
                    if (qiangShuStatus && rowData[zhuanZhaiIdx]) {
                        rowData[zhuanZhaiIdx] = rowData[zhuanZhaiIdx].slice(0, -1);
                    }
                } else {
                    for (let i = 0; i < tds.length; i++) {
                        const status = getQiangShuStatus(tds[i]);
                        if (status) {
                            qiangShuStatus = status;
                            titleInfo = parseTitleInfo(tds[i]);
                            insertIndex = i + 1;
                            break;
                        }
                    }
                }

                // 将强赎状态和详细信息插入到转债名称后面
                if (rowData.length > insertIndex - 1) {
                    rowData.splice(insertIndex, 0,
                        qiangShuStatus,
                        titleInfo.zuiHouJiaoYiRi,
                        titleInfo.zuiHouZhuanGuRi,
                        titleInfo.zhaiQuanDaoQiRi,
                        titleInfo.daoQiShuHuiJia,
                        titleInfo.shuHuiJia
                    );
                }

                return rowData;
            }).filter(row => row.length > 0);
        };

        // ===================== 6. 收集所有数据表格（排除表头表，避免重复） =====================
        let allData = Array.from(
            document.querySelectorAll('table:not(.jsl-table-header)'),
            table => getValidTableData(table, zhuanZhaiIndex)
        ).flat();

        // ===================== 7. 空数据校验 =====================
        if (allData.length === 0) {
            console.log('没有找到有效表格数据');
            return;
        }

        // ===================== 8. 处理数据：去掉行号和操作列，转股价的文本只保留数字部分 =====================
        if (allData.length > 0) {
            // 找到行号、操作和转股价列的索引
            const rowNumberIndex = headers.findIndex(h => h.includes('行号'));
            const operationIndex = headers.findIndex(h => h.includes('操作'));
            const zhuanGuJiaIndex = headers.findIndex(h => h.includes('转股价'));

            // 处理表头
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

            // 处理每一行数据
            allData = allData.map(row => {
                // 去掉行号列
                if (rowNumberIndex !== -1) {
                    row.splice(rowNumberIndex, 1);
                    // 如果操作列索引大于行号列，需要调整索引
                    if (operationIndex !== -1 && operationIndex > rowNumberIndex) {
                        row.splice(operationIndex - 1, 1);
                    } else if (operationIndex !== -1) {
                        row.splice(operationIndex, 1);
                    }
                } else if (operationIndex !== -1) {
                    // 只去掉操作列
                    row.splice(operationIndex, 1);
                }

                // 转股价的文本只保留数字部分，使用 cleanCell 函数处理
                if (zhuanGuJiaIndex !== -1 && row[zhuanGuJiaIndex]) {
                    row[zhuanGuJiaIndex] = cleanCell(row[zhuanGuJiaIndex]);
                }

                return row;
            });
        }

        // ===================== 9. 在表头"转债名称"后插入新列 =====================
        if (zhuanZhaiIndex !== -1) {
            headers.splice(zhuanZhaiIndex + 1, 0,
                '强赎状态',
                '最后交易日',
                '最后转股日',
                '债券到期日',
                '到期赎回价（元/张）',
                '赎回价（元/张）'
            );
        }

        // ===================== 10. 拼接表头 + 输出 =====================
        if (headers.length) {
            allData.unshift(headers);
        }

        console.log('提取的表格数据：', allData);
    }

    // 创建提取表格按钮
    function createExtractButton() {
        const button = document.createElement('button');
        button.textContent = '提取表格';
        button.style.cssText = `
            position: fixed;
            top: 10px;
            right: 10px;
            z-index: 9999;
            padding: 8px 16px;
            background: #4CAF50;
            color: white;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            font-size: 14px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.2);
        `;

        button.addEventListener('click', () => {
            extractTables();
        });
        document.body.appendChild(button);
    }

    // 页面加载完成后创建按钮
    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", createExtractButton);
    } else {
        createExtractButton();
    }
})();