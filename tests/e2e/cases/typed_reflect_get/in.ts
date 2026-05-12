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
const key = "name";
const box = new Box(3);

const missing: any = Reflect.get(p, "z");

console.log("x:", Reflect.get(p, "x"));
console.log("name:", Reflect.get(p, key));
console.log("class:", Reflect.get(box, "value"));
console.log("missing:", String(missing));
