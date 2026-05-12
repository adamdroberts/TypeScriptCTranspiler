interface Point {
    x: number;
    name: string;
}

class Box {
    value: number;

    constructor(value: number) {
        this.value = value;
    }
}

const p: Point = { x: 7, name: "Ada" };
const box = new Box(3);

const dx: any = Object.getOwnPropertyDescriptor(p, "x");
const dn: any = Object.getOwnPropertyDescriptor(p, "name");
const db: any = Reflect.getOwnPropertyDescriptor(box, "value");
const missing: any = Reflect.getOwnPropertyDescriptor(p, "missing");

console.log("x:", dx.value, dx.writable, dx.enumerable, dx.configurable);
console.log("name:", dn.value);
console.log("class:", db.value);
console.log("missing:", String(missing));
