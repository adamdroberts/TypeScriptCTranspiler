function report(label: string, action: () => void, values: any[]): void {
    try {
        action();
        console.log(label + " success");
    } catch (error: any) {
        console.log(label + ":", error);
    }
    console.log(label + " state:", values.join("|"), Object.keys(values).join("|"));
}

const typedLowerHole = [0, 2, 3];
delete typedLowerHole[0];
Object.preventExtensions(typedLowerHole);
report("typed lower hole", () => { typedLowerHole.reverse(); }, typedLowerHole);

const typedUpperHole = [1, 2, 0];
delete typedUpperHole[2];
Object.preventExtensions(typedUpperHole);
report("typed upper hole", () => { typedUpperHole.reverse(); }, typedUpperHole);

const dynamicLowerValues: any[] = [0, 2, 3];
delete dynamicLowerValues[0];
const dynamicLowerHole: any = dynamicLowerValues;
Object.preventExtensions(dynamicLowerHole);
report("dynamic lower hole", () => { dynamicLowerHole.reverse(); }, dynamicLowerHole);

const dynamicUpperValues: any[] = [1, 2, 0];
delete dynamicUpperValues[2];
const dynamicUpperHole: any = dynamicUpperValues;
Object.preventExtensions(dynamicUpperHole);
report("dynamic upper hole", () => { dynamicUpperHole.reverse(); }, dynamicUpperHole);
