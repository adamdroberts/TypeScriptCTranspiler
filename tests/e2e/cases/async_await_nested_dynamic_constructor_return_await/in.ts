import { setTimeout as delay } from "node:timers/promises";

class Box {
    constructor(left: string, right: string) {
        console.log("box:", left + ":" + right);
    }
}

function factory(): Promise<any> {
    return Promise.resolve(Box);
}

async function declaration(): Promise<any> {
    return await new (await factory())(
        await delay(1, "declaration-left"),
        await delay(1, "declaration-right"),
    );
}

class Worker {
    async run(): Promise<any> {
        return await new (await factory())(
            await delay(1, "method-left"),
            await delay(1, "method-right"),
        );
    }
}

const value = async (): Promise<any> =>
    await new (await factory())(
        await delay(1, "arrow-left"),
        await delay(1, "arrow-right"),
    );

declaration().then((result) => console.log("declaration: constructed", !!result));
new Worker().run().then((result) => console.log("method: constructed", !!result));
value().then((result) => console.log("value: constructed", !!result));
