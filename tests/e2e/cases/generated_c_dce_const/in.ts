const used_count = 4;
const unused_count = 99;
const unused_label = "dead";
const unused_flag = true;
const unused_bigint_literal = 123n;
const unused_regexp_literal = /dead-regexp/g;
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
const unused_in_object = "label" in { label: "dead" };
const unused_in_array = 0 in [1, 2, 3];
const unused_in_const_object = "extra" in unused_spread_source_object;
const unused_delete_object = delete ({ label: "dead" } as any).label;
const unused_delete_array = delete ([1, 2, 3] as any)[0];
const unused_delete_const_object = delete (unused_spread_source_object as any).extra;
const unused_array_is_array = Array.isArray([1, 2, 3]);
const unused_const_array_is_array = Array.isArray(unused_spread_source_array);
const unused_number_is_finite = Number.isFinite(1);
const unused_number_is_integer = Number.isInteger(2);
const unused_number_is_safe_integer = Number.isSafeInteger(3);
const unused_number_is_nan = Number.isNaN(0 / 0);
const unused_object_is = Object.is("dead", unused_label);
const unused_math_abs_call = Math.abs(-1);
const unused_math_max_call = Math.max(1, 2, 3);
const unused_math_hypot_call = Math.hypot(3, 4);
const unused_string_from_char_code = String.fromCharCode(65, 66);
const unused_object_keys_call = Object.keys({ dead_object_keys: 1 });
const unused_object_values_call = Object.values({ dead_object_values: 2 });
const unused_object_entries_call = Object.entries({ dead_object_entries: 3 });
const unused_const_object_keys_call = Object.keys(unused_spread_source_object);
const unused_array_keys_call = Object.keys([1, 2, 3]);
const unused_object_has_own_call = Object.hasOwn({ dead_object_has_own: true }, "dead_object_has_own");
const unused_array_has_own_call = Object.hasOwn([1, 2, 3], "0");
const unused_object_property_names_call = Object.getOwnPropertyNames({ dead_object_property_names: 1 });
const unused_object_property_descriptor_call = Object.getOwnPropertyDescriptor({ dead_object_property_descriptor: 1 }, "dead_object_property_descriptor");
const unused_object_property_descriptors_call = Object.getOwnPropertyDescriptors({ dead_object_property_descriptors: 1 });
const unused_array_property_names_call = Object.getOwnPropertyNames([1, 2, 3]);
const unused_object_get_prototype_call = Object.getPrototypeOf({ dead_object_get_prototype: 1 });
const unused_object_is_extensible_call = Object.isExtensible({ dead_object_is_extensible: 1 });
const unused_object_is_sealed_call = Object.isSealed(["dead_object_is_sealed"]);
const unused_object_is_frozen_call = Object.isFrozen(unused_spread_source_object);
const unused_object_prevent_extensions_call = Object.preventExtensions({ dead_object_prevent_extensions: 1 });
const unused_object_seal_call = Object.seal({ dead_object_seal: 1 });
const unused_object_freeze_call = Object.freeze(["dead_object_freeze"]);
const unused_reflect_has_call = Reflect.has({ dead_reflect_has: 1 }, "dead_reflect_has");
const unused_reflect_own_keys_call = Reflect.ownKeys({ dead_reflect_own_keys: 1 });
const unused_reflect_descriptor_call = Reflect.getOwnPropertyDescriptor({ dead_reflect_descriptor: 1 }, "dead_reflect_descriptor");
const unused_reflect_get_prototype_call = Reflect.getPrototypeOf({ dead_reflect_get_prototype: 1 });
const unused_reflect_is_extensible_call = Reflect.isExtensible(["dead_reflect_is_extensible"]);
const unused_reflect_prevent_extensions_call = Reflect.preventExtensions({ dead_reflect_prevent_extensions: 1 });
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
123n;
/top_level_dead_regex/g;
"top_level_dead_in" in { top_level_dead_in: true };
delete ({ top_level_dead_delete: true } as any).top_level_dead_delete;
Array.isArray(["top_level_dead_array_is_array"]);
Number.isFinite("top_level_dead_number_is_finite".length);
Object.is("top_level_dead_object_is", "dead");
Math.max("top_level_dead_math_call".length, 1);
String.fromCharCode("top_level_dead_from_char_code".length);
Object.keys({ top_level_dead_object_keys: 1 });
Object.values({ top_level_dead_object_values: 2 });
Object.hasOwn({ top_level_dead_object_has_own: 1 }, "top_level_dead_object_has_own");
Object.getOwnPropertyNames({ top_level_dead_property_names: 1 });
Object.getOwnPropertyDescriptor({ top_level_dead_property_descriptor: 1 }, "top_level_dead_property_descriptor");
Object.getPrototypeOf({ top_level_dead_get_prototype: 1 });
Object.isExtensible({ top_level_dead_is_extensible: 1 });
Object.isSealed(["top_level_dead_is_sealed"]);
Object.isFrozen({ top_level_dead_is_frozen: 1 });
Object.preventExtensions({ top_level_dead_prevent_extensions: 1 });
Object.seal({ top_level_dead_seal: 1 });
Object.freeze(["top_level_dead_freeze"]);
Reflect.has({ top_level_dead_reflect_has: 1 }, "top_level_dead_reflect_has");
Reflect.ownKeys({ top_level_dead_reflect_own_keys: 1 });
Reflect.getPrototypeOf({ top_level_dead_reflect_get_prototype: 1 });
Reflect.isExtensible(["top_level_dead_reflect_is_extensible"]);
Reflect.preventExtensions({ top_level_dead_reflect_prevent_extensions: 1 });
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
    456n;
    /local_dead_regex/g;
    "local_dead_in" in { local_dead_in: true };
    delete ({ local_dead_delete: true } as any).local_dead_delete;
    Array.isArray(["local_dead_array_is_array"]);
    Number.isInteger("local_dead_number_is_integer".length);
    Object.is("local_dead_object_is", "dead");
    Math.min("local_dead_math_call".length, 1);
    String.fromCharCode("local_dead_from_char_code".length);
    Object.entries({ local_dead_object_entries: 3 });
    Object.keys(["local_dead_array_keys"]);
    Object.hasOwn({ local_dead_object_has_own: 1 }, "local_dead_object_has_own");
    Object.getOwnPropertyDescriptors({ local_dead_property_descriptors: 1 });
    Object.getOwnPropertyNames(["local_dead_array_property_names"]);
    Object.getPrototypeOf({ local_dead_get_prototype: 1 });
    Object.isExtensible({ local_dead_is_extensible: 1 });
    Object.isSealed(["local_dead_is_sealed"]);
    Object.isFrozen({ local_dead_is_frozen: 1 });
    Object.preventExtensions({ local_dead_prevent_extensions: 1 });
    Object.seal({ local_dead_seal: 1 });
    Object.freeze(["local_dead_freeze"]);
    Reflect.getOwnPropertyDescriptor({ local_dead_reflect_descriptor: 1 }, "local_dead_reflect_descriptor");
    Reflect.ownKeys(["local_dead_reflect_array_keys"]);
    Reflect.getPrototypeOf({ local_dead_reflect_get_prototype: 1 });
    Reflect.isExtensible(["local_dead_reflect_is_extensible"]);
    Reflect.preventExtensions({ local_dead_reflect_prevent_extensions: 1 });
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

function exhaustiveSwitchExit(value: "x" | "y"): number {
    switch (value) {
        case "x":
            return 44;
        case "y":
            return 45;
    }
    const exhaustive_switch_after_exit = 46;
    console.log(exhaustive_switch_after_exit);
    return exhaustive_switch_after_exit;
}

function fallthroughSwitchExit(value: "p" | "q"): number {
    switch (value) {
        case "p":
        case "q":
            return 47;
    }
    const fallthrough_switch_after_exit = 48;
    console.log(fallthrough_switch_after_exit);
    return fallthrough_switch_after_exit;
}

function whileExit(): number {
    while (true) {
        return 50;
    }
    const while_after_exit = 51;
    console.log(while_after_exit);
    return while_after_exit;
}

function forExit(): number {
    for (;;) {
        return 60;
    }
    const for_after_exit = 61;
    console.log(for_after_exit);
    return for_after_exit;
}

function doExit(value: boolean): number {
    do {
        return 70;
    } while (value);
    const do_after_exit = 71;
    console.log(do_after_exit);
    return do_after_exit;
}

console.log(
    usedLocal(used_count),
    branchExit(true),
    nestedBlockExit(),
    tryExit(false),
    tryCatchExit(false),
    switchExit("a"),
    exhaustiveSwitchExit("y"),
    fallthroughSwitchExit("p"),
    whileExit(),
    forExit(),
    doExit(false),
    DceNamespace.kept,
);
