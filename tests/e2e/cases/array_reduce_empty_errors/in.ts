const typed: number[] = [];
try {
    console.log("typed reduce result:", typed.reduce((acc: number, value: number) => acc + value));
} catch (err) {
    console.log("typed reduce error:", String(err));
}
try {
    console.log("typed reduceRight result:", typed.reduceRight((acc: number, value: number) => acc + value));
} catch (err) {
    console.log("typed reduceRight error:", String(err));
}

const dynamicEmpty: any = [];
try {
    console.log("dynamic reduce result:", dynamicEmpty.reduce((acc: any, value: any) => acc + value));
} catch (err) {
    console.log("dynamic reduce error:", String(err));
}
try {
    console.log("dynamic reduceRight result:", dynamicEmpty.reduceRight((acc: any, value: any) => acc + value));
} catch (err) {
    console.log("dynamic reduceRight error:", String(err));
}

const proto: any = Array.prototype;
const emptyLike: any = { length: 0 };
const sparseLike: any = { length: 2 };

try {
    console.log("proto reduce result:", Reflect.apply(proto.reduce, emptyLike, [
        (acc: any, value: any) => acc + value,
    ]));
} catch (err) {
    console.log("proto reduce error:", String(err));
}
try {
    console.log("proto reduceRight result:", Reflect.apply(proto.reduceRight, sparseLike, [
        (acc: any, value: any) => acc + value,
    ]));
} catch (err) {
    console.log("proto reduceRight error:", String(err));
}
try {
    console.log("initial reduce result:", Reflect.apply(proto.reduce, emptyLike, [
        (acc: any, value: any) => acc + value,
        "seed",
    ]));
} catch (err) {
    console.log("initial reduce error:", String(err));
}
try {
    console.log("initial reduceRight result:", dynamicEmpty.reduceRight((acc: any, value: any) => acc + value, "seed"));
} catch (err) {
    console.log("initial reduceRight error:", String(err));
}
