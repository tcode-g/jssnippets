// ==UserScript==
// @name         UCFHere_Force_Cam
// @namespace    https://staybrowser.com/
// @version      0.0.10
// @description  Template userscript created by Stay
// @author       You
// @match        tcode.github.io/*
// @match        https://here.cdl.ucf.edu/*
// @grant        none
// @downloadURL  http://192.168.1.155/file/UCFHere_Force_Cam_Local.user.js
// @updateURL    http://192.168.1.155/file/UCFHere_Force_Cam_Local.user.js
// ==/UserScript==
(async () => {
    'use strict';

    const originalgetUserMedia = navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices);
    let invisibleDiv = null;
    let telephotoCamera = null;
    function log(message) {
        console.log(message);
        if (invisibleDiv === null) {
            invisibleDiv = document.createElement("div");
            invisibleDiv.style = "display: none;";
            invisibleDiv.id = "invisdiv";
            document.body.appendChild(invisibleDiv);
        }
        let p = document.createTextNode(message);
        invisibleDiv.appendChild(p);
    }
    log("2");
    async function getTelephotoCamera() {
        log("2.1");
        // Now list available cameras
        const devices = await navigator.mediaDevices.enumerateDevices();
        const cameras = devices.filter(device => device.kind === "videoinput" && device.label === "Back Telephoto Camera");
        log("2.2");
        if (cameras.length > 0) {
            log("found telephoto cam");
            log(cameras[0].label);
            return cameras[0];
        }
        log("2.3");
        return null;
    }
    log("3");
    navigator.mediaDevices.getUserMedia = async function (...args) {
        log("3.1");
        // alert("get user media interecept");
        //{ video: { facingMode: newFacingMode }
        let firstArg = args[0];
        if ("video" in firstArg) {
            let vidObj = firstArg["video"];
            if (vidObj === true) {
                return originalgetUserMedia(...args);
            }
        }

        if (telephotoCamera === null) {
            telephotoCamera = await getTelephotoCamera();
            log("3.2");
            // logToDiv(JSON.stringify(telephotoCamera));
            log("----------------------------");
            log(typeof telephotoCamera);
            log(telephotoCamera instanceof MediaDeviceInfo);
            log(telephotoCamera.toString());
            log("----------------------------");
        }

        log("3.3");


        if (telephotoCamera != null) {
            log("found telephoto cam");
            let firstArg = args[0];
            if ("video" in firstArg) {
                log("good first arg");
                log(JSON.stringify(firstArg));
                let vidObj = firstArg["video"];
                if ("facingMode" in vidObj) {
                    log("good facing mode");
                    if (vidObj["facingMode"] === "environment") {
                        log("different camera");
                        log("device id: " + telephotoCamera.deviceId);
                        const constraints = {
                            video: { deviceId: { exact: telephotoCamera.deviceId } }
                        };
                        log("attempting to get telephoto stream");
                        try {
                            let telephotoStream = await originalgetUserMedia(constraints);
                            log("after original gmu");
                            log(telephotoStream.getVideoTracks()[0].getSettings());
                            log(telephotoStream.getVideoTracks()[0].getCapabilities().zoom);
                            return Promise.resolve(telephotoStream);
                        } catch (error) {
                            log("error getting telephoto stream: " + error.message);
                            return originalgetUserMedia(...args);
                        }
                    }
                }
            }
        }
        log("intercepted getUserMedia");
        return originalgetUserMedia(...args);
    }
    log("4");

})();
