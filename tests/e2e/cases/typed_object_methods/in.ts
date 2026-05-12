interface Point {
    x: number;
    y: number;
}

class Box {
    value: number;

    constructor(value: number) {
        this.value = value;
    }
}

class CustomName {
    toString(): string {
        return "custom";
    }
}

const p: Point = { x: 1, y: 2 };
const same: Point = p.valueOf();
const b = new Box(7);
const custom = new CustomName();

console.log("iface-string:", p.toString());
console.log("iface-locale:", p.toLocaleString());
console.log("iface-value:", same.hasOwnProperty("y"));
console.log("class-string:", b.toString());
console.log("class-value:", b.valueOf().propertyIsEnumerable("value"));
console.log("custom-string:", custom.toString());
