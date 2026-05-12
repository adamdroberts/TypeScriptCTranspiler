interface Point {
    x: number;
    y: number;
}

class Box {
    value: number;

    constructor(value: number) {
        this.value = value;
    }

    label(): string {
        return "box";
    }
}

const p: Point = { x: 1, y: 2 };
const key = "y";
const box = new Box(3);

console.log("iface x:", Reflect.has(p, "x"));
console.log("iface z:", Reflect.has(p, "z"));
console.log("iface key:", Reflect.has(p, key));
console.log("class field:", Reflect.has(box, "value"));
console.log("class missing:", Reflect.has(box, "missing"));
