import { setTimeout as delay } from "node:timers/promises";

async function branchBlockFallthroughThrow(flag: boolean, prefix: string): Promise<string> {
    if (flag) {
        const value = await delay(1, "branch-ok");
        return prefix + value;
    }
    const value = await delay(2, "fall-bad");
    throw prefix + value;
}

class FallthroughThrowRunner {
    prefix: string;

    constructor(prefix: string) {
        this.prefix = prefix;
    }

    async method(flag: boolean): Promise<string> {
        if (flag) {
            const value = await delay(3, "method-ok");
            return this.prefix + value;
        }
        const value = await delay(4, "method-bad");
        throw this.prefix + value;
    }
}

const branchBlockFallthroughThrowValue = async (flag: boolean, prefix: string): Promise<string> => {
    if (flag) {
        const value = await delay(5, "value-ok");
        return prefix + value;
    }
    const value = await delay(6, "value-bad");
    throw prefix + value;
};

const runner = new FallthroughThrowRunner("this-");

branchBlockFallthroughThrow(true, "fn-")
    .then((value) => console.log("branch-fallthrough-post-await-throw-fn-ok:", value));
branchBlockFallthroughThrow(false, "fn-")
    .catch((reason: string) => console.log("branch-fallthrough-post-await-throw-fn:", reason));
runner.method(true)
    .then((value) => console.log("branch-fallthrough-post-await-throw-method-ok:", value));
runner.method(false)
    .catch((reason: string) => console.log("branch-fallthrough-post-await-throw-method:", reason));
branchBlockFallthroughThrowValue(true, "arrow-")
    .then((value) => console.log("branch-fallthrough-post-await-throw-value-ok:", value));
branchBlockFallthroughThrowValue(false, "arrow-")
    .catch((reason: string) => console.log("branch-fallthrough-post-await-throw-value:", reason));
