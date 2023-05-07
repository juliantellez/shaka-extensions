import shaka from 'shaka-player/dist/shaka-player.ui.debug';

import { BandwidthManager } from './bandwidthManager/BandwidthManager';
import { RequestManager } from './requestManager/RequestManager';
import { HttpNetworkEnginePlugin } from './requestManager/HttpNetworkEnginePlugin';

interface ShakaAbrHeuristicConfig {

}

class ShakaAbrHeuristic {
    private player: shaka.Player
    private requestManager: RequestManager
    private bandwidthManager: BandwidthManager

    constructor(player: shaka.Player, config?: ShakaAbrHeuristicConfig) {
        this.player = player
        this.bandwidthManager = new BandwidthManager()
        this.requestManager = new RequestManager(this.bandwidthManager)
        const httpNetworkEnginePlugin = new HttpNetworkEnginePlugin(this.requestManager)
        httpNetworkEnginePlugin.register()
        // this.retryManager = new RetryManager()
        // this.stateManager = new StateManager()
        // this.abrManager = new AbrManager()
    }
}

export {ShakaAbrHeuristic}