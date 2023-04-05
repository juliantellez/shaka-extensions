import shaka from 'shaka-player/dist/shaka-player.compiled.debug';

import { DynamicTimeouts, PluginState } from "./plugin";

describe("Plugin", () => {    
    beforeEach(() => {
        jest.useFakeTimers()
    })

    it("should notify BUFFER_LOW events", () => {
        const player: shaka.Player = {
            configure: jest.fn(),
            // @ts-expect-error partial implementation
            getConfiguration: () => ({streaming: {}}),
            // @ts-expect-error partial implementation
            getMediaElement: () => ({
                buffered: {
                    length: 1,
                    start: () => 0,
                    end: () => 20,
                },
                currentTime: 19,
            }),
        };

            // @ts-expect-error partial implementation
        const config: PluginConfig = {
            enable: true,
            pollingInterval: 100,
            bufferingGoal: 10,
            bufferLow: {
                timeout: 10,
                stallTimeout: 10,
            },
        };

        const plugin = new DynamicTimeouts(player, config)
        const subscription = jest.fn();

        plugin.subscribe(subscription);
        jest.advanceTimersByTime(config.pollingInterval);

        expect(subscription).toHaveBeenCalledTimes(1);
        expect(subscription).toBeCalledWith({
            state: PluginState.BUFFER_LOW,
        });
    })

    it("should notify BUFFER_BUILDING events", () => {
        const player: shaka.Player = {
            configure: jest.fn(),
            // @ts-expect-error partial implementation
            getConfiguration: () => ({streaming: {}}),
            // @ts-expect-error partial implementation
            getMediaElement: () => ({
                buffered: {
                    length: 1,
                    start: () => 0,
                    end: () => 20,
                },
                currentTime: 15,
            }),
        };

            // @ts-expect-error partial implementation
        const config: PluginConfig = {
            enable: true,
            pollingInterval: 100,
            bufferingGoal: 10,
            bufferBuilding: {
                timeout: 10,
                stallTimeout: 10,
            },
        };

        const plugin = new DynamicTimeouts(player, config)
        const subscription = jest.fn();

        plugin.subscribe(subscription);
        jest.advanceTimersByTime(config.pollingInterval);

        expect(subscription).toHaveBeenCalledTimes(1);
        expect(subscription).toBeCalledWith({
            state: PluginState.BUFFER_BUILDING,
        });
    })

    it("should notify BUFFER_FULL events", () => {
        const player: shaka.Player = {
            configure: jest.fn(),
            // @ts-expect-error partial implementation
            getConfiguration: () => ({streaming: {}}),
            // @ts-expect-error partial implementation
            getMediaElement: () => ({
                buffered: {
                    length: 1,
                    start: () => 0,
                    end: () => 20,
                },
                currentTime: 10,
            }),
        };

            // @ts-expect-error partial implementation
        const config: PluginConfig = {
            enable: true,
            pollingInterval: 100,
            bufferingGoal: 10,
            bufferFull: {
                timeout: 10,
                stallTimeout: 10,
            },
        };

        const plugin = new DynamicTimeouts(player, config)
        const subscription = jest.fn();

        plugin.subscribe(subscription);
        jest.advanceTimersByTime(config.pollingInterval);

        expect(subscription).toHaveBeenCalledTimes(1);
        expect(subscription).toBeCalledWith({
            state: PluginState.BUFFER_FULL,
        });
    })

    it("should unsubscribe subscriptions on destroy", () => {
        const player: shaka.Player = {
            configure: jest.fn(),
            // @ts-expect-error partial implementation
            getConfiguration: () => ({streaming: {}}),
            // @ts-expect-error partial implementation
            getMediaElement: () => ({
                buffered: {
                    length: 1,
                    start: () => 0,
                    end: () => 20,
                },
                currentTime: 10,
            }),
        };

            // @ts-expect-error partial implementation
        const config: PluginConfig = {
            enable: true,
            pollingInterval: 100,
            bufferingGoal: 10,
            bufferFull: {
                timeout: 10,
                stallTimeout: 10,
            },
        };

        const plugin = new DynamicTimeouts(player, config)
        const subscription = jest.fn();

        plugin.subscribe(subscription);
        plugin.subscribe(console.log);
        plugin.destroy()

        jest.advanceTimersByTime(config.pollingInterval);

        expect(subscription).toHaveBeenCalledTimes(0);
    })
})
