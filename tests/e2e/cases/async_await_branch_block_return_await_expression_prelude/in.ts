import { setTimeout as delay } from "node:timers/promises";

let trace = "";

function mark(value: string): void {
    trace = trace + value;
}

async function branchBlockReturnAwaitExpressionPrelude(flag: boolean, prefix: string): Promise<string> {
    if (flag) {
        let label = prefix + "branch";
        mark("fn-branch|");
        label = label + "-marked";
        return await delay(1, label);
    }
    let label = prefix + "fall";
    mark("fn-fall|");
    label = label + "-marked";
    return await delay(2, label);
}

class ReturnAwaitExpressionPreludeRunner {
    prefix: string;

    constructor(prefix: string) {
        this.prefix = prefix;
    }

    async method(flag: boolean): Promise<string> {
        if (flag) {
            let label = this.prefix + "method-branch";
            mark("method-branch|");
            label = label + "-marked";
            return await delay(3, label);
        }
        let label = this.prefix + "method-fall";
        mark("method-fall|");
        label = label + "-marked";
        return await delay(4, label);
    }
}

const branchBlockReturnAwaitExpressionPreludeValue = async (flag: boolean, prefix: string): Promise<string> => {
    if (flag) {
        let label = prefix + "value-branch";
        mark("value-branch|");
        label = label + "-marked";
        return await delay(5, label);
    }
    let label = prefix + "value-fall";
    mark("value-fall|");
    label = label + "-marked";
    return await delay(6, label);
};

const runner = new ReturnAwaitExpressionPreludeRunner("this-");

branchBlockReturnAwaitExpressionPrelude(true, "fn-")
    .then((value) => console.log("branch-block-return-await-expression-prelude-true:", value));
branchBlockReturnAwaitExpressionPrelude(false, "fn-")
    .then((value) => console.log("branch-block-return-await-expression-prelude-false:", value));
runner.method(true)
    .then((value) => console.log("method-branch-block-return-await-expression-prelude-true:", value));
runner.method(false)
    .then((value) => console.log("method-branch-block-return-await-expression-prelude-false:", value));
branchBlockReturnAwaitExpressionPreludeValue(true, "arrow-")
    .then((value) => console.log("value-branch-block-return-await-expression-prelude-true:", value));
branchBlockReturnAwaitExpressionPreludeValue(false, "arrow-")
    .then((value) => console.log("value-branch-block-return-await-expression-prelude-false:", value));

setTimeout(() => console.log("branch-block-return-await-expression-prelude-trace:", trace), 10);
