// ==UserScript==
// @name         双随机脚本
// @namespace    http://tampermonkey.net/
// @version      0.3
// @description  在指定页面添加自动操作按钮，执行一系列点击、表格提取和企业比对操作
// @author       You
// @match        http*://scjg.hubei.gov.cn/hbssj/meta/HBSSJ/analyses/CSTM-17956/*
// @grant        none
// @updateURL    https://raw.githubusercontent.com/hanj2025/MyScript/main/双随机脚本.js
// @downloadURL  https://raw.githubusercontent.com/hanj2025/MyScript/main/双随机脚本.js
// @license      MIT    
// ==/UserScript==

(function () {
    'use strict';

    // 用户提供的企业数据列表
    const targetCompanies = [
        { code: '91420582741797379M', name: '宜昌华直能源开发有限公司' },
        { code: '91420582559742523B', name: '湖北盛世华沣陶瓷有限公司' },
        { code: '914200007068757492', name: '湖北三峡新型建材股份有限公司' },
        { code: '91420582662265841J', name: '葛洲坝当阳水泥有限公司' },
        { code: '91420500744614179X', name: '蒙牛乳业(当阳)有限责任公司' },
        { code: '914205007510089868', name: '宜昌佳润纺织有限公司' },
        { code: '91420500722046668U', name: '湖北金庄科技再生资源有限公司' },
        { code: '91420582MA4F4R53XQ', name: '当阳德毅化工有限公司' },
        { code: '91420582MA4F5MF277', name: '湖北金晶新材料科技有限公司' },
        { code: '91420582MA49MT6K3R', name: '湖北晋控气体有限公司' },
        { code: '91420582MA49QG7D9T', name: '宜昌市百佳新材科技有限公司' },
        { code: '91420582MA49RCP950', name: '湖北泰湖鞋业有限公司' },
        { code: '91420582MA495Q0X0E', name: '当阳市昌瑞再生资源有限公司' },
        { code: '9142058255973251X3', name: '宜昌中盈科技发展有限公司' },
        { code: '91420582MA49LLTM9W', name: '华强生物科技有限公司' },
        { code: '9142058276067004XQ', name: '宜昌新成石墨有限责任公司' },
        { code: '91420582882632439U', name: '湖北红旗汇成电缆有限公司' },
        { code: '91420582MA493EPU1A', name: '当阳市瑞定包装材料有限公司' },
        { code: '91420582MA4F21XG2X', name: '湖北荣恺机械设备有限公司' },
        { code: '91420582576969471D', name: '史丹利化肥当阳有限公司' },
        { code: '9142050055704182XE', name: '湖北澳利龙食品股份有限公司' },
        { code: '91420582MA7HR77B6D', name: '湖北德毅肥业有限公司' },
        { code: '91420500MA48861WXN', name: '湖北宏贤鞋业有限公司' },
        { code: '914205825737031177', name: '湖北源洹实业投资有限公司' },
        { code: '914205820526062584', name: '湖北远蓝机器有限公司' },
        { code: '91420582MA4F11HF7G', name: '宜昌市吉中汽车内饰有限公司' },
        { code: '91420582MA496D5Y04', name: '湖北通耐复合材料科技有限公司' },
        { code: '914205007809222592', name: '当阳中燃城市燃气发展有限公司' },
        { code: '91420582343498904F', name: '中材（宜昌）节能新材料有限公司' },
        { code: '914205826917618954', name: '湖北东田微科技股份有限公司' },
        { code: '91420500MAC6Q60P70', name: '正大饲料（当阳）有限公司' },
        { code: '91420582MA7GPNAK0E', name: '宜昌杭氧气体有限公司' },
        { code: '91420582784457876W', name: '湖北富豪包装有限公司' },
        { code: '91420582751023772K', name: '湖北金叶玉阳化纤有限公司' },
        { code: '91420582309740832T', name: '当阳品创服饰有限公司' },
        { code: '91420582MADH6D0D0J', name: '湖北省吉中汽车内饰有限公司' },
        { code: '91420582557024202M', name: '当阳市中阳建材有限公司' },
        { code: '91420582MA7LAB2R73', name: '当阳品研服饰有限责任公司' },
        { code: '91420582MA487B0Y87', name: '宜昌正标饲料有限公司' },
        { code: '91420582MA48CA5E0R', name: '当阳市华直光伏发电有限公司' },
        { code: '91420582MA491EWN8P', name: '宜昌宇能精密科技有限公司' },
        { code: '91420582MACFFQE39D', name: '当阳品跃服饰有限公司' },
        { code: '91420582182713887C', name: '当阳市自来水有限公司' },
        { code: '91420582182716412L', name: '当阳市全运材料有限公司' },
        { code: '91420582795913005E', name: '当阳市华强塑业有限公司' },
        { code: '914205821827241130', name: '当阳市富豪实业有限责任公司' },
        { code: '91420582MAC12JHE59', name: '湖北和雅环境科技有限公司' },
        { code: '91420500MA48ABT51R', name: '湖北朗跃新能源有限公司' },
        { code: '91420582MA7MRX5K27', name: '湖北趣尚服饰有限公司' },
        { code: '91420581MA4970RN0Q', name: '湖北弘美铝业集团有限公司' },
        { code: '91420582MA49EWF44Q', name: '当阳市楚歌新能源有限公司' },
        { code: '91420500MA49KTT64Q', name: '华润风电（当阳）有限公司' },
        { code: '91420582MA7KRG05XW', name: '湖北乐创服饰有限公司' },
        { code: '91420582MAC277UJ4W', name: '湖北元恒服饰有限公司' },
        { code: '91420582MA48YRMG1H', name: '宜昌伽佰俐塑业有限公司' },
        { code: '91420582MA491WCNX3', name: '当阳中车水务有限公司' },
        { code: '91420582MABXWPM18B', name: '当阳恒欢服饰有限责任公司' },
        { code: '91420582MA4F5FBC46', name: '湖北拓塑科技有限公司' },
        { code: '91420582557022338J', name: '湖北全运新材科技有限公司' },
        { code: '91420582MA49CLHQ6M', name: '当阳市汇创服饰有限公司' },
        { code: '91420582MACLW9KB4P', name: '当阳市志盈贸易有限公司' },
        { code: '91420582MA495BYR7C', name: '当阳市晓军贸易有限公司' },
        { code: '9142058276411725X5', name: '当阳市方进农资有限责任公司' },
        { code: '91420582MA49HMM05E', name: '当阳市河溶镇康元液化气站' },
        { code: '914205825627086335', name: '华强化工集团（当阳）农资贸易有限公司' },
        { code: '91420582MAD0AWAKXT', name: '当阳武迪汽车销售服务有限公司' },
        { code: '91420582063540258D', name: '宜昌兴邦液业化工商贸有限公司' },
        { code: '91420582MA49CL6035', name: '宜昌智腾科技有限公司' },
        { code: '91420582MA49763B6W', name: '宜昌丰泰实业有限公司' },
        { code: '91330782MA2EC3C11F', name: '湖北岑俊服饰有限公司' },
        { code: '91420582MA499X378L', name: '当阳市优强贸易有限公司' },
        { code: '913401006726326848', name: '湖北邻尔服饰贸易有限公司' },
        { code: '91420582MA498ATY6P', name: '当阳市神天贸易有限公司' },
        { code: '91420100MA49HFR919', name: '湖北多乐熊服饰有限公司' },
        { code: '91420582MA489PQ200', name: '湖北双河农友农资有限公司' },
        { code: '91420582MA4987WW0Q', name: '当阳泰欣工贸家电商贸有限公司' },
        { code: '91420582MA49PXT46A', name: '当阳市辰兴矿业有限公司' },
        { code: '91420582722037673M', name: '当阳市广视加油站' },
        { code: '91420582MA48B39826', name: '湖北鄂嘉化工有限公司' },
        { code: '914205825882174373', name: '湖北利隆矿业有限公司' },
        { code: '91420582591483349R', name: '当阳市华致商贸有限公司' },
        { code: '91420582MA7FK9Y38Q', name: '龙济祥（湖北）新材料科技有限公司' },
        { code: '91420582MA491M3QXF', name: '宜昌宝能贸易有限公司' },
        { code: '91420582MA493NBM1R', name: '宜昌兴庄供应链有限公司' },
        { code: '91420582MA49FW3U6A', name: '当阳市渝庆玻璃贸易有限公司' },
        { code: '91420582MAC5TKG67W', name: '湖北博皓服饰有限公司' },
        { code: '91420582MA7NEQK80E', name: '当阳品沃服饰有限公司' },
        { code: '91420582MACMMG299K', name: '湖北风禾服饰有限公司' },
        { code: '91420582MA7HEAT38P', name: '宜昌庄源再生资源有限公司' },
        { code: '91420582MA4F2RED8M', name: '湖北汇知荣业金属科技有限公司' },
        { code: '91420582MACTPGER58', name: '当阳市鑫晨餐饮管理有限公司' },
        { code: '91420582MACBEXJR7N', name: '宜昌市华欣贸易有限公司' },
        { code: '91420582MACYBW63XJ', name: '当阳市品通服饰有限公司' },
        { code: '91420582MACBG9676U', name: '当阳市鸿鲜食品有限公司' },
        { code: '91420582316401169U', name: '当阳市亭磊农机商贸有限公司' },
        { code: '91420582MA7MEL4J4G', name: '当阳品爱服饰有限公司' },
        { code: '91420582568309860C', name: '当阳市龙景加油站' },
        { code: '91420582MAC5G6N97N', name: '当阳市品弘服装有限公司' },
        { code: '91420582722038641K', name: '当阳市旭光加油站' },
        { code: '91420582MACT4TRT5W', name: '湖北九州通长坂坡医药有限公司' },
        { code: '91420582557010134L', name: '宜昌和福农资有限公司' },
        { code: '91420582MA4F2GRB4L', name: '湖北香榭水岸商业有限责任公司' },
        { code: '9142058272203603XQ', name: '当阳市育溪加油站（个人独资）' },
        { code: '91420582573706190F', name: '宜昌大卫保安服务有限公司' },
        { code: '91420582MA497MD2X0', name: '湖北东土太一智慧科技有限公司' },
        { code: '91420582MA496E7U3W', name: '当阳爱尔眼科医院有限公司' },
        { code: '91420582MA494XAE2A', name: '当阳仁爱眼科医院有限公司' },
        { code: '91420582331893720H', name: '当阳市中运通物流有限公司' },
        { code: '91420582MAC320H944', name: '当阳市孝安殡葬服务有限责任公司' },
        { code: '91420582316436097E', name: '宜昌亿可达物流有限公司' },
        { code: '91420582MA49FMY86D', name: '湖北达圆工程有限公司' },
        { code: '91420582MA49HJPKX2', name: '湖北鄂广建设工程有限公司' },
        { code: '91420582MA495C8Q6J', name: '湖北焱日建设工程有限公司' }
    ];

    // 创建执行按钮
    const execButton = document.createElement('button');
    execButton.textContent = '自动操作';
    execButton.style.position = 'fixed';
    execButton.style.top = '10px';
    execButton.style.left = '10px';
    execButton.style.zIndex = '9999';
    execButton.style.padding = '10px 20px';
    execButton.style.backgroundColor = '#4CAF50';
    execButton.style.color = 'white';
    execButton.style.border = 'none';
    execButton.style.borderRadius = '5px';
    execButton.style.cursor = 'pointer';
    document.body.appendChild(execButton);

    // 用于跟踪是否应该继续循环
    let shouldContinue = true;

    // 点击事件处理函数
    execButton.addEventListener('click', async function () {
        console.log('开始执行自动操作流程');
        shouldContinue = true;
        await startProcess();
    });

    // 主流程函数
    async function startProcess() {
        while (shouldContinue) {
            try {
                // 步骤1: 点击按钮1
                console.log('步骤1: 点击重新摇号按钮');
                const button1 = document.evaluate('//*[@id="tsk4_btn_cxyh"]', document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
                if (button1) {
                    button1.click();
                } else {
                    throw new Error('未找到重新摇号按钮');
                }

                // 等待25秒
                console.log('等待25秒...');
                await new Promise(resolve => setTimeout(resolve, 25000));

                // 步骤2: 点击按钮2
                console.log('步骤2: 点击第一个确认按钮');
                const button2 = document.evaluate('//*[@id="ok"]/button', document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
                if (button2) {
                    button2.click();
                } else {
                    throw new Error('未找到第一个确认按钮');
                }

                // 等待3秒
                console.log('等待3秒...');
                await new Promise(resolve => setTimeout(resolve, 3000));

                // 步骤3: 点击按钮3
                console.log('步骤3: 点击第二个确认按钮');
                const button3 = document.evaluate('/html/body/div[4]/div/div/div[3]/div[1]/div[1]/span[1]/button', document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
                if (button3) {
                    button3.click();
                } else {
                    throw new Error('未找到第二个确认按钮');
                }

                // 等待30秒
                console.log('等待30秒...');
                await new Promise(resolve => setTimeout(resolve, 30000));

                // 步骤4: 获取并比对表格内容
                console.log('步骤4: 提取并比对表格内容');
                const tableBody = document.evaluate('//*[@id="table2"]/div[1]/div[4]/div/div/table/tbody', document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
                if (tableBody) {
                    const rows = tableBody.querySelectorAll('tr');
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
                        const cells = row.querySelectorAll('td');
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
                                const matchedCompany = targetCompanies.find(company => company.code === creditCode);
                                if (matchedCompany) {
                                    matchedCompanies.push({
                                        code: creditCode,
                                        name: objectName,
                                        matchedName: matchedCompany.name
                                    });
                                }
                            }
                        }

                        if (rowData.length > 0) {
                            tableData.push(rowData);
                        }
                    });

                    console.log('展示抽取结果(对象名称丨统一社会信用代码):');
                    console.table(tableData);

                    // 打印匹配结果
                    if (matchedCompanies.length > 0) {
                        console.log(`找到 ${matchedCompanies.length} 个匹配的企业:`);
                        matchedCompanies.forEach((company, index) => {
                            console.log(`${index + 1}. 统一代码: ${company.code}, 企业名称: ${company.name}`);
                        });
                    } else {
                        console.log('未找到匹配的企业');
                    }

                    // 检查是否达到停止条件
                    if (matchedCompanies.length >= 4) {
                        // 点击"对象配发"按钮
                        const button4 = document.evaluate('//*[@id="tsk4_btn_end"]', document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
                        if (button4) {
                            console.log('达到阈值:4,点击"对象配发"按钮');
                            button4.click();
                        } else {
                            console.error('未找到"对象配发"按钮');
                        }

                        console.log('程序已终止');
                        shouldContinue = false;
                        return;
                    } else {
                        console.log('未达到阈值:4,继续抽取');
                    }

                } else {
                    throw new Error('未找到抽取内容');
                }

                console.log('当前循环执行完毕');

                // 等待5秒后继续
                if (shouldContinue) {
                    console.log('等待5秒后开始下一次循环...');
                    await new Promise(resolve => setTimeout(resolve, 5000));
                }
            } catch (error) {
                console.error('操作过程中出错:', error.message);
                // 出错时也等待5秒后重试
                console.log('等待5秒后重试...');
                await new Promise(resolve => setTimeout(resolve, 5000));
            }
        }
    }

    console.log('自动操作脚本已加载，点击页面左上角按钮开始执行');
})();

