import shaka from 'shaka-player/dist/shaka-player.ui.debug';

// public defaultBandwidthEstimate = 500 * 1000;
//     public rollingAverageHistorySize = 3;
//     public thresholdSegmentSize = 35000;
//     public thresholdSegmentDownloadDurationMs = 50;

interface Request {
    startTime: number;
    totalBytes: number;
    hasFirstByte: boolean;
}

export enum ResponseEvent {
    LOAD,
    ABORT,
    ERROR,
    TIMEOUT
}

interface BandwidthManagerConfig {
    /**
     * minTotalBytes:
     * anything below this threshold will be disregarded
     * eg. ignore if a request body response is too small
     */
    minTotalBytes: number

    /**
     * minDurationMs:
     * anything below this threshold will be disregarded
     * eg. default to minimum Duration if the response was too eager
     */
    minDurationMs: number

    /**
     * samplesSize:
     * otherwise called rolling or moving average,
     * useful when calculating trends over a short period of time
     */
    samplesSize: number

    /**
     * bandwidthEstimateBytes:
     * Initial estimation
     */
    bandwidthEstimateBytes: number
}

class Bytes {
    private bytes = 0

    getBytes() {
        return this.bytes
    }

    addBytes(bytes: number) {
        this.bytes += bytes
    }

    restet() {
        this.bytes = 0
    }
}

/**
 * BandwidthManger:
 * - Maps the request cycle OPEN, TTFB, PROGRESS, CLOSE
 * - stores current estimate when a request closes
 * - keeps track of downloaded bytes to create a mean/average estimation
 * - individually tracks requests to create a per request estimation
 */
class BandwidthManager {
    private requests: Record<number, Request> = {}
    private samples: Array<number> = []
    private downloadedBytesTotal = new Bytes()
    private currentActiveRequests: number = 0
    private useNetworkEstimate: boolean = false
    private config: BandwidthManagerConfig
    private bandwidthEstimateBytes: number
    private previousBandwidthUpdateTime = Date.now()

    constructor(config: BandwidthManagerConfig = {
        minTotalBytes: 35000,
        minDurationMs: 50,
        samplesSize: 3,
        bandwidthEstimateBytes: 500 * 1000 // 500kbs
    }) {
        this.config = config
        this.bandwidthEstimateBytes = config.bandwidthEstimateBytes
    }

    /**
     * onRequestOpen
     * Registers an incoming request
     */
    public setRequestOpen(requestId: number, requestType: shaka.net.NetworkingEngine.RequestType): Request | null {
        if(shaka.net.NetworkingEngine.RequestType.SEGMENT !== requestType) {
            return null
        }
        
        const request: Request = {
            startTime: Date.now(),
            totalBytes: 0,
            hasFirstByte: false
        }

        this.requests[requestId] = request
        return request
    }

    /**
     * setRequestFirstByte
     * TTFB (Time to firstByte) flag
     */
    public setRequestFirstByte(requestId: number): Request | null {
        if(!(requestId in this.requests)) {
            return null
        }

        const request = this.requests[requestId]
        request.hasFirstByte = true

        this.currentActiveRequests += 1
        return request
    }

    public setRequestProgress(requestId: number, requestSizeBytes: number) : Request | null{
        if(!(requestId in this.requests)) {
            return null
        }

        const request = this.requests[requestId]
        const bytesDelta = requestSizeBytes - request.totalBytes

        request.totalBytes = requestSizeBytes
        this.downloadedBytesTotal.addBytes(bytesDelta)

        return request
    }

    public setRequestClose(requestId: number, responseEvent: ResponseEvent): Request | null {
        if(!(requestId in this.requests)) {
            return null
        }

        const request = this.requests[requestId]

        if(
            responseEvent === ResponseEvent.LOAD &&
            request.totalBytes >= this.config.minTotalBytes
            ) {
                const finsihTime = Date.now()
                const duration = Math.max(this.config.minDurationMs, finsihTime - request.startTime)
                const bandwidthEstimate = (request.totalBytes * 8000) / duration
                this.setBandwidthEstimate(bandwidthEstimate)
        }

        if(request.hasFirstByte) {
            this.currentActiveRequests -=1

            if(this.currentActiveRequests === 0) {
                this.useNetworkEstimate = false
            }
        }

        delete this.requests[requestId];
        return request
    }

    private setBandwidthEstimate(bandwidthEstimate: number) {
        this.samples.push(bandwidthEstimate)

        if(this.samples.length > this.config.samplesSize) {
            this.samples = this.samples.slice(-this.config.samplesSize)
        }
    }

    public getBandwidthEstimate(): number {
        return this.bandwidthEstimateBytes
    }

    public updateBandwidthEstimate(): void {
        const now = Date.now()

        if(this.useNetworkEstimate) {
            const duration = now - this.previousBandwidthUpdateTime
            const bandwidthEstimate = (8 * 1000 * this.downloadedBytesTotal.getBytes()) / duration
            this.setBandwidthEstimate(bandwidthEstimate)
        }

        if(this.samples.length > 0) {
            const sum = this.samples.reduce((total, value) => total + value, 0)
            const average = sum / this.samples.length
            this.bandwidthEstimateBytes = average
        }

        this.downloadedBytesTotal.restet()
        this.previousBandwidthUpdateTime = now
        this.useNetworkEstimate = this.currentActiveRequests > 0
    }
}

export {BandwidthManager}