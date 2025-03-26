// ==UserScript==
// @name         UCFHere_Force_Cam
// @namespace    https://github.com/tcode-g
// @version      0.0.10
// @description  Intercepts getUserMedia used by UCF Here to force use the camera with the most zoom.
// @author       tcode-g
// @match        https://here.cdl.ucf.edu/*
// @grant        none
// @downloadURL  https://raw.githubusercontent.com/tcode-g/jssnippets/refs/heads/main/UCFHereCam/UCF_Here_Force_Cam_Final.user.js
// @updateURL    https://raw.githubusercontent.com/tcode-g/jssnippets/refs/heads/main/UCFHereCam/UCF_Here_Force_Cam_Final.user.js
// ==/UserScript==

(async () => {
    'use strict';

    const originalgetUserMedia = navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices);
    let telephotoCamera = null;

    async function getTelephotoCamera() {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const cameras = devices.filter(device => device.kind === "videoinput" && device.label === "Back Telephoto Camera");
        if (cameras.length > 0) {
            return cameras[0];
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

        if (telephotoCamera === null) {
            telephotoCamera = await getTelephotoCamera();
        }

        if (telephotoCamera != null) {
            if ("video" in firstArg) {
                let vidObj = firstArg["video"];
                if ("facingMode" in vidObj) {
                    if (vidObj["facingMode"] === "environment") {
                        const constraints = {
                            video: { deviceId: { exact: telephotoCamera.deviceId } }
                        };
                        try {
                            return originalgetUserMedia(constraints);
                        } catch (error) {
                            return originalgetUserMedia(...args);
                        }
                    }
                }
            }
        }
        return originalgetUserMedia(...args);
    }
})();