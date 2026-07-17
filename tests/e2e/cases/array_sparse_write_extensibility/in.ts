function report(label: string, action: () => void, values: any[]): void {
    try {
        action();
        console.log(label + " success");
    } catch (error: any) {
        console.log(label + ":", error);
    }
    console.log(label + " state:", values.join("|"), Object.keys(values).join("|"));
}

const typedFill = [1, 0, 3];
delete typedFill[1];
Object.preventExtensions(typedFill);
report("typed fill", () => { typedFill.fill(9); }, typedFill);

const typedCopyCreate = [1, 0, 3];
delete typedCopyCreate[1];
Object.preventExtensions(typedCopyCreate);
report("typed copy create", () => { typedCopyCreate.copyWithin(1, 2); }, typedCopyCreate);

const typedCopyDelete = [0, 2, 3];
delete typedCopyDelete[0];
Object.seal(typedCopyDelete);
report("typed copy delete", () => { typedCopyDelete.copyWithin(1, 0, 1); }, typedCopyDelete);

const dynamicFillValues: any[] = [1, 0, 3];
delete dynamicFillValues[1];
const dynamicFill: any = dynamicFillValues;
Object.preventExtensions(dynamicFill);
report("dynamic fill", () => { dynamicFill.fill(9); }, dynamicFill);

const dynamicCopyValues: any[] = [1, 0, 3];
delete dynamicCopyValues[1];
const dynamicCopy: any = dynamicCopyValues;
Object.preventExtensions(dynamicCopy);
report("dynamic copy create", () => { dynamicCopy.copyWithin(1, 2); }, dynamicCopy);
