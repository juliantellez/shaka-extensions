import shaka from 'shaka-player/dist/shaka-player.ui.debug';

import { BandwidthManager } from './bandwidthManager/BandwidthManager';
import { RequestManager } from './requestManager/RequestManager';
import { HttpNetworkEnginePlugin } from './requestManager/HttpNetworkEnginePlugin';
import { StateManager } from './stateManager/StateManager';
import { RetryManager } from './retryManager/RetryManager';

interface ShakaAbrHeuristicConfig {

}

class ShakaAbrHeuristic {
    private player: shaka.Player
    private requestManager: RequestManager
    private bandwidthManager: BandwidthManager
    private stateManager: StateManager
    private retryManager: RetryManager

    constructor(player: shaka.Player, config?: ShakaAbrHeuristicConfig) {
        this.player = player
        this.bandwidthManager = new BandwidthManager()
        this.requestManager = new RequestManager(this.bandwidthManager)
        const httpNetworkEnginePlugin = new HttpNetworkEnginePlugin(this.requestManager)
        httpNetworkEnginePlugin.register()
        this.stateManager = new StateManager()
        this.retryManager = new RetryManager()
        // this.abrManager = new AbrManager()
    }
}

export {ShakaAbrHeuristic}