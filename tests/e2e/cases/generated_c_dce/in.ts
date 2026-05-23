function used(value: number): number {
    return value + 3;
}

function dead_helper(value: number): number {
    return value * 99;
}

function dead_leaf(value: number): number {
    return value * 101;
}

function dead_parent(value: number): number {
    return dead_leaf(value);
}

console.log(used(4));
