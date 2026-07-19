import { setTimeout as delay } from "node:timers/promises";

async function declaration(flag: boolean): Promise<string> {
    let total = 0;
    if (flag) {
        while (total < 2) {
            let step;
            step = 1;
            total = total + step;
        }
        return await delay(1, "declaration-while-" + total);
    }
    for (let key in { first: 1, second: 2 }) {
        total = total + (key === "first" ? 1 : 2);
    }
    return await delay(2, "declaration-in-" + total);
}

class Worker {
    async run(flag: boolean): Promise<string> {
        let total = 0;
        if (flag) {
            do {
                let step;
                step = 1;
                total = total + step;
            } while (total < 2);
            return await delay(3, "method-do-" + total);
        }
        for (let value of [1, 2]) {
            total = total + value;
        }
        return await delay(4, "method-of-" + total);
    }
}

const value = async (flag: boolean): Promise<string> => {
    let total = 0;
    if (flag) {
        for (let key in { first: 1, second: 2 }) {
            total = total + (key === "first" ? 1 : 2);
        }
        return await delay(5, "value-in-" + total);
    }
    while (total < 2) {
        let step;
        step = 1;
        total = total + step;
    }
    return await delay(6, "value-while-" + total);
};

declaration(true).then((result) => console.log("declaration-while:", result));
declaration(false).then((result) => console.log("declaration-in:", result));
new Worker().run(true).then((result) => console.log("method-do:", result));
new Worker().run(false).then((result) => console.log("method-of:", result));
value(true).then((result) => console.log("value-in:", result));
value(false).then((result) => console.log("value-while:", result));
