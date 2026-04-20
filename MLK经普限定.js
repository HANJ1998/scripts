// ==UserScript==
// @name         名录库终结者
// @namespace    https://gitee.com/hanj1998
// @version      1.1.1
// @description  经济普查是真的累！！！
// @author       hanj-cn@qq.com
// @updateURL    https://raw.githubusercontent.com/hanj1998/MyScript/main/MLK经普限定.js
// @downloadURL  https://raw.githubusercontent.com/hanj1998/MyScript/main/MLK经普限定.js
// @grant        unsafeWindow
// @grant        GM_setValue
// @grant        GM_getValue
// @match        http://10.42.31.167/tjmlk/Modules/RecordView/RecordView.aspx?E=%e6%b3%95%e4%ba%ba%e5%8d%95%e4%bd%8d%e8%a1%a8%e7%bb%b4%e6%8a%a4
// @match        http://10.42.31.167/tjmlk/Modules/RecordView/RecordView.aspx?E=%u6cd5%u4eba%u5355%u4f4d%u8868%u7ef4%u62a4
// @match        http://10.42.31.167/tjmlk/Common/CustomBill.aspx?E=%e4%bf%ae%e6%94%b9%e6%b3%95%e4%ba%ba%e5%8d%95%e4%bd%8d%e8%a1%a8*
// @match        http://10.42.31.167/tjmlk/Modules/RecordView/RecordView.aspx?E=%u4ea7%u4e1a%u6d3b%u52a8%u5355%u4f4d%u8868%u7ef4%u62a4
// @match        http://10.42.31.167/tjmlk/Modules/RecordView/RecordView.aspx?E=%e4%ba%a7%e4%b8%9a%e6%b4%bb%e5%8a%a8%e5%8d%95%e4%bd%8d%e8%a1%a8%e7%bb%b4%e6%8a%a4
// @match        http://10.42.31.167/tjmlk/Common/CustomBill.aspx?E=%e4%bf%ae%e6%94%b9%e4%ba%a7%e4%b8%9a%e6%b4%bb%e5%8a%a8%e5%8d%95%e4%bd%8d%e8%a1%a8*
// @require      https://lib.baomitu.com/jquery/latest/jquery.min.js
// ==/UserScript==

//最后更新时间：2023年8月8日08:38:42
//更新内容：优化逻辑，添加注释

(function () {
  //新增一个按钮用于操作
  function addStartBtn() {
    //获取当前网址
    var currentUrl = window.location.href;

    //判断网址，前两个是法人单位，后两个是产业活动单位
    if (
      includeUrl(
        currentUrl,
        "http://10.42.31.167/tjmlk/Modules/RecordView/RecordView.aspx?E=%u6cd5%u4eba%u5355%u4f4d%u8868%u7ef4%u62a4",
        "http://10.42.31.167/tjmlk/Modules/RecordView/RecordView.aspx?E=%e6%b3%95%e4%ba%ba%e5%8d%95%e4%bd%8d%e8%a1%a8%e7%bb%b4%e6%8a%a4",
        "http://10.42.31.167/tjmlk/Modules/RecordView/RecordView.aspx?E=%u4ea7%u4e1a%u6d3b%u52a8%u5355%u4f4d%u8868%u7ef4%u62a4",
        "http://10.42.31.167/tjmlk/Modules/RecordView/RecordView.aspx?E=%e4%ba%a7%e4%b8%9a%e6%b4%bb%e5%8a%a8%e5%8d%95%e4%bd%8d%e8%a1%a8%e7%bb%b4%e6%8a%a4",
      )
    ) {
      //在查询页面添加操作按钮
      $("body").prepend("<button id='startBtn'>处理数据</button>");

      //按钮点击事件
      $("#startBtn").click(function () {
        //如果数据不为空
        if (GM_getValue("data") != null) {
          //取出数据
          var itemNum = GM_getValue("data").itemNum;
          var first = GM_getValue("data").first;
          var itemArr = GM_getValue("data").itemArr;
          var item;

          //构造对象，用以记录变化
          var data = {
            itemArr: itemArr,
            first: false,
            itemNum: -1,
          };

          //判断
          if (itemNum >= 1) {
            //判断是否是第一次
            if (first) {
              item = itemArr[itemArr.length - itemNum];
            } else {
              item = itemArr[itemArr.length - itemNum + 1];
            }

            //当不是最后一个数据时
            if (itemNum > 1) {
              //填充筛选框
              fillFilter("社会信用代码", "等于", item.split("*")[0]);

              //给#btnSearch添加一个span用于点击
              $("#btnSearch").append("<span id='mySpan'></span>");

              //点击确定按钮开始搜索
              $("#mySpan").click();
            }

            //如果是首次运行的话，需要先搜索一遍，但不点击
            if (first) {
              data.itemNum = itemNum;
            } else {
              //不是首次，则判断结果条数后再确定是否点击
              var resultSize = $("#dbgData > tbody").children().length - 2;
              // 如果只有一条结果
              if (resultSize == 1) {
                //取出跳转链接
                const jumpBtn = $(
                  "#dbgData > tbody > tr:nth-child(2) > td:nth-child(2) > a:nth-child(1)",
                );

                //说明只有一条数据，点击第一条数据
                jumpBtn.append("<span id='mySpan1'></span>");

                //点击链接跳转
                $("#mySpan1").click();
              } else {
                //异常
                alert(
                  "搜索结果共" +
                    (resultSize == -2 ? 0 : resultSize) +
                    "条，请自行判断异常",
                );
              }
              //记录处理到哪个文件
              data.itemNum = itemNum - 1;
            }

            //记住处理到哪个数据
            GM_setValue("data", data);
          } else {
            GM_setValue("data", null);
            alert("本组数据已处理完毕，辛苦了^_^");
          }
        } else {
          alert("请先粘贴数据");
        }
      });
    }
  }

  //填充筛选条件
  function fillFilter(item, condition, input) {
    $("#ddlColumnName").val(item);
    $("#cmbOperator").val(condition);
    $("#edtFilter").val(input);
  }

  //添加初始化按钮
  function addInitBtn() {
    var currentUrl = window.location.href;
    if (
      includeUrl(
        currentUrl,
        "http://10.42.31.167/tjmlk/Modules/RecordView/RecordView.aspx?E=%u6cd5%u4eba%u5355%u4f4d%u8868%u7ef4%u62a4",
        "http://10.42.31.167/tjmlk/Modules/RecordView/RecordView.aspx?E=%e6%b3%95%e4%ba%ba%e5%8d%95%e4%bd%8d%e8%a1%a8%e7%bb%b4%e6%8a%a4",
        "http://10.42.31.167/tjmlk/Modules/RecordView/RecordView.aspx?E=%u4ea7%u4e1a%u6d3b%u52a8%u5355%u4f4d%u8868%u7ef4%u62a4",
        "http://10.42.31.167/tjmlk/Modules/RecordView/RecordView.aspx?E=%e4%ba%a7%e4%b8%9a%e6%b4%bb%e5%8a%a8%e5%8d%95%e4%bd%8d%e8%a1%a8%e7%bb%b4%e6%8a%a4",
      )
    ) {
      //添加按钮
      $("#startBtn").after("<button id='initBtn'>粘贴数据</button>");

      //点击事件
      $("#initBtn").click(function () {
        //输入窗口
        var mlkData = prompt("请至少粘贴三条数据");

        if (mlkData != "") {
          //打印日志
          console.log("用户输入\n[" + mlkData + "]");

          //拆分数据
          var mlkDataArr = mlkData.replace(/\r\n/g, "|").split("|");

          //数据条数必须不小于3
          if (mlkDataArr.length < 3) {
            alert("请至少粘贴三条数据");
          } else {
            //构造对象
            var data = {
              itemArr: mlkDataArr,
              first: true,
              itemNum: mlkDataArr.length,
            };

            //打印日志
            console.log(
              "格式化数据\n[" +
                data.itemArr +
                "]\n共" +
                data.itemNum +
                "个数据",
            );

            //放入油猴存储中
            GM_setValue("data", data);
          }
        } else {
          alert("无事发生");
        }
      });
    }
  }

  //获取css动态前缀
  function getCssPrefix() {
    var title = document.querySelector("#tdTitle").innerHTML;
    var index;
    if (
      title == "新增法人单位" ||
      title == "修改法人单位表" ||
      title == "取消剔除法人单位表"
    ) {
      index = 4;
    } else if (
      title == "新增产业单位" ||
      title == "修改产业活动单位表" ||
      title == "取消剔除产业活动单位表"
    ) {
      index = 3;
    } else {
      console.log("无法获取css动态前缀，请勿在此页面提交数据，请关闭本页面！");
    }
    var prefixId = document.querySelector("tr:nth-child(" + index + ") legend")
      .nextElementSibling.id;
    var prefix = "#" + prefixId.substring(0, prefixId.indexOf("_") - 2);
    console.log("已获取到CSS动态前缀：" + prefix);
    return prefix;
  }

  //判断网址，第一个参数是当前url
  function includeUrl(...args) {
    //标志
    var flag = false;

    //循环判断
    for (var i = 1; i < args.length; i++) {
      if (args[0].includes(args[i])) {
        flag = true;
      }
    }
    return flag;
  }

  //自动填充名录库
  function autoFill() {
    //判断网址
    var currentUrl = window.location.href;
    if (
      includeUrl(
        currentUrl,
        "http://10.42.31.167/tjmlk/Common/CustomBill.aspx?E=%e4%bf%ae%e6%94%b9%e6%b3%95%e4%ba%ba%e5%8d%95%e4%bd%8d%e8%a1%a8",
        "http://10.42.31.167/tjmlk/Common/CustomBill.aspx?E=%e4%bf%ae%e6%94%b9%e4%ba%a7%e4%b8%9a%e6%b4%bb%e5%8a%a8%e5%8d%95%e4%bd%8d%e8%a1%a8",
      )
    ) {
      //提取数据
      var itemNum = GM_getValue("data").itemNum;
      var itemArr = GM_getValue("data").itemArr;
      var areaCode = itemArr[itemArr.length - itemNum - 1].split("*")[1];

      //填充数据
      if (document.querySelector("#tdTitle").innerHTML == "修改法人单位表") {
        setValue(
          "03_行政区划代码_旧_edt代码",
          areaCode,
          "03_行政区划代码_edt代码",
          areaCode,
          "031_单位注册区划_旧_edt代码",
          areaCode,
        );

        //设置颜色
        setColor(
          "red",
          "03_行政区划代码_旧_edt代码",
          "03_行政区划代码_edt代码",
          "031_单位注册区划_旧_edt代码",
        );
      } else if (
        document.querySelector("#tdTitle").innerHTML == "修改产业活动单位表"
      ) {
        setValue(
          "03_行政区划代码_旧_edt代码",
          areaCode,
          "03_行政区划代码_edt代码",
          areaCode,
        );

        //设置颜色
        setColor(
          "red",
          "03_行政区划代码_旧_edt代码",
          "03_行政区划代码_edt代码",
        );
      }
    }
  }

  //填充数据
  function setValue(...args) {
    for (var i = 0; i < args.length; i++) {
      $(getCssPrefix() + args[i]).val(args[i + 1]);
      i++;
    }
  }

  //保存数据
  function saveValue(...args) {
    let arr = [];
    for (var i = 0; i < args.length; i++) {
      arr.push($(args[i]).val());
    }
    return arr;
  }

  //设置字体颜色,第一个参数是颜色
  function setColor(...args) {
    for (var i = 0; i < args.length; i++) {
      $(getCssPrefix() + args[i + 1]).css("color", args[0]);
    }
  }

  //显示变更(a → b)
  function showChange(...args) {
    var text = "";
    for (var i = 0; i < args.length; i++) {
      text = text + args[i] + " → " + args[i + 1] + "\n";
      i++;
    }
    return text;
  }

  addStartBtn();
  addInitBtn();
  autoFill();
})();
