const badPrototype: any = 42;
const notIterable: any = 7;

function badObjectCreate(): string {
    try {
        return String(Object.create(badPrototype));
    } catch (err) {
        return String(err);
    }
}

function badForOf(): string {
    try {
        let count = 0;
        for (const value of notIterable) {
            count += Number(value);
        }
        return String(count);
    } catch (err) {
        return String(err);
    }
}

const proto: any = { label: "proto" };
const child: any = Object.create(proto);
const values: any = ["a", "b"];
let joined = "";
for (const value of values) {
    joined += value;
}

console.log("create:", badObjectCreate());
console.log("for-of:", badForOf());
console.log("valid:", child.label, joined);
