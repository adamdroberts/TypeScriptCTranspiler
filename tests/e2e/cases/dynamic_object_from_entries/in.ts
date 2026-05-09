let current = 5;

function readScore(): number {
    return current;
}

const source: any = JSON.parse("{\"a\":1}");
Object.defineProperty(source, "score", {
    get: readScore,
    enumerable: true,
});

const entries: any = Object.entries(source);
const rebuilt: any = Object.fromEntries(entries);

console.log("entries:", entries[0].join("|"), entries[1].join("|"));
console.log("rebuilt:", rebuilt.a, rebuilt.score);

current = 9;
console.log("rebuilt stable:", rebuilt.score);

const custom: any = [["x", 2], ["y", "yes"]];
const made: any = Object.fromEntries(custom);
console.log("made:", made.x, made.y);
