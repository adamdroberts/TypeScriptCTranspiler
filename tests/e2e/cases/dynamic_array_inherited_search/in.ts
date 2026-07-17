function report(label: string, value: any): void {
    console.log(
        label,
        value.indexOf("needle"),
        value.lastIndexOf("needle"),
        value.includes("needle"),
    );
}

const dynamicValues: any[] = ["deleted", "middle", "deleted"];
delete dynamicValues[0];
delete dynamicValues[2];
const dynamic: any = dynamicValues;
const dynamicProto: any = Object.create(Array.prototype);
dynamicProto[0] = "needle";
dynamicProto[2] = "needle";
Object.setPrototypeOf(dynamic, dynamicProto);
report("dynamic inherited:", dynamic);

const typed: any[] = ["deleted", "middle", "deleted"];
delete typed[0];
delete typed[2];
const typedProto: any = Object.create(Array.prototype);
typedProto[0] = "needle";
typedProto[2] = "needle";
Object.setPrototypeOf(typed, typedProto);
console.log(
    "typed inherited:",
    typed.indexOf("needle"),
    typed.lastIndexOf("needle"),
    typed.includes("needle"),
);

const holes: any[] = ["deleted", "middle", "deleted"];
delete holes[0];
delete holes[2];
console.log(
    "typed holes:",
    holes.indexOf(undefined),
    holes.lastIndexOf(undefined),
    holes.includes(undefined),
);
