const map = new Map<string, number>([["existing", 17]]);
console.log("existing:", map.getOrInsert("existing", 19));
let calls = 0;
const inserted = map.getOrInsertComputed("key", (key) => {
    calls++;
    map.set(key, 23);
    map.set("after", 29);
    return 31;
});
console.log("computed:", inserted, map.get("key"), calls, Array.from(map.keys()).join(","));
const saved = map.getOrInsertComputed.bind(map, "bound");
console.log("bound:", saved(() => 37), map.get("bound"));
const empty = new Map<string, number>();
const marker = { value: 41 };
const dynamic: any = empty;
const returned = dynamic.getOrInsertComputed("object", () => marker);
console.log("actual:", returned === marker, dynamic.get("object") === marker);
