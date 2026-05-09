interface Scores {
    alice: number;
    bob: number;
    carol: number;
}

const scores: Scores = { alice: 4, bob: 7, carol: 2 };
const entries = Object.entries(scores);

console.log("entry-len:", entries.length, entries[0].length);
console.log("first:", entries[0][0], entries[0][1]);

let total = 0;
const labels: string[] = [];
for (const [name, score] of entries) {
    total += score;
    labels.push(name + ":" + score);
}

console.log("pairs:", labels.join("|"));
console.log("total:", total);

const rebuilt: Scores = Object.fromEntries(entries);
console.log("rebuilt:", rebuilt.alice, rebuilt.bob, rebuilt.carol);

const directEntries: [string, number][] = [["alice", 1], ["bob", 2], ["carol", 3]];
const direct: Scores = Object.fromEntries(directEntries);
console.log("direct:", direct.alice, direct.bob, direct.carol);
