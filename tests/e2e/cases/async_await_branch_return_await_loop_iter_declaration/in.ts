import { setTimeout as delay } from "node:timers/promises";

async function declaration(flag: boolean): Promise<string> {
    let total = 0;
    if (flag) {
        for (const value of [1, 2]) {
            total = total + value;
        }
        return await delay(1, "declaration-of-" + total);
    }
    for (const key in { first: 1, second: 2 }) {
        total = total + (key === "first" ? 1 : 2);
    }
    return await delay(2, "declaration-in-" + total);
}

class Worker {
    async run(flag: boolean): Promise<string> {
        let total = 0;
        if (flag) {
            for (const value of [1, 2]) {
                total = total + value;
            }
            return await delay(3, "method-of-" + total);
        }
        for (const key in { first: 1, second: 2 }) {
            total = total + (key === "first" ? 1 : 2);
        }
        return await delay(4, "method-in-" + total);
    }
}

const value = async (flag: boolean): Promise<string> => {
    let total = 0;
    if (flag) {
        for (const item of [1, 2]) {
            total = total + item;
        }
        return await delay(5, "value-of-" + total);
    }
    for (const key in { first: 1, second: 2 }) {
        total = total + (key === "first" ? 1 : 2);
    }
    return await delay(6, "value-in-" + total);
};

declaration(true).then((result) => console.log("declaration-of:", result));
declaration(false).then((result) => console.log("declaration-in:", result));
new Worker().run(true).then((result) => console.log("method-of:", result));
new Worker().run(false).then((result) => console.log("method-in:", result));
value(true).then((result) => console.log("value-of:", result));
value(false).then((result) => console.log("value-in:", result));
