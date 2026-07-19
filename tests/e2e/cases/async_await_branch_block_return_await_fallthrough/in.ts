import { setTimeout as delay } from "node:timers/promises";

async function branchBlockReturnAwaitFallthrough(flag: boolean, prefix: string): Promise<string> {
    if (flag) {
        const label = prefix + "branch";
        return await delay(1, label);
    }
    const label = prefix + "fall";
    return await delay(2, label);
}

class ReturnAwaitFallthroughRunner {
    prefix: string;

    constructor(prefix: string) {
        this.prefix = prefix;
    }

    async method(flag: boolean): Promise<string> {
        if (flag) {
            const label = this.prefix + "method-branch";
            return await delay(3, label);
        }
        const label = this.prefix + "method-fall";
        return await delay(4, label);
    }
}

const branchBlockReturnAwaitFallthroughValue = async (flag: boolean, prefix: string): Promise<string> => {
    if (flag) {
        const label = prefix + "value-branch";
        return await delay(5, label);
    }
    const label = prefix + "value-fall";
    return await delay(6, label);
};

const runner = new ReturnAwaitFallthroughRunner("this-");

branchBlockReturnAwaitFallthrough(true, "fn-")
    .then((value) => console.log("branch-block-return-await-fallthrough-true:", value));
branchBlockReturnAwaitFallthrough(false, "fn-")
    .then((value) => console.log("branch-block-return-await-fallthrough-false:", value));
runner.method(true)
    .then((value) => console.log("method-branch-block-return-await-fallthrough-true:", value));
runner.method(false)
    .then((value) => console.log("method-branch-block-return-await-fallthrough-false:", value));
branchBlockReturnAwaitFallthroughValue(true, "arrow-")
    .then((value) => console.log("value-branch-block-return-await-fallthrough-true:", value));
branchBlockReturnAwaitFallthroughValue(false, "arrow-")
    .then((value) => console.log("value-branch-block-return-await-fallthrough-false:", value));
