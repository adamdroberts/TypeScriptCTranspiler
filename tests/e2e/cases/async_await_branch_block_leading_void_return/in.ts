import { setTimeout as delay } from "node:timers/promises";

async function branchBlockLeadingVoid(flag: boolean, prefix: string): Promise<string> {
    if (flag) {
        const first = await delay(1, "branch-a");
        const seq = await delay(2);
        const second = await delay(3, first + "-b");
        return prefix + second;
    } else {
        const first = await delay(4, "else-a");
        const seq = await delay(5);
        const second = await delay(6, first + "-b");
        return prefix + second;
    }
}

class LeadingVoidRunner {
    prefix: string;

    constructor(prefix: string) {
        this.prefix = prefix;
    }

    async method(flag: boolean): Promise<string> {
        if (flag) {
            const first = await delay(7, "method-branch-a");
            const seq = await delay(8);
            const second = await delay(9, first + "-b");
            return this.prefix + second;
        } else {
            const first = await delay(10, "method-else-a");
            const seq = await delay(11);
            const second = await delay(12, first + "-b");
            return this.prefix + second;
        }
    }
}

const branchBlockLeadingVoidValue = async (flag: boolean, prefix: string): Promise<string> => {
    if (flag) {
        const first = await delay(13, "value-branch-a");
        const seq = await delay(14);
        const second = await delay(15, first + "-b");
        return prefix + second;
    } else {
        const first = await delay(16, "value-else-a");
        const seq = await delay(17);
        const second = await delay(18, first + "-b");
        return prefix + second;
    }
};

const runner = new LeadingVoidRunner("this-");

branchBlockLeadingVoid(true, "fn-").then((value) => console.log("branch-block-leading-void-true:", value));
branchBlockLeadingVoid(false, "fn-").then((value) => console.log("branch-block-leading-void-false:", value));
runner.method(true).then((value) => console.log("method-branch-block-leading-void-true:", value));
runner.method(false).then((value) => console.log("method-branch-block-leading-void-false:", value));
branchBlockLeadingVoidValue(true, "arrow-").then((value) => console.log("value-branch-block-leading-void-true:", value));
branchBlockLeadingVoidValue(false, "arrow-").then((value) => console.log("value-branch-block-leading-void-false:", value));
