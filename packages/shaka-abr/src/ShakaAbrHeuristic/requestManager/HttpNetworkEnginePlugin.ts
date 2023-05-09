import shaka from 'shaka-player/dist/shaka-player.ui.debug';

import { AbortableOperation } from './AbortableOperation';
import { HttpRequestInterceptor, HttpRequestInterceptorEvent } from './httpRequestInterceptor';
import { RequestManager } from './RequestManager';
import { Subscriber } from '../../Utils/observable';
import { Counter } from '../utils/Counter';

/**
 * HttpNetworkEnginePlugin:
 * See https://shaka-player-demo.appspot.com/docs/api/shaka.extern.html#.SchemePlugin
 * Shaka's network engine is responsible for all http/s requests,
 * this plugin creates an abortable interceptor that emits events through it's lifecycle
 */
class HttpNetworkEnginePlugin {
    private requestsCounter = new Counter()
    private plugin: shaka.extern.SchemePlugin

    constructor(requestManager: RequestManager) {
        this.plugin = this.create(requestManager.subscriber)
        this.register()
    }

    private create(subscriber: Subscriber<HttpRequestInterceptorEvent>) {
        const networkEnginePlugin: shaka.extern.SchemePlugin = (uri, request, requestType) => {
            const requestInterceptor = new HttpRequestInterceptor(
                this.requestsCounter.increment(),
                uri,
                request,
                requestType
            )

            requestInterceptor.subscribe(subscriber)

            const promise = requestInterceptor.open()

            const onAbort = () => {
                requestInterceptor.abort()
                return Promise.resolve()
            }

            return new AbortableOperation(promise, onAbort)
        }

        return networkEnginePlugin
    }

    private register() {
        shaka.net.NetworkingEngine.registerScheme("http", this.plugin)
        shaka.net.NetworkingEngine.registerScheme("https", this.plugin)
    }
}

export {HttpNetworkEnginePlugin}