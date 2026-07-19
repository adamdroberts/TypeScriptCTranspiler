import { setTimeout as delay } from "node:timers/promises";

async function declaration(flag: boolean): Promise<string> {
    let total = 0;
    try {
        const step = 1;
        if (flag) throw "rejected";
        total = total + step;
    } catch (reason) {
        const recovery = reason === "rejected" ? 2 : 0;
        total = total + recovery;
    } finally {
        let finish;
        finish = 1;
        total = total + finish;
    }
    return await delay(1, "declaration-" + total);
}

class Worker {
    async run(flag: boolean): Promise<string> {
        let total = 0;
        try {
            const step = 1;
            if (flag) throw "rejected";
            total = total + step;
        } catch (reason) {
            const recovery = reason === "rejected" ? 2 : 0;
            total = total + recovery;
        } finally {
            let finish;
            finish = 1;
            total = total + finish;
        }
        return await delay(2, "method-" + total);
    }
}

const value = async (flag: boolean): Promise<string> => {
    let total = 0;
    try {
        const step = 1;
        if (flag) throw "rejected";
        total = total + step;
    } catch (reason) {
        const recovery = reason === "rejected" ? 2 : 0;
        total = total + recovery;
    } finally {
        let finish;
        finish = 1;
        total = total + finish;
    }
    return await delay(3, "value-" + total);
};

declaration(false).then((result) => console.log("declaration-ok:", result));
declaration(true).then((result) => console.log("declaration-catch:", result));
new Worker().run(false).then((result) => console.log("method-ok:", result));
new Worker().run(true).then((result) => console.log("method-catch:", result));
value(false).then((result) => console.log("value-ok:", result));
value(true).then((result) => console.log("value-catch:", result));
