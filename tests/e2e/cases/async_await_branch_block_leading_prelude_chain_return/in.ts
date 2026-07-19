import { setTimeout as delay } from "node:timers/promises";

async function branchBlockLeadingPreludeChain(flag: boolean, prefix: string): Promise<string> {
    const root = prefix + "root-";
    if (flag) {
        const label = root + "branch-";
        const a = await delay(1, "a");
        const b = await delay(2, label + a + "-b");
        const c = await delay(3, b + "-c");
        const d = await delay(4, c + "-d");
        const e = await delay(5, d + "-e");
        const f = await delay(6, e + "-f");
        const g = await delay(7, f + "-g");
        return label + g;
    }
    const label = root + "fall-";
    const a = await delay(8, "a");
    const b = await delay(9, label + a + "-b");
    const c = await delay(10, b + "-c");
    const d = await delay(11, c + "-d");
    const e = await delay(12, d + "-e");
    const f = await delay(13, e + "-f");
    const g = await delay(14, f + "-g");
    return label + g;
}

class LeadingPreludeChainRunner {
    prefix: string;

    constructor(prefix: string) {
        this.prefix = prefix;
    }

    async method(flag: boolean): Promise<string> {
        const root = this.prefix + "root-";
        if (flag) {
            const label = root + "method-branch-";
            const a = await delay(15, "a");
            const b = await delay(16, label + a + "-b");
            const c = await delay(17, b + "-c");
            const d = await delay(18, c + "-d");
            const e = await delay(19, d + "-e");
            const f = await delay(20, e + "-f");
            const g = await delay(21, f + "-g");
            return label + g;
        }
        const label = root + "method-fall-";
        const a = await delay(22, "a");
        const b = await delay(23, label + a + "-b");
        const c = await delay(24, b + "-c");
        const d = await delay(25, c + "-d");
        const e = await delay(26, d + "-e");
        const f = await delay(27, e + "-f");
        const g = await delay(28, f + "-g");
        return label + g;
    }
}

const branchBlockLeadingPreludeChainValue = async (flag: boolean, prefix: string): Promise<string> => {
    const root = prefix + "root-";
    if (flag) {
        const label = root + "value-branch-";
        const a = await delay(29, "a");
        const b = await delay(30, label + a + "-b");
        const c = await delay(31, b + "-c");
        const d = await delay(32, c + "-d");
        const e = await delay(33, d + "-e");
        const f = await delay(34, e + "-f");
        const g = await delay(35, f + "-g");
        return label + g;
    }
    const label = root + "value-fall-";
    const a = await delay(36, "a");
    const b = await delay(37, label + a + "-b");
    const c = await delay(38, b + "-c");
    const d = await delay(39, c + "-d");
    const e = await delay(40, d + "-e");
    const f = await delay(41, e + "-f");
    const g = await delay(42, f + "-g");
    return label + g;
};

const runner = new LeadingPreludeChainRunner("this-");

branchBlockLeadingPreludeChain(true, "fn-")
    .then((value) => console.log("branch-block-leading-prelude-chain-true:", value));
branchBlockLeadingPreludeChain(false, "fn-")
    .then((value) => console.log("branch-block-leading-prelude-chain-false:", value));
runner.method(true)
    .then((value) => console.log("method-branch-block-leading-prelude-chain-true:", value));
runner.method(false)
    .then((value) => console.log("method-branch-block-leading-prelude-chain-false:", value));
branchBlockLeadingPreludeChainValue(true, "arrow-")
    .then((value) => console.log("value-branch-block-leading-prelude-chain-true:", value));
branchBlockLeadingPreludeChainValue(false, "arrow-")
    .then((value) => console.log("value-branch-block-leading-prelude-chain-false:", value));
