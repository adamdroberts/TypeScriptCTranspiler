import { setTimeout as delay } from "node:timers/promises";

async function branchBlockLeadingChain(flag: boolean, prefix: string): Promise<string> {
    if (flag) {
        const a = await delay(1, "branch-a");
        const b = await delay(2, a + "-b");
        const c = await delay(3, b + "-c");
        const d = await delay(4, c + "-d");
        const e = await delay(5, d + "-e");
        const f = await delay(6, e + "-f");
        return prefix + f;
    }
    const a = await delay(7, "fall-a");
    const b = await delay(8, a + "-b");
    const c = await delay(9, b + "-c");
    const d = await delay(10, c + "-d");
    const e = await delay(11, d + "-e");
    const f = await delay(12, e + "-f");
    return prefix + f;
}

class BranchLeadingChainRunner {
    prefix: string;

    constructor(prefix: string) {
        this.prefix = prefix;
    }

    async method(flag: boolean): Promise<string> {
        if (flag) {
            const a = await delay(13, "method-branch-a");
            const b = await delay(14, a + "-b");
            const c = await delay(15, b + "-c");
            const d = await delay(16, c + "-d");
            const e = await delay(17, d + "-e");
            const f = await delay(18, e + "-f");
            return this.prefix + f;
        }
        const a = await delay(19, "method-fall-a");
        const b = await delay(20, a + "-b");
        const c = await delay(21, b + "-c");
        const d = await delay(22, c + "-d");
        const e = await delay(23, d + "-e");
        const f = await delay(24, e + "-f");
        return this.prefix + f;
    }
}

const branchBlockLeadingChainValue = async (flag: boolean, prefix: string): Promise<string> => {
    if (flag) {
        const a = await delay(25, "value-branch-a");
        const b = await delay(26, a + "-b");
        const c = await delay(27, b + "-c");
        const d = await delay(28, c + "-d");
        const e = await delay(29, d + "-e");
        const f = await delay(30, e + "-f");
        return prefix + f;
    }
    const a = await delay(31, "value-fall-a");
    const b = await delay(32, a + "-b");
    const c = await delay(33, b + "-c");
    const d = await delay(34, c + "-d");
    const e = await delay(35, d + "-e");
    const f = await delay(36, e + "-f");
    return prefix + f;
};

const runner = new BranchLeadingChainRunner("this-");

branchBlockLeadingChain(true, "fn-")
    .then((value) => console.log("branch-block-leading-chain-true:", value));
branchBlockLeadingChain(false, "fn-")
    .then((value) => console.log("branch-block-leading-chain-false:", value));
runner.method(true)
    .then((value) => console.log("method-branch-block-leading-chain-true:", value));
runner.method(false)
    .then((value) => console.log("method-branch-block-leading-chain-false:", value));
branchBlockLeadingChainValue(true, "arrow-")
    .then((value) => console.log("value-branch-block-leading-chain-true:", value));
branchBlockLeadingChainValue(false, "arrow-")
    .then((value) => console.log("value-branch-block-leading-chain-false:", value));
