import { setTimeout as delay } from "node:timers/promises";

const lifted = async function (flag: boolean): Promise<any> {
    return await (flag
        ? [await delay(1, "lifted-first"), await delay(1, "lifted-second")]
        : { first: await delay(1, "lifted-left"), second: await delay(1, "lifted-right") });
};

const named = async function named(flag: boolean): Promise<any> {
    return await (flag
        ? { first: await delay(1, "named-first"), second: await delay(1, "named-second") }
        : [await delay(1, "named-left"), await delay(1, "named-right")]);
};

lifted(true).then((result) => console.log("lifted-true:", JSON.stringify(result)));
lifted(false).then((result) => console.log("lifted-false:", JSON.stringify(result)));
named(true).then((result) => console.log("named-true:", JSON.stringify(result)));
named(false).then((result) => console.log("named-false:", JSON.stringify(result)));
