const used_count = 4;
const unused_count = 99;
const unused_label = "dead";
const unused_flag = true;
const unused_array = [1, 2, [3, 4]];
const unused_object = { label: "dead", count: 2, nested: { flag: false } };
const unused_math = (1 + 2) * 3;
const unused_template = `dead-${1 + 2}`;
const unused_conditional = true ? "dead" : "live";
let unused_let = 42;
let unused_empty: number;

namespace DceNamespace {
    const unused_namespace_value = { label: "dead", count: 4 };
    export const kept = 7;
}

function usedLocal(value: number): number {
    const unused_local_const = { label: "dead", count: 9 };
    let unused_local_let = `dead-${1 + 2}`;
    let unused_local_empty: string;
    const kept_local = value + 3;
    return kept_local;
    const unreachable_local = "dead";
    console.log(unreachable_local);
}

console.log(usedLocal(used_count), DceNamespace.kept);
