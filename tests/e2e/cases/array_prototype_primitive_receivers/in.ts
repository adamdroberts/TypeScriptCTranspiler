const proto: any = Array.prototype;

function report(label: string, receiver: any): void {
    const sliced: any = Reflect.apply(proto.slice, receiver, [0]);
    const reversed: any = Reflect.apply(proto.toReversed, receiver, []);
    const flattened: any = Reflect.apply(proto.flat, receiver, []);
    const keys: any = Reflect.apply(proto.keys, receiver, []);
    const values: any = Reflect.apply(proto.values, receiver, []);
    const entries: any = Reflect.apply(proto.entries, receiver, []);
    const spliced: any = Reflect.apply(proto.toSpliced, receiver, [0, 0, "x", "y"]);

    console.log(
        label,
        "arrays:",
        Array.isArray(sliced), sliced.length,
        Array.isArray(reversed), reversed.length,
        Array.isArray(flattened), flattened.length,
        keys.length,
        values.length,
        entries.length,
        spliced.join("|"),
    );
    console.log(
        label,
        "mutators:",
        Reflect.apply(proto.push, receiver, [1, 2]),
        Reflect.apply(proto.unshift, receiver, [3]),
        Reflect.apply(proto.pop, receiver, []),
        Reflect.apply(proto.shift, receiver, []),
    );
    console.log(
        label,
        "empty-mutating:",
        String(Reflect.apply(proto.reverse, receiver, [])),
        String(Reflect.apply(proto.fill, receiver, ["z"])),
        String(Reflect.apply(proto.copyWithin, receiver, [0, 1])),
        String(Reflect.apply(proto.sort, receiver, [])),
    );

    try {
        Reflect.apply(proto.sort, receiver, [5]);
    } catch (err: any) {
        console.log(label, "sortBad:", err);
    }
    try {
        Reflect.apply(proto.toSorted, receiver, [5]);
    } catch (err: any) {
        console.log(label, "toSortedBad:", err);
    }
    try {
        Reflect.apply(proto.with, receiver, [0, "z"]);
    } catch (err: any) {
        console.log(label, "withBad:", err);
    }
}

report("number", 7 as any);
report("boolean", true as any);
