import { setTimeout as delay } from "node:timers/promises";

async function declaration(outer: boolean, inner: boolean): Promise<string> {
    let result = "declaration-initial";
    if (outer) {
        if (inner) {
            const first = await delay(1, "declaration-two");
            result = first;
            await delay(2, "sequencing");
        } else {
            const first = await delay(3, "declaration-one");
            result = first;
        }
    } else {
        const first = await delay(4, "declaration-fallback");
        result = first;
    }
    return result;
}

class Worker {
    async run(outer: boolean, inner: boolean): Promise<string> {
        let result = "method-initial";
        if (outer) {
            if (inner) {
                const first = await delay(5, "method-two");
                result = first;
                await delay(6, "sequencing");
            } else {
                const first = await delay(7, "method-one");
                result = first;
            }
        } else {
            const first = await delay(8, "method-fallback");
            result = first;
        }
        return result;
    }
}

const value = async (outer: boolean, inner: boolean): Promise<string> => {
    let result = "value-initial";
    if (outer) {
        if (inner) {
            const first = await delay(9, "value-two");
            result = first;
            await delay(10, "sequencing");
        } else {
            const first = await delay(11, "value-one");
            result = first;
        }
    } else {
        const first = await delay(12, "value-fallback");
        result = first;
    }
    return result;
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
