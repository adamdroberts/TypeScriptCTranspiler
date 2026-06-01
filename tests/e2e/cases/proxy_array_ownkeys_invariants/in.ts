const events: string[] = [];

function mark(label: string): string {
    events.push("ignored:" + label);
    return label;
}

function missingLength(target: any): string[] {
    events.push("missing length trap:" + target.length);
    return ["0"];
}

function extraOpen(target: any): string[] {
    events.push("extra open trap:" + target.length);
    return ["0", "ghost", "length"];
}

function missingClosed(target: any): string[] {
    events.push("missing closed trap:" + target.length);
    return ["0", "length"];
}

function extraClosed(target: any): string[] {
    events.push("extra closed trap:" + target.length);
    return ["0", "1", "2", "length"];
}

function exactClosed(target: any): string[] {
    events.push("exact closed trap:" + target.length);
    return ["0", "1", "length"];
}

function missingSide(target: any): string[] {
    events.push("missing side trap:" + target.length);
    return ["0", "length"];
}

function exactSide(target: any): string[] {
    events.push("exact side trap:" + target.length + ":" + target.extra);
    return ["0", "length", "extra"];
}

const openMissingLength: any = new Proxy(["x"], { ownKeys: missingLength as any });
try {
    console.log("missing length:", Reflect.ownKeys(openMissingLength, mark("missing length")).join("|"));
} catch (err: any) {
    console.log("missing length:", err);
}

const openExtra: any = new Proxy(["x"], { ownKeys: extraOpen as any });
console.log("extra open:", Reflect.ownKeys(openExtra, mark("extra open")).join("|"));

const closedMissingTarget: any = ["a", "b"];
Object.preventExtensions(closedMissingTarget);
const closedMissing: any = new Proxy(closedMissingTarget, { ownKeys: missingClosed as any });
try {
    console.log("missing closed:", Reflect.ownKeys(closedMissing, mark("missing closed")).join("|"));
} catch (err: any) {
    console.log("missing closed:", err);
}

const closedExtraTarget: any = ["a", "b"];
Object.preventExtensions(closedExtraTarget);
const closedExtra: any = new Proxy(closedExtraTarget, { ownKeys: extraClosed as any });
try {
    console.log("extra closed:", Reflect.ownKeys(closedExtra, mark("extra closed")).join("|"));
} catch (err: any) {
    console.log("extra closed:", err);
}

const closedExactTarget: any = ["a", "b"];
Object.preventExtensions(closedExactTarget);
const closedExact: any = new Proxy(closedExactTarget, { ownKeys: exactClosed as any });
console.log("exact closed:", Reflect.ownKeys(closedExact, mark("exact closed")).join("|"));

const sealedMissingTarget: any = ["s", "t"];
Object.seal(sealedMissingTarget);
const sealedMissing: any = new Proxy(sealedMissingTarget, { ownKeys: missingClosed as any });
try {
    console.log("missing sealed:", Object.keys(sealedMissing, mark("missing sealed")).join("|"));
} catch (err: any) {
    console.log("missing sealed:", err);
}

const sideMissingConfigTarget: any = ["c"];
Object.defineProperty(sideMissingConfigTarget, "extra", {
    value: "cfg",
    enumerable: true,
    configurable: true,
});
Object.preventExtensions(sideMissingConfigTarget);
const sideMissingConfig: any = new Proxy(sideMissingConfigTarget, { ownKeys: missingSide as any });
try {
    console.log("missing side configurable:", Reflect.ownKeys(sideMissingConfig, mark("missing side configurable")).join("|"));
} catch (err: any) {
    console.log("missing side configurable:", err);
}

const sideMissingFixedTarget: any = ["f"];
Object.defineProperty(sideMissingFixedTarget, "extra", {
    value: "fixed",
    enumerable: true,
    configurable: false,
});
const sideMissingFixed: any = new Proxy(sideMissingFixedTarget, { ownKeys: missingSide as any });
try {
    console.log("missing side fixed:", Reflect.ownKeys(sideMissingFixed, mark("missing side fixed")).join("|"));
} catch (err: any) {
    console.log("missing side fixed:", err);
}

const sideExactTarget: any = ["ok"];
sideExactTarget.extra = "present";
Object.preventExtensions(sideExactTarget);
const sideExact: any = new Proxy(sideExactTarget, { ownKeys: exactSide as any });
console.log("exact side:", Reflect.ownKeys(sideExact, mark("exact side")).join("|"));

console.log("events:", events.join("|"));
