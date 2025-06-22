import React from 'react'
import { QrReader } from 'react-qr-reader'

import { auth_token_dev, ucfhere_server, debug, zoomStepCount } from '../../config'
import { SCAN_RESPONSE, SCREEN_CHECK_IN } from '../../util'
import { EVENT_TYPES, FireAnalyticsEvent } from '../../util/analytics'

import { StatusBar } from '../../components/status-bar/status-bar'
import { FooterNav } from '../../components/footer-nav/footer-nav'
import { FeedbackScreen } from './feedback/feedback'

import './check-in.scss'
import { ZoomScroller } from '../../components/zoom-scroller/zoom-scroller'

const FACING = {
    ENVIRONMENT: 'environment',
    USER: 'user'
}

const DEFAULT_MIN_ZOOM = 1
const DEFAULT_MAX_ZOOM = 8
const DEFAULT_ZOOM_STEP = 0.1

/**
 * This screen is the first one user sees after logging in
 * It scans QR codes
 */

export class CheckInScreen extends React.Component {

    constructor(props) {
        super(props)
        this.state = {
            firstScan: '',
            secondScan: '',
            isScanningPaused: false,
            facingMode: FACING.ENVIRONMENT,
            scanResponse: '',
            scanResponseCode: 400,
            scanCourseData: {},
            scanUserData: {},
            scanTimestamp: '',
            failedScanCount: 0,
            cameraCanZoom: false,
            cameraCanPan: false,
            cameraCanTilt: false,
            cameraLabel: '',
            
            // These are based on camera settings returned from the 
            // navigator.mediaDevices.getUserMedia call in the 
            // allTracks object.
            cameraMinZoom: 0,
            cameraMaxZoom: 0,
            cameraZoomStep: 0,
            
            // Meanwhile, our zoom slider is based on zoomStepCount, which is
            // the number of unique spots available on the slider.
            zoomSliderPositionUser: 0,
            zoomSliderPositionEnvironment: 0,
            zoomStepCount: zoomStepCount || 10,

            pan: 0,
            tilt: 0,
            track: null,
            scanMessage: props.DICT.CHECKIN.helperText1,
            token: props.token,
            DICT: props.DICT,
            scanMessages: [
                props.DICT.CHECKIN.helperText1,
                props.DICT.CHECKIN.helperText1,
                props.DICT.CHECKIN.helperText2,
                props.DICT.CHECKIN.helperText2,
                props.DICT.CHECKIN.helperText2,
            ]
        }
        this.sendQRData = this.sendQRData.bind(this)
        this.captureQRData = this.captureQRData.bind(this)
        this.resetCapture = this.resetCapture.bind(this)
        this.switchCamera = this.switchCamera.bind(this)
        this.handleError = this.handleError.bind(this)
        this.changeZoom = this.changeZoom.bind(this)
    }

    /*
    * This function is called when the QR code is scanned and the server has responded.
    * Often, the QR code pair is invalid because the phone scanned a code, missed one or more, then
    * successfully scanned another code. This can happen several times, set by length of scanMessages.
    * The ScanMessages are what is displayed to the user at the top of the screen while scanning.
    */
    handleError(status_code = 400, immediateFeedback = false) {
        const newCount = (immediateFeedback ? this.state.scanMessages.length : this.state.failedScanCount + 1)
        if (newCount >= this.state.scanMessages.length) {
            FireAnalyticsEvent(EVENT_TYPES.ERROR_CHECK_IN_REJECTED, 'code_' + status_code.toString())
            this.setState({
                scanResponse: SCAN_RESPONSE.ERROR,
                scanResponseCode: status_code,
            })
        }
        else {
            this.setState({
                failedScanCount: newCount,
                scanMessage: this.state.scanMessages[newCount],
                firstScan: '',
                secondScan: '',
                isScanningPaused: false,
            })
        }
    }

    // The slider position is analog, say from 0 to 9 if there are ten spots on the slider.
    // Instead of zooming linearly, we want to zoom exponentially, so we need to convert the
    // slider position to a zoom scale.
    convertSliderPositionToScale(newZoomSliderPosition) {

        // On an exponential scale, the newZoom is a fractional power of the cameraMaxZoom.
        // For instance, if the slider is at 0, the zoom is 1, if the slider is at 9, the zoom is cameraMaxZoom.
        const newZoom = Math.pow(this.state.cameraMaxZoom, newZoomSliderPosition / (this.state.zoomStepCount - 1))
        
        // We need to round to the nearest valid step, so we can't just return newZoom.
        // Instead, we need to find the nearest step to newZoom.
        const newZoomStepCount = Math.round(newZoom / this.state.cameraZoomStep)
        return parseFloat(newZoomStepCount * this.state.cameraZoomStep).toFixed(1)
    }

    changeZoom(newZoomSliderPosition) {
        const newZoom = this.convertSliderPositionToScale(newZoomSliderPosition)
        if(this.state.facingMode === FACING.ENVIRONMENT) {
            this.setState({
                zoomSliderPositionEnvironment: newZoomSliderPosition,
            })
        } else {
            this.setState({
                zoomSliderPositionUser: newZoomSliderPosition,
            })
        }
        if(!debug) {
            this.state.track.applyConstraints({advanced: [ {zoom: newZoom} ]});
        }
    }

    switchCamera() {
        if (this.state.facingMode === FACING.ENVIRONMENT) {
            this.setState({ facingMode: FACING.USER })
            this.checkCameraZoom(FACING.USER)
        }
        else {
            this.setState({ facingMode: FACING.ENVIRONMENT })
            this.checkCameraZoom(FACING.ENVIRONMENT)
        }
    }

    async sendQRData(secondScan) {
        const timestamp = new Date().toJSON()
        this.setState({
            isScanningPaused: true,
            secondScan: secondScan,
            scanTimestamp: timestamp,
            scanCourseData: {},
            scanUserData: {}
        })
        let responseJson

        try {
            const response = await fetch(`${ucfhere_server}/api/v1/validate`, {
                method: 'POST',
                headers: {
                    Accept: 'application/json',
                    'Content-Type': 'application/json',
                    Authorization: 'Bearer ' + (this.state.token ? this.state.token : auth_token_dev)
                },
                body: JSON.stringify({
                    first: this.state.firstScan,
                    last: secondScan,
                    timestamp: timestamp,
                    gps: 'null'
                })
            })
            
            // Regardless of success, process the data returned from the server
            responseJson = await response.json()
            console.log("Response from server")
            console.log(responseJson)
            this.setState({
              scanCourseData: responseJson.course_data || {},
              scanUserData: responseJson.user_data || {},
              scanTimestamp: responseJson.course_data?.server_time || this.state.scanTimestamp
            })

            if (response.ok) {
                // status_code 200 = Check in is a success!
                if (responseJson.status_code === 200) {
                    FireAnalyticsEvent(EVENT_TYPES.CHECK_IN)
                    this.setState({
                        scanResponseCode: 200,
                        scanResponse: SCAN_RESPONSE.SUCCESS
                    })
                }
                // When a 100 code is received, handle the case immediately (don't need to fail 4 times)
                else if (responseJson.status_code === 100) {
                    this.setState({
                        scanResponseCode: 100,
                        scanResponse: SCAN_RESPONSE.SUCCESS
                    })
                }
                // Other errors: potentially keep trying.
                else {
                    this.handleError(responseJson.status_code, false)
                }
            }
            else if (response.status === 400
                || response.status === 404) {
                this.handleError(400, false)
            } else {
                this.handleError(400, false)
            }
        } catch (error) {
            console.error(error)
            this.handleError(400, true)
        }
    }

    resetCapture() {
        this.setState({
            firstScan: '',
            secondScan: '',
            isScanningPaused: false,
            failedScanCount: 0,
            scanMessage: this.state.scanMessages[0],
            scanResponse: '',
            scanResponseCode: 400,
        })
    }

    captureQRData(qrData) {
        if (this.state.isScanningPaused || !qrData || this.state.firstScan === qrData) {
            return
        }

        if (this.state.firstScan === '') {
            this.setState({ firstScan: qrData })
            return
        }

        this.sendQRData(qrData)
    }

    // At this point, the implementations of mediaStream are not consistent between
    // Firefox, Chrome, and Safari. We want to guarantee that the track we select is
    // the right camera (meaning facingMode is 'environment' or 'user', as requested).
    // In Firefox, this data is in track.getSettings().facingMode, but in Chrome,
    // it's in track.facingMode.
    isMatchingCamera(track, facingMode) {
        if (!track || !facingMode) {
            return false
        }

        // If the track has a facingMode, we can use that to determine if the camera is facing the right way.
        if(track.facingMode && track.facingMode === facingMode) {
            return true
        }

        // If the track has a getSettings() method, it MIGHT have a facingMode property.
        if(typeof(track.getSettings) === 'function') {
            let tempSettings = track.getSettings()
            if(tempSettings && tempSettings.facingMode && tempSettings.facingMode === facingMode) {
                return true
            }
        }

        // If the track has a getCapabilities() method, it MIGHT have a facingMode property,
        // and that property may be a string or an array.
        if(typeof(track.getCapabilities) === 'function') {
            let tempCapabilities = track.getCapabilities()
            if(tempCapabilities && tempCapabilities.facingMode) {
                if(typeof(tempCapabilities.facingMode) === 'string' && tempCapabilities.facingMode === facingMode) {
                    return true
                }
                if(Array.isArray(tempCapabilities.facingMode) && tempCapabilities.facingMode.includes(facingMode)) {
                    return true
                }
            }
        }

        // If there is no other way to determine if the camera is facing the designated way,
        // we can also check on the the label of the camera as a last resort.
        if (facingMode === FACING.ENVIRONMENT && track.label.toLowerCase().includes('back')) {
            return true
        }
        if (facingMode === FACING.USER && track.label.toLowerCase().includes('front')) {
            return true
        }

        return false
    }

    checkCameraZoom(newFacingMode) {

        // Code adapted from https://googlechrome.github.io/samples/image-capture/update-camera-zoom.html

        if(!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            this.setState({
                track: null,
                cameraCanZoom: false,
            })
            return Promise.reject('Camera facing ' + newFacingMode + ' not found')
        }

        navigator.mediaDevices.getUserMedia({ video: { facingMode: newFacingMode }})
            .then(mediaStream => {
                const allTracks = mediaStream.getVideoTracks()

                // By default, the selectedTrack is the first available video track. On devices that
                // have cameras but not the requested facingMode, this will prevent weird errors.
                let selectedTrack = allTracks.length > 0 ? allTracks[0] : null

                allTracks.forEach(track => {
                    if(this.isMatchingCamera(track, newFacingMode)) {
                        selectedTrack = track
                    }
                })

                if(!selectedTrack) {
                    this.setState({
                        track: null,
                        cameraCanZoom: false,
                    })
                    return Promise.reject('Camera facing ' + newFacingMode + ' not found')
                }

                const settings = selectedTrack.getSettings()

                // Check whether zoom is supported or not.
                if (!('zoom' in settings)) {
                    // If we can't check the zoom level, we'll just assume zoom is supported.
                    if(debug || typeof(selectedTrack.getCapabilities) !== 'function') {
                        this.setState({
                            track: selectedTrack,
                            cameraCanZoom: true,
                            cameraMinZoom: DEFAULT_MIN_ZOOM,
                            cameraMaxZoom: DEFAULT_MAX_ZOOM,
                            cameraZoomStep: DEFAULT_ZOOM_STEP,
                            cameraLabel: selectedTrack.label,
                            zoom: 1
                        })
                        return Promise.resolve()
                    }
                    this.setState({
                        track: selectedTrack,
                        cameraCanZoom: false,
                        cameraLabel: selectedTrack.label,
                        zoom: 1
                    })
                    return Promise.reject('Zoom is not supported by ' + selectedTrack.label)
                }

                if(typeof(selectedTrack.getCapabilities) === 'function') {
                    const capabilities = selectedTrack.getCapabilities()

                    this.setState({
                        track: selectedTrack,
                        cameraCanZoom: true,
                        cameraMinZoom: capabilities.zoom.min || DEFAULT_MIN_ZOOM,  // If min zoom is undefined, default to 1
                        cameraMaxZoom: capabilities.zoom.max || DEFAULT_MAX_ZOOM,  // If max zoom is undefined, default to 8
                        cameraZoomStep: capabilities.zoom.step || DEFAULT_ZOOM_STEP,  // If step is undefined, default to 0.1
                        cameraLabel: selectedTrack.label,
                        zoom: settings.zoom
                    })
                    return Promise.resolve()
                }
            })
            .catch(error => console.log(error.name || error));
    }

    async componentDidMount() {
        const el = document.getElementById('assistive-notification')
        if (el) el.innerHTML = this.state.DICT.CHECKIN.welcome

        this.checkCameraZoom(this.state.facingMode)
    }

    render() {
        return (
            <div className='FullScreen'>
                <div id='assistive-notification' className='Reader-Instructions' aria-live='polite'></div>
                <div className='FullContent'>
                    {this.state.scanResponse === '' && this.state.scanMessage !== ''
                        ? (<div className='Camera-Message-Container'>
                            <div className='Camera-Message'>{this.state.scanMessage}</div>
                        </div>)
                        : ''
                    }
                    <div className={`CheckIn-container ${this.state.scanResponse === '' && this.state.scanMessage !== '' ? 'lifted' : ''}`}>
                        {/* Having two separate QrReader components forces a refresh when the camera mode is changed */}
                        {this.state.facingMode === FACING.ENVIRONMENT && <QrReader className={this.state.scanResponse !== '' ? 'hidden' : ''}
                            onResult={(result) => {
                                if (!!result) {
                                    this.captureQRData(result?.text)
                                }
                            }}
                            constraints={{
                                facingMode: FACING.ENVIRONMENT
                            }}
                            style={{ width: '100%' }}
                        />}
                        {this.state.facingMode === FACING.USER && <QrReader className={this.state.scanResponse !== '' ? 'hidden' : ''}
                            onResult={(result) => {
                                if (!!result) {
                                    this.captureQRData(result?.text)
                                }
                            }}
                            constraints={{
                                facingMode: FACING.USER
                            }}
                            style={{ width: '100%' }}
                        />}
                        {this.state.scanResponse !== '' ?
                            (<FeedbackScreen
                                DICT={this.state.DICT}
                                scanResponseCode={this.state.scanResponseCode}
                                scanCourseData={this.state.scanCourseData}
                                scanUserData={this.state.scanUserData}
                                scanTimestamp={this.state.scanTimestamp}
                                resetCapture={this.resetCapture}
                            />) : ''
                        }
                    </div>
                    {this.state.scanResponse === ''
                        ? (<div className={`Camera-Focus ${this.state.scanResponse !== '' ? 'hidden' : ''}`}>
                            <div className='Focus-Corner Camera-Focus-TL' />
                            <div className='Focus-Corner Camera-Focus-TR' />
                            <div className='Focus-Corner Camera-Focus-BL' />
                            <div className='Focus-Corner Camera-Focus-BR' />
                        </div>)
                        : ''
                    }
                    <StatusBar
                        DICT={this.state.DICT}
                        firstScan={this.state.firstScan}
                        secondScan={this.state.secondScan}
                        scanResponse={this.state.scanResponse}
                        transparent={this.state.scanResponse !== ''}
                        switchCamera={this.switchCamera}
                    />
                    {this.state.cameraCanZoom && this.state.scanResponse === '' ?
                        <ZoomScroller
                            DICT={this.state.DICT}
                            zoom={this.state.facingMode === FACING.ENVIRONMENT ? this.state.zoomSliderPositionEnvironment : this.state.zoomSliderPositionUser}
                            zoomMin='0' // {this.state.cameraMinZoom}
                            zoomMax={this.state.zoomStepCount - 1} // {this.state.cameraMaxZoom}
                            changeZoom={this.changeZoom}
                        />
                        : ''
                    }
                </div>
                <div className='FooterNav'>
                    <FooterNav activeScreen={SCREEN_CHECK_IN} DICT={this.state.DICT}></FooterNav>
                </div>
            </div>
        )
    }
}
