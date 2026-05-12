const m = new Map<number, string>();
m.set(NaN, "first");
m.set(NaN, "second");
m.set(-0, "zero");

console.log("map:", m.size, m.get(NaN), m.has(NaN), m.get(0), m.has(-0));

const s = new Set<number>();
s.add(NaN);
s.add(NaN);
s.add(-0);
s.add(0);

console.log("set:", s.size, s.has(NaN), s.has(0), s.has(-0));

m.delete(NaN);
s.delete(NaN);
console.log("delete:", m.has(NaN), m.size, s.has(NaN), s.size);
