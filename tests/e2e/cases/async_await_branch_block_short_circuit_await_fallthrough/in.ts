import { setTimeout as delay } from "node:timers/promises";

async function branchBlockShortCircuitAwaitFallthrough(flag: boolean, mode: string, prefix: string): Promise<string> {
    if (flag) {
        const value = await delay(1, "branch");
        return prefix + value;
    }
    const label = prefix + "fall-";
    if (mode === "and") {
        const enabled: true = true;
        return enabled && label + await delay(2, "and");
    }
    if (mode === "or") {
        const cached = label + "or-sync";
        return cached || label + await delay(3, "or");
    }
    const maybe: string | null = null;
    return maybe ?? label + await delay(4, "nullish");
}

class ShortCircuitAwaitFallthroughRunner {
    prefix: string;

    constructor(prefix: string) {
        this.prefix = prefix;
    }

    async method(flag: boolean, mode: string): Promise<string> {
        if (flag) {
            const value = await delay(5, "method-branch");
            return this.prefix + value;
        }
        const label = this.prefix + "method-fall-";
        if (mode === "and") {
            const enabled: true = true;
            return enabled && label + await delay(6, "and");
        }
        if (mode === "or") {
            const cached = label + "or-sync";
            return cached || label + await delay(7, "or");
        }
        const maybe: string | null = null;
        return maybe ?? label + await delay(8, "nullish");
    }
}

const branchBlockShortCircuitAwaitFallthroughValue = async (flag: boolean, mode: string, prefix: string): Promise<string> => {
    if (flag) {
        const value = await delay(9, "value-branch");
        return prefix + value;
    }
    const label = prefix + "value-fall-";
    if (mode === "and") {
        const enabled: true = true;
        return enabled && label + await delay(10, "and");
    }
    if (mode === "or") {
        const cached = label + "or-sync";
        return cached || label + await delay(11, "or");
    }
    const maybe: string | null = null;
    return maybe ?? label + await delay(12, "nullish");
};

const runner = new ShortCircuitAwaitFallthroughRunner("this-");

branchBlockShortCircuitAwaitFallthrough(true, "and", "fn-")
    .then((value) => console.log("branch-block-short-circuit-await-fallthrough-branch:", value));
branchBlockShortCircuitAwaitFallthrough(false, "and", "fn-")
    .then((value) => console.log("branch-block-short-circuit-await-fallthrough-and:", value));
branchBlockShortCircuitAwaitFallthrough(false, "or", "fn-")
    .then((value) => console.log("branch-block-short-circuit-await-fallthrough-or:", value));
branchBlockShortCircuitAwaitFallthrough(false, "nullish", "fn-")
    .then((value) => console.log("branch-block-short-circuit-await-fallthrough-nullish:", value));
runner.method(true, "and")
    .then((value) => console.log("method-branch-block-short-circuit-await-fallthrough-branch:", value));
runner.method(false, "and")
    .then((value) => console.log("method-branch-block-short-circuit-await-fallthrough-and:", value));
runner.method(false, "or")
    .then((value) => console.log("method-branch-block-short-circuit-await-fallthrough-or:", value));
runner.method(false, "nullish")
    .then((value) => console.log("method-branch-block-short-circuit-await-fallthrough-nullish:", value));
branchBlockShortCircuitAwaitFallthroughValue(true, "and", "arrow-")
    .then((value) => console.log("value-branch-block-short-circuit-await-fallthrough-branch:", value));
branchBlockShortCircuitAwaitFallthroughValue(false, "and", "arrow-")
    .then((value) => console.log("value-branch-block-short-circuit-await-fallthrough-and:", value));
branchBlockShortCircuitAwaitFallthroughValue(false, "or", "arrow-")
    .then((value) => console.log("value-branch-block-short-circuit-await-fallthrough-or:", value));
branchBlockShortCircuitAwaitFallthroughValue(false, "nullish", "arrow-")
    .then((value) => console.log("value-branch-block-short-circuit-await-fallthrough-nullish:", value));
