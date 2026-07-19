import { setTimeout as delay } from "node:timers/promises";

async function declaration(kind: number): Promise<string> {
    switch (kind) {
        case 0:
        case 1: {
            const prefix = "zero-or-one";
            return await delay(1, prefix + "-done");
        }
        default:
            return "default";
    }
}

class Worker {
    async run(kind: number): Promise<string> {
        switch (kind) {
            case 0:
            case 1:
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
        case 1:
            return await delay(4, "value-zero-done");
        default:
            return "value-default";
    }
};

declaration(0).then((result) => console.log("declaration-zero:", result));
declaration(1).then((result) => console.log("declaration-one:", result));
declaration(2).then((result) => console.log("declaration-default:", result));
new Worker().run(0).then((result) => console.log("method-zero:", result));
new Worker().run(1).then((result) => console.log("method-fallthrough:", result));
new Worker().run(2).then((result) => console.log("method-default:", result));
value(0).then((result) => console.log("value-zero:", result));
value(1).then((result) => console.log("value-fallthrough:", result));
value(2).then((result) => console.log("value-default:", result));
