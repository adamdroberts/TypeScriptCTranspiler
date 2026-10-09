const map = new Map<string, number>();
map.set("a", 1); map.set("b", 2);
const keys = map.keys();
console.log(keys.next().value);
map.delete("a"); map.delete("b"); map.set("c", 3);
console.log(keys.next().value);
map.clear(); map.set("d", 4);
console.log(keys.next().value);
console.log(keys.next().done);
map.set("late", 5);
console.log(keys.next().done);
const readIterator = () => keys;
console.log(readIterator() === keys);
let mapOnce = false;
for (const [key, value] of map) {
    console.log(key, value);
    if (!mapOnce) { mapOnce = true; map.delete("late"); map.set("tail", 6); }
}
const set = new Set<number>();
set.add(-0); set.add(1);
const values = set.values();
console.log(Object.is(values.next().value, 0));
set.clear(); set.add(2);
console.log(values.next().value);
let setOnce = false;
for (const value of set) {
    console.log(value);
    if (!setOnce) { setOnce = true; set.delete(2); set.add(3); }
}
const context: any = {};
map.forEach(function(this: any, value, key, owner) {
    console.log(key, value, owner === map, this === context);
}, context);
set.forEach(function(value, duplicate, owner) { console.log(value, duplicate, owner === set); });
const boxed: any = map;
boxed[Symbol.iterator] = function() { return ["override"][Symbol.iterator](); };
for (const value of map) console.log(value);
const prototype: any = Map.prototype;
const originalValues = prototype.values;
Object.defineProperty(prototype, "values", {
    configurable: true,
    get() { console.log("factory getter"); return originalValues; }
});
const discarded = new Map<string, number>().values();
Object.defineProperty(prototype, "values", { value: originalValues, writable: true, configurable: true });
