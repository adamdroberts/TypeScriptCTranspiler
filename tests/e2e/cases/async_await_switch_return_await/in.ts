import { setTimeout as delay } from "node:timers/promises";

async function declaration(kind: number): Promise<string> {
    switch (kind) {
        case 0: {
            const prefix = "zero";
            return await delay(1, prefix + "-done");
        }
        case 1: {
            let prefix: string;
            prefix = "one";
            return await delay(2, prefix + "-done");
        }
        default:
            return "default";
    }
}

class Worker {
    async run(kind: number): Promise<string> {
        switch (kind) {
            case 0:
                return await delay(3, this.prefix("method-zero"));
            default:
                return "method-default";
        }
    }

    prefix(value: string): string {
        return value + "-done";
    }
}

const value = async (kind: number): Promise<string> => {
    switch (kind) {
        case 0:
            return await delay(4, "value-zero-done");
        default:
            return "value-default";
    }
};

declaration(0).then((result) => console.log("declaration-zero:", result));
declaration(1).then((result) => console.log("declaration-one:", result));
declaration(2).then((result) => console.log("declaration-default:", result));
new Worker().run(0).then((result) => console.log("method-zero:", result));
new Worker().run(1).then((result) => console.log("method-default:", result));
value(0).then((result) => console.log("value-zero:", result));
value(1).then((result) => console.log("value-default:", result));
