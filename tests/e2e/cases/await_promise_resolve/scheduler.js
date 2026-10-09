"use strict";
async function arrowFactory() {
    const run = async () => { await Promise.resolve(1); return "arrow"; };
    await Promise.resolve(2);
    return await run();
}
async function isolated(value) { await Promise.resolve(1); await Promise.resolve(2); return value; }
arrowFactory().then(value => console.log(value));
Promise.all([isolated("L"), isolated("R")]).then(result => console.log(result.join(",")));
const awaitTrace = [], input = Promise.resolve("identity");
Object.defineProperty(input, "constructor", { get() { awaitTrace.push("constructor"); return Promise; } });
Object.defineProperty(input, "then", { get() { throw "then must remain unread"; } });
(async () => { const value = await input; console.log(value + ":" + awaitTrace.join(",")); })();
