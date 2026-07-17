function report(label: string, value: any[]): void {
    console.log(label, value.join("|"), Object.keys(value).join("|"));
}

const inheritedLeftValues: any[] = ["deleted", "b"];
delete inheritedLeftValues[0];
const inheritedLeft: any = inheritedLeftValues;
Object.setPrototypeOf(inheritedLeft, { 0: "inherited-left" });
const inheritedRightValues: any[] = ["c", "deleted"];
delete inheritedRightValues[1];
const inheritedRight: any = inheritedRightValues;
Object.setPrototypeOf(inheritedRight, { 1: "inherited-right" });
const dynamicResult: any[] = Array.prototype.concat.call(inheritedLeft, inheritedRight);
report("dynamic inherited:", dynamicResult);

const typedLeft: any[] = ["deleted", "b"];
delete typedLeft[0];
Object.setPrototypeOf(typedLeft, { 0: "inherited-left" });
const typedRight: any[] = ["c", "deleted"];
delete typedRight[1];
Object.setPrototypeOf(typedRight, { 1: "inherited-right" });
const typedResult = typedLeft.concat(typedRight);
report("typed inherited:", typedResult);

const holeLeft: any[] = ["deleted", "b"];
delete holeLeft[0];
const holeRight: any[] = ["c", "deleted"];
delete holeRight[1];
const holeResult = holeLeft.concat(holeRight);
report("typed holes:", holeResult);
