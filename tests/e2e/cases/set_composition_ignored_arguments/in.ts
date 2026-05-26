const events: string[] = [];

function mark(label: string): string {
    events.push(label);
    return label;
}

function show(label: string, set: Set<number>): void {
    console.log(label + ":", set.values().join(","));
}

const a = new Set([1, 2, 3]);
const b = new Set([3, 4]);
const subset = new Set([1, 2]);
const disjoint = new Set([9]);

show("union", a.union(b, mark("union")));
show("intersection", a.intersection(b, mark("intersection")));
show("difference", a.difference(b, mark("difference")));
show("symmetric", a.symmetricDifference(b, mark("symmetric")));
console.log(
    "predicates:",
    subset.isSubsetOf(a, mark("subset")),
    a.isSupersetOf(subset, mark("superset")),
    a.isDisjointFrom(disjoint, mark("disjoint")),
);
console.log("events:", events.join("|"));
