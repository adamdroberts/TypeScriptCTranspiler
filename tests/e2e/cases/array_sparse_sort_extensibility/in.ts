function report(label: string, action: () => void, values: any[]): void {
    try {
        action();
        console.log(label + " success");
    } catch (error: any) {
        console.log(label + ":", error);
    }
    console.log(label + " state:", values.join("|"), Object.keys(values).join("|"));
}

const typedSparse = [3, 0, 1];
delete typedSparse[1];
typedSparse.sort((a, b) => a - b);
console.log("typed sparse:", typedSparse.join("|"), Object.keys(typedSparse).join("|"));

const typedClosed = [3, 0, 1];
delete typedClosed[1];
Object.preventExtensions(typedClosed);
report("typed closed", () => { typedClosed.sort((a, b) => a - b); }, typedClosed);

const typedSealed = [3, 0, 1];
delete typedSealed[1];
Object.seal(typedSealed);
report("typed sealed", () => { typedSealed.sort((a, b) => a - b); }, typedSealed);

const dynamicValues: any[] = [3, 0, 1];
delete dynamicValues[1];
const dynamicClosed: any = dynamicValues;
Object.preventExtensions(dynamicClosed);
report("dynamic closed", () => { dynamicClosed.sort((a: any, b: any) => a - b); }, dynamicClosed);
