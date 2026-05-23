function used(value: number): number {
    function dead_local_helper(inner: number): number {
        console.log("dead local effect");
        return inner * 1000;
    }

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
