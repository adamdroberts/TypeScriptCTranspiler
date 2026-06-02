const proto: any = Array.prototype;
const nullValue: any = null;
const undefinedValue: any = undefined;

function report(label: string, fn: () => any): void {
    try {
        console.log(label, fn());
    } catch (err: any) {
        console.log(label + ":", err);
    }
}

function reportReceiver(label: string, receiver: any): void {
    report(label + " at", () => Reflect.apply(proto.at, receiver, [0]));
    report(label + " includes", () => Reflect.apply(proto.includes, receiver, [0]));
    report(label + " indexOf", () => Reflect.apply(proto.indexOf, receiver, [0]));
    report(label + " lastIndexOf", () => Reflect.apply(proto.lastIndexOf, receiver, [0]));
    report(label + " join", () => Reflect.apply(proto.join, receiver, []));
    report(label + " keys", () => Reflect.apply(proto.keys, receiver, []));
    report(label + " values", () => Reflect.apply(proto.values, receiver, []));
    report(label + " entries", () => Reflect.apply(proto.entries, receiver, []));
    report(label + " pop", () => Reflect.apply(proto.pop, receiver, []));
    report(label + " push", () => Reflect.apply(proto.push, receiver, [1]));
    report(label + " shift", () => Reflect.apply(proto.shift, receiver, []));
    report(label + " unshift", () => Reflect.apply(proto.unshift, receiver, [1]));
    report(label + " concat", () => Reflect.apply(proto.concat, receiver, [[1]]));
    report(label + " slice", () => Reflect.apply(proto.slice, receiver, [0]));
    report(label + " fill", () => Reflect.apply(proto.fill, receiver, [1]));
    report(label + " copyWithin", () => Reflect.apply(proto.copyWithin, receiver, [0, 1]));
    report(label + " splice", () => Reflect.apply(proto.splice, receiver, [0, 0]));
    report(label + " sort", () => Reflect.apply(proto.sort, receiver, []));
    report(label + " toSorted", () => Reflect.apply(proto.toSorted, receiver, []));
    report(label + " with", () => Reflect.apply(proto.with, receiver, [0, 1]));
    report(label + " toSpliced", () => Reflect.apply(proto.toSpliced, receiver, [0, 0]));
    report(label + " flat", () => Reflect.apply(proto.flat, receiver, []));
    report(label + " reverse", () => Reflect.apply(proto.reverse, receiver, []));
    report(label + " toReversed", () => Reflect.apply(proto.toReversed, receiver, []));
}

reportReceiver("null", nullValue);
reportReceiver("undefined", undefinedValue);
