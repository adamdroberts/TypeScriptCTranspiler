function missingLength(target: any): string[] {
    return ["0"];
}

function extraOpen(target: any): string[] {
    return ["0", "ghost", "length"];
}

function missingClosed(target: any): string[] {
    return ["0", "length"];
}

function extraClosed(target: any): string[] {
    return ["0", "1", "2", "length"];
}

function exactClosed(target: any): string[] {
    return ["0", "1", "length"];
}

const openMissingLength: any = new Proxy(["x"], { ownKeys: missingLength as any });
try {
    console.log("missing length:", Reflect.ownKeys(openMissingLength).join("|"));
} catch (err: any) {
    console.log("missing length:", err);
}

const openExtra: any = new Proxy(["x"], { ownKeys: extraOpen as any });
console.log("extra open:", Reflect.ownKeys(openExtra).join("|"));

const closedMissingTarget: any = ["a", "b"];
Object.preventExtensions(closedMissingTarget);
const closedMissing: any = new Proxy(closedMissingTarget, { ownKeys: missingClosed as any });
try {
    console.log("missing closed:", Reflect.ownKeys(closedMissing).join("|"));
} catch (err: any) {
    console.log("missing closed:", err);
}

const closedExtraTarget: any = ["a", "b"];
Object.preventExtensions(closedExtraTarget);
const closedExtra: any = new Proxy(closedExtraTarget, { ownKeys: extraClosed as any });
try {
    console.log("extra closed:", Reflect.ownKeys(closedExtra).join("|"));
} catch (err: any) {
    console.log("extra closed:", err);
}

const closedExactTarget: any = ["a", "b"];
Object.preventExtensions(closedExactTarget);
const closedExact: any = new Proxy(closedExactTarget, { ownKeys: exactClosed as any });
console.log("exact closed:", Reflect.ownKeys(closedExact).join("|"));

const sealedMissingTarget: any = ["s", "t"];
Object.seal(sealedMissingTarget);
const sealedMissing: any = new Proxy(sealedMissingTarget, { ownKeys: missingClosed as any });
try {
    console.log("missing sealed:", Object.keys(sealedMissing).join("|"));
} catch (err: any) {
    console.log("missing sealed:", err);
}
