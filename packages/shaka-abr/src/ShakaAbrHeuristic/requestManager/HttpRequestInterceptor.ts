import shaka from 'shaka-player/dist/shaka-player.ui.debug';

import { BehaviourSubject, Subscriber } from "../../Utils/observable"

export interface HttpRequestInterceptorEvent {
    type: 'INIT' | 'REQUEST_OPEN' | "REQUEST_TIMEOUT" | "REQUEST_ERROR" | "REQUEST_ABORT" | "REQUEST_PROGRESS" | "REQUEST_LOAD";
    progressEvent?: ProgressEvent
    reference: HttpRequestInterceptor
}

const createHeaders = (event: ProgressEvent<XMLHttpRequest>) => {
    return event.target?.getAllResponseHeaders()?.trim()
    .split('\r\n')
    .reduce<Record<string, string>>(
        (all, part) => {
            const header = part.split(': ');
            const key = header[0].toLowerCase();
            all[key] = header.slice(1).join(': ');

            return all;
        },
        {}
    );
}

const createResponse = (event: ProgressEvent<XMLHttpRequest>, requestUri: string, requestType: shaka.net.NetworkingEngine.RequestType): shaka.extern.Response => {
    const status = Number(event.target?.status)
    const uri = event.target?.responseURL || requestUri
    const headers = createHeaders(event) || {}

    if (status >= 200 && status < 300 && status !== 202) {
        return {
            uri,
            status,
            headers,
            data: event.target?.response,
        }
    }

    const severity = status === 401 || status === 403 ? shaka.util.Error.Severity.CRITICAL: shaka.util.Error.Severity.RECOVERABLE
    const category = shaka.util.Error.Category.NETWORK
    const code = shaka.util.Error.Code.BAD_HTTP_STATUS

    throw new shaka.util.Error(
        severity,
        category,
        code,
        uri,
        status,
        headers,
        requestType,
    )
}

/**
 * HttpRequestInterceptor
 * receives shaka's request and implements an xhr around it
 * This is so we can abort and timeout operations
 * and so we have visibility of the request's lifecycle
 */
class HttpRequestInterceptor {
    private xhr: XMLHttpRequest
    private hasTimedOut = false
    private state$ = new BehaviourSubject<HttpRequestInterceptorEvent>({type: "INIT", reference: this})
    public id: number
    public uri: string
    public request: shaka.extern.Request
    public requestType: shaka.net.NetworkingEngine.RequestType

    constructor(id: number, uri: string, request: shaka.extern.Request, requestType: shaka.net.NetworkingEngine.RequestType) {
        this.xhr = new XMLHttpRequest()
        this.id = id
        this.uri = uri
        this.request = request
        this.requestType = requestType
    }

    private emitEvent = (eventType:  HttpRequestInterceptorEvent["type"], event?: ProgressEvent) => {
        this.state$.next({
            type: eventType,
            progressEvent: event,
            reference: this
        })
    }

    private onLoad(
        event: ProgressEvent<EventTarget>,
        resolve: (value: shaka.extern.Response) => void,
        reject: (reason?: unknown) => void
        ) {
        try {
            const response = createResponse(event as ProgressEvent<XMLHttpRequest>, this.uri, this.requestType)
            this.emitEvent("REQUEST_LOAD")
            resolve(response)
        } catch (error) {
            this.emitEvent("REQUEST_ERROR")
            reject(error)
        }
    }

    private onProgress = (event: ProgressEvent) => {
        this.emitEvent("REQUEST_PROGRESS", event)
    }

    private onTimeout(reject: (error?: shaka.util.Error) => void) : void {
        this.emitEvent("REQUEST_TIMEOUT")
        reject(
            new shaka.util.Error(
                shaka.util.Error.Severity.RECOVERABLE,
                shaka.util.Error.Category.NETWORK,
                shaka.util.Error.Code.TIMEOUT,
                this.uri,
                this.requestType
            )
        );
    }

    private onError = (event: ProgressEvent, reject: (error?: shaka.util.Error) => void) : void => {
        this.emitEvent("REQUEST_ERROR")
        reject(
            new shaka.util.Error(
                shaka.util.Error.Severity.RECOVERABLE,
                shaka.util.Error.Category.NETWORK,
                shaka.util.Error.Code.HTTP_ERROR,
                this.uri,
                event,
                this.requestType
            )
        );
    }

    private onAbort = (reject: (error?: shaka.util.Error) => void): void => {
        if(this.hasTimedOut) {
            return this.onTimeout(reject)
        }

        this.emitEvent("REQUEST_ABORT")
        reject(
            new shaka.util.Error(
                shaka.util.Error.Severity.RECOVERABLE,
                shaka.util.Error.Category.NETWORK,
                shaka.util.Error.Code.OPERATION_ABORTED,
                this.uri,
                this.requestType
            )
        );
    }

    public subscribe(subscriber: Subscriber<HttpRequestInterceptorEvent>) {
        return this.state$.subscribe(subscriber)
    }

    public abort ():void {
        this.xhr.abort()
    }

    public timeout(): void {
        this.hasTimedOut = true
        this.abort()
    }

    public getHasTimedOut(): boolean {
        return this.hasTimedOut
    }

    public open(): Promise<shaka.extern.Response> {
        return new Promise((resolve, reject) => {
            this.emitEvent("REQUEST_OPEN")

            this.xhr.open(this.request.method, this.uri, true)
            this.xhr.responseType = 'arraybuffer';
            this.xhr.timeout = this.request.retryParameters.timeout;
            this.xhr.withCredentials = this.request.allowCrossSiteCredentials;

            this.xhr.onabort = () => this.onAbort(reject);
            this.xhr.onprogress = this.onProgress;
            this.xhr.onload = (event: ProgressEvent<EventTarget>) => this.onLoad(event, resolve, reject);
            this.xhr.onerror = (event: ProgressEvent<EventTarget>) => this.onError(event, reject);
            this.xhr.ontimeout = () => this.onTimeout(reject);

            for (const key in this.request.headers) {
                const lowerCaseKey = key.toLowerCase();
                const value = this.request.headers[key];
                this.xhr.setRequestHeader(lowerCaseKey, value);
            }

            this.xhr.send(this.request.body);
        })
    }
}

export {HttpRequestInterceptor}