const proto: any = Array.prototype;

const grow: any = { 0: "a", 1: "b", 2: "c", 3: "d", length: 4 };
const growRemoved: any = Reflect.apply(proto.splice, grow, [1, 2, "x", "y", "z"]);
console.log("grow:", growRemoved.join("|"), grow.length, grow[0], grow[1], grow[2], grow[3], grow[4], "5" in grow);

const shrink: any = { 0: "a", 1: "b", 2: "c", 3: "d", length: 4 };
const shrinkRemoved: any = Reflect.apply(proto.splice, shrink, [1, 2, "x"]);
console.log("shrink:", shrinkRemoved.join("|"), shrink.length, shrink[0], shrink[1], shrink[2], "3" in shrink);

const omitted: any = { 0: "a", 1: "b", 2: "c", length: 3 };
const omittedRemoved: any = Reflect.apply(proto.splice, omitted, [1]);
console.log("omitted:", omittedRemoved.join("|"), omitted.length, omitted[0], "1" in omitted);

const explicitUndefined: any = { 0: "a", 1: "b", 2: "c", length: 3 };
const explicitRemoved: any = Reflect.apply(proto.splice, explicitUndefined, [1, undefined, "x"]);
console.log("undefined:", explicitRemoved.length, explicitUndefined.length, explicitUndefined[0], explicitUndefined[1], explicitUndefined[2], explicitUndefined[3]);

const sparse: any = { 0: "a", 2: "c", 4: "e", length: 5 };
const sparseRemoved: any = Reflect.apply(proto.splice, sparse, [1, 3, "x"]);
console.log("sparse:", sparseRemoved.join("|"), sparseRemoved.length, sparse.length, sparse[0], sparse[1], sparse[2], "3" in sparse, "4" in sparse);
