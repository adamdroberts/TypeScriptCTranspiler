const ages = new Map<string, number>();
ages.set("alice", 30);
ages.set("bob", 25);
ages.set("carol", 40);

console.log("size:", ages.size);
console.log("has alice:", ages.has("alice"));
console.log("has dan:", ages.has("dan"));
console.log("bob:", ages.get("bob"));

ages.set("bob", 26);
console.log("updated bob:", ages.get("bob"));

ages.delete("alice");
console.log("size after delete:", ages.size);
console.log("has alice:", ages.has("alice"));

const names = ages.keys();
names.forEach((n) => console.log("name:", n));

const vals = ages.values();
const total = vals.reduce((acc, v) => acc + v, 0);
console.log("total age:", total);

// --- Set ---
const seen = new Set<number>();
seen.add(1);
seen.add(2);
seen.add(2);
seen.add(3);
console.log("set size:", seen.size);
console.log("has 2:", seen.has(2));
console.log("has 99:", seen.has(99));
seen.delete(2);
console.log("size after delete 2:", seen.size);
