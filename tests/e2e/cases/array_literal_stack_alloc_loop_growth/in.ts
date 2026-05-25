function describe(): string {
    const values: number[] = [1];
    for (let i = 0; i < 3; i++) {
        values.push(i + 2);
    }
    for (let j = 0; j <= 1; j++) {
        values.unshift(j);
    }
    return [values.join("|"), values.length].join(":");
}

console.log(describe());
