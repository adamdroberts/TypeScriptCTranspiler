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

function mark(label: string): number {
    console.log("effect:", label);
    return label.length;
}

const unused_top_effect = mark("top");
let unused_top_let_effect = mark("top-let");

function localEffects(): number {
    const unused_local_effect = mark("local");
    let unused_local_let_effect = mark("local-let");
    return 11;
}

console.log(used(4));
console.log(localEffects());
