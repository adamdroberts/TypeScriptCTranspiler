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

function describe(): string {
    const point: Point = { x: 4, y: 5 };
    const same: Point = Object.prototype.valueOf.call(point);
    const sameAgain: Point = Object.prototype.valueOf.call(same);
    sameAgain.y = sameAgain.y + 3;

    const box = new Box(9);
    const sameBox: Box = Object.prototype.valueOf.call(box);
    sameBox.value = sameBox.value + 1;

    return [
        same.x + same.y,
        Object.keys(sameAgain).join("|"),
        Reflect.get(same, "y"),
        Object.prototype.hasOwnProperty.call(sameAgain, "x"),
        sameBox.value,
        Object.keys(sameBox).join("|"),
        point.y,
    ].join(":");
}

console.log(describe());
