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
    const point: Point = { x: 3, y: 4 };
    const alias = point;
    const second = alias;
    second.y = second.y + 2;

    const box = new Box(8);
    const boxAlias = box;
    const boxSecond = boxAlias;

    return [
        second.x + second.y,
        Object.keys(second).join("|"),
        Reflect.get(second, "y"),
        Object.prototype.propertyIsEnumerable.call(second, "x"),
        Object.keys(boxSecond).join("|"),
        Reflect.get(boxSecond, "value"),
        Object.prototype.hasOwnProperty.call(boxSecond, "value"),
        point.y,
    ].join(":");
}

console.log(describe());
