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
    const point: Point = { x: 5, y: 6 };
    let alias: Point = undefined as any;
    let second: Point = undefined as any;
    alias = point;
    second = alias;
    second.y = second.y + 4;

    const box = new Box(11);
    let boxAlias: Box = undefined as any;
    let boxSecond: Box = undefined as any;
    boxAlias = box;
    boxSecond = boxAlias;
    boxSecond.value = boxSecond.value + 2;

    return [
        second.x + second.y,
        Object.keys(alias).join("|"),
        Reflect.get(second, "y"),
        Object.prototype.hasOwnProperty.call(alias, "x"),
        boxSecond.value,
        Object.keys(boxAlias).join("|"),
        Reflect.get(boxSecond, "value"),
        point.y,
        box.value,
    ].join(":");
}

console.log(describe());
