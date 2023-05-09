export type Subscriber<D> = (data: D) => void
export type Subscription = () => void

interface BehaviourSubectObservable<Data> {
    getValue(): Data
    subscribe(subscriber: Subscriber<Data>): Subscription
    next(data: Data): void
}

class BehaviourSubject<Data> implements BehaviourSubectObservable<Data> {
    private state: Data
    private subscriptions: Array<Subscriber<Data>> = []

    constructor(data: Data) {
        this.state = data
    }

    public getValue(): Data {
        return this.state
    }

    public subscribe(subscriber: Subscriber<Data>): Subscription {
        this.subscriptions.push(subscriber)

        return () => {
            const index = this.subscriptions.findIndex(subs => subs === subscriber)
            if(index >= 0) {
                this.subscriptions.splice(index, 1);
            }
        }
    }

    public next(data: Data): void {
        this.state = data
        
        this.subscriptions.forEach(subscription => subscription(data))
    }
}

export {BehaviourSubject}