import { Counter } from "../utils/Counter"

interface RetryManagerConfig {
    /**
     * threshold:
     * maximum amount of allowed failures
     */
    threshold: number

    /**
     * baseDelayMs:
     * Delay before invoking the retry callback
     */
    baseDelayMs: number
}

const retryManagerConfig: RetryManagerConfig = {
    threshold: 2,
    baseDelayMs: 100,
}

class RetryManager {
    private timeoutId: number = 0
    private timeoutMs = new Counter()
    private failuresCounter = new Counter()
    private config: RetryManagerConfig

    constructor(config: RetryManagerConfig = retryManagerConfig) {
        this.config = config
    }

    public onFailure(retryCb: () => void) {
        if(this.timeoutId !== 0) {
            return
        }

        this.failuresCounter.increment()
        
        if(this.failuresCounter.get() <= this.config.threshold) {
            retryCb()
        } else {
            this.timeoutId = this.setTimeout(
                retryCb,
                this.timeoutMs.set(this.exponentialBackOff())
            )
        }
    }

    public onSuccess() {
        this.failuresCounter.reset()
        this.timeoutMs.reset()
        this.timeoutId = 0
        this.clearTimeout(this.timeoutId)
    }

    private exponentialBackOff(): number {
        return Math.pow(2, this.failuresCounter.get()) * this.config.baseDelayMs
    }

    private setTimeout(retryCb: () => void, timeoutMs: number): number {
        return window.setTimeout(retryCb, timeoutMs)
    }

    private clearTimeout(timeoutId: number) {
        clearTimeout(timeoutId)
    }
}

export {RetryManager}