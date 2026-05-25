const rootCause = "root";
const outerOptions = { cause: rootCause };
const typedCause = 42;
const typedOptions = { cause: typedCause };
const emptyOptions = {};
const aggregateCause = true;
const aggregateOptions = { cause: aggregateCause };

const outer = new Error("outer", outerOptions);
const typed = TypeError("bad", typedOptions);
const empty = new RangeError("range", emptyOptions);
const aggregate = new AggregateError(["one"], "many", aggregateOptions);

console.log("outer:", outer.name, outer.message, outer.cause);
console.log("typed:", typed.name, typed.message, typed.cause);
console.log("empty:", empty.name, empty.message, empty.cause);
console.log("aggregate:", aggregate.name, aggregate.message, aggregate.cause, aggregate.errors[0]);
