import shaka from 'shaka-player/dist/shaka-player.compiled.debug';

import { PluginConfig, PluginState, Subscriber } from "../plugin";

const subscribeToState: (player: shaka.Player, config: PluginConfig) => Subscriber = (player, config) => (data) => {
    const currentConfig = player.getConfiguration()
    const pluginConfig = {
        [PluginState.BUFFER_BUILDING]: config.bufferBuilding,
        [PluginState.BUFFER_FULL]: config.bufferFull,
        [PluginState.BUFFER_LOW]: config.bufferLow,
    }[data.state]

    player.configure({
        ...currentConfig,
        streaming: {
            ...currentConfig.streaming,
            retryParameters: {
                ...currentConfig.streaming.retryParameters,
                timeout: pluginConfig.timeout,
                stallTimeout: pluginConfig.stallTimeout,
            }
        }
    })
}

export {subscribeToState}
