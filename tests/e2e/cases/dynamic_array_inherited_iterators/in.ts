function valuesText(iterator: any): string {
    const out: string[] = [];
    for (const value of iterator) out.push(String(value));
    return out.join("|");
}

function entriesText(iterator: any): string {
    const out: string[] = [];
    for (const entry of iterator) out.push(String(entry[0]) + ":" + String(entry[1]));
    return out.join("|");
}

const dynamicValues: any[] = ["deleted", "middle", "deleted"];
delete dynamicValues[0];
delete dynamicValues[2];
const dynamic: any = dynamicValues;
const dynamicProto: any = Object.create(Array.prototype);
dynamicProto[0] = "inherited";
Object.setPrototypeOf(dynamic, dynamicProto);
console.log("dynamic:", valuesText(dynamic.values()), entriesText(dynamic.entries()));

const typed: any[] = ["deleted", "middle", "deleted"];
delete typed[0];
delete typed[2];
const typedProto: any = Object.create(Array.prototype);
typedProto[0] = "inherited";
Object.setPrototypeOf(typed, typedProto);
console.log("typed:", valuesText(typed.values()), entriesText(typed.entries()));

const holes: any[] = ["deleted", "middle", "deleted"];
delete holes[0];
delete holes[2];
console.log("holes:", valuesText(holes.values()), entriesText(holes.entries()));
