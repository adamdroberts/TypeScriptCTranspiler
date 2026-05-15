const aggregate = new AggregateError(["one", "two"], "many");
const called = AggregateError(["solo"]);

console.log("aggregate:", aggregate.name, aggregate.message, aggregate.toString(), aggregate.errors.length, aggregate.errors[0], aggregate.errors[1]);
console.log("called:", called.name, called.message, called.toString(), called.errors.length, called.errors[0]);

try {
    throw aggregate;
} catch (e) {
    console.log("caught:", e);
}
