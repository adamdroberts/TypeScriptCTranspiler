function* mapEntries(): Generator<string, string, number> {
    const values = new Map<string, number>();
    values.set("a", 1);
    values.set("b", 2);
    for (const [key, value] of values) {
        yield key + ":" + value;
    }
    return "map-done";
}

function* dynamicEntries(): Generator<string, string, number> {
    const values: any = [["x", 3], ["y", 4]];
    for (const [key, value] of values) {
        yield String(key) + ":" + String(value);
    }
    return "dynamic-done";
}

const map = mapEntries();
const map1: any = map.next(0);
console.log("map1", map1.done, map1.value);
const map2: any = map.next(0);
console.log("map2", map2.done, map2.value);
const map3: any = map.next(0);
console.log("map3", map3.done, map3.value);

const dynamic = dynamicEntries();
const dynamic1: any = dynamic.next(0);
console.log("dynamic1", dynamic1.done, dynamic1.value);
const dynamic2: any = dynamic.next(0);
console.log("dynamic2", dynamic2.done, dynamic2.value);
const dynamic3: any = dynamic.next(0);
console.log("dynamic3", dynamic3.done, dynamic3.value);
