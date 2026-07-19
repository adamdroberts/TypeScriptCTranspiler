import { setTimeout as delay } from "node:timers/promises";

async function branchBlockFallthroughPostAwaitIf(flag: boolean, suffix: boolean, prefix: string): Promise<string> {
    if (flag) {
        const value = await delay(1, "branch");
        return prefix + value;
    }
    const value = await delay(2, "fall");
    if (suffix) return prefix + value + "-yes";
    return prefix + value + "-no";
}

class FallthroughPostAwaitIfRunner {
    prefix: string;

    constructor(prefix: string) {
        this.prefix = prefix;
    }

    async method(flag: boolean, suffix: boolean): Promise<string> {
        if (flag) {
            const value = await delay(3, "method-branch");
            return this.prefix + value;
        }
        const value = await delay(4, "method-fall");
        if (suffix) return this.prefix + value + "-yes";
        return this.prefix + value + "-no";
    }
}

const branchBlockFallthroughPostAwaitIfValue = async (flag: boolean, suffix: boolean, prefix: string): Promise<string> => {
    if (flag) {
        const value = await delay(5, "value-branch");
        return prefix + value;
    }
    const value = await delay(6, "value-fall");
    if (suffix) return prefix + value + "-yes";
    return prefix + value + "-no";
};

const runner = new FallthroughPostAwaitIfRunner("this-");

branchBlockFallthroughPostAwaitIf(true, true, "fn-")
    .then((value) => console.log("branch-block-fallthrough-post-await-if-true:", value));
branchBlockFallthroughPostAwaitIf(false, true, "fn-")
    .then((value) => console.log("branch-block-fallthrough-post-await-if-fall-yes:", value));
branchBlockFallthroughPostAwaitIf(false, false, "fn-")
    .then((value) => console.log("branch-block-fallthrough-post-await-if-fall-no:", value));
runner.method(true, false)
    .then((value) => console.log("method-branch-block-fallthrough-post-await-if-true:", value));
runner.method(false, true)
    .then((value) => console.log("method-branch-block-fallthrough-post-await-if-fall-yes:", value));
runner.method(false, false)
    .then((value) => console.log("method-branch-block-fallthrough-post-await-if-fall-no:", value));
branchBlockFallthroughPostAwaitIfValue(true, true, "arrow-")
    .then((value) => console.log("value-branch-block-fallthrough-post-await-if-true:", value));
branchBlockFallthroughPostAwaitIfValue(false, true, "arrow-")
    .then((value) => console.log("value-branch-block-fallthrough-post-await-if-fall-yes:", value));
branchBlockFallthroughPostAwaitIfValue(false, false, "arrow-")
    .then((value) => console.log("value-branch-block-fallthrough-post-await-if-fall-no:", value));
