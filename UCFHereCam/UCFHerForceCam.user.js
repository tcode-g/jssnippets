// ==UserScript==
// @name         UCFHere_Force_Cam
// @namespace    https://github.com/tcode-g
// @version      1.0.1
// @description  Intercepts getUserMedia used by UCF Here to force use the camera with the most zoom.
// @author       tcode-g
// @match        https://here.cdl.ucf.edu/*
// @grant        none
// @downloadURL  https://raw.githubusercontent.com/tcode-g/jssnippets/refs/heads/main/UCFHereCam/UCFHerForceCam.user.js
// @updateURL    https://raw.githubusercontent.com/tcode-g/jssnippets/refs/heads/main/UCFHereCam/UCFHerForceCam.user.js
// ==/UserScript==

(async () => {
    'use strict';

    const DEBUG = true;

    const originalgetUserMedia = navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices);
    let telephotoCamera = null;

    const sleep = (delay) => {
        return new Promise((resolve) => setTimeout(resolve, delay));
    };

    function print(...args) {
        if (DEBUG) {
            console.log("[DEBUG]:", ...args);
        }
    }
    
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
        while (tries < 120) { // a full minute
            let camera = getTelephotoCamera();
            if (camera != null) {
                return camera;
            }
            await sleep(500);
            tries += 1;
        }
        return null;
    }

    navigator.mediaDevices.getUserMedia = async function (...args) {
        let firstArg = args[0];
        if ("video" in firstArg) {
            let vidObj = firstArg["video"];
            if (vidObj === true) {
                return originalgetUserMedia(...args);
            }
        }

        print("Passed check 1");

        if (telephotoCamera === null) {
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
        print("DIdn't intercept camera");
        return originalgetUserMedia(...args);
    }
})();