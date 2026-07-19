import { setTimeout as delay } from "node:timers/promises";

async function declaration(kind: number): Promise<string> {
    let first = "seed";
    if (kind === 0) {
        first = await delay(1, "zero-one");
        first = await delay(1, first + "-two");
    } else if (kind === 1) {
        first = await delay(1, "one-one");
        first = await delay(1, first + "-two");
    } else {
        first = await delay(1, "other-one");
        first = await delay(1, first + "-two");
    }
    const third = await delay(1, first + "-three");
    return third;
}

class Worker {
    async run(kind: number): Promise<string> {
        let first = "method-seed";
        if (kind === 0) {
            first = await delay(1, "method-zero-one");
            first = await delay(1, first + "-two");
        } else if (kind === 1) {
            first = await delay(1, "method-one-one");
            first = await delay(1, first + "-two");
        } else {
            first = await delay(1, "method-other-one");
            first = await delay(1, first + "-two");
        }
        const third = await delay(1, first + "-three");
        return third;
    }
}

const value = async function(kind: number): Promise<string> {
    let first = "value-seed";
    if (kind === 0) {
        first = await delay(1, "value-zero-one");
        first = await delay(1, first + "-two");
    } else if (kind === 1) {
        first = await delay(1, "value-one-one");
        first = await delay(1, first + "-two");
    } else {
        first = await delay(1, "value-other-one");
        first = await delay(1, first + "-two");
    }
    const third = await delay(1, first + "-three");
    return third;
};

async function branch(outer: boolean, kind: number): Promise<string> {
    if (outer) {
        let first = "branch-seed";
        if (kind === 0) {
            first = await delay(1, "branch-zero-one");
            first = await delay(1, first + "-two");
        } else if (kind === 1) {
            first = await delay(1, "branch-one-one");
            first = await delay(1, first + "-two");
        } else {
            first = await delay(1, "branch-other-one");
            first = await delay(1, first + "-two");
        }
        const third = await delay(1, first + "-three");
        return third;
    }
    return "fallthrough";
}

declaration(0).then((result: string): void => console.log("declaration-zero:", result));
declaration(2).then((result: string): void => console.log("declaration-other:", result));
new Worker().run(1).then((result: string): void => console.log("method-one:", result));
value(0).then((result: string): void => console.log("value-zero:", result));
branch(true, 2).then((result: string): void => console.log("branch-other:", result));
branch(false, 0).then((result: string): void => console.log("branch-fallthrough:", result));
