const nested = [[1, 2], [3, 4], []];
const flat = nested.flat();
console.log("flat:", flat.join(","));

const deep = [[[1], [2, 3]], [[4]]];
const flat2 = deep.flat(2);
console.log("flat2:", flat2.join(","));

const sparseInner = [1, 2, 3];
delete sparseInner[1];
const sparseNested = [sparseInner, [4]];
console.log("sparse inner:", sparseNested.flat().join(","));

const sparseOuter = [[1], [2]];
delete sparseOuter[0];
console.log("sparse outer:", sparseOuter.flat().join(","));

const copy = [5, 1].flat(0);
console.log("copy:", copy.join(","));

const mapped = [2, 4, 6].flatMap((n, i) => [n, i]);
console.log("flatMap:", mapped.join(","));

const scalarMapped = [1, 2, 3].flatMap((n) => n * 2);
console.log("flatMap scalar:", scalarMapped.join(","));

const dynamicMapped = [1, 2, 3].flatMap((n): any => n === 2 ? [n, n + 10] : n);
console.log("flatMap dynamic:", dynamicMapped.join(","));
