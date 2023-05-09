import shaka from 'shaka-player/dist/shaka-player.ui.debug';

import { HttpRequestInterceptorEvent } from '../requestManager/httpRequestInterceptor';
import { Counter } from '../utils/Counter';
import { BehaviourSubject, Subscriber } from '../../Utils/observable';


interface Request {
    startTimeMs: number;
    totalBytes: Counter;
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
     * eg. ignore if a request body response size is too small
     */
    minTotalBytes: number

    /**
     * minDurationMs:
     * anything below this threshold will be disregarded
     * eg. default to minimum Duration if the response time was too eager/fast
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
    bandwidthEstimateBps: number

    /**
     * intervalMs:
     * regulates how often bandwidth estimations are issued
     */
    intervalMs: number
}

const defaultBandwidthManagerConfig: BandwidthManagerConfig = {
    minTotalBytes: 35000,
    minDurationMs: 50,
    samplesSize: 3,
    bandwidthEstimateBps: 500 * 1000, // 500kbs,
    intervalMs: 500
}

interface BandwidthManagerState {
    bandwidthEstimateBps: number
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
    private downloadedBytesTotal = new Counter()
    private currentActiveRequests = new Counter()
    private useNetworkEstimate: boolean = false
    private config: BandwidthManagerConfig
    private previousBandwidthUpdateTimeMs = Date.now()
    private intervalId: number
    private state$ = new BehaviourSubject<BandwidthManagerState>({
        bandwidthEstimateBps: 0,
    })

    constructor(config: BandwidthManagerConfig = defaultBandwidthManagerConfig) {
        this.config = config
        this.state$.next({bandwidthEstimateBps: config.bandwidthEstimateBps})
        this.intervalId = this.createInterval(config.intervalMs)
    }

    private createInterval(intervalMs: number): number {
        return window.setInterval(() => {
            this.updateBandwidthEstimate()
        }, intervalMs)
    }

    private clearInterval() {
        window.clearInterval(this.intervalId)
    }

    /**
     * TODO needs reviewing
     */
    private createBandwidthEstimate (bytes: number, startTimeMs: number, finishTimeMs: number) {
        const durationMs = Math.max(this.config.minDurationMs, finishTimeMs - startTimeMs)
        const bandwidthEstimate = (bytes * 8000) / durationMs;
        return bandwidthEstimate
    }

    private pushBandwidthEstimateSample(bandwidthEstimate: number) {
        if(!bandwidthEstimate){
            return
        }

        this.samples.push(bandwidthEstimate)

        if(this.samples.length > this.config.samplesSize) {
            this.samples = this.samples.slice(-this.config.samplesSize)
        }
    }

    /**
     * onRequestOpen
     * Registers an incoming request
     */
    public onRequestOpen(requestId: number, requestType: shaka.net.NetworkingEngine.RequestType): Request | null {
        if(shaka.net.NetworkingEngine.RequestType.SEGMENT !== requestType) {
            return null
        }
        
        const request: Request = {
            startTimeMs: Date.now(),
            totalBytes: new Counter(),
            hasFirstByte: false
        }

        this.requests[requestId] = request
        return request
    }

    /**
     * onRequestFirstByte
     * TTFB (Time to firstByte) flag
     */
    public onRequestFirstByte(requestId: number): Request | null {
        if(!(requestId in this.requests)) {
            return null
        }

        const request = this.requests[requestId]
        request.hasFirstByte = true

        this.currentActiveRequests.add(1)
        return request
    }

    public onRequestProgress(requestId: number, requestSizeBytes: number) : Request | null{
        if(!(requestId in this.requests)) {
            return null
        }

        const request = this.requests[requestId]
        const bytesDelta = requestSizeBytes - request.totalBytes.get()

        request.totalBytes.set(requestSizeBytes)
        this.downloadedBytesTotal.add(bytesDelta)

        return request
    }

    public onRequestClose(requestId: number, eventType: HttpRequestInterceptorEvent["type"]): Request | null {
        if(!(requestId in this.requests)) {
            return null
        }

        const request = this.requests[requestId]

        if(
            eventType === "REQUEST_LOAD" &&
            request.totalBytes.get() >= this.config.minTotalBytes
            ) {

                const finishTimeMs = Date.now()
                const bandwidthEstimate = this.createBandwidthEstimate(request.totalBytes.get(), request.startTimeMs, finishTimeMs)
                this.pushBandwidthEstimateSample(bandwidthEstimate)
        }


        if(request.hasFirstByte) {
            // TODO theres a bug here
            this.currentActiveRequests.substract(1)
            if(this.currentActiveRequests.get() === 0) {
                this.useNetworkEstimate = false
            }
        }

        delete this.requests[requestId];
        return request
    }

    public setBandwidthEstimate(bandwidthEstimateBytes: number): void {
        this.state$.next({bandwidthEstimateBps: bandwidthEstimateBytes })
    }

    public getBandwidthEstimate(): number {
        return this.state$.getValue().bandwidthEstimateBps
    }

    public updateBandwidthEstimate(): void {
        const nowMs = Date.now()

        if(this.useNetworkEstimate) {
            const bandwidthEstimate = this.createBandwidthEstimate(this.downloadedBytesTotal.get(), this.previousBandwidthUpdateTimeMs, nowMs)
            this.pushBandwidthEstimateSample(bandwidthEstimate)
        }

        if(this.samples.length > 0) {
            const sum = this.samples.reduce((total, value) => total + value, 0)
            const average = sum / this.samples.length
            this.state$.next({bandwidthEstimateBps: Math.floor(average)})
        }

        this.downloadedBytesTotal.reset()
        this.previousBandwidthUpdateTimeMs = nowMs
        this.useNetworkEstimate = this.currentActiveRequests.get() > 0
    }

    public subscribe(subscriber: Subscriber<BandwidthManagerState>) {
        return this.state$.subscribe(subscriber)
    }

    public tearDown() {
        this.clearInterval()
    }
}

export {BandwidthManager}