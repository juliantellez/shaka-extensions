import shaka from 'shaka-player/dist/shaka-player.compiled.debug';

import { PluginConfig, PluginState, Subscriber } from "../plugin";

const subscribeToBufferBuilding: (player: shaka.Player, config: PluginConfig) => Subscriber = (player, config) => (data) => {
    if (data.state !== PluginState.BUFFER_BUILDING) return

    const currentConfig = player.getConfiguration()

    player.configure({
        ...currentConfig,
        streaming: {
            ...currentConfig.streaming,
            retryParameters: {
                ...currentConfig.streaming.retryParameters,
                timeout: config.bufferBuilding.timeout,
                stallTimeout: config.bufferBuilding.stallTimeout,
            }
        }
    })
}

export {subscribeToBufferBuilding}
