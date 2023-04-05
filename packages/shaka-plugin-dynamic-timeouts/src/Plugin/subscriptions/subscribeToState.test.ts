import shaka from 'shaka-player/dist/shaka-player.compiled.debug';

import { PluginConfig, PluginState } from "../plugin"
import { subscribeToState } from "./subscribeToState"

describe("subscribeToState", () => {
    it("should subscribe to BUFFER_LOW", () => {
        const player: shaka.Player = {
            // @ts-expect-error partial implementation
           getConfiguration: () => ({streaming: {}}),
           configure: jest.fn() 
        }

        // @ts-expect-error partial implementation
        const config: PluginConfig = {
            bufferLow: {
                stallTimeout: 0,
                timeout: 0,
            }
        }

        subscribeToState(player, config)({state: PluginState.BUFFER_LOW})

        const expected =  {
            streaming: {
                retryParameters: {
                    stallTimeout: 0,
                    timeout: 0
                }
            }
        }

        expect(player.configure).toHaveBeenCalledWith(expected)
    })

    it("should subscribe to BUFFER_BUILDING", () => {
        const player: shaka.Player = {
            // @ts-expect-error partial implementation
           getConfiguration: () => ({streaming: {}}),
           configure: jest.fn() 
        }

        // @ts-expect-error partial implementation
        const config: PluginConfig = {
            bufferBuilding: {
                stallTimeout: 0,
                timeout: 0,
            }
        }

        subscribeToState(player, config)({state: PluginState.BUFFER_BUILDING})

        const expected =  {
            streaming: {
                retryParameters: {
                    stallTimeout: 0,
                    timeout: 0
                }
            }
        }

        expect(player.configure).toHaveBeenCalledWith(expected)
    })

    it("should subscribe to BUFFER_FULL", () => {
        const player: shaka.Player = {
            // @ts-expect-error partial implementation
           getConfiguration: () => ({streaming: {}}),
           configure: jest.fn() 
        }

        // @ts-expect-error partial implementation
        const config: PluginConfig = {
            bufferFull: {
                stallTimeout: 0,
                timeout: 0,
            }
        }

        subscribeToState(player, config)({state: PluginState.BUFFER_FULL})

        const expected =  {
            streaming: {
                retryParameters: {
                    stallTimeout: 0,
                    timeout: 0
                }
            }
        }

        expect(player.configure).toHaveBeenCalledWith(expected)
    })
})
