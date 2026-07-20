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
    throw outer ? (inner ? "declaration-two" : "declaration-one") : "declaration-fallback";
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
        throw outer ? (inner ? "method-two" : "method-one") : "method-fallback";
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
    throw outer ? (inner ? "value-two" : "value-one") : "value-fallback";
};

declaration(true, true).catch((reason) => console.log("declaration-two:", reason));
declaration(true, false).catch((reason) => console.log("declaration-one:", reason));
declaration(false, false).catch((reason) => console.log("declaration-fallback:", reason));
new Worker().run(true, true).catch((reason) => console.log("method-two:", reason));
new Worker().run(true, false).catch((reason) => console.log("method-one:", reason));
new Worker().run(false, false).catch((reason) => console.log("method-fallback:", reason));
value(true, true).catch((reason) => console.log("value-two:", reason));
value(true, false).catch((reason) => console.log("value-one:", reason));
value(false, false).catch((reason) => console.log("value-fallback:", reason));
