import { setTimeout as delay } from "node:timers/promises";

async function declaration(kind: number): Promise<string> {
    switch (kind) {
        default:
        case 1:
        case 2:
            return await delay(1, "declaration-shared");
    }
}

class Worker {
    async run(kind: number): Promise<string> {
        switch (kind) {
            default:
            case 1:
                return await delay(2, "method-shared");
        }
    }
}

const value = async (kind: number): Promise<string> => {
    switch (kind) {
        case 1:
        default:
            return await delay(3, "value-shared");
    }
};

declaration(0).then((result) => console.log("declaration-default:", result));
declaration(1).then((result) => console.log("declaration-one:", result));
declaration(2).then((result) => console.log("declaration-two:", result));
new Worker().run(0).then((result) => console.log("method-default:", result));
new Worker().run(1).then((result) => console.log("method-one:", result));
value(0).then((result) => console.log("value-default:", result));
value(1).then((result) => console.log("value-one:", result));
