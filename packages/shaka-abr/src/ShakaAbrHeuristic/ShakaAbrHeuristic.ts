import shaka from 'shaka-player/dist/shaka-player.ui.debug';

import { BandwidthManager } from './bandwidthManager/BandwidthManager';
import { RequestManager } from './requestManager/RequestManager';
import { HttpNetworkEnginePlugin } from './requestManager/HttpNetworkEnginePlugin';
import { StateManager } from './stateManager/StateManager';
import { RetryManager } from './retryManager/RetryManager';
import { AbrManager } from './abrManager/AbrManager';
import { BehaviourSubject, Subscription } from '../Utils/observable';

interface ShakaAbrHeuristicConfig {

}

interface ShakaAbrHeuristicState {
    type: "INIT" | "BANDWIDTH_MANAGER" | "ABR_MANAGER"
    data: {
        bandwidthEstimateBps: number;
        variants: shaka.extern.Variant[]
        variantIndex: number
    }
}

/**
 * TODO
 * - check retry strategy
 * - check bandiwth manager ttfb vs average
 */
class ShakaAbrHeuristic {
    private player: shaka.Player
    private bandwidthManager: BandwidthManager
    private requestManager: RequestManager
    private httpNetworkEnginePlugin: HttpNetworkEnginePlugin
    private retryManager: RetryManager

    private stateManager: StateManager
    private abrManager: AbrManager
    private subscriptions: Array<Subscription> = []
    private state$ = new BehaviourSubject<ShakaAbrHeuristicState>({
        type: "INIT",
        data: {
            bandwidthEstimateBps: 0,
            variants: [],
            variantIndex: 0
        }
    })

    constructor(player: shaka.Player, config?: ShakaAbrHeuristicConfig) {
        this.player = player
        this.bandwidthManager = new BandwidthManager()
        this.requestManager = new RequestManager(this.bandwidthManager)
        this.httpNetworkEnginePlugin = new HttpNetworkEnginePlugin(this.requestManager)

        this.stateManager = new StateManager(this.player)
        this.retryManager = new RetryManager()
        this.abrManager = new AbrManager()

        this.configurePlayer()
        
        this.subscriptions.push(
            this.subscribeToAbrManager(),
            this.subscribeToBandwidthManager(),
            this.subscribeToStateManager(),
        )
    }

    private configurePlayer() {
        const playerConfiguration: Partial<shaka.extern.PlayerConfiguration> = {
            abrFactory: () => this.abrManager,
            streaming: {
                retryParameters: {
                    maxAttempts: 1,
                    timeout: 0,
                    baseDelay: 0,
                    fuzzFactor: 0,
                    backoffFactor: 0,
                    connectionTimeout: 0,
                    stallTimeout: 0,
                },
                failureCallback: (error) => {
                    this.player.retryStreaming()
                    // this.retryManager.onFailure(
                    //     this.player.retryStreaming.bind(this.player),
                    //     error
                    // )
                }
            },
        }

        this.player.configure(playerConfiguration)
    }

    private subscribeToBandwidthManager() {
        return this.bandwidthManager.subscribe(currentState => {
            this.state$.next({
                type: "BANDWIDTH_MANAGER",
                data: {
                    ...this.state$.getValue().data,
                    bandwidthEstimateBps: currentState.bandwidthEstimateBps,
                },
            })
        })
    }

    private subscribeToAbrManager() {
        return this.abrManager.subscribe(currentState => {
            this.state$.next({
                type: "ABR_MANAGER",
                data: {
                    ...this.state$.getValue().data,
                    variants: currentState.data.variants,
                    variantIndex: currentState.data.variantIndex,
                },
            })
        })
    }

    private subscribeToStateManager() {
        return this.stateManager.subscribe(currentState => {
            console.log(currentState.type)
            switch (currentState.type) {
                case "PANIC":
                    this.onPanic()
                    break;
                case "REBUFFER":
                    this.onRebuffer(currentState.data.bufferedRangeSeconds)
                    break;
                case "STEADY":
                    this.onSteady()
                    break;
            }
        })
    }

    private onPanic() {
        this.requestManager.timeoutAllRequest()
        this.requestManager.setTimeoutFirstByte(1000)
        this.requestManager.setTimeoutLoad(2000)

        const heuristicState = this.state$.getValue()
        const nextVariantIndex = heuristicState.data.variants.length -1
        this.abrManager.setVariantIndex(nextVariantIndex)
    }

    private onRebuffer(bufferedRangeSeconds: number) {
        this.requestManager.setTimeoutFirstByte(1000)
        this.requestManager.setTimeoutLoad(4000)

        const stateConfig = this.stateManager.getConfig()
        const bufferFullness = bufferedRangeSeconds / stateConfig.steadyThreshold
        const maxBandwidthUsage = 0.8
        const minBandwidthUsage = 0.5
        
        const bandwidthUsage = Math.min(
            maxBandwidthUsage,
            minBandwidthUsage + ((maxBandwidthUsage - minBandwidthUsage) * bufferFullness)
        )
        this.setVariantIndex(bandwidthUsage)
    }

    private onSteady() {
        this.requestManager.setTimeoutFirstByte(2000)
        this.requestManager.setTimeoutLoad(6000)

        const bandwidthUsage = 0.9
        this.setVariantIndex(bandwidthUsage)
    }

    /**
     * setVariantIndex
     * @param bandwidthUsage: bandwidth percentage that should be used
     */
    private setVariantIndex(bandwidthUsage: number) {
        const {bandwidthEstimateBps, variants} = this.state$.getValue().data
        
        const modifiedBandwidthEstimate = bandwidthEstimateBps * bandwidthUsage
        const variantIndex = variants.findIndex(variant => variant.bandwidth <= modifiedBandwidthEstimate)
        const nextVariantIndex = Math.min(variantIndex, variants.length -1)
        
        this.abrManager.setVariantIndex(nextVariantIndex)
    }

    public tearDown() {
        this.bandwidthManager.tearDown()
        this.subscriptions.forEach(unsubscribe => unsubscribe())
    }
}

export {ShakaAbrHeuristic}