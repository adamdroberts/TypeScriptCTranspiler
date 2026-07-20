import { setTimeout as delay } from "node:timers/promises";

function factory(): Promise<any> {
    return Promise.resolve(Array);
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

declaration().then((result) => console.log("declaration:", JSON.stringify(result)));
new Worker().run().then((result) => console.log("method:", JSON.stringify(result)));
value().then((result) => console.log("value:", JSON.stringify(result)));
