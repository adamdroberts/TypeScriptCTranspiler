import { setTimeout as delay } from "node:timers/promises";

async function declaration(outer: boolean, inner: boolean): Promise<string> {
    if (outer) {
        if (inner) {
            await delay(1, "first");
            await delay(2, "second");
        } else {
            await delay(3, "first");
            await delay(4, "second");
        }
    } else {
        await delay(5, "first");
        await delay(6, "second");
    }
    return outer ? (inner ? "declaration-true-true" : "declaration-true-false") : "declaration-false";
}

class Worker {
    async run(outer: boolean, inner: boolean): Promise<string> {
        if (outer) {
            if (inner) {
                await delay(7, "first");
                await delay(8, "second");
            } else {
                await delay(9, "first");
                await delay(10, "second");
            }
        } else {
            await delay(11, "first");
            await delay(12, "second");
        }
        return outer ? (inner ? "method-true-true" : "method-true-false") : "method-false";
    }
}

const value = async (outer: boolean, inner: boolean): Promise<string> => {
    if (outer) {
        if (inner) {
            await delay(13, "first");
            await delay(14, "second");
        } else {
            await delay(15, "first");
            await delay(16, "second");
        }
    } else {
        await delay(17, "first");
        await delay(18, "second");
    }
    return outer ? (inner ? "value-true-true" : "value-true-false") : "value-false";
};

declaration(true, true).then((result) => console.log(result));
declaration(true, false).then((result) => console.log(result));
declaration(false, false).then((result) => console.log(result));
new Worker().run(true, true).then((result) => console.log(result));
new Worker().run(true, false).then((result) => console.log(result));
new Worker().run(false, false).then((result) => console.log(result));
value(true, true).then((result) => console.log(result));
value(true, false).then((result) => console.log(result));
value(false, false).then((result) => console.log(result));
