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

const pointDescs: any = Object.getOwnPropertyDescriptors(p);
const boxDescs: any = Object.getOwnPropertyDescriptors(box);

console.log("point keys:", Object.keys(pointDescs).join("|"));
console.log("x:", pointDescs.x.value, pointDescs.x.writable, pointDescs.x.enumerable, pointDescs.x.configurable);
console.log("name:", pointDescs.name.value);
console.log("box keys:", Object.keys(boxDescs).join("|"));
console.log("box value:", boxDescs.value.value);
