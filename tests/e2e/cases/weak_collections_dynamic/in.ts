function report(label: string, fn: () => any): void {
    try {
        console.log(label + ":", fn());
    } catch (err: any) {
        console.log(label + ":", err);
    }
}

const alice: any = { name: "alice" };
const bob: any = { name: "bob" };
const entries: any = [[alice, "admin"], [bob, "user"]];
const nil: any = null;
const undef: any = undefined;
const badSource: any = 1;
const badEntry: any = [alice];
const badKeyEntries: any = [["bad", "value"]];
const values: any = [alice, bob];
const badValues: any = [alice, "bad"];

const emptyMap = new WeakMap<any, any>(nil);
console.log("empty map:", emptyMap.get(alice), new WeakMap<any, any>(undef).has(alice));

const seeded = new WeakMap<any, any>(entries);
console.log("seeded map:", seeded.get(alice), seeded.has(bob), seeded.get("bad"), seeded.has("bad"), seeded.delete("bad"));
console.log("delete object:", seeded.delete(bob), seeded.has(bob));
report("set primitive", (): any => {
    new WeakMap<any, any>().set("bad", 1);
    return "ok";
});
report("bad map source", (): any => {
    new WeakMap<any, any>(badSource);
    return "ok";
});
report("bad map entry", (): any => {
    new WeakMap<any, any>(badEntry);
    return "ok";
});
report("bad map key", (): any => {
    new WeakMap<any, any>(badKeyEntries);
    return "ok";
});

const emptySet = new WeakSet<any>(nil);
console.log("empty set:", emptySet.has(alice), new WeakSet<any>(undef).has(alice));

const seen = new WeakSet<any>(values);
console.log("seeded set:", seen.has(alice), seen.has(bob), seen.has("bad"), seen.delete("bad"));
console.log("delete value:", seen.delete(bob), seen.has(bob));
report("add primitive", (): any => {
    new WeakSet<any>().add("bad");
    return "ok";
});
report("bad set source", (): any => {
    new WeakSet<any>(badSource);
    return "ok";
});
report("bad set value", (): any => {
    new WeakSet<any>(badValues);
    return "ok";
});
