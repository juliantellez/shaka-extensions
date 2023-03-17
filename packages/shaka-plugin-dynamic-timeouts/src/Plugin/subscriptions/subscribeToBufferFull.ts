import shaka from 'shaka-player/dist/shaka-player.compiled.debug';

import { PluginConfig, PluginState, Subscriber } from "../plugin";

const subscribeToBufferFull: (player: shaka.Player, config: PluginConfig) => Subscriber = (player, config) => (data) => {
    if (data.state !== PluginState.BUFFER_FULL) return

    const currentConfig = player.getConfiguration()

    player.configure({
        ...currentConfig,
        streaming: {
            ...currentConfig.streaming,
            retryParameters: {
                ...currentConfig.streaming.retryParameters,
                timeout: config.bufferFull.timeout,
                stallTimeout: config.bufferFull.stallTimeout,
            }
        }
    })
}

export {subscribeToBufferFull}
