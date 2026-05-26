const aggregate = new AggregateError(["one", "two"], "many");
const called = AggregateError(["solo"]);
let seen = "";

function mark(label: string): string {
    seen += label;
    return label;
}

const extra = new AggregateError(["x"], "extra", {}, mark("a"));
const calledExtra = AggregateError(["y"], "called extra", {}, mark("b"));
const undefinedExtra = new AggregateError(["z"], undefined, undefined, mark("u"));
const undefinedCause = AggregateError(["c"], undefined, { cause: "root" }, mark("c"));

console.log("aggregate:", aggregate.name, aggregate.message, aggregate.toString(), aggregate.errors.length, aggregate.errors[0], aggregate.errors[1]);
console.log("called:", called.name, called.message, called.toString(), called.errors.length, called.errors[0]);
console.log("extra:", extra.name, extra.message, extra.errors[0], calledExtra.message, calledExtra.errors[0], seen);
console.log("undefined:", undefinedExtra.message, undefinedExtra.errors[0], undefinedExtra.cause === undefined, undefinedCause.message, undefinedCause.cause, seen);

try {
    throw aggregate;
} catch (e) {
    console.log("caught:", e);
}
