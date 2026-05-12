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

const p: Point = { x: 1, name: "Ada" };
const key = "name";
const box = new Box(3);

console.log("set x:", Reflect.set(p, "x", 9), p.x);
console.log("set name:", Reflect.set(p, key, "Grace"), p.name);
console.log("set class:", Reflect.set(box, "value", 7), box.value);
console.log("set missing:", Reflect.set(p, "missing", 1));
