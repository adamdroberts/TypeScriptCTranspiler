function report(label: string, fn: () => any): void {
    try {
        console.log(label + ":", fn());
    } catch (e: any) {
        console.log(label + ":", e);
    }
}

const inheritedFlags: any = { enumerable: true, configurable: true };
const inheritedDesc: any = Object.create(inheritedFlags);
inheritedDesc.value = "from-proto-flags";

const inheritedTarget: any = {};
console.log(
    "inherited data:",
    Reflect.defineProperty(inheritedTarget, "x", inheritedDesc),
    Object.keys(inheritedTarget).join(","),
    inheritedTarget.x
);

const objectTarget: any = {};
const badDesc: any = 1;
report("object bad descriptor", (): any => Object.defineProperty(objectTarget, "a", badDesc));

const reflectTarget: any = {};
report("reflect bad descriptor", (): any => Reflect.defineProperty(reflectTarget, "a", badDesc));

const mixedDesc: any = { value: 1, get: undefined };
report("mixed descriptor", (): any => Object.defineProperty(objectTarget, "mixed", mixedDesc));

const accessorDesc: any = { get: 1 };
report("dynamic accessor", (): any => Object.defineProperty(objectTarget, "accessor", accessorDesc));
