function describe(): string {
    const values: number[] = [2, 5, 9];
    const keys = Object.keys(values).join("|");
    const names = Object.getOwnPropertyNames(values).join("|");
    const own = Reflect.ownKeys(values).join("|");
    const copied = Object.values(values);
    copied[1] = 7;
    const entry = Object.entries(values)[2];
    const desc: any = Object.getOwnPropertyDescriptor(values, "1");
    const reflectDesc: any = Reflect.getOwnPropertyDescriptor(values, "0");
    const flags = [
        Object.hasOwn(values, "1"),
        Reflect.has(values, "length"),
        "2" in values,
        Array.isArray(values),
        Object.isExtensible(values),
        !Object.isSealed(values),
        !Object.isFrozen(values),
        Reflect.isExtensible(values),
    ].join("|");
    return [
        keys,
        names,
        own,
        copied.join("|"),
        entry[0] + "-" + entry[1],
        desc.value,
        reflectDesc.value,
        Reflect.get(values, "length"),
        flags,
        values.join("|"),
    ].join(":");
}

console.log(describe());
