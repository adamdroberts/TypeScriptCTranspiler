const scores = new Map<string, number>();
scores.set("alice", 3);
scores.set("bob", 5);
scores.set("carol", 7);

let total = 0;
let labels = "";
for (const [name, score] of scores) {
    labels = labels + name + "=" + score + ";";
    total = total + score;
}
console.log(labels);
console.log("total:", total);

const seen = new Set<string>();
seen.add("red");
seen.add("blue");
seen.add("red");

let joined = "";
for (const color of seen) {
    joined = joined + color + "|";
}
console.log(joined);
