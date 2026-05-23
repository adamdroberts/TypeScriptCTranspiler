const used_count = 4;
const unused_count = 99;
const unused_label = "dead";
const unused_flag = true;
const unused_array = [1, 2, [3, 4]];
const unused_object = { label: "dead", count: 2, nested: { flag: false } };
const unused_math = (1 + 2) * 3;
const unused_template = `dead-${1 + 2}`;
const unused_conditional = true ? "dead" : "live";
const unused_satisfies = ("dead" satisfies string);
const unused_non_null = ("dead"!);
const unused_spread_array = [0, ...[1, 2], ..."ab"];
const unused_spread_object = { ok: true, ...{ label: "dead" } };
const unused_chain_seed = "dead";
const unused_chain_mid = unused_chain_seed;
const unused_chain_object = { label: unused_chain_mid };
const unused_other_key = "gone";
const unused_computed_key_object = { ["dead"]: 1, [unused_other_key]: 2 };
let unused_let = 42;
let unused_empty: number;
"top_level_dead_expr";
(1 + 2) * 3;

namespace DceNamespace {
    const unused_namespace_value = { label: "dead", count: 4 };
    export const kept = 7;
}

function usedLocal(value: number): number {
    const unused_local_const = { label: "dead", count: 9 };
    let unused_local_let = `dead-${1 + 2}`;
    let unused_local_empty: string;
    "local_dead_expr";
    const unused_local_seed = "dead";
    const unused_local_chain = unused_local_seed;
    const kept_local = value + 3;
    return kept_local;
    const unreachable_local = "dead";
    console.log(unreachable_local);
}

function branchExit(value: boolean): number {
    const branch_only_dead = "dead";
    if (value) {
        return 11;
    } else {
        return 12;
    }
    console.log(branch_only_dead);
    const branch_after_exit = 13;
    return branch_after_exit;
}

function nestedBlockExit(): number {
    {
        return 14;
    }
    const nested_after_block = 15;
    return nested_after_block;
}

console.log(usedLocal(used_count), branchExit(true), nestedBlockExit(), DceNamespace.kept);
