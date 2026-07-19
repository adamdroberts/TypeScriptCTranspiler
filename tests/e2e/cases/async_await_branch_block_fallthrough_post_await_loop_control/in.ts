import { setTimeout as delay } from "node:timers/promises";

async function branchBlockFallthroughPostAwaitLoopControl(flag: boolean, prefix: string): Promise<string> {
    if (flag) {
        const value = await delay(1, "branch");
        return prefix + value;
    }
    const value = await delay(2, "fall");
    let out = prefix + value;
    for (let i = 0; i < 6; i++) {
        if (i === 1 || i === 3) continue;
        if (i === 5) break;
        out = out + "-" + i;
    }
    return out;
}

class FallthroughPostAwaitLoopControlRunner {
    prefix: string;

    constructor(prefix: string) {
        this.prefix = prefix;
    }

    async method(flag: boolean): Promise<string> {
        if (flag) {
            const value = await delay(3, "method-branch");
            return this.prefix + value;
        }
        const value = await delay(4, "method-fall");
        let out = this.prefix + value;
        let i = 0;
        while (i < 6) {
            if (i === 1 || i === 3) {
                i++;
                continue;
            }
            if (i === 5) break;
            out = out + "-" + i;
            i++;
        }
        return out;
    }
}

const branchBlockFallthroughPostAwaitLoopControlValue = async (flag: boolean, prefix: string): Promise<string> => {
    if (flag) {
        const value = await delay(5, "value-branch");
        return prefix + value;
    }
    const value = await delay(6, "value-fall");
    let out = prefix + value;
    for (let i = 0; i < 6; i++) {
        if (i === 1 || i === 3) continue;
        if (i === 5) break;
        out = out + "-" + i;
    }
    return out;
};

const runner = new FallthroughPostAwaitLoopControlRunner("this-");

branchBlockFallthroughPostAwaitLoopControl(true, "fn-")
    .then((value) => console.log("branch-block-fallthrough-post-await-loop-control-true:", value));
branchBlockFallthroughPostAwaitLoopControl(false, "fn-")
    .then((value) => console.log("branch-block-fallthrough-post-await-loop-control-fall:", value));
runner.method(true)
    .then((value) => console.log("method-branch-block-fallthrough-post-await-loop-control-true:", value));
runner.method(false)
    .then((value) => console.log("method-branch-block-fallthrough-post-await-loop-control-fall:", value));
branchBlockFallthroughPostAwaitLoopControlValue(true, "arrow-")
    .then((value) => console.log("value-branch-block-fallthrough-post-await-loop-control-true:", value));
branchBlockFallthroughPostAwaitLoopControlValue(false, "arrow-")
    .then((value) => console.log("value-branch-block-fallthrough-post-await-loop-control-fall:", value));
