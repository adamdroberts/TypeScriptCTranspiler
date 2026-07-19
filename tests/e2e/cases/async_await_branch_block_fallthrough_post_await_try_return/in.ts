import { setTimeout as delay } from "node:timers/promises";

async function branchBlockFallthroughPostAwaitTry(flag: boolean, fail: boolean, prefix: string): Promise<string> {
    if (flag) {
        const value = await delay(1, "branch");
        return prefix + value;
    }
    const value = await delay(2, "fall");
    let out = "";
    try {
        if (fail) throw prefix + value + "-bad";
        out = prefix + value + "-ok";
    } catch (reason) {
        out = "caught-" + reason;
    } finally {
        out = out + "-F";
    }
    return out;
}

class FallthroughPostAwaitTryRunner {
    prefix: string;

    constructor(prefix: string) {
        this.prefix = prefix;
    }

    async method(flag: boolean, fail: boolean): Promise<string> {
        if (flag) {
            const value = await delay(3, "method-branch");
            return this.prefix + value;
        }
        const value = await delay(4, "method-fall");
        let out = "";
        try {
            if (fail) throw this.prefix + value + "-bad";
            out = this.prefix + value + "-ok";
        } catch (reason) {
            out = "caught-" + reason;
        } finally {
            out = out + "-M";
        }
        return out;
    }
}

const branchBlockFallthroughPostAwaitTryValue = async (flag: boolean, fail: boolean, prefix: string): Promise<string> => {
    if (flag) {
        const value = await delay(5, "value-branch");
        return prefix + value;
    }
    const value = await delay(6, "value-fall");
    let out = "";
    try {
        if (fail) throw prefix + value + "-bad";
        out = prefix + value + "-ok";
    } catch (reason) {
        out = "caught-" + reason;
    } finally {
        out = out + "-V";
    }
    return out;
};

const runner = new FallthroughPostAwaitTryRunner("this-");

branchBlockFallthroughPostAwaitTry(true, false, "fn-")
    .then((value) => console.log("branch-block-fallthrough-post-await-try-true:", value));
branchBlockFallthroughPostAwaitTry(false, false, "fn-")
    .then((value) => console.log("branch-block-fallthrough-post-await-try-fall-ok:", value));
branchBlockFallthroughPostAwaitTry(false, true, "fn-")
    .then((value) => console.log("branch-block-fallthrough-post-await-try-fall-catch:", value));
runner.method(true, false)
    .then((value) => console.log("method-branch-block-fallthrough-post-await-try-true:", value));
runner.method(false, false)
    .then((value) => console.log("method-branch-block-fallthrough-post-await-try-fall-ok:", value));
runner.method(false, true)
    .then((value) => console.log("method-branch-block-fallthrough-post-await-try-fall-catch:", value));
branchBlockFallthroughPostAwaitTryValue(true, false, "arrow-")
    .then((value) => console.log("value-branch-block-fallthrough-post-await-try-true:", value));
branchBlockFallthroughPostAwaitTryValue(false, false, "arrow-")
    .then((value) => console.log("value-branch-block-fallthrough-post-await-try-fall-ok:", value));
branchBlockFallthroughPostAwaitTryValue(false, true, "arrow-")
    .then((value) => console.log("value-branch-block-fallthrough-post-await-try-fall-catch:", value));
