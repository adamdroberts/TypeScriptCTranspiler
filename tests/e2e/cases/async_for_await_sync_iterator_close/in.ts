let returnCalls = 0;
class SyncIterator {
    private step = 0;

    next(): any {
        if (this.step++ === 0) return { done: false, value: "first" };
        return { done: true, value: undefined };
    }

    return(value?: any): any {
        returnCalls++;
        return { done: true, value };
    }
}

class SyncIterable {
}

const iterable: any = new SyncIterable();
Object.defineProperty(iterable, Symbol.iterator, {
    value: (): any => new SyncIterator(),
});

async function stop(iter: any): Promise<string> {
    for await (const value of iter) {
        return value;
    }
    return "empty";
}

stop(iterable).then((value: string): void => {
    console.log("value:", value, "return-calls:", returnCalls);
});
