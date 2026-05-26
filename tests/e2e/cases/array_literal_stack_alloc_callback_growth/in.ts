function growFromCallback(): string {
    const values: string[] = [];
    [1, 2, 3].forEach((n) => values.push("v" + n));
    return values.join(",");
}

console.log(growFromCallback());
