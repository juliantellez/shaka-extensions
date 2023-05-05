import shaka from 'shaka-player/dist/shaka-player.compiled.debug';
import { BandwidthManager } from './bandwidthManager/BandwidthManager';

interface ShakaAbrHeuristicConfig {

}

class ShakaAbrHeuristic {
    private player: shaka.Player

    constructor(player: shaka.Player, config?: ShakaAbrHeuristicConfig) {
        this.player = player
        this.bandwidthManager = new BandwidthManager(player)
        // this.requestManager = new RequestManager()
        // this.retryManager = new RetryManager()
        // this.stateManager = new StateManager()
        // this.abrManager = new AbrManager()
    }
}

export {ShakaAbrHeuristic}