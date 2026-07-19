import { setTimeout as delay } from "node:timers/promises";

const awaitedLocal = async (prefix: string): Promise<string> => {
    const value = await delay(1, "local");
    return prefix + value + "!";
};

const branchBlock = async (flag: boolean, prefix: string): Promise<string> => {
    if (flag) {
        const value = await delay(1, "branch");
        return prefix + value + "!";
    }
    const fallback = await delay(1, "fallthrough");
    return prefix + fallback + "!";
};

const leadingAwaitChain = async (prefix: string): Promise<string> => {
    const first = await delay(1, "first");
    const ignored = await delay(1);
    const second = await delay(1, first + "-second");
    return prefix + second + "!";
};

const preludeLocal = async (prefix: string): Promise<string> => {
    const label = prefix + "prelude-";
    const value = await delay(1, "value");
    return label + value + "!";
};

Promise.resolve()
    .then((_ignored: any): Promise<string> => awaitedLocal("arrow-"))
    .then((value: string): Promise<string> => {
        console.log("awaited-local:", value);
        return branchBlock(true, "arrow-");
    })
    .then((value: string): Promise<string> => {
        console.log("branch-true:", value);
        return branchBlock(false, "arrow-");
    })
    .then((value: string): Promise<string> => {
        console.log("branch-false:", value);
        return leadingAwaitChain("arrow-");
    })
    .then((value: string): Promise<string> => {
        console.log("leading-chain:", value);
        return preludeLocal("arrow-");
    })
    .then((value: string): void => {
        console.log("prelude-local:", value);
    });
