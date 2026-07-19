import { setTimeout as delay } from "node:timers/promises";

async function branchBlockPrelude(flag: boolean, prefix: string): Promise<string> {
    if (flag) {
        const label = prefix + "branch-";
        const value = await delay(1, "value");
        return label + value + "!";
    } else {
        const label = prefix + "else-";
        const value = await delay(2, "value");
        return label + value + "!";
    }
}

class BranchPreludeRunner {
    prefix: string;

    constructor(prefix: string) {
        this.prefix = prefix;
    }

    async method(flag: boolean): Promise<string> {
        if (flag) {
            const label = this.prefix + "method-branch-";
            const value = await delay(3, "value");
            return label + value + "!";
        } else {
            const label = this.prefix + "method-else-";
            const value = await delay(4, "value");
            return label + value + "!";
        }
    }
}

const branchBlockPreludeValue = async (flag: boolean, prefix: string): Promise<string> => {
    if (flag) {
        const label = prefix + "value-branch-";
        const value = await delay(5, "value");
        return label + value + "!";
    } else {
        const label = prefix + "value-else-";
        const value = await delay(6, "value");
        return label + value + "!";
    }
};

const runner = new BranchPreludeRunner("this-");

branchBlockPrelude(true, "fn-").then((value) => console.log("branch-block-prelude-true:", value));
branchBlockPrelude(false, "fn-").then((value) => console.log("branch-block-prelude-false:", value));
runner.method(true).then((value) => console.log("method-branch-block-prelude-true:", value));
runner.method(false).then((value) => console.log("method-branch-block-prelude-false:", value));
branchBlockPreludeValue(true, "arrow-").then((value) => console.log("value-branch-block-prelude-true:", value));
branchBlockPreludeValue(false, "arrow-").then((value) => console.log("value-branch-block-prelude-false:", value));
