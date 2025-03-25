// ==UserScript==
// @name         UCFHere_Force_Cam
// @namespace    https://staybrowser.com/
// @version      0.04
// @description  Template userscript created by Stay
// @author       You
// @match        tcode.github.io/*
// @match        https://here.cdl.ucf.edu/*
// @grant        none
// @downloadURL  https://raw.githubusercontent.com/tcode-g/jssnippets/refs/heads/main/UCFHere_Force_Cam.user.js
// @updateURL  https://raw.githubusercontent.com/tcode-g/jssnippets/refs/heads/main/UCFHere_Force_Cam.user.js
// ==/UserScript==
(async () => {
    'use strict';
    let invisibleDiv = null;
    function logToDiv(message) {
        if (invisibleDiv === null) {
            invisibleDiv = document.createElement("div");
            invisibleDiv.style = "display: none;";
            invisibleDiv.id = "invisdiv";
            document.body.appendChild(invisibleDiv);
        }
        let p = document.createTextNode(message);
        invisibleDiv.appendChild(p);
    }
    async function getTelephotoCamera(){ 
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        stream.getTracks().forEach(track => track.stop()); // Stop preview after permission granted

        // Now list available cameras
        const devices = await navigator.mediaDevices.enumerateDevices();
        const cameras = devices.filter(device => device.kind === "videoinput" && device.label === "Back Telephoto Camera");
        if (cameras.length > 0) {
            logToDiv("found telephoto cam");
            logToDiv(cameras[0].label);
            return cameras[0];
        }

        // let telephotoCamera = null;

        // cameras.forEach((camera, index) => {
        //     // Check for "Back Telephoto Camera"
        //     logToDiv(camera.label);
        //     if (camera.label.includes("Back Telephoto Camera")) {
        //         logToDiv("found telephoto cam");
        //         logToDiv(telephotoCamera);
        //         telephotoCamera = camera;
        //     }
        // });
        // return telephotoCamera;
    }
    let originalgetUserMedia = navigator.mediaDevices.getUserMedia;
    navigator.mediaDevices.getUserMedia = function(...args) {
        // alert("get user media interecept");
        //{ video: { facingMode: newFacingMode }
        let telephotoCamera = getTelephotoCamera();
        logToDiv(JSON.stringify(telephotoCamera));
        if (telephotoCamera !== null || telephotoCamera == {}) {
            logToDiv("found telephoto cam");
            let firstArg = args[0];
            if ("video" in firstArg) {
                logToDiv("good first arg");
                logToDiv(JSON.stringify(firstArg));
                let vidObj = firstArg["video"];
                if ("facingMode" in vidObj) {
                    logToDiv("good facing mode");
                    if (vidObj["facingMode"] === "environment") {
                        logToDiv("different camera");
                        return originalgetUserMedia({video: { deviceId: { exact: telephotoCamera.deviceId }}})
                    }
                }
            }
        }
        logToDiv("intercepted getUserMedia");
        return originalgetUserMedia(...args);
    }

    
})();
