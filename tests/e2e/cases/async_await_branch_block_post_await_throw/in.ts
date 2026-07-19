import { setTimeout as delay } from "node:timers/promises";

async function branchBlockPostAwaitThrow(flag: boolean, prefix: string): Promise<string> {
    if (flag) {
        const value = await delay(1, "branch-bad");
        throw prefix + value;
    }
    const value = await delay(2, "fallthrough");
    return prefix + value;
}

class BranchThrowRunner {
    prefix: string;

    constructor(prefix: string) {
        this.prefix = prefix;
    }

    async method(flag: boolean): Promise<string> {
        if (flag) {
            const value = await delay(3, "method-bad");
            throw this.prefix + value;
        }
        const value = await delay(4, "method-ok");
        return this.prefix + value;
    }
}

const branchBlockPostAwaitThrowValue = async (flag: boolean, prefix: string): Promise<string> => {
    if (flag) {
        const value = await delay(5, "value-bad");
        throw prefix + value;
    }
    const value = await delay(6, "value-ok");
    return prefix + value;
};

const runner = new BranchThrowRunner("this-");

branchBlockPostAwaitThrow(true, "fn-")
    .catch((reason: string) => console.log("branch-block-post-await-throw-fn:", reason));
branchBlockPostAwaitThrow(false, "fn-")
    .then((value) => console.log("branch-block-post-await-throw-fn-ok:", value));
runner.method(true)
    .catch((reason: string) => console.log("branch-block-post-await-throw-method:", reason));
runner.method(false)
    .then((value) => console.log("branch-block-post-await-throw-method-ok:", value));
branchBlockPostAwaitThrowValue(true, "arrow-")
    .catch((reason: string) => console.log("branch-block-post-await-throw-value:", reason));
branchBlockPostAwaitThrowValue(false, "arrow-")
    .then((value) => console.log("branch-block-post-await-throw-value-ok:", value));
