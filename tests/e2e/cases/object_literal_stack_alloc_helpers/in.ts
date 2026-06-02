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
    const point: Point = { x: 2, y: 5 };
    const box = new Box(7);
    const keys = Object.keys(point).join("|");
    const names = Object.getOwnPropertyNames(point).join("|");
    const own = Reflect.ownKeys(point).join("|");
    const values = Object.values(point).join("|");
    const entry = Object.entries(point)[1];
    const desc: any = Object.getOwnPropertyDescriptor(point, "x");
    const descriptors: any = Object.getOwnPropertyDescriptors(point);
    const flags = [
        Object.hasOwn(point, "y"),
        Object.isExtensible(point),
        Object.isFrozen(point),
        Object.isSealed(point),
        Reflect.has(point, "x"),
        Reflect.isExtensible(point),
        "x" in point,
        Object.prototype.hasOwnProperty.call(point, "x"),
        Object.prototype.propertyIsEnumerable.call(point, "y"),
        Object.prototype.isPrototypeOf.call(point, {}),
        Object.prototype.toString.call(point),
        Object.prototype.toLocaleString.call(point),
    ].join("|");
    return [
        keys,
        names,
        own,
        values,
        entry[0] + "-" + entry[1],
        desc.value,
        descriptors.y.value,
        Reflect.get(point, "y"),
        Reflect.getOwnPropertyDescriptor(point, "x")!.value,
        flags,
        Object.keys(box).join("|"),
        Reflect.get(box, "value"),
        Object.prototype.hasOwnProperty.call(box, "value"),
        point.x + point.y,
    ].join(":");
}

console.log(describe());
