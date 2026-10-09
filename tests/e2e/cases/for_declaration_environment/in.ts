const bodies: Array<() => number> = [], updates: Array<() => number> = [];
let original: () => number = () => -1;
for (let index = 0, reader = () => index; index < 3; (updates.push(() => index), index++)) {
    original = reader; bodies.push(() => index);
}
console.log("ordinary", original(), bodies[0](), bodies[1](), bodies[2](), updates[0](), updates[1](), updates[2]());
const patternSource: any = [0];
for (let [index, { value = index + 1 } = {}] = patternSource; index < 2; index++) {
    console.log("pattern", index, value);
}
async function suspended(): Promise<void> {
    const retained: Array<() => number> = [];
    let first: () => number = () => -1;
    for (let index = 0, reader = () => index; await Promise.resolve(index < 3); index = await Promise.resolve(index + 1)) {
        await Promise.resolve();
        first = reader; retained.push(() => index);
        if (index === 1) continue;
    }
    console.log("suspended", first(), retained[0](), retained[1](), retained[2]());
    try {
        for (let reader: () => number = () => later, first: number = reader(), later: number = 1; false;) { await Promise.resolve(); }
    } catch (error) { console.log("tdz", error instanceof ReferenceError); }
}
suspended();
