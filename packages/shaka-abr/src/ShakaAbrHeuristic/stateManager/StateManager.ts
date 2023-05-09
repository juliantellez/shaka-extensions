import shaka from 'shaka-player/dist/shaka-player.ui.debug';

import { BehaviourSubject, Subscriber } from "../../Utils/observable"

interface StateManagerConfig {
    intervalMs: number
    rebufferThreshold: number
    steadyThreshold: number
}

interface State {
    type: "PANIC" | "REBUFFER" | "STEADY";
    data: {
        bufferedRangeSeconds: number
    }
}

const defaultStateManagerConfig: StateManagerConfig = {
    intervalMs: 1000,
    rebufferThreshold: 4,
    steadyThreshold: 10,
}

class StateManager {
    private config: StateManagerConfig
    private player: shaka.Player
    private intervalId: number
    private state$ = new BehaviourSubject<State>({
        type: "PANIC",
        data: {
            bufferedRangeSeconds: 0,
        }
    })

    constructor(player: shaka.Player, config: StateManagerConfig = defaultStateManagerConfig) {
        this.player = player
        this.intervalId = this.createInterval(config.intervalMs)
        this.config = config
    }

    private createInterval(intervalMs: number): number {
        return window.setInterval(() => {
            this.emitState()
        }, intervalMs)
    }

    private clearInterval() {
        window.clearInterval(this.intervalId)
    }

    private emitState() {
        const bufferedRangeSeconds = this.getBufferedRangeSeconds()
        const currentState = this.state$.getValue()

        //   Panic    Rebuffer    Steady
        // 1--------4---------10---------|
        if (
            bufferedRangeSeconds < this.config.rebufferThreshold &&
            currentState.type !== "PANIC"
            ) {
            return this.state$.next({type: "PANIC", data: { bufferedRangeSeconds }})
        }

        if (
            bufferedRangeSeconds >= this.config.rebufferThreshold &&
            bufferedRangeSeconds < this.config.steadyThreshold &&
            currentState.type !== "REBUFFER"
            ) {
            return this.state$.next({type: "REBUFFER", data: { bufferedRangeSeconds }})
        }

        if (
            bufferedRangeSeconds >= this.config.steadyThreshold &&
            currentState.type !== "STEADY"
            ) {
            return this.state$.next({type: "STEADY", data: { bufferedRangeSeconds }})
        }
    }

    private getBufferedRangeSeconds = () => {
        const videoElement = this.player.getMediaElement();
        const buffered = videoElement?.buffered;
        const currentTime = videoElement?.currentTime;

        if (!buffered || !buffered.length || !currentTime) {
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

        return Math.floor(range.end - currentTime);
    }

    public getConfig(): StateManagerConfig {
        return this.config
    }

    public subscribe(subscriber: Subscriber<State>) {
        return this.state$.subscribe(subscriber)
    }

    public tearDown() {
        this.clearInterval()
    }
}

export {StateManager}
