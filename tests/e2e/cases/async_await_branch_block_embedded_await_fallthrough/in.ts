import { setTimeout as delay } from "node:timers/promises";

async function branchBlockEmbeddedAwaitFallthrough(flag: boolean, prefix: string): Promise<string> {
    if (flag) {
        const value = await delay(1, "branch");
        return prefix + value;
    }
    const label = prefix + "fall-";
    return label + await delay(2, "embedded");
}

class EmbeddedAwaitFallthroughRunner {
    prefix: string;

    constructor(prefix: string) {
        this.prefix = prefix;
    }

    async method(flag: boolean): Promise<string> {
        if (flag) {
            const value = await delay(3, "method-branch");
            return this.prefix + value;
        }
        const label = this.prefix + "method-fall-";
        return label + await delay(4, "embedded");
    }
}

const branchBlockEmbeddedAwaitFallthroughValue = async (flag: boolean, prefix: string): Promise<string> => {
    if (flag) {
        const value = await delay(5, "value-branch");
        return prefix + value;
    }
    const label = prefix + "value-fall-";
    return label + await delay(6, "embedded");
};

const runner = new EmbeddedAwaitFallthroughRunner("this-");

branchBlockEmbeddedAwaitFallthrough(true, "fn-")
    .then((value) => console.log("branch-block-embedded-await-fallthrough-true:", value));
branchBlockEmbeddedAwaitFallthrough(false, "fn-")
    .then((value) => console.log("branch-block-embedded-await-fallthrough-false:", value));
runner.method(true)
    .then((value) => console.log("method-branch-block-embedded-await-fallthrough-true:", value));
runner.method(false)
    .then((value) => console.log("method-branch-block-embedded-await-fallthrough-false:", value));
branchBlockEmbeddedAwaitFallthroughValue(true, "arrow-")
    .then((value) => console.log("value-branch-block-embedded-await-fallthrough-true:", value));
branchBlockEmbeddedAwaitFallthroughValue(false, "arrow-")
    .then((value) => console.log("value-branch-block-embedded-await-fallthrough-false:", value));
