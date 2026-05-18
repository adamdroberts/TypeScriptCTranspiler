const aggregate = new AggregateError(["one", "two"], "many");
const called = AggregateError(["solo"]);
let seen = "";

function mark(label: string): string {
    seen += label;
    return label;
}

const extra = new AggregateError(["x"], "extra", {}, mark("a"));
const calledExtra = AggregateError(["y"], "called extra", {}, mark("b"));

console.log("aggregate:", aggregate.name, aggregate.message, aggregate.toString(), aggregate.errors.length, aggregate.errors[0], aggregate.errors[1]);
console.log("called:", called.name, called.message, called.toString(), called.errors.length, called.errors[0]);
console.log("extra:", extra.name, extra.message, extra.errors[0], calledExtra.message, calledExtra.errors[0], seen);

try {
    throw aggregate;
} catch (e) {
    console.log("caught:", e);
}
