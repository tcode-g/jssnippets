// ==UserScript==
// @name         UCF Here Force Camera
// @namespace    https://staybrowser.com/
// @version      0.3
// @description  Template userscript created by Stay
// @author       You
// @match        tcode.github.io/*
// @match        https://here.cdl.ucf.edu/*
// @grant        none
// @downloadURL  https://raw.githubusercontent.com/tcode-g/jssnippets/refs/heads/main/ucfhereforcecamera.js
// ==/UserScript==
(function () {
    'use strict';
    let originalgetUserMedia = navigator.mediaDevices.getUserMedia;
    navigator.mediaDevices.getUserMedia = function(...args) {
        // alert("get user media interecept");
        return originalgetUserMedia(...args);
    }
})();
