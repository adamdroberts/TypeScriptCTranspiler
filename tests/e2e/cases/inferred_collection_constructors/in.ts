const map = new Map();
map.set("alpha", 1);
map.set(2, "beta");
console.log("map:", map.get("alpha"), map.get(2), map.size, map.has("missing"));

const set = new Set();
set.add("red");
set.add(2);
set.add("red");
console.log("set:", set.has("red"), set.has(3), set.size);

const key = { id: 7 };
const weakMap = new WeakMap();
weakMap.set(key, "value");
console.log("weakmap:", weakMap.get(key), weakMap.has(key));

const weakSet = new WeakSet();
weakSet.add(key);
console.log("weakset:", weakSet.has(key), weakSet.delete(key), weakSet.has(key));

const weakRef = new WeakRef(key);
console.log("weakref:", weakRef.deref() === key);

const registry = new FinalizationRegistry((held) => {
    console.log("cleanup:", held);
});
registry.register(key, "token", key);
console.log("registry:", registry.unregister(key));
