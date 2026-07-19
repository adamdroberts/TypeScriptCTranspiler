import { setTimeout as delay } from "node:timers/promises";

async function declaration(flag: boolean, prefix: string): Promise<string> {
    if (flag) {
        let count = 0;
        while (count < 2) {
            count = count + 1;
        }
        return await delay(1, prefix + "branch-" + count);
    }
    let count = 0;
    while (count < 3) {
        count = count + 1;
    }
    return await delay(2, prefix + "fall-" + count);
}

class Worker {
    async run(flag: boolean, prefix: string): Promise<string> {
        if (flag) {
            let count = 0;
            while (count < 2) {
                count = count + 1;
            }
            return await delay(3, prefix + "method-branch-" + count);
        }
        let count = 0;
        while (count < 3) {
            count = count + 1;
        }
        return await delay(4, prefix + "method-fall-" + count);
    }
}

const value = async (flag: boolean, prefix: string): Promise<string> => {
    if (flag) {
        let count = 0;
        while (count < 2) {
            count = count + 1;
        }
        return await delay(5, prefix + "value-branch-" + count);
    }
    let count = 0;
    while (count < 3) {
        count = count + 1;
    }
    return await delay(6, prefix + "value-fall-" + count);
};

declaration(true, "fn-").then((result) => console.log("declaration-branch:", result));
declaration(false, "fn-").then((result) => console.log("declaration-fall:", result));
new Worker().run(true, "this-").then((result) => console.log("method-branch:", result));
new Worker().run(false, "this-").then((result) => console.log("method-fall:", result));
value(true, "arrow-").then((result) => console.log("value-branch:", result));
value(false, "arrow-").then((result) => console.log("value-fall:", result));
