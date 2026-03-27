// ==UserScript==
// @name         给CSDN首页加上收藏夹按钮
// @namespace    http://tampermonkey.net/
// @version      0.1
// @description  try to take over the world!
// @author       You
// @match        *://*.csdn.net/*
// @icon         https://favicon.yandex.net/favicon/v2/https://www.csdn.net/?size=32
// @grant        none
// @updateURL    https://raw.githubusercontent.com/hanj2025/MyScript/main/CSDN添加收藏按钮.js
// @downloadURL  https://raw.githubusercontent.com/hanj2025/MyScript/main/CSDN添加收藏按钮.js
// @license      MIT    
// ==/UserScript==

(function() {
    'use strict';
    setTimeout(function() {

        // 获取父节点
        let onlyUser = document.getElementsByClassName("onlyUser")[0];

        // 获取兄弟节点
        let toolbar_btn_dynamic = onlyUser.children[3];

        // 克隆
        let collection_btn = toolbar_btn_dynamic.cloneNode(true);

        // 获取子节点
        let a = collection_btn.children[0];

        // 改变属性
        a.textContent = "收藏夹";
        a.setAttribute("href", "https://i.csdn.net/#/user-center/collection-list?type=1")

        // 然后放到toolbar_btn_dynamic的前面
        onlyUser.insertBefore(collection_btn, toolbar_btn_dynamic);
    }, 500);

})();