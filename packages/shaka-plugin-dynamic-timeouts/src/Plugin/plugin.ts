import shaka from 'shaka-player/dist/shaka-player.compiled.debug';

import { BehaviourSubject } from "./observable"
import { subscribeToState } from './subscriptions/subscribeToState';

const DEFAULT_POLLING_INTERVAL = 1000

interface PluginConfig {
    enable: boolean;
    pollingInterval: number
    bufferingGoal: number
    bufferLow: {
        timeout: number,
        stallTimeout: number,
    },
    bufferBuilding: {
        timeout: number,
        stallTimeout: number,
    },
    bufferFull: {
        timeout: number,
        stallTimeout: number,
    }
}

enum PluginState {
    BUFFER_LOW = 'BUFFER_LOW',
    BUFFER_BUILDING = 'BUFFER_BUILDING',
    BUFFER_FULL = 'BUFFER_FULL'
}

interface PluginEvent {
    state: PluginState
}

type Subscription = () => void
type Subscriber = (event: PluginEvent) => void

interface PluginApi {
    getValue(): PluginEvent
    subscribe(subscriber: Subscriber): void
    destroy(): void
}

class DynamicTimeouts implements PluginApi {
    private state$ = new BehaviourSubject<PluginEvent>({state: PluginState.BUFFER_BUILDING})
    private config: PluginConfig
    private player: shaka.Player
    private pollingInterval: number
    private subscriptions: Subscription[] = []
    
    constructor(player: shaka.Player, config: PluginConfig) {
        this.player = player
        this.config = config
        this.pollingInterval = config.pollingInterval || DEFAULT_POLLING_INTERVAL
        if(!config.enable) return

        this.init()
    }

    public getValue = (): PluginEvent => {
        return this.state$.getValue()
    }

    public subscribe = (subscriber: Subscriber): void => {
        const subscription = this.state$.subscribe(subscriber)
        this.subscriptions.push(subscription)
    }

    private init = () => {
        this.createPollingInterval()
        this.subscriptions = this.createSubscriptions()
    }

    public destroy = () => {
        this.subscriptions.forEach(unsubscribe => unsubscribe())
        this.subscriptions = []
    }

    private createSubscriptions = (): Array<Subscription> => {
        return [
            subscribeToState(this.player, this.config),
        ].map(s => this.state$.subscribe(s))
    }

    private createPollingInterval = () => {
        return setInterval(this.inspectBuffer, this.pollingInterval);
    }

    private inspectBuffer = () => {
        const buffer = Math.floor(this.getBufferedRange())

        switch (true) {
            case buffer >= this.config.bufferingGoal:
                this.state$.next({state: PluginState.BUFFER_FULL})
                break;
            case buffer >= this.config.bufferingGoal / 2:
                this.state$.next({state: PluginState.BUFFER_BUILDING})
                break;
            case buffer <= this.config.bufferingGoal / 2:
                this.state$.next({state: PluginState.BUFFER_LOW})
                break;
        }
    }

    private getBufferedRange = () => {
        const {buffered, currentTime} = this.player.getMediaElement() as HTMLVideoElement

        if (!currentTime || !buffered || !buffered.length) {
            return 0;
        }

        const bufferedRanges = [];
        for (let i = 0; i < buffered.length; i++) {
            bufferedRanges.push({
                start: buffered.start(i),
                end: buffered.end(i),
            });
        }

        const range = bufferedRanges.find(({ start, end }) => currentTime >= start && currentTime < end);

        if (!range) {
            return 0;
        }

        return range.end - currentTime;
    }
}

export {
    DynamicTimeouts,
    Subscription,
    Subscriber,
    PluginState,
    PluginConfig,
    PluginEvent,
}
