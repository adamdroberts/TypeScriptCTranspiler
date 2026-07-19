import { setTimeout as delay } from "node:timers/promises";

async function branchBlockFallthroughPostAwaitLoop(flag: boolean, count: number, prefix: string): Promise<string> {
    if (flag) {
        const value = await delay(1, "branch");
        return prefix + value;
    }
    const value = await delay(2, "fall");
    let out = prefix + value;
    for (let i = 0; i < count; i++) {
        out = out + "-" + i;
    }
    return out;
}

class FallthroughPostAwaitLoopRunner {
    prefix: string;

    constructor(prefix: string) {
        this.prefix = prefix;
    }

    async method(flag: boolean, count: number): Promise<string> {
        if (flag) {
            const value = await delay(3, "method-branch");
            return this.prefix + value;
        }
        const value = await delay(4, "method-fall");
        let out = this.prefix + value;
        let i = 0;
        while (i < count) {
            out = out + "-" + i;
            i++;
        }
        return out;
    }
}

const branchBlockFallthroughPostAwaitLoopValue = async (flag: boolean, count: number, prefix: string): Promise<string> => {
    if (flag) {
        const value = await delay(5, "value-branch");
        return prefix + value;
    }
    const value = await delay(6, "value-fall");
    let out = prefix + value;
    for (let i = 0; i < count; i++) {
        out = out + "-" + i;
    }
    return out;
};

const runner = new FallthroughPostAwaitLoopRunner("this-");

branchBlockFallthroughPostAwaitLoop(true, 3, "fn-")
    .then((value) => console.log("branch-block-fallthrough-post-await-loop-true:", value));
branchBlockFallthroughPostAwaitLoop(false, 3, "fn-")
    .then((value) => console.log("branch-block-fallthrough-post-await-loop-fall:", value));
runner.method(true, 2)
    .then((value) => console.log("method-branch-block-fallthrough-post-await-loop-true:", value));
runner.method(false, 2)
    .then((value) => console.log("method-branch-block-fallthrough-post-await-loop-fall:", value));
branchBlockFallthroughPostAwaitLoopValue(true, 2, "arrow-")
    .then((value) => console.log("value-branch-block-fallthrough-post-await-loop-true:", value));
branchBlockFallthroughPostAwaitLoopValue(false, 3, "arrow-")
    .then((value) => console.log("value-branch-block-fallthrough-post-await-loop-fall:", value));
