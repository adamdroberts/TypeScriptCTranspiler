import { setTimeout as delay } from "node:timers/promises";

async function declaration(kind: number): Promise<string> {
    if (kind === 0) {
        const zeroMarker = "zero-", zero = await delay(1, zeroMarker + "one");
        var zeroPostMarker;
        zeroPostMarker = "zero-post-";
        const zeroAgain = await delay(1, zeroPostMarker + "two");
    } else {
        const otherMarker = "other-", other = await delay(1, otherMarker + "one");
        var otherPostMarker;
        otherPostMarker = "other-post-";
        const otherAgain = await delay(1, otherPostMarker + "two");
    }
    return "declaration-done";
}

class Worker {
    async run(kind: number): Promise<string> {
        if (kind === 0) {
            const zero = await delay(1, "method-zero-one");
            const zeroAgain = await delay(1, "method-zero-two");
        } else {
            const other = await delay(1, "method-other-one");
            const otherAgain = await delay(1, "method-other-two");
        }
        return "method-done";
    }
}

const value = async (kind: number): Promise<string> => {
    if (kind === 0) {
        const zero = await delay(1, "value-zero-one");
        const zeroAgain = await delay(1, "value-zero-two");
    } else {
        const other = await delay(1, "value-other-one");
        const otherAgain = await delay(1, "value-other-two");
    }
    return "value-done";
};

async function branch(outer: boolean, kind: number): Promise<string> {
    if (outer) {
        if (kind === 0) {
            const zero = await delay(1, "branch-zero-one");
            const zeroAgain = await delay(1, "branch-zero-two");
        } else {
            const other = await delay(1, "branch-other-one");
            const otherAgain = await delay(1, "branch-other-two");
        }
        return "branch-done";
    }
    return "fallthrough";
}

declaration(0).then((result: string): void => console.log("declaration:", result));
new Worker().run(1).then((result: string): void => console.log("method:", result));
value(0).then((result: string): void => console.log("value:", result));
branch(true, 1).then((result: string): void => console.log("branch:", result));
branch(false, 0).then((result: string): void => console.log("fallthrough:", result));
