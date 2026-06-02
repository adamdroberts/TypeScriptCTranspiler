function total(): number {
    const values: number[] = [3, 1, 2];
    values.reverse();
    values.fill(4, 1, 2);
    values.copyWithin(2, 0, 1);
    return values[0] + values[1] + values[2];
}

function wrappedUses(): string {
    const checks: number[] = [4, 2, 1];
    const direct = Array.isArray(checks.reverse());
    const keys = Object.keys(checks.fill(9, 1, 2)).join("|");
    const same = Object.prototype.valueOf.call((checks.copyWithin(2, 0, 1))).join("|");
    ((checks.sort()));
    return [direct, keys, same, checks.join("|")].join(":");
}

console.log(total(), wrappedUses());
