import { setTimeout as delay } from "node:timers/promises";

async function tailAwait(): Promise<string> {
    return await delay(5, "tail");
}

tailAwait().then((value: string): void => console.log("result:", value));
