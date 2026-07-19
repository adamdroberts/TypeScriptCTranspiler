import { setTimeout as delay } from "node:timers/promises";

async function branchBlockShortCircuitLeftAwaitFallthrough(flag: boolean, choice: boolean, prefix: string): Promise<string> {
    if (flag) {
        const value = await delay(1, "branch");
        return prefix + value;
    }
    const label = prefix + "fall-";
    return choice
        ? await delay(2, "ready") && label + "and"
        : await delay(3, "") || label + "or";
}

class ShortCircuitLeftAwaitFallthroughRunner {
    prefix: string;

    constructor(prefix: string) {
        this.prefix = prefix;
    }

    async method(flag: boolean, choice: boolean): Promise<string> {
        if (flag) {
            const value = await delay(4, "method-branch");
            return this.prefix + value;
        }
        const label = this.prefix + "method-fall-";
        return choice
            ? await delay(5, "ready") && label + "and"
            : await delay(6, "") || label + "or";
    }
}

const branchBlockShortCircuitLeftAwaitFallthroughValue = async (flag: boolean, choice: boolean, prefix: string): Promise<string> => {
    if (flag) {
        const value = await delay(7, "value-branch");
        return prefix + value;
    }
    const label = prefix + "value-fall-";
    return choice
        ? await delay(8, "ready") && label + "and"
        : await delay(9, "") || label + "or";
};

const runner = new ShortCircuitLeftAwaitFallthroughRunner("this-");

branchBlockShortCircuitLeftAwaitFallthrough(true, false, "fn-")
    .then((value) => console.log("branch-block-short-circuit-left-await-fallthrough-branch:", value));
branchBlockShortCircuitLeftAwaitFallthrough(false, true, "fn-")
    .then((value) => console.log("branch-block-short-circuit-left-await-fallthrough-and:", value));
branchBlockShortCircuitLeftAwaitFallthrough(false, false, "fn-")
    .then((value) => console.log("branch-block-short-circuit-left-await-fallthrough-or:", value));
runner.method(true, false)
    .then((value) => console.log("method-branch-block-short-circuit-left-await-fallthrough-branch:", value));
runner.method(false, true)
    .then((value) => console.log("method-branch-block-short-circuit-left-await-fallthrough-and:", value));
runner.method(false, false)
    .then((value) => console.log("method-branch-block-short-circuit-left-await-fallthrough-or:", value));
branchBlockShortCircuitLeftAwaitFallthroughValue(true, false, "arrow-")
    .then((value) => console.log("value-branch-block-short-circuit-left-await-fallthrough-branch:", value));
branchBlockShortCircuitLeftAwaitFallthroughValue(false, true, "arrow-")
    .then((value) => console.log("value-branch-block-short-circuit-left-await-fallthrough-and:", value));
branchBlockShortCircuitLeftAwaitFallthroughValue(false, false, "arrow-")
    .then((value) => console.log("value-branch-block-short-circuit-left-await-fallthrough-or:", value));
