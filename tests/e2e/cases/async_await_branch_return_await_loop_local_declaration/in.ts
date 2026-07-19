import { setTimeout as delay } from "node:timers/promises";

async function declaration(flag: boolean): Promise<string> {
    let total = 0;
    if (flag) {
        while (total < 2) {
            const step = 1;
            total = total + step;
        }
        return await delay(1, "declaration-" + total);
    }
    for (let index = 0; index < 2; index = index + 1) {
        total = total + 1;
    }
    return await delay(2, "declaration-fall-" + total);
}

class Worker {
    async run(flag: boolean): Promise<string> {
        let total = 0;
        if (flag) {
            do {
                const step = 1;
                total = total + step;
            } while (total < 2);
            return await delay(3, "method-" + total);
        }
        for (let index = 0; index < 2; index = index + 1) {
            total = total + 1;
        }
        return await delay(4, "method-fall-" + total);
    }
}

const value = async (flag: boolean): Promise<string> => {
    let total = 0;
    if (flag) {
        for (let index = 0; index < 2; index = index + 1) {
            const step = 1;
            total = total + step;
        }
        return await delay(5, "value-" + total);
    }
    while (total < 2) {
        const step = 1;
        total = total + step;
    }
    return await delay(6, "value-fall-" + total);
};

declaration(true).then((result) => console.log("declaration-branch:", result));
declaration(false).then((result) => console.log("declaration-fall:", result));
new Worker().run(true).then((result) => console.log("method-branch:", result));
new Worker().run(false).then((result) => console.log("method-fall:", result));
value(true).then((result) => console.log("value-branch:", result));
value(false).then((result) => console.log("value-fall:", result));
