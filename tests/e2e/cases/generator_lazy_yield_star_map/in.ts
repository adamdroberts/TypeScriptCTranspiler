function* mapEntries(input: Map<string, number>): Generator<any, string, undefined> {
    console.log("start");
    yield* input;
    console.log("after map");
    return "done";
}

const scores = new Map<string, number>();
scores.set("alice", 3);
scores.set("bob", 5);
scores.set("alice", 7);

const g = mapEntries(scores);
console.log("created");

let step: any = g.next();
while (!step.done) {
    const entry: any = step.value;
    console.log("entry:", entry[0], entry[1]);
    step = g.next();
}
console.log("return:", step.value);
