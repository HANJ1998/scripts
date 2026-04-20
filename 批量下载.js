// ==UserScript==
// @name         批量下载
// @namespace    https://github.com/hanj1998
// @version      1.2
// @description  Automated document download solution for government service portals
// @author       Professional Developer
// @match        https://ycszx.sc.yichang.gov.cn/yczxplus/modules/suggestion-manager
// @match        https://lzpt.ycsrd.gov.cn/npc/modules/suggestion-manager
// @grant        GM_xmlhttpRequest
// @updateURL    https://raw.githubusercontent.com/hanj1998/MyScript/main/批量下载.js
// @downloadURL  https://raw.githubusercontent.com/hanj1998/MyScript/main/批量下载.js
// @license      MIT
// ==/UserScript==

(function () {
  "use strict";

  // UI组件初始化：创建主操作按钮
  const initDownloadButton = () => {
    const btn = document.createElement("button");
    btn.textContent = "批量下载";
    Object.assign(btn.style, {
      position: "fixed",
      top: "40px",
      right: "40px",
      padding: "10px 20px",
      backgroundColor: "#007BFF",
      color: "white",
      border: "none",
      borderRadius: "5px",
      cursor: "pointer",
      zIndex: 9999,
    });
    document.body.appendChild(btn);
    return btn;
  };

  const downloadButton = initDownloadButton();

  // 核心业务逻辑：文档下载流程控制
  const handleBatchDownload = () => {
    console.debug("[DEBUG] 启动文档采集流程");

    // DOM元素定位策略
    const findTargetFrame = () => {
      const frameContainer = document.querySelector("div.curholder");
      if (!frameContainer) throw new Error("框架容器未找到");

      const contentFrame = frameContainer.querySelector("iframe");
      return (
        contentFrame?.contentDocument || contentFrame?.contentWindow?.document
      );
    };

    try {
      const targetDocument = findTargetFrame();
      const linkElements = targetDocument.querySelectorAll(
        'a[href^="/yczxplus/a/sug/unitAnswerForm"], ' +
          'a[href^="/npc/a/sug/unitAnswerForm"]',
      );

      // 数据预处理：链接对象化
      const processLinks = Array.from(linkElements).map((link) => ({
        url: new URL(link.href, window.location.href).toString(),
        title: link.textContent.trim(),
      }));

      executeDownloadQueue(processLinks, processLinks.length);
    } catch (error) {
      console.error(`[ERROR] 流程异常: ${error.message}`);
    }
  };

  // 事件绑定
  downloadButton.addEventListener("click", handleBatchDownload);

  // 队列处理器（支持重试机制）
  const executeDownloadQueue = (taskQueue, initialCount) => {
    if (taskQueue.length === 0) {
      console.info("[STATUS] 所有任务已完成");
      return;
    }

    const currentTask = taskQueue.shift();
    console.log(
      `[PROGRESS] 处理任务 ${initialCount - taskQueue.length}/${initialCount}`,
    );

    // 文档解析模块
    const parseDocumentContent = (htmlContent) => {
      const doc = new DOMParser().parseFromString(htmlContent, "text/html");

      // 元数据提取
      const getCaseMetadata = () => {
        const caseTitleElement = [...doc.querySelectorAll("tr th")].find(
          (th) =>
            th.textContent.includes("案由") || th.textContent.includes("标题"),
        )?.nextElementSibling; // 正确写法
        return caseTitleElement?.textContent.trim() || "未命名案件";
      };

      return {
        caseTitle: getCaseMetadata(),
        // 修改后的选择器同时匹配两种路径格式
        departments: [
          ...doc.querySelectorAll(
            'tr:has(a[href^="/yczxplus/a/sug/answerFileDownLoad"]), ' +
              'tr:has(a[href^="/npc/a/sug/answerFileDownLoad"])',
          ),
        ],
      };
    };

    // 文件处理器
    const processDepartmentFiles = (departmentList) => {
      departmentList.forEach((departmentNode, index) => {
        const departmentName =
          departmentNode
            .querySelector("td:nth-child(1)")
            ?.textContent.replace(/\s/g, "") || "未知部门";

        // 文件处理流水线
        [
          ...departmentNode.querySelectorAll(
            'a[href^="/yczxplus/a/sug/answerFileDownLoad"], ' +
              'a[href^="/npc/a/sug/answerFileDownLoad"]',
          ),
        ].forEach((fileElement, fileIndex) => {
          if (fileElement.textContent.includes("扫描件")) return;

          // 文件命名策略
          const generateFileName = (extension = "") => {
            const baseName = [
              currentTask.title.replace(/[\s_]/g, ""),
              departmentName,
              fileElement.textContent.trim().replace(/[\s_]/g, ""),
              Math.random().toString(36).slice(2, 4),
            ].join("-");

            // 修复后缀处理逻辑
            const hasExtension = extension && extension.length > 0;
            return hasExtension
              ? `${baseName}.${extension}`
              : `${baseName}.dat`;
          };

          // 下载执行器
          const initiateDownload = (fileURL) => {
            // 将扩展名获取逻辑移至下载执行器内部
            const fileNameParam =
              new URL(fileURL).searchParams.get("fileName") || "";
            const fileExtension = fileNameParam.includes(".")
              ? fileNameParam.slice(fileNameParam.lastIndexOf(".") + 1) // 修复点号问题
              : "dat";

            GM_xmlhttpRequest({
              method: "GET",
              url: fileURL,
              responseType: "arraybuffer",
              onload: (response) => {
                const blob = new Blob([response.response], {
                  type: "application/octet-stream",
                });
                const tempLink = Object.assign(document.createElement("a"), {
                  href: URL.createObjectURL(blob),
                  download: generateFileName(fileExtension),
                  style: { display: "none" },
                });
                document.body.appendChild(tempLink).click();
                setTimeout(() => document.body.removeChild(tempLink), 100);
              },
            });
          };

          initiateDownload(new URL(fileElement.href, window.location.href));
        });
      });
    };

    // 主请求流程
    GM_xmlhttpRequest({
      method: "GET",
      url: currentTask.url,
      onload: (response) => {
        const { caseTitle, departments } = parseDocumentContent(
          response.responseText,
        );
        processDepartmentFiles(departments);
        setTimeout(() => executeDownloadQueue(taskQueue, initialCount), 2000);
      },
      onerror: () =>
        setTimeout(() => executeDownloadQueue(taskQueue, initialCount), 2000),
    });
  };
})();
