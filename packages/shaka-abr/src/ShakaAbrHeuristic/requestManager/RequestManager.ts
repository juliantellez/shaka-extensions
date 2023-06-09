import shaka from 'shaka-player/dist/shaka-player.ui.debug';
import { HttpRequestInterceptor, HttpRequestInterceptorEvent } from './httpRequestInterceptor';
import { BandwidthManager } from '../bandwidthManager/BandwidthManager';

interface Request {
    metadata: {
        // there is no need for these
        // loadedBytes: number,
        // totalBytes: number,
        // request.metadata.loadedBytes = Number(event.progressEvent?.loaded)
        // request.metadata.totalBytes = Number(event.progressEvent?.total)
        startTime: number,
    },
    reference: HttpRequestInterceptor
    timeoutFirstByteId: number;
    timeoutLoadId: number;
}

interface RequestManagerConfig {
    timeoutFirstByteMs: number;
    timeoutLoadMs: number;
}

const defaultRequestManagerConfig: RequestManagerConfig = {
    timeoutFirstByteMs: 1000,
    timeoutLoadMs: 6000
}

/**
 * RequestManager:
 * - subscribes to xhr events from the http-request interceptor
 * - Records and handles requests timeouts
 * - delegates bandwidth estimations per requests on "OPEN", "PROGRESS" and "CLOSE" events
 */
class RequestManager {
    private bandwidthManager: BandwidthManager
    private requests: Record<number, Request> = {}
    private config: RequestManagerConfig

    constructor (bandwidthManager: BandwidthManager, config: RequestManagerConfig = defaultRequestManagerConfig) {
        this.bandwidthManager = bandwidthManager
        this.config = config
    }

    /**
     * subscriber:
     * Subscribes to xhr events from the http-request interceptor
     */
    public subscriber = (event: HttpRequestInterceptorEvent) => {
        switch (event.type) {
            case "REQUEST_OPEN":
                this.bandwidthManager.onRequestOpen(event.reference.id, event.reference.requestType)
                this.onRequestOpen(event)
                break;
            case "REQUEST_PROGRESS":
                this.bandwidthManager.onRequestProgress(event.reference.id, Number(event.progressEvent?.loaded))
                this.onRequestProgress(event)
                break;
            case "REQUEST_LOAD":
            case "REQUEST_ABORT":
            case "REQUEST_ERROR":
            case "REQUEST_TIMEOUT":
                this.bandwidthManager.onRequestClose(event.reference.id, event.type)
                this.onRequestClose(event)
        }
    }

    private createTimeout(eventReference: HttpRequestInterceptorEvent["reference"], timeoutMs: number): number {
        return window?.setTimeout(() => {
            eventReference.abort()
        }, timeoutMs)
    }

    private clearTimeout(timeoutId: number) {
        clearTimeout(timeoutId)
    }

    private onRequestOpen(event: HttpRequestInterceptorEvent) {
        if(event.reference?.requestType !== shaka.net.NetworkingEngine.RequestType.SEGMENT) {
            return
        }
        
        const currentRequest: Request = {
            reference: event.reference,
            metadata: {
                startTime: Date.now()
            },
            timeoutFirstByteId: this.createTimeout(event.reference, this.config.timeoutFirstByteMs),
            timeoutLoadId: this.createTimeout(event.reference, this.config.timeoutLoadMs),
        }

        this.requests[event.reference.id] = currentRequest
    }

    private onRequestProgress(event: HttpRequestInterceptorEvent) {
        const request = this.requests[event.reference.id]
        if(!request) {
            return
        }

        this.clearTimeout(request.timeoutFirstByteId)
        this.bandwidthManager.onRequestFirstByte(event.reference.id)
    }

    private onRequestClose(event: HttpRequestInterceptorEvent) {
        const request = this.requests[event.reference.id]
        if(!request){
            return
        }

        this.clearTimeout(request.timeoutFirstByteId)
        this.clearTimeout(request.timeoutLoadId)

        delete this.requests[event.reference.id]
    }

    public timeoutAllRequest() {
        Object.values(this.requests).forEach(request => {
            return request.reference.timeout()
        })
    }

    public setTimeoutFirstByte(timeoutMs: number) {
        if(this.config.timeoutFirstByteMs === timeoutMs) {
            return
        }

        this.config.timeoutFirstByteMs = timeoutMs
        const now = Date.now()
        Object.values(this.requests).forEach(request => {
            if(!request.timeoutFirstByteId) {
                return
            }
            this.clearTimeout(request.timeoutFirstByteId)
            const elapsed = now - request.metadata.startTime
            const remaining = Math.max(0, timeoutMs - elapsed)
            request.timeoutFirstByteId = this.createTimeout(request.reference, remaining)
        })
    }

    public setTimeoutLoad(timeoutMs: number) {
        if(this.config.timeoutLoadMs === timeoutMs) {
            return
        }

        this.config.timeoutLoadMs = timeoutMs
        const now = Date.now()

        Object.values(this.requests).forEach(request => {
            if(!request.timeoutLoadId) {
                return
            }

            this.clearTimeout(request.timeoutLoadId)
            const elapsed = now - request.metadata.startTime
            const remaining = Math.max(0, timeoutMs - elapsed)
            request.timeoutLoadId = this.createTimeout(request.reference, remaining)
        })
    }
}

export {RequestManager}
