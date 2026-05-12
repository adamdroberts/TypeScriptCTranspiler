const map = new Map<string, number>();
map.set("a", 1);
map.set("b", 2);

const entries = Array.from(map);
console.log("len:", entries.length);
for (let i = 0; i < entries.length; i++) {
    console.log(entries[i]![0], entries[i]![1]);
}

const labels = Array.from(map, (entry, index) => entry[0] + ":" + (entry[1] + index));
console.log("labels:", labels.join("|"));

function score(entry: ObjectEntry<number>, index: number): number {
    return entry[1] * 10 + index;
}

const scores = Array.from(map, score);
console.log("scores:", scores.join("|"));
