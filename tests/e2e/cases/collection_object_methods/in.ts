interface Key {
    id: number;
}

const key: Key = { id: 7 };
let trace = "";

function mark(label: string): string {
    trace += label;
    return label;
}

const map = new Map<string, number>();
map.set("a", 3);
console.log("map:", map.toString(), map.toLocaleString(), map.valueOf().get("a"));

const set = new Set<string>();
set.add("x");
console.log("set:", set.toString(), set.toLocaleString(), set.valueOf().has("x"));

const weakMap = new WeakMap<Key, string>();
weakMap.set(key, "ok");
console.log("weakmap:", weakMap.toString(), weakMap.toLocaleString(), weakMap.valueOf().get(key));

const weakSet = new WeakSet<Key>();
weakSet.add(key);
console.log("weakset:", weakSet.toString(), weakSet.toLocaleString(), weakSet.valueOf().has(key));

const weakRef = new WeakRef<Key>(key);
console.log("weakref:", weakRef.toString(), weakRef.toLocaleString(), weakRef.valueOf().deref()?.id ?? -1);

console.log("map own:", Object.keys(map).length, Object.values(map).length, Object.entries(map).length, Object.getOwnPropertyNames(map).length, Object.hasOwn(map, "size"));
const mapDescs: any = Object.getOwnPropertyDescriptors(map);
console.log("map desc:", String(Object.getOwnPropertyDescriptor(map, "size")), Object.keys(mapDescs).length);
console.log("weak own:", Object.keys(weakMap).length, Object.getOwnPropertyNames(weakRef).length, Object.hasOwn(weakSet, "add"));
console.log("reflect own:", Reflect.ownKeys(map).length, String(Reflect.getOwnPropertyDescriptor(weakMap, "x")));
console.log("proto own:", map.hasOwnProperty("size"), set.propertyIsEnumerable("size"), weakRef.hasOwnProperty("deref"));
console.log("integrity:", Object.isExtensible(map, mark("E")), Object.isSealed(set, mark("L")), Object.isFrozen(weakMap, mark("F")), Reflect.isExtensible(weakSet, mark("I")), Object.isExtensible(weakRef, mark("R")));
console.log("ignored:", map.toString(mark("m")), set.toLocaleString(mark("s")), weakMap.valueOf(mark("w")) === weakMap, weakSet.toString(mark("x")), weakRef.deref(mark("r"))?.id ?? -1, trace);
