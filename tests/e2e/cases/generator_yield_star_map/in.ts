function* entries(input: Map<string, number>): Generator<ObjectEntry<number>, string, undefined> {
    yield* input;
    return "done";
}

const scores = new Map<string, number>();
scores.set("alice", 3);
scores.set("bob", 5);
scores.set("alice", 7);

let total = 0;
let labels = "";
for (const [name, score] of entries(scores)) {
    labels = labels + name + "=" + score + ";";
    total = total + score;
}

console.log("entries:", labels);
console.log("total:", total);
