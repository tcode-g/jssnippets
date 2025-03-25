// ==UserScript==
// @name         UCF Here Force Camera
// @namespace    https://staybrowser.com/
// @version      0.1
// @description  Template userscript created by Stay
// @author       You
// @match        tcode.github.io/*
// @grant        none
// ==/UserScript==
(function () {
    'use strict';
    let originalgetUserMedia = navigator.mediaDevices.getUserMedia;
    navigator.mediaDevices.getUserMedia = function(...args) {
        alert("get user media interecept");
        return originalgetUserMedia(...args);
    }
})();
