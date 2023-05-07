class Counter {
    private total = 0

    get(): number {
        return this.total
    }

    set(value: number): number {
        this.total = value
        return this.total
    }

    add(summand: number): number {
        this.total += summand
        return this.total
    }

    substract(term: number): number {
        this.total -= term
        return this.total
    }

    increment(): number {
        this.add(1)
        return this.total
    }

    reset(): number {
        this.set(0)
        return this.total
    }
}


export {Counter}