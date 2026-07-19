import { setTimeout as delay } from "node:timers/promises";

async function declaration(outer: boolean, inner: boolean): Promise<string> {
    if (outer) {
        if (inner) {
            await delay(1, "first");
            await delay(2, "second");
        } else {
            await delay(3, "only");
        }
    } else {
        await delay(4, "fallback");
    }
    return outer ? (inner ? "declaration-two" : "declaration-one") : "declaration-fallback";
}

class Worker {
    async run(outer: boolean, inner: boolean): Promise<string> {
        if (outer) {
            if (inner) {
                await delay(5, "first");
                await delay(6, "second");
            } else {
                await delay(7, "only");
            }
        } else {
            await delay(8, "fallback");
        }
        return outer ? (inner ? "method-two" : "method-one") : "method-fallback";
    }
}

const value = async (outer: boolean, inner: boolean): Promise<string> => {
    if (outer) {
        if (inner) {
            await delay(9, "first");
            await delay(10, "second");
        } else {
            await delay(11, "only");
        }
    } else {
        await delay(12, "fallback");
    }
    return outer ? (inner ? "value-two" : "value-one") : "value-fallback";
};

declaration(true, true).then((result) => console.log("declaration-two:", result));
declaration(true, false).then((result) => console.log("declaration-one:", result));
declaration(false, false).then((result) => console.log("declaration-fallback:", result));
new Worker().run(true, true).then((result) => console.log("method-two:", result));
new Worker().run(true, false).then((result) => console.log("method-one:", result));
new Worker().run(false, false).then((result) => console.log("method-fallback:", result));
value(true, true).then((result) => console.log("value-two:", result));
value(true, false).then((result) => console.log("value-one:", result));
value(false, false).then((result) => console.log("value-fallback:", result));
