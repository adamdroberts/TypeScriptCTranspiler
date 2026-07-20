import { setTimeout as delay } from "node:timers/promises";

async function declaration(outer: boolean, inner: boolean): Promise<string> {
    if (outer) {
        if (inner) {
            const first = await delay(1, "declaration-true");
            await delay(2, first + "-next");
        } else {
            const first = await delay(3, "declaration-inner-false");
            await delay(4, first + "-next");
        }
    } else {
        const first = await delay(5, "declaration-outer-false");
        await delay(6, first + "-next");
    }
    return "declaration-done";
}

class Worker {
    async run(outer: boolean, inner: boolean): Promise<string> {
        if (outer) {
            if (inner) {
                const first = await delay(7, "method-true");
                await delay(8, first + "-next");
            } else {
                const first = await delay(9, "method-inner-false");
                await delay(10, first + "-next");
            }
        } else {
            const first = await delay(11, "method-outer-false");
            await delay(12, first + "-next");
        }
        return "method-done";
    }
}

const value = async (outer: boolean, inner: boolean): Promise<string> => {
    if (outer) {
        if (inner) {
            const first = await delay(13, "value-true");
            await delay(14, first + "-next");
        } else {
            const first = await delay(15, "value-inner-false");
            await delay(16, first + "-next");
        }
    } else {
        const first = await delay(17, "value-outer-false");
        await delay(18, first + "-next");
    }
    return "value-done";
};

declaration(true, true).then((result) => console.log("declaration-a:", result));
declaration(true, false).then((result) => console.log("declaration-b:", result));
declaration(false, false).then((result) => console.log("declaration-c:", result));
new Worker().run(true, true).then((result) => console.log("method-a:", result));
new Worker().run(true, false).then((result) => console.log("method-b:", result));
new Worker().run(false, false).then((result) => console.log("method-c:", result));
value(true, true).then((result) => console.log("value-a:", result));
value(true, false).then((result) => console.log("value-b:", result));
value(false, false).then((result) => console.log("value-c:", result));
