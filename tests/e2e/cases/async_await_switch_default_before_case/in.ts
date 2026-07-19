import { setTimeout as delay } from "node:timers/promises";

async function declaration(kind: number): Promise<string> {
    switch (kind) {
        default:
            return await delay(1, "declaration-default");
        case 1:
            return await delay(4, "declaration-one");
    }
}

class Worker {
    async run(kind: number): Promise<string> {
        switch (kind) {
            default:
                return await delay(2, "method-default");
            case 1:
                return await delay(5, "method-one");
        }
    }
}

const value = async (kind: number): Promise<string> => {
    switch (kind) {
        default:
            return await delay(3, "value-default");
        case 1:
            return await delay(6, "value-one");
    }
};

declaration(0).then((result) => console.log("declaration-default:", result));
declaration(1).then((result) => console.log("declaration-one:", result));
new Worker().run(0).then((result) => console.log("method-default:", result));
new Worker().run(1).then((result) => console.log("method-one:", result));
value(0).then((result) => console.log("value-default:", result));
value(1).then((result) => console.log("value-one:", result));
