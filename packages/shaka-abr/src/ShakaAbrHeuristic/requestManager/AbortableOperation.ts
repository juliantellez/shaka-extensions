/**
 * See https://shaka-player-demo.appspot.com/docs/api/shaka.extern.IAbortableOperation.html
 */
class AbortableOperation implements shaka.extern.IAbortableOperation<shaka.extern.Response> {
    public promise: Promise<shaka.extern.Response>
    private onAbort : () => Promise<void>;
    private hasAborted = false

    constructor(promise: Promise<shaka.extern.Response>, onAbort: () => Promise<void>) {
        this.promise = promise
        this.onAbort = onAbort
    }

    abort(): Promise<unknown> {
        if(this.hasAborted) {
            return Promise.resolve()
        }

        this.hasAborted = true

        return this.onAbort()
    }

    /**
     * onFinal:
     * A callback to be invoked after the operation succeeds or fails.
     * The boolean argument is true if the operation succeeded and false if it failed.
     */
    finally(onFinal: (a: boolean) => unknown): shaka.extern.IAbortableOperation<shaka.extern.Response> {
        this.promise.then(
            () => onFinal(true),
            () => onFinal(false)
        )

        return this
    }
}

export {AbortableOperation}