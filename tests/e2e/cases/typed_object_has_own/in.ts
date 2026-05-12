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
const key = "x";
const b = new Box(3);

console.log("object-x:", Object.hasOwn(p, "x"));
console.log("object-z:", Object.hasOwn(p, "z"));
console.log("object-key:", Object.hasOwn(p, key));
console.log("method-y:", p.hasOwnProperty("y"));
console.log("enum-x:", p.propertyIsEnumerable("x"));
console.log("enum-missing:", p.propertyIsEnumerable("missing"));
console.log("class-field:", Object.hasOwn(b, "value"));
console.log("class-method:", Object.hasOwn(b, "label"));
