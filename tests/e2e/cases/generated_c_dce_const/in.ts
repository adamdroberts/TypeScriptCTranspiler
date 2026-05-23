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
const unused_spread_source_array = [5, 6];
const unused_spread_source_object = { extra: "dead" };
const unused_const_spread_array = [0, ...unused_spread_source_array];
const unused_const_spread_object = { ok: true, ...unused_spread_source_object };
const unused_string_length = "dead".length;
const unused_array_length = [1, 2, 3].length;
const unused_const_array_length = unused_spread_source_array.length;
const unused_string_index = "dead"[1];
const unused_array_index = [1, 2, 3][0];
const unused_const_array_index = unused_spread_source_array[0];
const unused_object_prop = { label: "dead" }.label;
const unused_const_object_prop = unused_spread_source_object.extra;
const unused_object_key_index = { label: "dead" }["label"];
const unused_chain_seed = "dead";
const unused_chain_mid = unused_chain_seed;
const unused_chain_object = { label: unused_chain_mid };
const unused_other_key = "gone";
const unused_computed_key_object = { ["dead"]: 1, [unused_other_key]: 2 };
// @ts-ignore: intentional pure comma expression for generated-C DCE coverage.
const unused_comma_expr = (1, "dead");
let unused_let = 42;
let unused_empty: number;
"top_level_dead_expr";
(1 + 2) * 3;
"top_level_dead_length".length;
"top_level_dead_index"[0];
({ label: "top_level_dead_prop" }).label;
// @ts-ignore: intentional pure comma expression for generated-C DCE coverage.
(1, "top_level_dead_comma");

namespace DceNamespace {
    const unused_namespace_value = { label: "dead", count: 4 };
    export const kept = 7;
}

function usedLocal(value: number): number {
    const unused_local_const = { label: "dead", count: 9 };
    let unused_local_let = `dead-${1 + 2}`;
    let unused_local_empty: string;
    "local_dead_expr";
    "local_dead_length".length;
    "local_dead_index"[0];
    ({ label: "local_dead_prop" }).label;
    // @ts-ignore: intentional pure comma expression for generated-C DCE coverage.
    (1, "local_dead_comma");
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

function tryExit(value: boolean): number {
    try {
        if (value) {
            return 20;
        } else {
            return 21;
        }
    } finally {
    }
    const try_after_exit = 22;
    console.log(try_after_exit);
    return try_after_exit;
}

function tryCatchExit(value: boolean): number {
    try {
        if (value) {
            throw "try_catch_dead";
        }
        return 30;
    } catch (err) {
        return 31;
    }
    const try_catch_after_exit = 32;
    console.log(try_catch_after_exit);
    return try_catch_after_exit;
}

function switchExit(value: "a" | "b"): number {
    switch (value) {
        case "a":
            return 40;
        case "b":
            return 41;
        default:
            return 42;
    }
    const switch_after_exit = 43;
    console.log(switch_after_exit);
    return switch_after_exit;
}

console.log(
    usedLocal(used_count),
    branchExit(true),
    nestedBlockExit(),
    tryExit(false),
    tryCatchExit(false),
    switchExit("a"),
    DceNamespace.kept,
);
