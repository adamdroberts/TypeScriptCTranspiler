function show<T>(label: string, a: Set<T>): void {
    const values: string[] = [];
    a.forEach((value) => values.push("" + value));
    console.log(label, "[" + values.join(",") + "]");
}

const a = new Set<number>([1, 2, 3, 4]);
const b = new Set<number>([3, 4, 5, 6]);

show("union", a.union(b));
show("intersection", a.intersection(b));
show("difference", a.difference(b));
show("symmetricDifference", a.symmetricDifference(b));

const sub = new Set<number>([2, 3]);
console.log("subset(yes):", sub.isSubsetOf(a));
console.log("subset(no):", a.isSubsetOf(sub));
console.log("superset(yes):", a.isSupersetOf(sub));
console.log("superset(no):", sub.isSupersetOf(a));

const disjoint = new Set<number>([10, 20]);
console.log("disjoint(yes):", a.isDisjointFrom(disjoint));
console.log("disjoint(no):", a.isDisjointFrom(b));

const empty = new Set<number>();
console.log("empty-subset:", empty.isSubsetOf(a));
console.log("empty-superset:", a.isSupersetOf(empty));
console.log("self-subset:", a.isSubsetOf(a));

const sa = new Set<string>(["x", "y"]);
const sb = new Set<string>(["y", "z"]);
show("str-union", sa.union(sb));
show("str-intersection", sa.intersection(sb));
show("str-diff", sa.difference(sb));
