import { setTimeout as delay } from "node:timers/promises";

async function parenthesizedConditional(flag: boolean, prefix: string): Promise<string> {
    return (flag
        ? prefix + await delay(1, "conditional-await")
        : prefix + "conditional-sync");
}

async function parenthesizedNestedConditional(outer: boolean, inner: boolean, prefix: string): Promise<string> {
    return (outer
        ? (inner
            ? prefix + await delay(2, "nested-inner")
            : prefix + "nested-sync")
        : prefix + await delay(3, "nested-fallthrough"));
}

async function parenthesizedLogicalOr(prefix: string): Promise<string> {
    return (prefix || await delay(4, "logical-or-await"));
}

async function parenthesizedLogicalAnd(flag: boolean): Promise<any> {
    return (flag && await delay(5, "logical-and-await"));
}

async function preludeParenthesizedConditional(flag: boolean, prefix: string): Promise<string> {
    const label = prefix + "prelude-";
    return (flag
        ? label + await delay(6, "conditional-await")
        : label + "conditional-sync");
}

async function parenthesizedBranchReturnAwait(flag: boolean, prefix: string): Promise<string> {
    if (flag) return (await delay(9, prefix + "branch-true"));
    return (await delay(10, prefix + "branch-false"));
}

class Worker {
    prefix: string;

    constructor(prefix: string) {
        this.prefix = prefix;
    }

    async parenthesizedConditional(flag: boolean): Promise<string> {
        return (flag
            ? this.prefix + await delay(7, "method-conditional-await")
            : this.prefix + "method-conditional-sync");
    }

    async parenthesizedBranchReturnAwait(flag: boolean): Promise<string> {
        if (flag) return (await delay(11, this.prefix + "method-branch-true"));
        return (await delay(12, this.prefix + "method-branch-false"));
    }
}

const parenthesizedValue = async (prefix: string): Promise<string> => {
    return (prefix + await delay(8, "value-await"));
};

const parenthesizedBranchValue = async (flag: boolean, prefix: string): Promise<string> => {
    if (flag) return (await delay(13, prefix + "value-branch-true"));
    return (await delay(14, prefix + "value-branch-false"));
};

parenthesizedConditional(true, "fn-").then((value: string): void => {
    console.log("parenthesized-conditional-await:", value);
});

parenthesizedConditional(false, "fn-").then((value: string): void => {
    console.log("parenthesized-conditional-sync:", value);
});

parenthesizedNestedConditional(true, true, "fn-").then((value: string): void => {
    console.log("parenthesized-nested-conditional-inner:", value);
});

parenthesizedNestedConditional(false, false, "fn-").then((value: string): void => {
    console.log("parenthesized-nested-conditional-fallthrough:", value);
});

parenthesizedLogicalOr("logical-sync").then((value: string): void => {
    console.log("parenthesized-logical-or-sync:", value);
});

parenthesizedLogicalOr("").then((value: string): void => {
    console.log("parenthesized-logical-or-await:", value);
});

parenthesizedLogicalAnd(false).then((value: any): void => {
    console.log("parenthesized-logical-and-sync:", value);
});

parenthesizedLogicalAnd(true).then((value: any): void => {
    console.log("parenthesized-logical-and-await:", value);
});

preludeParenthesizedConditional(true, "fn-").then((value: string): void => {
    console.log("prelude-parenthesized-conditional-await:", value);
});

parenthesizedBranchReturnAwait(true, "fn-").then((value: string): void => {
    console.log("parenthesized-branch-return-await-true:", value);
});

parenthesizedBranchReturnAwait(false, "fn-").then((value: string): void => {
    console.log("parenthesized-branch-return-await-false:", value);
});

new Worker("method-").parenthesizedConditional(true).then((value: string): void => {
    console.log("method-parenthesized-conditional-await:", value);
});

new Worker("method-").parenthesizedBranchReturnAwait(true).then((value: string): void => {
    console.log("method-parenthesized-branch-return-await:", value);
});

parenthesizedValue("value-").then((value: string): void => {
    console.log("value-parenthesized-return:", value);
});

parenthesizedBranchValue(true, "value-").then((value: string): void => {
    console.log("value-parenthesized-branch-return-await:", value);
});
