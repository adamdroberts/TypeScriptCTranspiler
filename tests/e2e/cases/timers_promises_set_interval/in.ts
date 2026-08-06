declare const AbortController: { new(): any };

import { setInterval as interval } from "node:timers/promises";

async function collect(iterator: any, values: string[]): Promise<string> {
    for await (const value of iterator) {
        values.push(value);
        if (values.length === 3) break;
    }
    return values.join("|");
}

const controller: any = new AbortController();
const aborted: any = interval(2, "cancelled", { signal: controller.signal });
aborted.next().catch((reason: any): void => {
    console.log("abort:", reason);
});
controller.abort("stop");
aborted.next().then((result: any): void => {
    console.log("done:", result.done, result.value);
});

collect(interval(2, "tick"), []).then((value: string): void => {
    console.log("values:", value);
});
