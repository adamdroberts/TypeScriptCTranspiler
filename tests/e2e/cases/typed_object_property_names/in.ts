interface Point {
    x: number;
    y: number;
}

const p: Point = { x: 1, y: 2 };
console.log("iface", Object.getOwnPropertyNames(p).join("|"));

class Box {
    value = 3;
    label = "box";
    getLabel(): string {
        return this.label;
    }
}

const b = new Box();
console.log("class", Object.getOwnPropertyNames(b).join("|"));

let constructed = 0;
class Counted {
    first = 1;
    second = 2;
    constructor() {
        constructed = constructed + 1;
    }
}

console.log("keys side", Object.keys(new Counted()).join("|"), constructed);
console.log("names side", Object.getOwnPropertyNames(new Counted()).join("|"), constructed);
console.log("reflect side", Reflect.ownKeys(new Counted()).join("|"), constructed);
