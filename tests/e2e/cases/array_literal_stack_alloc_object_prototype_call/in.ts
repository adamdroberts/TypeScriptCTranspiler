function describe(): string {
    const values: number[] = [2, 5, 9];
    const child: any = {};
    const has = Object.prototype.hasOwnProperty.call(values, "1");
    const enumerable = Object.prototype.propertyIsEnumerable.call(values, "length");
    const proto = Object.prototype.isPrototypeOf.call(values, child);
    const tag = Object.prototype.toString.call(values);
    const text = Object.prototype.toLocaleString.call(values);
    return [has, enumerable, proto, tag, text, values.join("|")].join(":");
}

console.log(describe());
