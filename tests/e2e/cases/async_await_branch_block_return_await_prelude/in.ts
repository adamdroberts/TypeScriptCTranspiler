import { setTimeout as delay } from "node:timers/promises";

async function branchBlockReturnAwaitPrelude(flag: boolean, prefix: string): Promise<string> {
    if (flag) {
        const label = prefix + "branch";
        return await delay(1, label);
    } else {
        const label = prefix + "else";
        return await delay(2, label);
    }
}

class ReturnAwaitPreludeRunner {
    prefix: string;

    constructor(prefix: string) {
        this.prefix = prefix;
    }

    async method(flag: boolean): Promise<string> {
        if (flag) {
            const label = this.prefix + "method-branch";
            return await delay(3, label);
        } else {
            const label = this.prefix + "method-else";
            return await delay(4, label);
        }
    }
}

const branchBlockReturnAwaitPreludeValue = async (flag: boolean, prefix: string): Promise<string> => {
    if (flag) {
        const label = prefix + "value-branch";
        return await delay(5, label);
    } else {
        const label = prefix + "value-else";
        return await delay(6, label);
    }
};

const runner = new ReturnAwaitPreludeRunner("this-");

branchBlockReturnAwaitPrelude(true, "fn-").then((value) => console.log("branch-block-return-await-prelude-true:", value));
branchBlockReturnAwaitPrelude(false, "fn-").then((value) => console.log("branch-block-return-await-prelude-false:", value));
runner.method(true).then((value) => console.log("method-branch-block-return-await-prelude-true:", value));
runner.method(false).then((value) => console.log("method-branch-block-return-await-prelude-false:", value));
branchBlockReturnAwaitPreludeValue(true, "arrow-").then((value) => console.log("value-branch-block-return-await-prelude-true:", value));
branchBlockReturnAwaitPreludeValue(false, "arrow-").then((value) => console.log("value-branch-block-return-await-prelude-false:", value));
