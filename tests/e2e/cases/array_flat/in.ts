const nested = [[1, 2], [3, 4], []];
const flat = nested.flat();
console.log("flat:", flat.join(","));

const deep = [[[1], [2, 3]], [[4]]];
const flat2 = deep.flat(2);
console.log("flat2:", flat2.join(","));

const copy = [5, 1].flat(0);
console.log("copy:", copy.join(","));

const mapped = [2, 4, 6].flatMap((n, i) => [n, i]);
console.log("flatMap:", mapped.join(","));
