async function main(): Promise<void> {
    let sum = 0;
    const targets = ["./a.mjs", "./b.mjs"];
    for (const request of targets) sum += (await import(request)).value;
    for (const request of [] as string[]) await import(request);
    const empty = { [Symbol.iterator]() { return { next() { return { done: true, value: "./outside.mjs" }; } }; } };
    for (const request of empty) await import(request);
    console.log("iterator imports:", sum, sum === 36);
}
main();
