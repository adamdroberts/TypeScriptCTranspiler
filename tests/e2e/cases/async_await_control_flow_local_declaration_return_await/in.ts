import { setTimeout as delay } from "node:timers/promises";

async function declaration(flag: boolean, kind: number): Promise<string> {
    let total = 0;
    if (flag) {
        const step = 1;
        total = total + step;
    } else {
        let step;
        step = 2;
        total = total + step;
    }
    switch (kind) {
        case 1: {
            const extra = 1;
            total = total + extra;
            break;
        }
        default: {
            let extra;
            extra = 2;
            total = total + extra;
            break;
        }
    }
    return await delay(1, "declaration-" + total);
}

class Worker {
    async run(flag: boolean, kind: number): Promise<string> {
        let total = 0;
        if (flag) {
            const step = 2;
            total = total + step;
        } else {
            let step;
            step = 3;
            total = total + step;
        }
        switch (kind) {
            case 1: {
                const extra = 2;
                total = total + extra;
                break;
            }
            default: {
                let extra;
                extra = 3;
                total = total + extra;
                break;
            }
        }
        return await delay(2, "method-" + total);
    }
}

const value = async (flag: boolean, kind: number): Promise<string> => {
    let total = 0;
    if (flag) {
        const step = 3;
        total = total + step;
    } else {
        let step;
        step = 4;
        total = total + step;
    }
    switch (kind) {
        case 1: {
            const extra = 3;
            total = total + extra;
            break;
        }
        default: {
            let extra;
            extra = 4;
            total = total + extra;
            break;
        }
    }
    return await delay(3, "value-" + total);
};

declaration(true, 1).then((result) => console.log("declaration-a:", result));
declaration(false, 0).then((result) => console.log("declaration-b:", result));
new Worker().run(true, 1).then((result) => console.log("method-a:", result));
new Worker().run(false, 0).then((result) => console.log("method-b:", result));
value(true, 1).then((result) => console.log("value-a:", result));
value(false, 0).then((result) => console.log("value-b:", result));
