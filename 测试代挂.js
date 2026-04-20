// ==UserScript==
// @name         测试代挂网页
// @namespace    http://tampermonkey.net/
// @version      0.1
// @description  try to take over the world!
// @author       hanj.cn@outlook.com
// @match        http://47.101.208.143:8848/
// @icon         https://www.google.com/s2/favicons?sz=64&domain=208.143
// @grant        none
// @updateURL    https://raw.githubusercontent.com/hanj1998/MyScript/main/测试代挂.js
// @downloadURL  https://raw.githubusercontent.com/hanj1998/MyScript/main/测试代挂.js
// @license      MIT
// ==/UserScript==

(function () {
  "use strict";
  let result = confirm("点击确定按钮开始测试");
  if (result) {
    // 获取nickname输入框
    let nickname = document.getElementById("nickname");
    let nickname_1 = document.getElementById("nickname_1");

    // 获取反馈内容输入框
    let content = document.getElementById("content");

    // 获取邮箱输入框
    let email = document.getElementById("email");

    // 获取cookie输入框
    let cookie = document.getElementById("cookie");

    // 获取UID输入框
    let UID = document.getElementById("wxPusherId");

    // 获取检测cookie的按钮
    let check_cookie_btn = document.getElementsByClassName("btn-warning")[0];

    // 获取提交代挂的按钮
    let submit_data_btn = document.getElementsByClassName("btn-primary")[0];

    // 获取提交反馈的按钮
    let submit_question_btn = document.getElementsByClassName("btn-success")[0];

    // 赋值
    nickname.setAttribute("value", "测试用户");
    cookie.setAttribute("value", "pt_key=xxx;pt_pin=xxx;");
    UID.setAttribute("value", "UID_5WzrSc0oZcxy7pnWN6Qni4n2qNLU");

    nickname_1.setAttribute("value", "测试用户");
    content.setAttribute("value", "测试内容");
    email.setAttribute("value", "hanj.cn@outlook.com");

    // 延迟500ms点击检查按钮
    setTimeout(function () {
      check_cookie_btn.onclick();
    }, 500);

    // 点击提交代挂按钮
    setTimeout(function () {
      submit_data_btn.onclick();
    }, 500);

    // 点击提交反馈按钮
    setTimeout(function () {
      submit_question_btn.onclick();
    }, 500);
  }
})();
