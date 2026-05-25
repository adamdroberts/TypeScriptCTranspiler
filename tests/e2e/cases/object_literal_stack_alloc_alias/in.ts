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
    alias.y = alias.y + 2;

    const box = new Box(8);
    const boxAlias = box;

    return [
        alias.x + alias.y,
        Object.keys(alias).join("|"),
        Reflect.get(alias, "y"),
        Object.prototype.propertyIsEnumerable.call(alias, "x"),
        Object.keys(boxAlias).join("|"),
        Reflect.get(boxAlias, "value"),
        Object.prototype.hasOwnProperty.call(boxAlias, "value"),
        point.y,
    ].join(":");
}

console.log(describe());
