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
    const final = await delay(5, outer ? (inner ? "declaration-two" : "declaration-one") : "declaration-fallback");
    return final;
}

class Worker {
    async run(outer: boolean, inner: boolean): Promise<string> {
        if (outer) {
            if (inner) {
                await delay(6, "first");
                await delay(7, "second");
            } else {
                await delay(8, "only");
            }
        } else {
            await delay(9, "fallback");
        }
        const final = await delay(10, outer ? (inner ? "method-two" : "method-one") : "method-fallback");
        return final;
    }
}

const value = async (outer: boolean, inner: boolean): Promise<string> => {
    if (outer) {
        if (inner) {
            await delay(11, "first");
            await delay(12, "second");
        } else {
            await delay(13, "only");
        }
    } else {
        await delay(14, "fallback");
    }
    const final = await delay(15, outer ? (inner ? "value-two" : "value-one") : "value-fallback");
    return final;
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
