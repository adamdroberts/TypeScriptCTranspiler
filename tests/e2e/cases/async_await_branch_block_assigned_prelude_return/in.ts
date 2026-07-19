import { setTimeout as delay } from "node:timers/promises";

async function branchBlockAssignedPrelude(flag: boolean, prefix: string): Promise<string> {
    if (flag) {
        let label: string;
        label = prefix + "branch-";
        const value = await delay(1, "value");
        return label + value + "!";
    } else {
        let label: string;
        label = prefix + "else-";
        const value = await delay(2, "value");
        return label + value + "!";
    }
}

class AssignedPreludeRunner {
    prefix: string;

    constructor(prefix: string) {
        this.prefix = prefix;
    }

    async method(flag: boolean): Promise<string> {
        if (flag) {
            let label: string;
            label = this.prefix + "method-branch-";
            const value = await delay(3, "value");
            return label + value + "!";
        } else {
            let label: string;
            label = this.prefix + "method-else-";
            const value = await delay(4, "value");
            return label + value + "!";
        }
    }
}

const branchBlockAssignedPreludeValue = async (flag: boolean, prefix: string): Promise<string> => {
    if (flag) {
        let label: string;
        label = prefix + "value-branch-";
        const value = await delay(5, "value");
        return label + value + "!";
    } else {
        let label: string;
        label = prefix + "value-else-";
        const value = await delay(6, "value");
        return label + value + "!";
    }
};

const runner = new AssignedPreludeRunner("this-");

branchBlockAssignedPrelude(true, "fn-").then((value) => console.log("branch-block-assigned-prelude-true:", value));
branchBlockAssignedPrelude(false, "fn-").then((value) => console.log("branch-block-assigned-prelude-false:", value));
runner.method(true).then((value) => console.log("method-branch-block-assigned-prelude-true:", value));
runner.method(false).then((value) => console.log("method-branch-block-assigned-prelude-false:", value));
branchBlockAssignedPreludeValue(true, "arrow-").then((value) => console.log("value-branch-block-assigned-prelude-true:", value));
branchBlockAssignedPreludeValue(false, "arrow-").then((value) => console.log("value-branch-block-assigned-prelude-false:", value));
