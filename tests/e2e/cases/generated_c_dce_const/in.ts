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
const unused_from_entries_source: ObjectEntry<string>[] = [["dead_object_from_entries_const_key", "dead_object_from_entries_const_value"]];
const unused_string_method_source = "dead_string_method_source";
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
const unused_array_of_call = Array.of("dead_array_of", "dead_array_of_tail");
const unused_array_from_array_call = Array.from(["dead_array_from_array"]);
const unused_array_from_string_call = Array.from("dead_array_from_string");
const unused_const_array_from_call = Array.from(unused_spread_source_array);
const unused_number_is_finite = Number.isFinite(1);
const unused_number_is_integer = Number.isInteger(2);
const unused_number_is_safe_integer = Number.isSafeInteger(3);
const unused_number_is_nan = Number.isNaN(0 / 0);
const unused_global_parse_int = parseInt("dead_global_parse_int", 10);
const unused_global_parse_float = parseFloat("dead_global_parse_float");
const unused_global_is_nan = isNaN("dead_global_is_nan");
const unused_global_is_finite = isFinite("dead_global_is_finite");
const unused_number_parse_int = Number.parseInt("dead_number_parse_int", 10);
const unused_number_parse_float = Number.parseFloat("dead_number_parse_float");
const unused_string_constructor_call = String("dead_string_constructor");
const unused_number_constructor_call = Number("123");
const unused_boolean_constructor_call = Boolean("dead_boolean_constructor");
const unused_date_parse_call = Date.parse("2020-01-02T03:04:05Z");
const unused_date_utc_call = Date.UTC(2020, 0, 2, 3, 4, 5, 6);
const unused_new_date_empty_call = new Date();
const unused_new_date_string_call = new Date("2020-01-03T04:05:06Z");
const unused_new_date_number_call = new Date(1234567);
const unused_new_date_parts_call = new Date(2020, 0, 3, 4, 5, 6, 7);
const unused_uri_source = "dead_uri_source";
const unused_encode_uri_call = encodeURI("dead encode uri");
const unused_encode_uri_component_call = encodeURIComponent(unused_uri_source);
const unused_decode_uri_call = decodeURI("dead-decode-uri");
const unused_decode_uri_component_call = decodeURIComponent("dead-decode-uri-component");
const unused_bigint_constructor_string_call = BigInt("123456");
const unused_bigint_constructor_number_call = BigInt(42);
const unused_bigint_constructor_boolean_call = BigInt(true);
const unused_regexp_constructor_call = RegExp("dead_regexp_constructor", "g");
const unused_new_regexp_constructor_call = new RegExp("dead_new_regexp_constructor");
const unused_symbol_constructor_call = Symbol("dead_symbol_constructor");
const unused_string_char_at_call = "dead_string_char_at".charAt(1);
const unused_string_index_of_call = "dead_string_index_of".indexOf("string");
const unused_string_slice_call = "dead_string_slice".slice(1, 4);
const unused_string_case_call = "dead_string_case".toUpperCase();
const unused_const_string_trim_call = unused_string_method_source.trim();
const unused_array_slice_call = ["dead_array_slice"].slice(0, 1);
const unused_array_at_call = ["dead_array_at"].at(0);
const unused_array_includes_call = ["dead_array_includes"].includes("dead_array_includes");
const unused_array_keys_method_call = ["dead_array_keys_method"].keys();
const unused_array_values_method_call = ["dead_array_values_method"].values();
const unused_array_entries_method_call = ["dead_array_entries_method"].entries();
const unused_array_concat_call = ["dead_array_concat"].concat(["dead_array_concat_tail"]);
const unused_array_flat_call = [["dead_array_flat"]].flat();
const unused_array_to_sorted_call = ["dead_array_to_sorted"].toSorted();
const unused_array_to_spliced_call = ["dead_array_to_spliced"].toSpliced(0, 0, "dead_array_to_spliced_insert");
const unused_array_to_reversed_call = ["dead_array_to_reversed"].toReversed();
const unused_array_value_of_call = unused_spread_source_array.valueOf();
const unused_error_constructor = new Error("dead_error_constructor");
const unused_type_error_constructor = new TypeError("dead_type_error_constructor");
const unused_object_is = Object.is("dead", unused_label);
const unused_math_abs_call = Math.abs(-1);
const unused_math_max_call = Math.max(1, 2, 3);
const unused_math_hypot_call = Math.hypot(3, 4);
const unused_string_from_char_code = String.fromCharCode(65, 66);
const unused_regexp_escape_call = RegExp.escape("dead_regexp_escape");
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
const unused_object_set_prototype_call = Object.setPrototypeOf({ dead_object_set_prototype: 1 }, { proto: "dead_object_set_prototype_proto" });
const unused_object_create_null_call = Object.create(null);
const unused_object_create_object_call = Object.create({ dead_object_create_object: 1 });
const unused_object_create_const_call = Object.create(unused_spread_source_object);
const unused_object_assign_object_call = Object.assign({ dead_object_assign_target: 1 }, { dead_object_assign_source: 2 });
const unused_object_assign_array_call = Object.assign(["dead_object_assign_array_target"], ["dead_object_assign_array_source"]);
const unused_object_assign_const_source_call = Object.assign({ dead_object_assign_const_target: 1 }, unused_spread_source_object);
const unused_object_from_entries_call = Object.fromEntries([["dead_object_from_entries_key", "dead_object_from_entries_value"]]);
const unused_object_from_entries_const_call = Object.fromEntries(unused_from_entries_source);
const unused_reflect_has_call = Reflect.has({ dead_reflect_has: 1 }, "dead_reflect_has");
const unused_reflect_own_keys_call = Reflect.ownKeys({ dead_reflect_own_keys: 1 });
const unused_reflect_descriptor_call = Reflect.getOwnPropertyDescriptor({ dead_reflect_descriptor: 1 }, "dead_reflect_descriptor");
const unused_reflect_get_prototype_call = Reflect.getPrototypeOf({ dead_reflect_get_prototype: 1 });
const unused_reflect_is_extensible_call = Reflect.isExtensible(["dead_reflect_is_extensible"]);
const unused_reflect_prevent_extensions_call = Reflect.preventExtensions({ dead_reflect_prevent_extensions: 1 });
const unused_reflect_set_prototype_call = Reflect.setPrototypeOf({ dead_reflect_set_prototype: 1 }, null);
const unused_chain_seed = "dead";
const unused_chain_mid = unused_chain_seed;
const unused_chain_object = { label: unused_chain_mid };
const unused_other_key = "gone";
const unused_computed_key_object = { ["dead"]: 1, [unused_other_key]: 2 };
// @ts-ignore: intentional pure comma expression for generated-C DCE coverage.
const unused_comma_expr = (1, "dead");
const top_level_static_false = false;
const unused_static_conditional_dead_call = top_level_static_false ? console.log("dead_static_conditional_call") : "dead_static_conditional_value";
const unused_static_and_dead_call = top_level_static_false && console.log("dead_static_and_call");
const unused_static_or_dead_call = !top_level_static_false || console.log("dead_static_or_call");
const top_level_static_non_nullish = "alive";
const unused_static_nullish_dead_call = top_level_static_non_nullish ?? console.log("dead_static_nullish_call");
const unused_static_nullish_fallback = (undefined as string | undefined) ?? "dead_static_nullish_fallback_value";
const top_level_static_truthy_string: string = "static truthy";
let unused_let = 42;
let unused_empty: number;
"top_level_dead_expr";
123n;
/top_level_dead_regex/g;
"top_level_dead_in" in { top_level_dead_in: true };
delete ({ top_level_dead_delete: true } as any).top_level_dead_delete;
Array.isArray(["top_level_dead_array_is_array"]);
Array.of("top_level_dead_array_of", "top_level_dead_array_of_tail");
Array.from(["top_level_dead_array_from_array"]);
Array.from("top_level_dead_array_from_string");
Number.isFinite("top_level_dead_number_is_finite".length);
parseInt("top_level_dead_global_parse_int", 10);
parseFloat("top_level_dead_global_parse_float");
isNaN("top_level_dead_global_is_nan");
isFinite("top_level_dead_global_is_finite");
Number.parseInt("top_level_dead_number_parse_int", 10);
Number.parseFloat("top_level_dead_number_parse_float");
String("top_level_dead_string_constructor");
Number("456");
Boolean("top_level_dead_boolean_constructor");
Date.parse("2020-02-03T04:05:06Z");
Date.UTC(2020, 1, 3, 4, 5, 6, 7);
new Date("2020-02-04T05:06:07Z");
new Date(2234567);
new Date(2020, 1, 4, 5, 6, 7, 8);
encodeURI("top level dead encode uri");
encodeURIComponent("top-level-dead-encode-uri-component");
decodeURI("top-level-dead-decode-uri");
decodeURIComponent("top-level-dead-decode-uri-component");
BigInt("234567");
BigInt(43);
BigInt(false);
RegExp("top_level_dead_regexp_constructor", "i");
new RegExp("top_level_dead_new_regexp_constructor");
Symbol("top_level_dead_symbol_constructor");
"top_level_dead_string_char_at".charAt(1);
"top_level_dead_string_includes".includes("string");
"top_level_dead_string_slice".slice(1, 4);
"top_level_dead_string_case".toLowerCase();
"top_level_dead_string_trim".trimStart();
["top_level_dead_array_slice"].slice(0, 1);
["top_level_dead_array_at"].at(0);
["top_level_dead_array_includes"].includes("top_level_dead_array_includes");
["top_level_dead_array_keys_method"].keys();
["top_level_dead_array_concat"].concat(["top_level_dead_array_concat_tail"]);
[["top_level_dead_array_flat", "top_level_dead_array_flat_tail"]].flat();
["top_level_dead_array_to_sorted"].toSorted();
["top_level_dead_array_to_spliced"].toSpliced(0, 0, "top_level_dead_array_to_spliced_insert");
["top_level_dead_array_to_reversed"].toReversed();
new Error("top_level_dead_error_constructor");
new RangeError("top_level_dead_range_error_constructor");
Object.is("top_level_dead_object_is", "dead");
Math.max("top_level_dead_math_call".length, 1);
String.fromCharCode("top_level_dead_from_char_code".length);
RegExp.escape("top_level_dead_regexp_escape");
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
Object.setPrototypeOf({ top_level_dead_set_prototype: 1 }, { proto: "top_level_dead_set_prototype_proto" });
Object.create(null);
Object.create({ top_level_dead_create_object: 1 });
Object.assign({ top_level_dead_assign_target: 1 }, { top_level_dead_assign_source: 2 });
Object.assign(["top_level_dead_assign_array_target"], ["top_level_dead_assign_array_source"]);
Object.fromEntries([["top_level_dead_from_entries_key", "top_level_dead_from_entries_value"]]);
Reflect.has({ top_level_dead_reflect_has: 1 }, "top_level_dead_reflect_has");
Reflect.ownKeys({ top_level_dead_reflect_own_keys: 1 });
Reflect.getPrototypeOf({ top_level_dead_reflect_get_prototype: 1 });
Reflect.isExtensible(["top_level_dead_reflect_is_extensible"]);
Reflect.preventExtensions({ top_level_dead_reflect_prevent_extensions: 1 });
Reflect.setPrototypeOf({ top_level_dead_reflect_set_prototype: 1 }, null);
(1 + 2) * 3;
"top_level_dead_length".length;
"top_level_dead_index"[0];
({ label: "top_level_dead_prop" }).label;
// @ts-ignore: intentional pure comma expression for generated-C DCE coverage.
(1, "top_level_dead_comma");
if (top_level_static_false) {
    console.log("top_level_dead_static_if");
}
if (!top_level_static_false) {
    "top_level_dead_static_true_branch";
} else {
    console.log("top_level_dead_static_else");
}
while (false) {
    console.log("top_level_dead_while_false");
}
for (; false; console.log("top_level_dead_for_false_increment")) {
    console.log("top_level_dead_for_false_body");
}
if (0 as number) {
    console.log("top_level_dead_zero_if");
}
if (top_level_static_truthy_string) {
    "top_level_dead_truthy_then";
} else {
    console.log("top_level_dead_truthy_else");
}
top_level_static_false ? console.log("top_level_dead_static_conditional_call") : "top_level_dead_static_conditional_value";
top_level_static_false && console.log("top_level_dead_static_and_call");
!top_level_static_false || console.log("top_level_dead_static_or_call");
top_level_static_non_nullish ?? console.log("top_level_dead_static_nullish_call");
(undefined as string | undefined) ?? "top_level_dead_static_nullish_fallback";

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
    Array.of("local_dead_array_of", "local_dead_array_of_tail");
    Array.from(["local_dead_array_from_array"]);
    Array.from("local_dead_array_from_string");
    Number.isInteger("local_dead_number_is_integer".length);
    parseInt("local_dead_global_parse_int", 10);
    parseFloat("local_dead_global_parse_float");
    isNaN("local_dead_global_is_nan");
    isFinite("local_dead_global_is_finite");
    Number.parseInt("local_dead_number_parse_int", 10);
    Number.parseFloat("local_dead_number_parse_float");
    String("local_dead_string_constructor");
    Number("789");
    Boolean("local_dead_boolean_constructor");
    Date.parse("2020-03-04T05:06:07Z");
    Date.UTC(2020, 2, 4, 5, 6, 7, 8);
    new Date("2020-03-05T06:07:08Z");
    new Date(3234567);
    new Date(2020, 2, 5, 6, 7, 8, 9);
    encodeURI("local dead encode uri");
    encodeURIComponent("local-dead-encode-uri-component");
    decodeURI("local-dead-decode-uri");
    decodeURIComponent("local-dead-decode-uri-component");
    BigInt("345678");
    BigInt(44);
    BigInt(true);
    RegExp("local_dead_regexp_constructor", "m");
    new RegExp("local_dead_new_regexp_constructor");
    Symbol("local_dead_symbol_constructor");
    "local_dead_string_char_at".charAt(1);
    "local_dead_string_starts_with".startsWith("local");
    "local_dead_string_substring".substring(1, 4);
    "local_dead_string_case".toUpperCase();
    "local_dead_string_trim".trimEnd();
    ["local_dead_array_slice"].slice(0, 1);
    ["local_dead_array_at"].at(0);
    ["local_dead_array_includes"].includes("local_dead_array_includes");
    ["local_dead_array_values_method"].values();
    ["local_dead_array_entries_method"].entries();
    ["local_dead_array_concat"].concat(["local_dead_array_concat_tail"]);
    [["local_dead_array_flat"]].flat();
    ["local_dead_array_to_sorted"].toSorted();
    ["local_dead_array_to_spliced"].toSpliced(0, 0, "local_dead_array_to_spliced_insert");
    new Error("local_dead_error_constructor");
    new SyntaxError("local_dead_syntax_error_constructor");
    Object.is("local_dead_object_is", "dead");
    Math.min("local_dead_math_call".length, 1);
    String.fromCharCode("local_dead_from_char_code".length);
    RegExp.escape("local_dead_regexp_escape");
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
    Object.setPrototypeOf({ local_dead_set_prototype: 1 }, { proto: "local_dead_set_prototype_proto" });
    Object.create(null);
    Object.create({ local_dead_create_object: 1 });
    Object.assign({ local_dead_assign_target: 1 }, { local_dead_assign_source: 2 });
    Object.assign(["local_dead_assign_array_target"], ["local_dead_assign_array_source"]);
    Object.fromEntries([["local_dead_from_entries_key", "local_dead_from_entries_value"]]);
    Reflect.getOwnPropertyDescriptor({ local_dead_reflect_descriptor: 1 }, "local_dead_reflect_descriptor");
    Reflect.ownKeys(["local_dead_reflect_array_keys"]);
    Reflect.getPrototypeOf({ local_dead_reflect_get_prototype: 1 });
    Reflect.isExtensible(["local_dead_reflect_is_extensible"]);
    Reflect.preventExtensions({ local_dead_reflect_prevent_extensions: 1 });
    Reflect.setPrototypeOf({ local_dead_reflect_set_prototype: 1 }, null);
    "local_dead_length".length;
    "local_dead_index"[0];
    ({ label: "local_dead_prop" }).label;
    // @ts-ignore: intentional pure comma expression for generated-C DCE coverage.
    (1, "local_dead_comma");
    const unused_local_static_conditional = false ? console.log("local_dead_static_conditional_call") : "local_dead_static_conditional_value";
    false ? console.log("local_dead_static_conditional_expr_call") : "local_dead_static_conditional_expr_value";
    const unused_local_static_and = false && console.log("local_dead_static_and_call");
    const unused_local_static_or = true || console.log("local_dead_static_or_call");
    false && console.log("local_dead_static_and_expr_call");
    true || console.log("local_dead_static_or_expr_call");
    const local_static_non_nullish = { ok: true };
    const unused_local_static_nullish = local_static_non_nullish ?? console.log("local_dead_static_nullish_call");
    const unused_local_static_nullish_fallback = (undefined as string | undefined) ?? "local_dead_static_nullish_fallback";
    local_static_non_nullish ?? console.log("local_dead_static_nullish_expr_call");
    (undefined as string | undefined) ?? "local_dead_static_nullish_expr_fallback";
    for (; false; console.log("local_dead_for_false_increment")) {
        console.log("local_dead_for_false_body");
    }
    const unused_local_seed = "dead";
    const unused_local_chain = unused_local_seed;
    const kept_local = value + 3;
    return kept_local;
    const unreachable_local = "dead";
    console.log(unreachable_local);
}

function constantBranch(value: number): number {
    const local_static_false = false;
    if (local_static_false) {
        const local_dead_static_if_value = "local_dead_static_if";
        console.log(local_dead_static_if_value);
        return 900;
    }
    if (!local_static_false) {
        return value + 80;
    } else {
        console.log("local_dead_static_else");
        return 901;
    }
    const static_branch_after_exit = 902;
    console.log(static_branch_after_exit);
    return static_branch_after_exit;
}

function branchInnerExit(value: boolean): number {
    if (value) {
        return 85;
        const branch_inner_after_return = 86;
        console.log(branch_inner_after_return);
    } else {
        {
            return 87;
            const nested_branch_inner_after_return = 88;
            console.log(nested_branch_inner_after_return);
        }
    }
}

function elseIfStatic(value: number): number {
    if (value < 0) {
        return 88;
    } else if (false) {
        console.log("else_if_static_dead");
        return 89;
    } else if (true) {
        return 90;
    } else {
        console.log("else_if_static_dead_tail");
        return 91;
    }
}

function literalTruthiness(): number {
    const local_static_empty_string: string = "";
    if (local_static_empty_string) {
        console.log("local_dead_empty_string_if");
        return 92;
    } else if (1 as number) {
        return 93;
    } else {
        console.log("local_dead_truthy_tail");
        return 94;
    }
}

function staticSwitchDce(): number {
    const local_static_switch_key: "a" | "b" = top_level_static_false ? "a" : "b";
    switch (local_static_switch_key) {
        case "a":
            console.log("local_dead_static_switch_a");
            return 95;
        case "b":
            return 96;
        default:
            console.log("local_dead_static_switch_default");
            return 97;
    }
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
    constantBranch(used_count),
    branchInnerExit(true),
    elseIfStatic(used_count),
    literalTruthiness(),
    staticSwitchDce(),
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
