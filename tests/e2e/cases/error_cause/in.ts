const outer = new Error("outer", { cause: "root" });
const typed = TypeError("bad", { cause: 42 });
const empty = new RangeError("range", {});
const aggregate = new AggregateError(["one"], "many", { cause: true });

console.log("outer:", outer.name, outer.message, outer.cause);
console.log("typed:", typed.name, typed.message, typed.cause);
console.log("empty:", empty.name, empty.message, empty.cause);
console.log("aggregate:", aggregate.name, aggregate.message, aggregate.cause, aggregate.errors[0]);
