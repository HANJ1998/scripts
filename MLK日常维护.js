// ==UserScript==
// @name         名录库助手
// @namespace    https://github.com/hanj1998
// @version      4.4.1
// @description  全自动改错
// @updateURL    https://jsd.onmicrosoft.cn/gh/HANJ1998/scripts@v4.4.1/MLK日常维护.js
// @downloadURL  https://jsd.onmicrosoft.cn/gh/HANJ1998/scripts@v4.4.1/MLK日常维护.js
// @author       GOD
// @match        *://tjymlk.stats.gov.cn/*
// @grant        GM_xmlhttpRequest
// @connect      jcfx.tjj.zj.gov.cn
// @connect      open.bigmodel.cn
// @license      MIT
// ==/UserScript==

//更新时间：2026年3月3日
//更新内容：修复244.单位注册地详细地址是否与单位所在地详细地址一致”所有单位不得为空，且取值为1或2 ；微调AI提示词和参数。
(function () {
  "use strict";

  /**
   * 名录库助手主命名空间
   */
  const MLK = {
    // 全局状态与配置
    State: {
      isAutoRunning: false,
      timer: null,
      progressTimer: null,
      currentCompany: "",
      processedCount: 0,
      successCount: 0,
      startTime: null,
      lastUpdateTime: null,
    },

    Config: {
      AI_TOKEN: "REVOKED",
      AI_API_URL: "https://open.bigmodel.cn/api/paas/v4/chat/completions",
      INDUSTRY_API_URL:
        "https://jcfx.tjj.zj.gov.cn:6443/autocode-clusterapi-pub/api/stats/query/mobile/des/",
      DEFAULT_ADDRESS_PREFIX: "湖北省宜昌市当阳市",
      AUTO_CHECK_INTERVAL: 3000,
      PROGRESS_UPDATE_INTERVAL: 1000,
      AUTO_TIMEOUT: 30000,
    },

    // 区域数据
    AreaData: {
      areaCodeList: {
        当阳: 420582000000,
        玉阳: 420582001000,
        熊家山社区: 420582001001,
        太子桥社区: 420582001002,
        东门楼社区: 420582001003,
        子龙路社区: 420582001004,
        窑湾社区: 420582001005,
        南门垱社区: 420582001006,
        付家岗社区: 420582001007,
        香榭里社区: 420582001008,
        广家洲社区: 420582001009,
        东群村: 420582001201,
        新民村: 420582001202,
        北门村: 420582001203,
        长坂村: 420582001204,
        望城村: 420582001205,
        三里港村: 420582001206,
        和平村: 420582001207,
        窑湾村: 420582001208,
        白龙村: 420582001209,
        庆丰岗村: 420582001210,
        坳口村: 420582001211,
        金塔村: 420582001212,
        坝陵: 420582002000,
        坝陵桥社区: 420582002001,
        慈化寺社区: 420582002002,
        锦屏山社区: 420582002003,
        白庙村: 420582002201,
        群力村: 420582002202,
        坝陵村: 420582002203,
        何畈村: 420582002206,
        国河村: 420582002207,
        苏河村: 420582002208,
        花园村: 420582002209,
        童台村: 420582002210,
        木林村: 420582002211,
        群益村: 420582002212,
        群华村: 420582002213,
        荣耀村: 420582002214,
        照耀村: 420582002215,
        精耀村: 420582002216,
        黄林村: 420582002217,
        鲁山村: 420582002218,
        慈化村: 420582002219,
        玉泉: 420582003000,
        娘娘庙社区: 420582003001,
        子龙村: 420582003201,
        合意村: 420582003202,
        玉泉村: 420582003203,
        岩屋庙村: 420582003204,
        关陵庙村: 420582003205,
        雄风村: 420582003206,
        官道河村: 420582003207,
        干河村: 420582003208,
        清溪村: 420582003209,
        枣林村: 420582003210,
        三桥村: 420582003211,
        柳林村: 420582003212,
        金沙村: 420582003213,
        焦堤村: 420582003214,
        百宝寨村: 420582003215,
        两河: 420582101000,
        麦城社区: 420582101001,
        双龙村: 420582101201,
        友谊村: 420582101202,
        民主村: 420582101203,
        赵闸村: 420582101204,
        胡场村: 420582101205,
        麦城村: 420582101206,
        富里寺村: 420582101207,
        群丰村: 420582101208,
        群合村: 420582101209,
        糜城村: 420582101210,
        新星村: 420582101211,
        孙场村: 420582101212,
        河溶: 420582102000,
        过街楼社区: 420582102001,
        三星寺村: 420582102200,
        星火村: 420582102201,
        赵湖村: 420582102202,
        观基寺村: 420582102203,
        前英村: 420582102204,
        前进村: 420582102205,
        前合村: 420582102206,
        前华村: 420582102207,
        郭家场村: 420582102208,
        前程村: 420582102209,
        民新村: 420582102210,
        建国村: 420582102211,
        民合村: 420582102212,
        民耀村: 420582102213,
        红联村: 420582102214,
        红胜村: 420582102215,
        红日村: 420582102216,
        红明村: 420582102217,
        丁场村: 420582102218,
        官垱村: 420582102219,
        淯溪: 420582103000,
        淯溪河社区: 420582103001,
        月潭河社区: 420582103002,
        廖家垭村: 420582103201,
        同明村: 420582103202,
        前明村: 420582103203,
        水田湾村: 420582103204,
        红旗村: 420582103205,
        白石港村: 420582103206,
        春新村: 420582103207,
        马店村: 420582103208,
        八景坡村: 420582103209,
        龙井村: 420582103210,
        中山村: 420582103211,
        光明村: 420582103212,
        曹岗村: 420582103213,
        洪锦村: 420582103214,
        洪桥铺村: 420582103215,
        胜利村: 420582103216,
        联合村: 420582103217,
        绿林山村: 420582103218,
        脚东村: 420582103219,
        刘河村: 420582103220,
        勤丰村: 420582103221,
        林河村: 420582103222,
        九冲村: 420582103223,
        庙前: 420582104000,
        沙坝河社区: 420582104001,
        小烟墩集社区: 420582104002,
        桐树垭村: 420582104201,
        烟集村: 420582104202,
        井岗村: 420582104203,
        清平河村: 420582104204,
        旭光村: 420582104205,
        沙河村: 420582104206,
        林桥村: 420582104207,
        鞍山村: 420582104208,
        李湾村: 420582104209,
        佟湖村: 420582104210,
        英雄村: 420582104211,
        普济寺村: 420582104212,
        长春村: 420582104213,
        山峰村: 420582104214,
        庙前村: 420582104215,
        石马村: 420582104216,
        李店村: 420582104217,
        巩河村: 420582104218,
        王店: 420582105000,
        王家店社区: 420582105001,
        跑马村: 420582105201,
        木店村: 420582105202,
        新店村: 420582105203,
        史店村: 420582105204,
        朝阳观村: 420582105205,
        王店村: 420582105206,
        同心村: 420582105207,
        黑土坡村: 420582105208,
        熊河村: 420582105209,
        金星村: 420582105210,
        白河村: 420582105211,
        满山红村: 420582105212,
        双莲村: 420582105213,
        泉河村: 420582105214,
        严河村: 420582105215,
        半月: 420582106000,
        半月山社区: 420582106001,
        先锋村: 420582106201,
        红光村: 420582106202,
        燎原村: 420582106203,
        龙台村: 420582106204,
        宇宙村: 420582106205,
        罗店村: 420582106206,
        春光村: 420582106207,
        紫盖村: 420582106208,
        胡家湾村: 420582106209,
        泰山村: 420582106210,
        草埠湖: 420582107000,
        头山社区: 420582107001,
        马窑村: 420582107201,
        楚湖村: 420582107202,
        新河村: 420582107203,
        郑湖村: 420582107204,
        台渡村: 420582107205,
        南湖村: 420582107206,
        张闸村: 420582107207,
        楚城村: 420582107208,
        邵冲村: 420582107209,
        符台村: 420582107210,
        金龙村: 420582107211,
        开源村: 420582107212,
        南村: 420582107213,
        高台村: 420582107214,
      },

      streetNames: [
        "玉阳",
        "坝陵",
        "玉泉",
        "两河",
        "河溶",
        "淯溪",
        "庙前",
        "王店",
        "半月",
        "草埠湖",
      ],
    },

    /**
     * 工具函数模块
     */
    Utils: {
      // 延迟执行
      delay(ms) {
        return new Promise((resolve) => setTimeout(resolve, ms));
      },

      //通过xpath设置下拉框的值
      setSelectValueByXpath(xpath, index, value = "") {
        // 1. 获取下拉框元素
        var selectElement = document.evaluate(
          xpath,
          document,
          null,
          XPathResult.FIRST_ORDERED_NODE_TYPE,
          null,
        ).singleNodeValue;

        // 2. 检查元素是否存在
        if (!selectElement) {
          MLK.UI.log("未找到地址一致性的下拉框元素", "error");
          return false;
        }
        // 3. 设置值，如果提供了value参数，则优先设置value，否则根据index设置selectedIndex
        if (value) {
          selectElement.value = value;
        } else {
          selectElement.selectedIndex = index - 1; // （index - 1）表示第几个选项
        }

        // 4. 手动触发change事件
        // 创建并派发标准的change事件，让系统感知到选择变更
        const changeEvent = new Event("change", {
          bubbles: true, // 事件冒泡（模拟用户操作）
          cancelable: true,
        });
        selectElement.dispatchEvent(changeEvent);
      },

      // 获取所有元素的文本内容
      getAllElementsTextByXPath(xpath) {
        const result = document.evaluate(
          xpath,
          document,
          null,
          XPathResult.ORDERED_NODE_SNAPSHOT_TYPE,
          null,
        );
        const nodes = [];
        for (let i = 0; i < result.snapshotLength; i++) {
          nodes.push(result.snapshotItem(i).textContent);
        }
        return nodes;
      },

      // 通过xpath设置值
      setValueByXpath(xpath, value, fieldName = "") {
        try {
          const element = document.evaluate(
            xpath,
            document,
            null,
            XPathResult.FIRST_ORDERED_NODE_TYPE,
            null,
          ).singleNodeValue;

          if (!element) {
            MLK.UI.log(`未找到元素: ${xpath}`, "warning");
            return false;
          }

          // 如果未提供字段名称，尝试从DOM获取
          let displayName = fieldName;
          if (!displayName) {
            try {
              displayName =
                element.parentElement.previousElementSibling.textContent;
            } catch (e) {
              displayName = xpath.split("/").pop();
            }
          }

          // 设置值，并将字体颜色改为红色
          element.style.color = "red";
          element.value = value;

          // 创建并触发事件
          ["input", "change"].forEach((eventType) => {
            const event = new Event(eventType, {
              bubbles: true,
              cancelable: true,
              composed: true,
            });
            element.dispatchEvent(event);
          });

          // 使用统一的格式打印日志
          MLK.UI.log(`${displayName} 填入: ${value}`);
          return true;
        } catch (error) {
          MLK.UI.log(`设置值失败: ${error.message}`, "error");
          return false;
        }
      },

      // 通过xpath获取值
      getValueByXpath(xpath) {
        try {
          const element = document.evaluate(
            xpath,
            document,
            null,
            XPathResult.FIRST_ORDERED_NODE_TYPE,
            null,
          ).singleNodeValue;
          return element ? element.value : null;
        } catch (error) {
          MLK.UI.log(`获取值失败: ${error.message}`, "error");
          return null;
        }
      },

      // 查找元素
      findElement(xpath) {
        try {
          return document.evaluate(
            xpath,
            document,
            null,
            XPathResult.FIRST_ORDERED_NODE_TYPE,
            null,
          ).singleNodeValue;
        } catch (error) {
          MLK.UI.log(`查找元素失败: ${error.message}`, "error");
          return null;
        }
      },

      // 查找区划代码
      findAreaCode(address) {
        if (!address) return null;

        let areaCode = null;

        // 第一次匹配：查找村和社区
        for (const [name, code] of Object.entries(MLK.AreaData.areaCodeList)) {
          if (
            address.includes(name) &&
            (name.includes("村") || name.includes("社区"))
          ) {
            areaCode = code;
            break;
          }
        }

        // 如果没找到村或社区，尝试匹配街道名称
        if (!areaCode) {
          for (const streetName of MLK.AreaData.streetNames) {
            if (address.includes(streetName)) {
              // 从areaCode中查找对应的街道完整名称和代码
              for (const [name, code] of Object.entries(
                MLK.AreaData.areaCodeList,
              )) {
                if (name === streetName) {
                  areaCode = Math.floor(code / 10) * 10 + 1;
                  MLK.UI.log(`模糊匹配到: ${streetName}`);
                  break;
                }
              }
              if (areaCode) break;
            }
          }
        }

        return areaCode;
      },

      // 查找复选框
      async findCheckbox() {
        const xpath =
          '//*[starts-with(@id, "mat-mdc-checkbox-") and substring(@id, string-length(@id) - string-length("-input") + 1) = "-input"]';
        const result = document.evaluate(
          xpath,
          document,
          null,
          XPathResult.FIRST_ORDERED_NODE_TYPE,
          null,
        );
        return result.singleNodeValue;
      },

      // 查找保存按钮
      async findSaveButton() {
        const targetXPath =
          '//*[@id="content"]/section[2]/common-project-bill/common-bill/div/div[2]/div[2]';
        const targetResult = document.evaluate(
          targetXPath,
          document,
          null,
          XPathResult.FIRST_ORDERED_NODE_TYPE,
          null,
        );
        const targetElement = targetResult.singleNodeValue;
        return targetElement?.lastElementChild || null;
      },

      // 查找"下一个"按钮
      async findNextButton() {
        const xpath =
          '//*[@id="content"]/section[2]/common-project-bill/common-bill/div/div[1]/common-sequence/div[1]/button[3]';
        const result = document.evaluate(
          xpath,
          document,
          null,
          XPathResult.FIRST_ORDERED_NODE_TYPE,
          null,
        );
        return result.singleNodeValue;
      },
    },

    /**
     * UI相关功能
     */
    UI: {
      // 显示消息提示
      showMessage(text, type = "info") {
        const colors = {
          info: "#2196F3",
          success: "#4CAF50",
          error: "#F44336",
          warning: "#FF9800",
        };

        // 查找现有消息容器或创建新的
        let messageContainer = document.getElementById("mlk-message-container");
        if (!messageContainer) {
          messageContainer = document.createElement("div");
          messageContainer.id = "mlk-message-container";
          messageContainer.style.cssText = `
            position: fixed;
            bottom: 20px;
            left: 50%;
            transform: translateX(-50%);
            z-index: 10001;
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 10px;
          `;
          document.body.appendChild(messageContainer);
        }

        const toast = document.createElement("div");
        toast.textContent = text;
        toast.style.cssText = `
          padding: 10px 20px;
          background-color: ${colors[type]};
          color: white;
          border-radius: 4px;
          box-shadow: 0 2px 10px rgba(0,0,0,0.2);
          font-weight: bold;
          opacity: 0;
          transition: opacity 0.3s ease;
        `;

        messageContainer.appendChild(toast);

        // 确保消息显示出来
        setTimeout(() => {
          toast.style.opacity = 1;
        }, 10);

        // 自动消失
        setTimeout(() => {
          toast.style.opacity = 0;
          setTimeout(() => toast.remove(), 300);
        }, 3000);

        // 同时记录到控制台
        this.log(text, type);
      },

      // 增强日志输出
      log(message, type = "info") {
        const timestamp = new Date().toLocaleTimeString();
        const colorMap = {
          info: "color: #2196F3",
          success: "color: #4CAF50",
          error: "color: #F44336",
          warning: "color: #FF9800",
        };

        console.log(`%c[${timestamp}] ${message}`, colorMap[type]);

        // 同时更新状态栏
        this.updateStatusText(`${message}`);
      },

      // 更新状态栏文本（不会自动消失）
      updateStatusText(text) {
        const statusBar = document.getElementById("mlk-status");
        if (statusBar) {
          statusBar.textContent = text;
        }
      },

      // 更新进度函数
      updateProgress() {
        const elapsed = Math.floor((Date.now() - MLK.State.startTime) / 1000);
        const minutes = Math.floor(elapsed / 60);
        const seconds = elapsed % 60;
        const timeStr = `${minutes}分${seconds}秒`;

        // 计算处理速度
        const recordsPerMinute =
          MLK.State.processedCount > 0
            ? (MLK.State.processedCount / (elapsed / 60)).toFixed(1)
            : "0.0";

        const statusBar = document.getElementById("mlk-status");
        if (statusBar) {
          statusBar.innerHTML = `
            <div style="display:flex; justify-content:space-between; margin-bottom:3px;">
              <span>企业数: ${MLK.State.processedCount}</span>
              <span>成功: ${MLK.State.successCount}</span>
            </div>
            <div style="display:flex; justify-content:space-between;">
              <span>运行: ${timeStr}</span>
              <span>速度: ${recordsPerMinute}家/分</span>
            </div>
          `;

          // 根据成功率改变状态栏颜色
          const successRate =
            MLK.State.processedCount > 0
              ? MLK.State.successCount / MLK.State.processedCount
              : 0;

          if (successRate >= 0.8) {
            statusBar.style.color = "#4CAF50"; // 绿色
          } else if (successRate >= 0.5) {
            statusBar.style.color = "#FF9800"; // 橙色
          } else if (MLK.State.processedCount > 0) {
            statusBar.style.color = "#F44336"; // 红色
          }
        }
      },

      // 创建助手盒子
      createHelperBox() {
        // 创建主容器
        const helperBox = document.createElement("div");
        helperBox.id = "mlk-helper";
        helperBox.style.cssText = `
          position: fixed;
          top: 20px;
          right: 20px;
          width: 200px;
          background-color: rgba(255, 255, 255, 0.95);
          border: 2px solid #ff3333;
          border-radius: 8px;
          box-shadow: 0 2px 10px rgba(255, 0, 0, 0.2);
          z-index: 10000;
          user-select: none;
        `;

        // 创建标题栏
        const titleBar = document.createElement("div");
        titleBar.style.cssText = `
          padding: 10px;
          background-color: #ff3333;
          color: white;
          font-weight: bold;
          border-radius: 6px 6px 0 0;
          cursor: move;
          text-align: center;
        `;
        titleBar.textContent = "名录库助手 v4.4";

        // 创建按钮容器
        const buttonContainer = document.createElement("div");
        buttonContainer.style.cssText = `
          padding: 10px;
          display: flex;
          gap: 10px;
          justify-content: center;
        `;

        // 创建按钮样式
        const buttonStyle = `
          padding: 5px 15px;
          background-color: #ff3333;
          color: white;
          border: none;
          border-radius: 4px;
          cursor: pointer;
          transition: all 0.3s ease;
          font-weight: bold;
        `;

        // 创建按钮
        const button1 = document.createElement("button");
        button1.textContent = "改错";
        button1.style.cssText = buttonStyle;

        const button2 = document.createElement("button");
        button2.textContent = "自动";
        button2.style.cssText = buttonStyle;

        // 添加按钮点击事件
        button1.addEventListener("click", MLK.Core.manualFix);
        button2.addEventListener("click", MLK.Core.toggleAutoMode);

        // 添加按钮悬停效果
        [button1, button2].forEach((button) => {
          button.addEventListener("mouseover", () => {
            button.style.backgroundColor = "#ff0000";
            button.style.transform = "scale(1.05)";
          });
          button.addEventListener("mouseout", () => {
            button.style.backgroundColor = "#ff3333";
            button.style.transform = "scale(1)";
          });
        });

        // 创建状态显示区
        const statusBar = document.createElement("div");
        statusBar.id = "mlk-status";
        statusBar.style.cssText = `
          padding: 10px;
          font-size: 12px;
          text-align: left;
          color: #666;
          border-top: 1px solid #eee;
          height: 40px;
        `;
        statusBar.innerHTML = "<div>就绪</div>";

        // 组装元素
        buttonContainer.appendChild(button1);
        buttonContainer.appendChild(button2);
        helperBox.appendChild(titleBar);
        helperBox.appendChild(buttonContainer);
        helperBox.appendChild(statusBar);

        // 添加版本和作者信息
        const infoBar = document.createElement("div");
        infoBar.style.cssText = `
          padding: 5px;
          font-size: 10px;
          text-align: center;
          color: #999;
          border-top: 1px solid #eee;
        `;
        infoBar.textContent = "by HANJ · 2025";

        helperBox.appendChild(infoBar);

        // 添加拖动功能
        let isDragging = false;
        let currentX;
        let currentY;
        let initialX;
        let initialY;

        titleBar.addEventListener("mousedown", (e) => {
          isDragging = true;
          initialX = e.clientX - helperBox.offsetLeft;
          initialY = e.clientY - helperBox.offsetTop;
        });

        document.addEventListener("mousemove", (e) => {
          if (isDragging) {
            e.preventDefault();
            currentX = e.clientX - initialX;
            currentY = e.clientY - initialY;
            helperBox.style.left = `${currentX}px`;
            helperBox.style.top = `${currentY}px`;
            helperBox.style.right = "auto";
          }
        });

        document.addEventListener("mouseup", () => {
          isDragging = false;
        });

        // 添加到页面
        document.body.appendChild(helperBox);

        // 显示欢迎消息
        this.showMessage("名录库助手已启动", "info");
      },
    },

    /**
     * 企业信息分析与行业代码查询
     */
    DataAnalysis: {
      /**
       * 主函数：分析企业名称，返回业务活动和行业代码
       * @param {string} companyName - 企业或事业单位名称
       * @returns {Promise<Object>} - 返回包含业务活动和行业代码的对象
       */
      async analyzeCompany(companyName) {
        try {
          // 步骤1：通过AI获取主要业务活动
          const activityResult =
            await this.getBusinessActivityFromAI(companyName);

          // 步骤2：通过业务活动获取行业代码
          const industryResult = await this.getIndustryCodeFromAPI(
            activityResult.businessActivity,
          );

          // 返回组合结果
          return {
            companyName: companyName,
            businessActivity: activityResult.businessActivity,
            industryCode: industryResult.code,
            industryName: industryResult.name,
            industryCategory: industryResult.category,
            success: true,
          };
        } catch (error) {
          MLK.UI.log(
            `分析企业 "${companyName}" 时发生错误: ${error.message}`,
            "error",
          );
          return {
            companyName: companyName,
            businessActivity: "",
            industryCode: "",
            industryName: "",
            industryCategory: "",
            success: false,
            error: error.message,
          };
        }
      },

      /**
       * 通过智谱AI获取企业主要业务活动
       * @param {string} companyName - 企业名称
       * @returns {Promise<Object>} - {businessActivity: string}
       */
      getBusinessActivityFromAI(companyName) {
        return new Promise((resolve, reject) => {
          // 构造请求数据
          const requestData = {
            model: "glm-4",
            messages: [
              {
                role: "system",
                content: `
                        你是专业的企业业务分析专家，仅需严格按照以下规则分析企业/单位的核心业务活动：
                        【格式规则】
                        1. 必须返回"名词+动词"或"动词+名词"的短语，例如：软件开发、提供教育服务（错误示例：从事软件开发、软件开发业务）
                        2. 短语长度严格控制在4-8个汉字，无任何多余字符
                        3. 仅允许使用汉字，禁止出现标点、数字、字母、空格、换行及任何符号
                        【内容规则】
                        1. 业务活动描述必须具体、精准，避免模糊表述（错误示例：开展业务、经营活动）
                        2. 行政/事业单位需体现核心职能定位（例如：市场监督管理、义务教育保障）
                        3. 销售类企业禁止使用"销售"一词，统一替换为"批发"或"零售"（例如：食品零售、电子产品批发）
                        【输出规则】
                        1. 仅返回符合要求的业务活动短语，无任何解释、说明、补充内容
                        2. 无论何种情况，只返回1个短语，禁止返回多个结果`,
              },
              {
                role: "user",
                content: `请分析"${companyName}"的主要业务活动，按规则返回唯一短语`,
              },
            ],
            temperature: 0.1,
            top_p: 0.5,
            max_tokens: 10,
          };

          // 使用GM_xmlhttpRequest实现跨域请求
          GM_xmlhttpRequest({
            method: "POST",
            url: MLK.Config.AI_API_URL,
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${MLK.Config.AI_TOKEN}`,
            },
            data: JSON.stringify(requestData),
            onload: function (response) {
              try {
                if (response.status !== 200) {
                  reject(
                    new Error(
                      `AI API请求失败: ${response.status} ${response.statusText}`,
                    ),
                  );
                  return;
                }

                const data = JSON.parse(response.responseText);
                let aiResponse = data.choices[0].message.content.trim();

                // 更彻底地清理AI回复，移除所有非汉字字符
                let businessActivity = "";

                // 第一步：使用正则表达式只保留汉字、英文字母和数字
                businessActivity = aiResponse.replace(
                  /[^\u4e00-\u9fa5a-zA-Z0-9]/g,
                  "",
                );

                // 第二步：去除可能的前缀词语
                const prefixes = [
                  "主要业务活动是",
                  "主要业务活动为",
                  "业务活动是",
                  "业务活动为",
                  "主要是",
                  "主要为",
                ];
                for (const prefix of prefixes) {
                  if (businessActivity.startsWith(prefix)) {
                    businessActivity = businessActivity.substring(
                      prefix.length,
                    );
                    break;
                  }
                }

                // 第三步：去除可能的解释性描述
                const explanationIndex = businessActivity.indexOf("即");
                if (explanationIndex > 0) {
                  businessActivity = businessActivity.substring(
                    0,
                    explanationIndex,
                  );
                }

                // 第四步：限制最终长度
                if (businessActivity.length > 8) {
                  businessActivity = businessActivity.substring(0, 8);
                }

                MLK.UI.log(
                  `AI分析结果(清理后): ${businessActivity}`,
                  "success",
                );
                resolve({ businessActivity });
              } catch (error) {
                MLK.UI.log(`处理AI响应失败: ${error.message}`, "error");
                reject(error);
              }
            },
            onerror: function (error) {
              MLK.UI.log(`AI API请求失败: ${error.message}`, "error");
              reject(new Error("无法连接到AI服务"));
            },
          });
        });
      },

      /**
       * 通过浙江自动编码系统API获取行业代码
       * @param {string} businessActivity - 主要业务活动描述
       * @returns {Promise<Object>} - {code: string, name: string, category: string}
       */
      getIndustryCodeFromAPI(businessActivity) {
        return new Promise((resolve, reject) => {
          // 构建API URL，使用业务活动作为关键词
          const searchTerm = encodeURIComponent(businessActivity);
          const apiUrl = `${MLK.Config.INDUSTRY_API_URL}${searchTerm}/5`;

          // 使用GM_xmlhttpRequest实现跨域请求
          GM_xmlhttpRequest({
            method: "GET",
            url: apiUrl,
            headers: {
              Accept: "application/json",
              "Content-Type": "application/json",
            },
            onload: function (response) {
              try {
                if (response.status !== 200) {
                  MLK.UI.log(`行业代码API状态: ${response.status}`, "warning");
                  reject(new Error(`行业代码API请求失败: ${response.status}`));
                  return;
                }

                const data = JSON.parse(response.responseText);

                // 检查API响应格式
                if (
                  !data ||
                  data.code !== "00000" ||
                  !data.data ||
                  !data.data.Codes ||
                  !data.data.Codes.length
                ) {
                  reject(new Error("未找到匹配的行业代码"));
                  return;
                }

                // 获取权重最高的结果
                const bestMatch = data.data.Codes[0];
                MLK.UI.log(
                  `获取行业代码: ${bestMatch.Code} ${bestMatch.Name}`,
                  "success",
                );

                // 检查是否需要设置经营形式和零售业态
                const industryPrefix = bestMatch.Code.substring(0, 2);
                if (["51", "52", "61", "62"].includes(industryPrefix)) {
                  // 170错误：这些行业需要设置经营形式
                  setTimeout(() => {
                    MLK.Utils.setValueByXpath(
                      '//*[@id="selJYXS"]/input',
                      "1",
                      "经营形式",
                    );
                  }, 500);
                }

                // 174错误：零售业需要设置零售业态
                if (industryPrefix === "52") {
                  setTimeout(() => {
                    MLK.Utils.setValueByXpath(
                      '//*[@id="selLSYT1"]/input',
                      "1050",
                      "零售业态1",
                    );
                  }, 700);
                }

                resolve({
                  code: bestMatch.Code,
                  name: bestMatch.Name,
                  category: bestMatch.Category,
                });
              } catch (error) {
                MLK.UI.log(
                  `处理行业代码API响应失败: ${error.message}`,
                  "error",
                );
                reject(error);
              }
            },
            onerror: function (error) {
              MLK.UI.log(`行业代码API请求失败: ${error.message}`, "error");
              reject(new Error("无法连接到行业代码服务"));
            },
          });
        });
      },
    },

    /**
     * 错误修复模块
     */
    ErrorFixer: {
      /**
       * 设置期末从业人数为1，营业收入为1
       */
      fixPeopleNumberAndIncome() {
        MLK.Utils.setValueByXpath('//*[@id="qmcyrs"]/input', "1");
        return MLK.Utils.setValueByXpath('//*[@id="yysr"]/input', "1");
      },
      /**
       * 174.行业代码前两位是'52零售业'，则零售业态1必须填写1050
       * @returns {boolean} 是否成功修复
       */
      fixRetailFormat() {
        const hydm = MLK.Utils.getValueByXpath('//*[@id="hydm"]/input');
        if (hydm && hydm.startsWith("52")) {
          return MLK.Utils.setValueByXpath(
            '//*[@id="selLSYT1"]/input',
            "1050",
            "零售业态1",
          );
        }
        return false;
      },
      /**
       * 112.详细地址如果填写，则长度应大于等于2个汉字；且不能全部由数字或字母组成
       * 087.如果填写，则长度应大于等于2个汉字；且不能全部由数字或字母组成
       * @returns {boolean} 是否成功修复
       */
      fixAddress() {
        // 获取详细地址和注册地址
        const xxdz = MLK.Utils.getValueByXpath('//*[@id="xxdz"]/input');
        const zcdz = MLK.Utils.getValueByXpath('//*[@id="zcdxxdz"]/input');

        if ((!xxdz || xxdz.trim() === "") && (!zcdz || zcdz.trim() === "")) {
          MLK.UI.log("未找到详细地址和注册地址或两者均为空", "warning");
          return false;
        }

        // 清理地址函数
        function cleanAddress(address) {
          if (!address) return "";

          // 先转换全角数字为半角数字
          const fullToHalfMap = {
            "１": "1",
            "２": "2",
            "３": "3",
            "４": "4",
            "５": "5",
            "６": "6",
            "７": "7",
            "８": "8",
            "９": "9",
            "０": "0",
          };

          let cleanedAddress = address;

          // 替换全角数字
          for (const [full, half] of Object.entries(fullToHalfMap)) {
            cleanedAddress = cleanedAddress.replace(
              new RegExp(full, "g"),
              half,
            );
          }

          // 然后处理特殊字符
          cleanedAddress = cleanedAddress
            // 去除半角标点符号: ' " , ? @ - ( ) [ ] { } * 和空格
            .replace(/['",?@\()[\]{}\* ]/g, "")
            // 去除全角标点符号：''""，？＠－（）【】「」『』〔〕［］｛｝＊和全角空格
            .replace(/[''"",，？？＠（）【】「」『』〔〕［］｛｝＊　]/g, "")
            // 移除前后空格
            .trim();

          return cleanedAddress;
        }

        // 处理单个地址的函数
        function processAddress(address, fieldName) {
          if (!address || address.trim() === "") return "";

          let cleanedAddress = cleanAddress(address);

          // 检查是否全为数字或字母或长度不足
          const isAllDigitsOrLetters = /^[A-Za-z0-9]+$/.test(cleanedAddress);

          if (isAllDigitsOrLetters || cleanedAddress.length < 2) {
            // 尝试获取单位名称作为补充
            const companyName = MLK.Utils.getValueByXpath(
              '//*[@id="dwmc"]/input',
            );

            if (companyName && companyName.trim() !== "") {
              // 将单位名称添加到地址前
              cleanedAddress = companyName + "办公地址" + cleanedAddress;
              MLK.UI.log(`${fieldName}格式无效，已使用单位名称补充地址`);
            } else {
              // 如果没有单位名称，使用默认地址
              cleanedAddress =
                MLK.Config.DEFAULT_ADDRESS_PREFIX + cleanedAddress;
              MLK.UI.log(`${fieldName}格式无效，已添加默认前缀`);
            }
          }

          // 如果是纯数字地址，添加"号"字
          if (/^\d+$/.test(cleanedAddress)) {
            cleanedAddress += "号";
          }

          // 检查乱码或半个汉字情况
          if (/[\ufffd]/.test(cleanedAddress)) {
            cleanedAddress = cleanedAddress.replace(/[\ufffd]/g, "");
            MLK.UI.log(`检测到${fieldName}可能的乱码，已移除`);
          }

          return cleanedAddress;
        }

        // 处理详细地址
        const processedXxdz = xxdz ? processAddress(xxdz, "详细地址") : "";

        // 处理注册地址
        let processedZcdz = zcdz ? processAddress(zcdz, "注册地址") : "";

        // 如果注册地址为空但详细地址不为空，则使用详细地址
        if ((!processedZcdz || processedZcdz === "") && processedXxdz) {
          processedZcdz = processedXxdz;
          MLK.UI.log("注册地址为空，已使用详细地址填充");
        }

        // 如果详细地址为空但注册地址不为空，则使用注册地址
        const finalXxdz = processedXxdz || processedZcdz;
        const finalZcdz = processedZcdz || processedXxdz;

        // 设置处理后的地址
        let success = true;
        if (xxdz !== finalXxdz) {
          success =
            MLK.Utils.setValueByXpath('//*[@id="xxdz"]/input', finalXxdz) &&
            success;
        }

        if (zcdz !== finalZcdz) {
          success =
            MLK.Utils.setValueByXpath('//*[@id="zcdxxdz"]/input', finalZcdz) &&
            success;
        }

        // 因为地址修改会影响区划代码，所以尝试更新区划代码
        if (success) {
          this.fixAreaCode();
        }

        return success;
      },

      /**
       * 113.区划代码不能为空，且须与12位国家标准省地县乡村地址码一致。
       * @returns {boolean} 是否成功修复
       */
      fixAreaCode() {
        const address = MLK.Utils.findElement('//*[@id="xxdz"]/input');

        if (!address) {
          MLK.UI.log("未找到地址输入框", "warning");
          return false;
        }

        const areaCode = MLK.Utils.findAreaCode(address.value);

        // 填入区划代码
        if (areaCode) {
          MLK.Utils.setValueByXpath('//*[@id="qhdm"]/input', areaCode);
          MLK.Utils.setValueByXpath('//*[@id="zcdqhdm"]/input', areaCode);
          return true;
        } else {
          MLK.UI.log("未找到匹配的区划代码", "warning");
          return false;
        }
      },

      /**
       * 根据统一社会信用代码判断单位类型，设置执行会计标准类别
       * @returns {boolean} 是否成功修复
       */
      fixAccountingStandard() {
        //获取统一社会信用代码
        const tyshxydm = MLK.Utils.getValueByXpath('//*[@id="shxydm"]/input');
        //如果统一社会信用代码为空，则返回false
        if (!tyshxydm) {
          MLK.UI.log("未找到统一社会信用代码", "warning");
          return false;
        }

        // 获取统一社会信用代码的前两位字符
        const orgTypeCode = tyshxydm.substring(0, 2);
        let zxkjValue = "9"; // 默认为"其他"

        // 判断机构类型
        // 政府机构、事业单位代码规则: 1-5开头
        if (/^[1-5]/.test(orgTypeCode)) {
          zxkjValue = "2"; // 行政事业单位
          MLK.UI.log("识别为行政事业单位");
        }
        // 工商企业代码规则: 9开头(91-98是企业)
        else if (/^9[1-8]/.test(orgTypeCode)) {
          zxkjValue = "1"; // 企业
          MLK.UI.log("识别为企业");
          this.fixEnterpriseAccountingRule();
        }
        // 社会团体代码规则: 5开头的部分是社会团体
        else if (/^5/.test(orgTypeCode)) {
          zxkjValue = "4"; // 民间非盈利组织
          MLK.UI.log("识别为民间非盈利组织");
        }
        // 其他情况
        else {
          MLK.UI.log("无法识别单位类型，使用默认值'其他'");
        }

        // 设置单位会计主管部门
        return MLK.Utils.setValueByXpath('//*[@id="selZXKJ"]/input', zxkjValue);
      },

      /**
       * 091.主要业务活动1含非法字符或空格。
       * 092.主要业务活动1如果填写，长度不能超过15个汉字。
       * @returns {boolean} 是否成功修复
       */
      fixBusinessActivityFormat() {
        // 获取主要业务活动文本
        const text = MLK.Utils.getValueByXpath('//*[@id="zyywhd1"]/input');

        // 如果文本为空，则返回失败
        if (!text || text.trim() === "") {
          MLK.UI.log("未找到主要业务活动", "warning");
          return false;
        }

        // 用标点符号分割文本 (中英文标点都考虑)
        const textArray = text.split(/[，。（）、：,.():；;]/);

        // 过滤掉空白项
        const filteredArray = textArray.filter(
          (item) => item && item.trim() !== "",
        );

        if (filteredArray.length === 0) {
          MLK.UI.log("分割后没有有效内容", "warning");
          return false;
        }

        // 如果第二个文本存在且有效，则使用第二个文本
        // 否则使用第一个文本
        // 同时去除前后空格
        const selectedText =
          filteredArray.length > 1 && filteredArray[1].trim()
            ? filteredArray[1].trim()
            : filteredArray[0].trim();

        // 设置处理后的文本
        return MLK.Utils.setValueByXpath(
          '//*[@id="zyywhd1"]/input',
          selectedText,
        );
      },

      /**
       * 141.隶属关系如果填写，不能是（'10中央'，'11地方'）以外的值。
       * @returns {boolean} 是否成功修复
       */
      fixAffiliation() {
        return MLK.Utils.setValueByXpath('//*[@id="selLSGX"]/input', "11");
      },

      /**
       * 170.行业代码前两位是'51批发业'或者'52零售业'或者'61住宿业'或者'62餐饮业'，则经营形式必须填写。
       * @returns {boolean} 是否成功修复
       */
      fixBusinessFormat() {
        return MLK.Utils.setValueByXpath('//*[@id="selJYXS"]/input', "1");
      },

      /**
       * 079.机构类型是'10企业'，并且运营状态不是'3筹建'，则开业年份必须填写。
       * @returns {boolean} 是否成功修复
       */
      fixOpeningDate() {
        //获取成立年
        const clnf = MLK.Utils.getValueByXpath('//*[@id="clnf"]/input');
        //获取成立月
        const clyf = MLK.Utils.getValueByXpath('//*[@id="clyf"]/input');
        //如果成立年成立月同时为空，则返回false
        if (!clnf && !clyf) {
          MLK.UI.log("未找到成立年月", "warning");
          return false;
        }

        //设置开业年月
        MLK.Utils.setValueByXpath('//*[@id="kynf"]/input', clnf);
        MLK.Utils.setValueByXpath('//*[@id="kyyf"]/input', clyf, "开业月份");
        return true;
      },

      /**
       * 122.运营状态不能为空。
       * @returns {boolean} 是否成功修复
       */
      fixOperatingStatus() {
        let success = MLK.Utils.setValueByXpath(
          '//*[@id="selYYZT"]/input',
          "1",
        );

        // 如果是企业，还需要设置开业年月，同时营业收入为0
        if (MLK.Utils.getValueByXpath('//*[@id="selJGLX"]/input') == 10) {
          this.fixOpeningDate();
          this.fixRevenue();
        }

        return success;
      },

      /**
       * 154.执行会计标准类别是'1企业'，则执行企业会计准则情况一般不能为空。
       * @returns {boolean} 是否成功修复
       */
      fixEnterpriseAccountingRule() {
        return MLK.Utils.setValueByXpath('//*[@id="selZXQY"]/input', "1");
      },

      /**
       * 194.单位负责人不能为空。
       * @returns {boolean} 是否成功修复
       */
      fixResponsiblePerson() {
        const fddbr = MLK.Utils.getValueByXpath('//*[@id="fddbr"]/input');
        const yddh = MLK.Utils.getValueByXpath('//*[@id="yddh"]/input');

        if (!fddbr || !yddh) {
          MLK.UI.log("未找到法定代表人或手机号码", "warning");
          return false;
        }

        let success = true;
        success &= MLK.Utils.setValueByXpath('//*[@id="dwfzr"]/input', fddbr);
        success &= MLK.Utils.setValueByXpath('//*[@id="tjfzr"]/input', fddbr);
        success &= MLK.Utils.setValueByXpath('//*[@id="tbr"]/input', fddbr);
        success &= MLK.Utils.setValueByXpath('//*[@id="tbrlxdh"]/input', yddh);
        return success;
      },

      /**
       * 131.机构类型是'10企业'或者'55农民专业合作社'的法人，且运营状态是'1正常运营'，则营业收入不能为空。
       * @returns {boolean} 是否成功修复
       */
      fixRevenue() {
        return MLK.Utils.setValueByXpath('//*[@id="yysr"]/input', "1");
      },

      /**
       * 090.主要业务活动1不能为空，且长度不少于等于3个汉字，且不能全由数字组成。
       * @returns {boolean} 是否成功修复
       */
      async fixBusinessActivity() {
        //获取企业名称
        let companyName = MLK.Utils.getValueByXpath('//*[@id="dwmc"]/input');
        if (!companyName) {
          MLK.UI.log("企业名称为空，无法处理", "warning");
          return false;
        }

        MLK.UI.log(`正在处理企业: ${companyName}`, "info");

        //获取主要业务活动
        const result = await MLK.DataAnalysis.analyzeCompany(companyName);

        //如果任何一个为空，返回false
        if (
          !result.success ||
          !result.businessActivity ||
          !result.industryCode
        ) {
          MLK.UI.log("无法获取业务活动或行业代码", "error");
          return false;
        }

        //设置主要业务活动和行业代码
        let success = true;
        success &= MLK.Utils.setValueByXpath(
          '//*[@id="zyywhd1"]/input',
          result.businessActivity,
        );
        success &= MLK.Utils.setValueByXpath(
          '//*[@id="hydm"]/input',
          result.industryCode,
          "行业代码",
        );

        return success;
      },

      /**
       * 通用修复2026年3月3日
       */
      async universalRepair() {
        MLK.ErrorFixer.fixOperatingStatus();
        MLK.ErrorFixer.fixOpeningDate();
        // 235.核实情况为空，如本单位已调查核实，请填写！
        MLK.Utils.setSelectValueByXpath("//*[@id='selHSQK']/select", 1);
        // 244.单位注册地详细地址是否与单位所在地详细地址一致”所有单位不得为空，且取值为1或2
        MLK.Utils.setSelectValueByXpath("//*[@id='dzsfyz']/select", 1);
      },

      /**
       * 097.行业代码不能为空且应该是4位有效码
       * @returns {boolean} 是否成功修复
       */
      async fixIndustryCode() {
        //获取主要业务活动1
        let businessActivity = MLK.Utils.getValueByXpath(
          '//*[@id="zyywhd1"]/input',
        );
        //如果主要业务活动1为空，无法处理
        if (!businessActivity) {
          MLK.UI.log("主要业务活动1为空，无法处理", "error");
          return false;
        }

        //获取行业代码
        try {
          let industryResult =
            await MLK.DataAnalysis.getIndustryCodeFromAPI(businessActivity);
          //设置行业代码
          return MLK.Utils.setValueByXpath(
            '//*[@id="hydm"]/input',
            industryResult.code,
            "行业代码",
          );
        } catch (error) {
          MLK.UI.log(`获取行业代码失败: ${error.message}`, "error");
          return false;
        }
      },
    },

    /**
     * 核心功能模块
     */
    Core: {
      // 处理所有错误
      async fixAllErrors() {
        // 先设置基础数据
        MLK.ErrorFixer.fixPeopleNumberAndIncome();

        try {
          const xpathError =
            '//*[@id="content"]/section[2]/common-project-bill/common-bill/div/div[1]/mat-drawer-container/mat-drawer/div/common-bill-check-list/div/div/div[2]/div[2]/div[1]/div';

          // 读取错误列表
          const errorList = MLK.Utils.getAllElementsTextByXPath(xpathError);

          if (errorList.length === 0) {
            MLK.UI.log("未发现需要修复的错误");
            return true;
          }

          MLK.UI.log(`发现 ${errorList.length} 个错误需要修复`, "info");

          // 截取每个错误的前3个数字
          let errorNoList = [];
          for (let i = 0; i < errorList.length; i++) {
            errorNoList.push(errorList[i].slice(0, 3));
          }

          // 检查是否同时存在090和097错误
          const has090Error = errorNoList.includes("090");
          const has097Error = errorNoList.includes("097");

          // 如果同时存在090和097错误，从errorNoList中移除097
          if (has090Error && has097Error) {
            MLK.UI.log("检测到090和097同时存在，将只处理090错误", "info");
            errorNoList = errorNoList.filter((code) => code !== "097");
          }

          // 记录已修复的错误
          let fixed = 0;

          // 根据每个错误的前3个数字，执行对应的修复函数
          for (let i = 0; i < errorNoList.length; i++) {
            let success = false;
            const errorCode = errorNoList[i];

            MLK.UI.log(`正在修复错误: ${errorCode}`, "info");

            //通用修复2025年9月9日10点01分
            MLK.ErrorFixer.universalRepair();

            switch (errorCode) {
              case "090": // 主要业务活动1不能为空
                success = await MLK.ErrorFixer.fixBusinessActivity();
                // 如果090修复成功，我们认为097也已经修复了
                if (success && has090Error && has097Error) {
                  fixed++; // 额外增加一个计数，表示097已被隐式修复
                  MLK.UI.log(`通过090修复同时解决了097错误`, "success");
                }
                break;

              case "097": // 行业代码不能为空 (只有不和090同时出现时才单独处理)
                success = await MLK.ErrorFixer.fixIndustryCode();
                break;

              // ... 其他错误处理代码保持不变 ...
              case "083": // 成立年份和开业年份相同时，开业月份不能早于成立月份
                success = MLK.ErrorFixer.fixOpeningDate();
                break;

              case "087": // 地址格式问题
              case "112": // 地址格式问题
                success = MLK.ErrorFixer.fixAddress();
                break;

              case "113": // 区划代码问题
                success = MLK.ErrorFixer.fixAreaCode();
                break;

              case "122": // 运营状态不能为空
                success = MLK.ErrorFixer.fixOperatingStatus();
                break;

              case "154": // 执行企业会计准则情况
                success = MLK.ErrorFixer.fixEnterpriseAccountingRule();
                break;

              case "194": // 单位负责人不能为空
                success = MLK.ErrorFixer.fixResponsiblePerson();
                break;

              case "091": // 主要业务活动格式问题
              case "092": // 主要业务活动长度问题
                success = MLK.ErrorFixer.fixBusinessActivityFormat();
                break;

              case "141": // 隶属关系问题
                success = MLK.ErrorFixer.fixAffiliation();
                break;

              case "142": // 执行会计标准类别
                success = MLK.ErrorFixer.fixAccountingStandard();
                break;

              case "170": // 经营形式问题
                success = MLK.ErrorFixer.fixBusinessFormat();
                break;

              case "079": // 开业年份问题
                success = MLK.ErrorFixer.fixOpeningDate();
                break;

              case "131": // 营业收入问题
                success = MLK.ErrorFixer.fixRevenue();
                break;

              case "174": // 零售业态问题
                success = MLK.ErrorFixer.fixRetailFormat();
                break;

              default:
                MLK.UI.log(`未知错误类型: ${errorCode}`, "warning");
            }

            if (success) {
              fixed++;
              MLK.UI.log(`成功修复错误: ${errorCode}`, "success");
            } else {
              MLK.UI.log(`修复错误 ${errorCode} 失败`, "warning");
            }
          }

          MLK.UI.log(
            `修复了 ${fixed}/${errorList.length} 个错误`,
            fixed > 0 ? "success" : "warning",
          );
          return fixed > 0;
        } catch (error) {
          MLK.UI.log(`修复错误时出错: ${error.message}`, "error");
          return false;
        }
      },

      // 手动修复按钮处理
      async manualFix() {
        try {
          const button = document.querySelector(
            "#mlk-helper button:nth-child(1)",
          );
          button.disabled = true;

          await MLK.Core.fixAllErrors();
          MLK.UI.showMessage("错误修复完成", "success");
        } catch (error) {
          MLK.UI.log(`手动修复出错: ${error.message}`, "error");
          MLK.UI.showMessage("修复出错", "error");
        } finally {
          const button = document.querySelector(
            "#mlk-helper button:nth-child(1)",
          );
          button.disabled = false;
        }
      },

      // 自动模式开关
      toggleAutoMode() {
        const button = document.querySelector(
          "#mlk-helper button:nth-child(2)",
        );

        // 如果已在运行中，则停止
        if (MLK.State.isAutoRunning) {
          // 清除所有相关定时器
          clearInterval(MLK.State.timer);
          if (MLK.State.progressTimer) {
            clearInterval(MLK.State.progressTimer);
          }

          // 重置状态
          MLK.State.isAutoRunning = false;
          MLK.State.timer = null;
          MLK.State.progressTimer = null;
          button.textContent = "自动";

          // 显示运行总结
          const elapsed = Math.floor((Date.now() - MLK.State.startTime) / 1000);
          const minutes = Math.floor(elapsed / 60);
          const seconds = elapsed % 60;
          const timeStr = `${minutes}分${seconds}秒`;

          MLK.UI.showMessage(
            `处理完成！共处理 ${MLK.State.processedCount} 家企业，成功 ${MLK.State.successCount} 家，用时 ${timeStr}`,
            "success",
          );
          return;
        }

        // 开始自动运行
        MLK.State.isAutoRunning = true;
        MLK.State.startTime = Date.now();
        MLK.State.lastUpdateTime = Date.now();
        button.textContent = "停止";
        MLK.UI.showMessage("自动处理已开启", "success");

        // 重置计数（仅在新会话开始时）
        if (MLK.State.currentCompany === "") {
          MLK.State.processedCount = 0;
          MLK.State.successCount = 0;

          // 初始化状态栏
          const statusBar = document.getElementById("mlk-status");
          if (statusBar) {
            statusBar.innerHTML = `<div>准备处理...</div>`;
            statusBar.style.color = "#666";
          }
        }

        // 设置处理定时器
        MLK.State.timer = setInterval(async function () {
          try {
            const newCompany = await MLK.Core.autoProcessCompany(
              MLK.State.currentCompany,
            );
            if (newCompany && newCompany !== MLK.State.currentCompany) {
              MLK.State.currentCompany = newCompany;
              MLK.State.lastUpdateTime = Date.now(); // 重置超时计时
            }

            // 检查是否超过30秒没有更新
            const currentTime = Date.now();
            const timeElapsed = currentTime - MLK.State.lastUpdateTime;

            // 超过30秒未更新，说明页面可能卡住了
            if (timeElapsed > MLK.Config.AUTO_TIMEOUT) {
              MLK.UI.log(
                "30秒内未检测到企业变化，尝试点击下一个按钮",
                "warning",
              );

              // 尝试点击"下一个"按钮恢复
              const nextButton = await MLK.Utils.findNextButton();
              if (nextButton) {
                MLK.UI.showMessage("系统超时，点击下一个继续", "warning");
                nextButton.click();
                MLK.State.lastUpdateTime = Date.now(); // 重置超时计时
              } else {
                MLK.UI.log("未找到下一个按钮", "error");
              }
            }
          } catch (error) {
            // 错误处理保持不变
            MLK.UI.log(`自动处理出错: ${error.message}`, "error");
            MLK.UI.showMessage("自动处理出错，已停止", "error");
            clearInterval(MLK.State.timer);
            clearInterval(MLK.State.progressTimer);
            MLK.State.isAutoRunning = false;
            MLK.State.timer = null;
            MLK.State.progressTimer = null;
            button.textContent = "自动";
          }
        }, MLK.Config.AUTO_CHECK_INTERVAL);

        // 设置进度更新定时器(仅设置一个)
        if (!MLK.State.progressTimer) {
          MLK.State.progressTimer = setInterval(() => {
            if (MLK.State.isAutoRunning) {
              MLK.UI.updateProgress();
            }
          }, MLK.Config.PROGRESS_UPDATE_INTERVAL);
        }
      },

      // 自动处理企业
      async autoProcessCompany(companyOld) {
        try {
          // 获取企业名称
          const companyName = MLK.Utils.getValueByXpath(
            '//*[@id="dwmc"]/input',
          );
          if (!companyName || companyName === companyOld) return companyOld;

          MLK.UI.log(`处理企业: ${companyName}`, "info");

          // 检查是否存在090错误
          const xpathError =
            '//*[@id="content"]/section[2]/common-project-bill/common-bill/div/div[1]/mat-drawer-container/mat-drawer/div/common-bill-check-list/div/div/div[2]/div[2]/div[1]/div';
          const errorList = MLK.Utils.getAllElementsTextByXPath(xpathError);
          const has090Error = errorList.some((error) =>
            error.startsWith("090"),
          );

          // 修复错误并检查是否成功
          const fixed = await MLK.Core.fixAllErrors();

          // 更新处理计数
          if (companyName !== companyOld) {
            MLK.State.processedCount++;
            MLK.State.lastUpdateTime = Date.now();
          }

          if (!fixed) {
            MLK.UI.log("未能修复错误，准备跳过", "warning");

            // 点击"下一个"按钮
            const nextButton = await MLK.Utils.findNextButton();

            if (nextButton) {
              nextButton.click();
              MLK.UI.log(`已跳过企业: ${companyName}`, "info");
              MLK.UI.updateProgress();
              await MLK.Utils.delay(1000);
              return companyName;
            } else {
              MLK.UI.log("未找到下一个按钮", "error");
              return companyOld;
            }
          }

          // 如果存在090错误，检查主要业务活动和行业代码是否已填写
          if (has090Error) {
            MLK.UI.log(
              "检测到090错误，保存前确认主要业务活动和行业代码已填写",
              "info",
            );

            // 创建检查字段函数
            const checkFieldsFilled = () => {
              const businessActivity = MLK.Utils.getValueByXpath(
                '//*[@id="zyywhd1"]/input',
              );
              const industryCode = MLK.Utils.getValueByXpath(
                '//*[@id="hydm"]/input',
              );
              return (
                businessActivity &&
                industryCode &&
                businessActivity.trim().length >= 3
              );
            };

            // 如果字段未填写，等待最多10秒
            if (!checkFieldsFilled()) {
              MLK.UI.log(
                "主要业务活动或行业代码未正确填写，等待API响应...",
                "warning",
              );

              // 使用Promise.race实现超时等待
              try {
                await Promise.race([
                  // 每500ms检查一次字段是否已填写
                  new Promise((resolve, reject) => {
                    let attempts = 0;
                    const maxAttempts = 20; // 10秒 / 500ms = 20次

                    const checkInterval = setInterval(() => {
                      attempts++;
                      if (checkFieldsFilled()) {
                        clearInterval(checkInterval);
                        MLK.UI.log("字段已正确填写，继续处理", "success");
                        resolve();
                      } else if (attempts >= maxAttempts) {
                        clearInterval(checkInterval);
                        reject(new Error("等待填写主要业务活动和行业代码超时"));
                      }
                    }, 500);
                  }),

                  // 超时Promise
                  new Promise((_, reject) =>
                    setTimeout(() => reject(new Error("等待填写超时")), 10000),
                  ),
                ]);
              } catch (error) {
                MLK.UI.log(error.message, "error");

                // 尝试再次调用fixBusinessActivity
                MLK.UI.log("尝试再次修复090错误", "warning");
                const retryResult = await MLK.ErrorFixer.fixBusinessActivity();
                if (!retryResult) {
                  MLK.UI.log("重试失败，跳过当前企业", "error");

                  // 点击"下一个"按钮
                  const nextButton = await MLK.Utils.findNextButton();

                  if (nextButton) {
                    nextButton.click();
                    MLK.UI.log(`已跳过企业: ${companyName}`, "info");
                    MLK.UI.updateProgress();
                    await MLK.Utils.delay(1000);
                    return companyName;
                  } else {
                    MLK.UI.log("未找到下一个按钮", "error");
                    return companyOld;
                  }
                }
              }
            }

            // 最后再检查一次
            const businessActivity = MLK.Utils.getValueByXpath(
              '//*[@id="zyywhd1"]/input',
            );
            const industryCode = MLK.Utils.getValueByXpath(
              '//*[@id="hydm"]/input',
            );

            if (
              !businessActivity ||
              !industryCode ||
              businessActivity.trim().length < 3
            ) {
              MLK.UI.log(
                "主要业务活动或行业代码依然未正确填写，无法继续",
                "error",
              );
              return companyOld;
            } else {
              MLK.UI.log("字段验证通过，继续保存", "success");
            }
          }

          // 如果修复成功，继续原有流程
          const checkbox = await MLK.Utils.findCheckbox();
          if (!checkbox) {
            MLK.UI.log("未找到复选框", "error");
            return companyOld;
          }

          checkbox.click();
          MLK.UI.log("已点击复选框");

          await MLK.Utils.delay(1000);

          const saveButton = await MLK.Utils.findSaveButton();
          if (!saveButton) {
            MLK.UI.log("未找到保存按钮", "error");
            return companyOld;
          }

          saveButton.click();
          MLK.UI.log("已点击保存按钮");

          // 更新成功计数
          MLK.State.successCount++;

          // 显示计数消息
          MLK.UI.showMessage(`处理成功: ${companyName}`, "success");
          MLK.UI.updateProgress();

          return companyName;
        } catch (error) {
          MLK.UI.log(`处理企业出错: ${error.message}`, "error");
          throw error;
        }
      },
    },
  };

  // 初始化
  MLK.UI.createHelperBox();

  // 暴露主命名空间到全局作用域以方便调试
  window.MLK = MLK;
})();
