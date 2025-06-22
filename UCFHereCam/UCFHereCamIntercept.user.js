// ==UserScript==
// @name         Intercept Cam UCFHere
// @namespace    https://github.com/tcode-g
// @version      1.0.0
// @description  Intercepts getUserMedia used by UCF Here to force use the camera with the most zoom.
// @author       tcode-g
// @match        https://here.cdl.ucf.edu/*
// @grant        none
// @run-at       document-start
// @downloadURL  https://raw.githubusercontent.com/tcode-g/jssnippets/refs/heads/main/UCFHereCam/UCFHereCamIntercept.user.js
// @updateURL    https://raw.githubusercontent.com/tcode-g/jssnippets/refs/heads/main/UCFHereCam/UCFHereCamIntercept.user.js
// ==/UserScript==

console.log("Start of intercept script");

(async () => {
    'use strict';
    
    const DEBUG = false;
    const retryForInSeconds = 5;
    
    const originalgetUserMedia = navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices);
    let telephotoCamera = null;
    
    print("Before interception function");
    navigator.mediaDevices.getUserMedia = async function (...args) {
        let firstArg = args[0];
        if ("video" in firstArg) {
            let vidObj = firstArg["video"];
            if (vidObj === true) {
                return originalgetUserMedia(...args);
            }
        }

        print("Passed check 1");

        if (telephotoCamera == null) {
            print("Telephoto cam is null");
            telephotoCamera = await waitTryTelephotoCamera();
        }

        print("Passed check 2");

        if (telephotoCamera != null) {
            if ("video" in firstArg) {
                let vidObj = firstArg["video"];
                if ("facingMode" in vidObj) {
                    if (vidObj["facingMode"] === "environment") {
                        const constraints = {
                            video: { deviceId: { exact: telephotoCamera.deviceId } }
                        };
                        try {
                            print("Intercepted camera");
                            return originalgetUserMedia(constraints);
                        } catch (error) {
                            print("Didn't intercept camera");
                            return originalgetUserMedia(...args);
                        }
                    }
                }
            }
        }
        print("Didn't intercept camera");
        return originalgetUserMedia(...args);
    }
    

    const sleep = (delay) => {
        return new Promise((resolve) => setTimeout(resolve, delay));
    };

    function print(...args) {
        if (DEBUG) {
            console.log("[DEBUG]:", ...args);
        }
    }

    print("Before getTelephotoCamera");
    
    async function getTelephotoCamera() {
        const devices = await navigator.mediaDevices.enumerateDevices();
        print("Devices: ", devices);
        const cameras = devices.filter(device => device.kind === "videoinput" && device.label === "Back Telephoto Camera");
        if (cameras.length > 0) {
            return cameras[0];
        }
        print("No camera found.");
        return null;
    }
    
    async function waitTryTelephotoCamera() {
        let tries = 0;
        while (tries < retryForInSeconds * 2) {
            print("start trying getTelephotoCamera()");
            let camera = await getTelephotoCamera();
            if (camera != null) {
                print("shouldn't return unless has camera", camera);
                return camera;
            }
            await sleep(500);
            tries += 1;
            print("next try");
        }
        return null;
    }

    // Ask for camera permission
    await originalgetUserMedia({video: true});

})();