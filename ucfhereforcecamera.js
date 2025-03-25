// ==UserScript==
// @name         UCF Here Force Camera
// @namespace    https://staybrowser.com/
// @version      0.5
// @description  Template userscript created by Stay
// @author       You
// @match        tcode.github.io/*
// @match        https://here.cdl.ucf.edu/*
// @grant        none
// @downloadURL  https://raw.githubusercontent.com/tcode-g/jssnippets/refs/heads/main/ucfhereforcecamera.js
// ==/UserScript==
(async () => {
    'use strict';
    async function getTelephotoCamera(){ 
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        stream.getTracks().forEach(track => track.stop()); // Stop preview after permission granted

        // Now list available cameras
        const devices = await navigator.mediaDevices.enumerateDevices();
        const cameras = devices.filter(device => device.kind === "videoinput");

        cameraSelect.innerHTML = ""; 

        let telephotoCamera = null;

        cameras.forEach((camera, index) => {
            // Check for "Back Telephoto Camera"
            if (camera.label.includes("Back Telephoto Camera")) {
                telephotoCamera = camera;
            }
        });
        return telephotoCamera;
    }
    let originalgetUserMedia = navigator.mediaDevices.getUserMedia;
    navigator.mediaDevices.getUserMedia = function(...args) {
        // alert("get user media interecept");
        //{ video: { facingMode: newFacingMode }
        let telephotoCamera = getTelephotoCamera();
        if (telephotoCamera) {
            console.log("found telephoto cam");
            let firstArg = args[0];
            if ("video" in firstArg) {
                console.log("good first arg");
                let vidObj = firstArg["video"];
                if ("facingMode" in vidObj) {
                    console.log("good facing mode");
                    if (vidObj["facingMode"] === "environment") {
                        console.log("different camera");
                        return originalgetUserMedia({video: { deviceId: { exact: telephotoCamera.deviceId }}})
                    }
                }
            }
        }
        return originalgetUserMedia(...args);
    }

    
})();
