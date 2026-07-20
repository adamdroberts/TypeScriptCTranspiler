import { setTimeout as delay } from "node:timers/promises";

function makeValue(suffix: string): () => Promise<string> {
    return async () => await (
        await delay(1, "one") +
        await delay(1, "two") +
        await delay(1, "three") +
        await delay(1, "four") +
        await delay(1, "five") +
        suffix
    );
}

const value = makeValue("-closure");
value().then((result) => console.log("value:", result));
