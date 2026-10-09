"use strict";
async function await() { return 7; }
console.log("script:", typeof await);
function ordinary(await) { return await + 1; }
console.log("parameter:", ordinary(3));
async function outer() {
    function inner(await) { return await + 2; }
    const named = function await() { return 9; };
    const holder = { await: 11 };
    console.log("nested:", inner(5), named(), holder.await);
}
outer();
await().then(value => console.log("resolved:", value));
