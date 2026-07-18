import { setTimeout as delay } from "node:timers/promises";

function makeInline(): (prefix: string) => Promise<string> {
    return async (prefix: string): Promise<string> => {
        return prefix + await delay(1, "inline") + "!";
    };
}

function makeBranch(): (flag: boolean, prefix: string) => Promise<string> {
    return async (flag: boolean, prefix: string): Promise<string> => {
        if (flag) return prefix + await delay(2, "branch-true") + "!";
        return prefix + await delay(3, "branch-false") + "!";
    };
}

function makeConditional(): (flag: boolean, prefix: string) => Promise<string> {
    return async function (flag: boolean, prefix: string): Promise<string> {
        return flag
            ? prefix + await delay(4, "conditional-true") + "!"
            : prefix + "conditional-sync!";
    };
}

function makeLogical(): (left: string) => Promise<string> {
    return async function (left: string): Promise<string> {
        return left || await delay(5, "logical-await");
    };
}

function makePrelude(): (prefix: string) => Promise<string> {
    return async (prefix: string): Promise<string> => {
        const label = prefix + "prelude-";
        return label + await delay(6, "await") + "!";
    };
}

function makeTwoAwait(): (prefix: string) => Promise<string> {
    return async (prefix: string): Promise<string> => {
        const first = await delay(7, "one");
        const second = await delay(8, prefix + first + "-two");
        return first + ":" + second + "!";
    };
}

const inline = makeInline();
const branch = makeBranch();
const conditional = makeConditional();
const logical = makeLogical();
const prelude = makePrelude();
const twoAwait = makeTwoAwait();

inline("closure-").then((value: string): void => {
    console.log("closure-inline:", value);
});

branch(true, "closure-").then((value: string): void => {
    console.log("closure-branch-true:", value);
});

branch(false, "closure-").then((value: string): void => {
    console.log("closure-branch-false:", value);
});

conditional(true, "closure-").then((value: string): void => {
    console.log("closure-conditional-await:", value);
});

conditional(false, "closure-").then((value: string): void => {
    console.log("closure-conditional-sync:", value);
});

logical("logical-sync").then((value: string): void => {
    console.log("closure-logical-sync:", value);
});

logical("").then((value: string): void => {
    console.log("closure-logical-await:", value);
});

prelude("closure-").then((value: string): void => {
    console.log("closure-prelude:", value);
});

twoAwait("closure-").then((value: string): void => {
    console.log("closure-two-await:", value);
});
