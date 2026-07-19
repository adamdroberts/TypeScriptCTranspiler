import { setTimeout as delay } from "node:timers/promises";

const awaitedLocal = async function namedAwaitedLocal(prefix: string): Promise<string> {
    const value = await delay(1, "local");
    return prefix + value + "!";
};

const branchValue = async function namedBranchValue(flag: boolean, prefix: string): Promise<string> {
    if (flag) {
        const value = await delay(1, "branch");
        return prefix + value + "!";
    }
    const fallback = await delay(1, "fallthrough");
    return prefix + fallback + "!";
};

const leadingValue = async function namedLeadingValue(prefix: string): Promise<string> {
    const first = await delay(1, "first");
    const second = await delay(1, first + "-second");
    return prefix + second + "!";
};

awaitedLocal("named-")
    .then((value: string): Promise<string> => {
        console.log("named-awaited-local:", value);
        return branchValue(true, "named-");
    })
    .then((value: string): Promise<string> => {
        console.log("named-branch-true:", value);
        return branchValue(false, "named-");
    })
    .then((value: string): Promise<string> => {
        console.log("named-branch-false:", value);
        return leadingValue("named-");
    })
    .then((value: string): void => {
        console.log("named-leading:", value);
    });
