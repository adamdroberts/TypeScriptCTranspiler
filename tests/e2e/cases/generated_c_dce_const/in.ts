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
const unused_spread_map_array = [...new Map([["dead_spread_map_key", "dead_spread_map_value"]])];
const unused_spread_set_array = [...new Set(["dead_spread_set", "dead_spread_set_tail"])];
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
const unused_array_from_map_call = Array.from(new Map([["dead_array_from_map_key", "dead_array_from_map_value"]]));
const unused_array_from_set_call = Array.from(new Set(["dead_array_from_set", "dead_array_from_set_tail"]));
const unused_array_from_empty_array_mapper_call = Array.from([] as number[], (value) => value + "dead_array_from_empty_array_mapper".length);
const unused_array_from_empty_string_mapper_call = Array.from("", (value) => value + "dead_array_from_empty_string_mapper");
const unused_array_from_empty_map_mapper_call = Array.from(new Map<string, number>(), (entry) => entry[1] + "dead_array_from_empty_map_mapper".length);
const unused_array_from_empty_set_mapper_call = Array.from(new Set<number>(), (value) => value + "dead_array_from_empty_set_mapper".length);
Array.from(new Set(["kept_array_from_non_empty_set_mapper"]), (value) => value);
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
const unused_date_callable_call = Date("dead_date_callable_ignored");
const unused_date_now_call = Date.now("dead_date_now_ignored");
const unused_date_parse_call = Date.parse("2020-01-02T03:04:05Z");
const unused_date_utc_call = Date.UTC(2020, 0, 2, 3, 4, 5, 6);
const unused_new_date_empty_call = new Date();
const unused_new_date_string_call = new Date("2020-01-03T04:05:06Z");
const unused_new_date_number_call = new Date(1234567);
const unused_new_date_parts_call = new Date(2020, 0, 3, 4, 5, 6, 7);
const unused_new_url_call = new URL("https://dead-new-url.test/path?q=1");
const unused_new_url_base_call = new URL("child", "https://dead-new-url-base.test/root/");
const unused_new_map_empty_call = new Map<string, number>();
const unused_new_map_entries_call = new Map([["dead_new_map_entries_key", "dead_new_map_entries_value"]]);
const unused_new_map_object_entries_call = new Map(Object.entries({ dead_new_map_object_entries_key: "dead_new_map_object_entries_value" }));
const unused_new_map_copy_call = new Map(new Map([["dead_new_map_copy_key", "dead_new_map_copy_value"]]));
const unused_new_set_empty_call = new Set<number>();
const unused_new_set_array_call = new Set(["dead_new_set_array", "dead_new_set_array_tail"]);
const unused_new_set_copy_call = new Set(new Set(["dead_new_set_copy", "dead_new_set_copy_tail"]));
const unused_new_weak_map_empty_call = new WeakMap<object, string>();
const unused_new_weak_set_empty_call = new WeakSet<object>();
const unused_new_weak_ref_call = new WeakRef<object>({ label: "dead_weak_ref_target" });
const unused_new_finalization_registry_call = new FinalizationRegistry<string>((held) => {
    "dead_finalization_registry_callback";
});
const unused_uri_source = "dead_uri_source";
const unused_url_can_parse_call = URL.canParse("https://dead-url-can-parse.test/path");
const unused_url_can_parse_base_call = URL.canParse("dead-url-can-parse-child", "https://dead-url-can-parse-base.test/root/");
const unused_promise_resolve_call = Promise.resolve("dead_promise_resolve", "dead_promise_resolve_ignored");
const unused_promise_all_empty_call = Promise.all([] as Promise<string>[]);
const unused_promise_all_settled_empty_call = Promise.allSettled([] as Promise<string>[]);
const unused_promise_race_empty_call = Promise.race([] as Promise<string>[]);
const unused_promise_resolve_bigint_call = Promise.resolve(123456789n);
const unused_promise_resolve_signed_number_call = Promise.resolve(-123456.5);
const unused_promise_resolve_nan_call = Promise.resolve(NaN, "dead_promise_resolve_nan_ignored");
const unused_promise_resolve_infinity_call = Promise.resolve(-Infinity, "dead_promise_resolve_infinity_ignored");
const unused_promise_resolve_string_constructor_call = Promise.resolve(String("dead_promise_resolve_string_constructor"));
const unused_promise_resolve_number_constructor_call = Promise.resolve(Number("dead_promise_resolve_number_constructor"));
const unused_promise_resolve_boolean_constructor_call = Promise.resolve(Boolean("dead_promise_resolve_boolean_constructor"));
const unused_promise_resolve_bigint_constructor_call = Promise.resolve(BigInt("456789123"));
const unused_promise_resolve_symbol_call = Promise.resolve(Symbol("dead_promise_resolve_symbol"));
const unused_promise_resolve_date_callable_call = Promise.resolve(Date("dead_promise_resolve_date_callable_ignored"));
const unused_promise_resolve_date_now_call = Promise.resolve(Date.now("dead_promise_resolve_date_now_ignored"));
const unused_promise_resolve_date_parse_call = Promise.resolve(Date.parse("2099-01-02T03:04:05Z"));
const unused_promise_resolve_date_utc_call = Promise.resolve(Date.UTC(2099, 0, 2, 3, 4, 5, 6));
const unused_promise_resolve_string_static_call = Promise.resolve(String.fromCharCode("dead_promise_resolve_string_static".length));
const unused_promise_resolve_string_code_point_call = Promise.resolve(String.fromCodePoint(0x1f680));
const unused_promise_resolve_regexp_escape_call = Promise.resolve(RegExp.escape("dead_promise_resolve_regexp_escape"));
const unused_promise_resolve_array_is_array_call = Promise.resolve(Array.isArray(["dead_promise_resolve_array_is_array"]));
const unused_promise_resolve_object_is_call = Promise.resolve(Object.is("dead_promise_resolve_object_is", "dead_promise_resolve_object_is"));
const unused_promise_resolve_object_has_own_call = Promise.resolve(Object.hasOwn({ dead_promise_resolve_object_has_own: 1 }, "dead_promise_resolve_object_has_own"));
const unused_promise_resolve_object_extensible_call = Promise.resolve(Object.isExtensible({ dead_promise_resolve_object_extensible: 1 }));
const unused_promise_resolve_object_sealed_call = Promise.resolve(Object.isSealed({ dead_promise_resolve_object_sealed: 1 }));
const unused_promise_resolve_object_frozen_call = Promise.resolve(Object.isFrozen({ dead_promise_resolve_object_frozen: 1 }));
const unused_promise_resolve_url_can_parse_call = Promise.resolve(URL.canParse("https://dead-promise-resolve-url-can-parse.test/"));
const unused_promise_resolve_reflect_has_call = Promise.resolve(Reflect.has({ dead_promise_resolve_reflect_has: 1 }, "dead_promise_resolve_reflect_has"));
const unused_promise_resolve_reflect_extensible_call = Promise.resolve(Reflect.isExtensible({ dead_promise_resolve_reflect_extensible: 1 }));
const unused_promise_resolve_string_method_call = Promise.resolve("dead_promise_resolve_string_method".toUpperCase());
const unused_promise_resolve_string_search_call = Promise.resolve("dead_promise_resolve_string_search".search("resolve"));
const unused_promise_resolve_regexp_test_call = Promise.resolve(/dead_promise_resolve_regexp_test/.test("dead_promise_resolve_regexp_test"));
const unused_promise_resolve_regexp_string_call = Promise.resolve(/dead_promise_resolve_regexp_string/.toString());
const unused_promise_resolve_array_includes_call = Promise.resolve(["dead_promise_resolve_array_includes"].includes("missing"));
const unused_promise_resolve_array_index_call = Promise.resolve(["dead_promise_resolve_array_index"].indexOf("missing"));
const unused_promise_resolve_array_join_call = Promise.resolve(["dead_promise_resolve_array_join"].join(","));
const unused_promise_resolve_array_string_call = Promise.resolve(["dead_promise_resolve_array_string"].toString());
const unused_promise_resolve_string_length_call = Promise.resolve("dead_promise_resolve_string_length".length);
const unused_promise_resolve_array_length_call = Promise.resolve(["dead_promise_resolve_array_length"].length);
const unused_promise_resolve_string_element_call = Promise.resolve("dead_promise_resolve_string_element"[0]);
const unused_promise_resolve_template_call = Promise.resolve(`dead_promise_resolve_template_${"value"}`);
const unused_promise_resolve_conditional_call = Promise.resolve(true ? "dead_promise_resolve_conditional_true" : "dead_promise_resolve_conditional_false");
const unused_promise_resolve_logical_source: string = String("dead_promise_resolve_logical_left");
const unused_promise_resolve_nullish_source: string | undefined = String("dead_promise_resolve_nullish_left");
const unused_promise_resolve_logical_call = Promise.resolve(unused_promise_resolve_logical_source && "dead_promise_resolve_logical_right");
const unused_promise_resolve_nullish_call = Promise.resolve(unused_promise_resolve_nullish_source ?? "dead_promise_resolve_nullish_right");
const unused_promise_resolve_comma_call = Promise.resolve((String("dead_promise_resolve_comma_left"), "dead_promise_resolve_comma_right"));
const unused_promise_resolve_arithmetic_call = Promise.resolve("dead_promise_resolve_arithmetic".length + 3);
const unused_promise_resolve_comparison_call = Promise.resolve("dead_promise_resolve_comparison".length > 2);
const unused_promise_resolve_equality_call = Promise.resolve(String("dead_promise_resolve_equality") === "missing");
const unused_promise_resolve_in_call = Promise.resolve("dead_promise_resolve_in_key" in { dead_promise_resolve_in_key: true });
const unused_promise_resolve_delete_call = Promise.resolve(delete ({ dead_promise_resolve_delete_key: true } as { dead_promise_resolve_delete_key?: boolean }).dead_promise_resolve_delete_key);
const unused_promise_resolve_void_call = Promise.resolve(void String("dead_promise_resolve_void"));
const unused_promise_resolve_typeof_call = Promise.resolve(typeof String("dead_promise_resolve_typeof"));
const unused_promise_resolve_prefix_call = Promise.resolve(!"dead_promise_resolve_prefix_bang".length);
const unused_promise_resolve_bitwise_not_call = Promise.resolve(~"dead_promise_resolve_prefix_tilde".length);
const dead_promise_resolve_object_shorthand = "dead_promise_resolve_object_shorthand";
const unused_promise_resolve_object_shorthand_call = Promise.resolve({ dead_promise_resolve_object_shorthand }.dead_promise_resolve_object_shorthand);
const dead_promise_resolve_object_spread_source = { dead_promise_resolve_object_spread: "dead_promise_resolve_object_spread" };
const unused_promise_resolve_object_spread_call = Promise.resolve({ ...dead_promise_resolve_object_spread_source }.dead_promise_resolve_object_spread);
const dead_promise_resolve_object_assign_source = { dead_promise_resolve_object_assign: "dead_promise_resolve_object_assign" };
const unused_promise_resolve_object_assign_call = Promise.resolve(Object.assign({}, dead_promise_resolve_object_assign_source).dead_promise_resolve_object_assign);
const unused_promise_resolve_object_from_entries_call = Promise.resolve(Object.fromEntries<{ dead_promise_resolve_object_from_entries: string }>([["dead_promise_resolve_object_from_entries", "dead_promise_resolve_object_from_entries"]]).dead_promise_resolve_object_from_entries);
const unused_promise_resolve_object_entries_from_entries_call = Promise.resolve(Object.fromEntries<{ dead_promise_resolve_object_entries_from_entries: string }>(Object.entries({ dead_promise_resolve_object_entries_from_entries: "dead_promise_resolve_object_entries_from_entries" })).dead_promise_resolve_object_entries_from_entries);
const unused_promise_resolve_object_define_property_call = Promise.resolve(Object.defineProperty({} as { dead_promise_resolve_object_define_property: string }, "dead_promise_resolve_object_define_property", { value: "dead_promise_resolve_object_define_property", enumerable: true }).dead_promise_resolve_object_define_property);
const unused_promise_resolve_object_define_properties_call = Promise.resolve(Object.defineProperties({} as { dead_promise_resolve_object_define_properties: string }, { dead_promise_resolve_object_define_properties: { value: "dead_promise_resolve_object_define_properties", configurable: true } }).dead_promise_resolve_object_define_properties);
const unused_promise_resolve_object_create_descriptor_call = Promise.resolve(Object.create(null, { dead_promise_resolve_object_create_descriptor: { value: "dead_promise_resolve_object_create_descriptor", enumerable: true } }).dead_promise_resolve_object_create_descriptor);
const unused_promise_resolve_object_property_call = Promise.resolve({ dead_promise_resolve_object_property: "dead_promise_resolve_object_property" }.dead_promise_resolve_object_property);
const unused_promise_resolve_object_property_missing_call = Promise.resolve(({ dead_promise_resolve_object_property_missing_source: 1 } as { [key: string]: number }).dead_promise_resolve_object_property_missing);
const dead_promise_resolve_array_spread_source = ["dead_promise_resolve_array_spread"];
const unused_promise_resolve_array_spread_call = Promise.resolve([0, ...dead_promise_resolve_array_spread_source][1]);
const unused_promise_resolve_string_spread_call = Promise.resolve([..."dead_promise_resolve_string_spread"][2]);
const unused_promise_resolve_array_element_call = Promise.resolve(["dead_promise_resolve_array_element"][0]);
const unused_promise_resolve_array_element_oob_call = Promise.resolve(["dead_promise_resolve_array_element_oob"][4]);
const unused_promise_resolve_date_getter_call = Promise.resolve(new Date("2101-01-02T03:04:05Z").getTime("dead_promise_resolve_date_getter_ignored"));
const unused_promise_resolve_date_string_call = Promise.resolve(new Date("2101-02-03T04:05:06Z").toUTCString("dead_promise_resolve_date_string_ignored"));
const unused_promise_resolve_error_string_call = Promise.resolve(new Error("dead_promise_resolve_error_message").toString("dead_promise_resolve_error_ignored"));
const unused_promise_resolve_aggregate_error_string_call = Promise.resolve(new AggregateError(["dead_promise_resolve_aggregate_error_item"], "dead_promise_resolve_aggregate_error_message").toLocaleString("dead_promise_resolve_aggregate_error_ignored"));
const unused_promise_resolve_parser_call = Promise.resolve(parseInt("456789", 10));
const unused_promise_resolve_number_parse_call = Promise.resolve(Number.parseInt("dead_promise_resolve_number_parse", 10));
const unused_promise_resolve_number_predicate_call = Promise.resolve(Number.isSafeInteger("dead_promise_resolve_number_predicate".length));
const unused_promise_resolve_uri_call = Promise.resolve(encodeURIComponent("dead promise resolve uri"));
const unused_promise_resolve_math_call = Promise.resolve(Math.hypot("dead_promise_resolve_math".length, 4));
const unused_encode_uri_call = encodeURI("dead encode uri");
const unused_encode_uri_component_call = encodeURIComponent(unused_uri_source);
const unused_decode_uri_call = decodeURI("dead-decode-uri");
const unused_decode_uri_component_call = decodeURIComponent("dead-decode-uri-component");
const unused_bigint_constructor_string_call = BigInt("123456");
const unused_bigint_constructor_number_call = BigInt(42);
const unused_bigint_constructor_boolean_call = BigInt(true);
const unused_regexp_constructor_call = RegExp("dead_regexp_constructor", "g");
const unused_new_regexp_constructor_call = new RegExp("dead_new_regexp_constructor");
const unused_regexp_test_call = /dead_regexp_test/.test("dead_regexp_test_input");
const unused_regexp_exec_call = RegExp("dead_regexp_exec").exec("dead_regexp_exec_input");
const unused_regexp_to_string_call = /dead_regexp_to_string/.toString();
const unused_regexp_to_locale_string_call = new RegExp("dead_regexp_to_locale_string").toLocaleString();
const unused_regexp_value_of_call = /dead_regexp_value_of/.valueOf();
const unused_symbol_constructor_call = Symbol("dead_symbol_constructor");
const unused_string_char_at_call = "dead_string_char_at".charAt(1);
const unused_string_index_of_call = "dead_string_index_of".indexOf("string");
const unused_string_slice_call = "dead_string_slice".slice(1, 4);
const unused_string_case_call = "dead_string_case".toUpperCase();
const unused_const_string_trim_call = unused_string_method_source.trim();
const unused_string_normalize_call = "dead_string_normalize".normalize("NFC");
const unused_string_repeat_call = "dead_string_repeat".repeat(2);
const unused_string_pad_call = "dead_string_pad".padStart(18, ".");
const unused_string_replace_call = "dead_string_replace".replace("replace", "replacement");
const unused_string_replace_all_call = "dead_string_replace_all".replaceAll("dead", "replacement");
const unused_string_replace_regex_call = "dead_string_replace_regex".replace(/replace_regex/, "replacement");
const unused_string_replace_all_regex_call = "dead_string_replace_all_regex".replaceAll(/replace_all_regex/g, "replacement");
const unused_string_split_call = "dead_string_split,dead_string_split_tail".split(",", 1);
const unused_string_split_regex_call = "dead_string_split_regex dead_string_split_regex_tail".split(/\\s+/, 1);
const unused_string_match_call = "dead_string_match".match("string_match");
const unused_string_match_all_call = "dead_string_match_all".matchAll("string_match_all");
const unused_string_search_call = "dead_string_search".search("string_search");
const unused_array_slice_call = ["dead_array_slice"].slice(0, 1);
const unused_array_at_call = ["dead_array_at"].at(0);
const unused_array_includes_call = ["dead_array_includes"].includes("dead_array_includes");
const unused_array_keys_method_call = ["dead_array_keys_method"].keys();
const unused_array_values_method_call = ["dead_array_values_method"].values();
const unused_array_entries_method_call = ["dead_array_entries_method"].entries();
const unused_array_concat_call = ["dead_array_concat"].concat(["dead_array_concat_tail"]);
const unused_array_flat_call = [["dead_array_flat"]].flat();
const unused_array_join_call = ["dead_array_join", "dead_array_join_tail"].join("|");
const unused_array_pop_call = ["dead_array_pop"].pop();
const unused_array_shift_call = ["dead_array_shift"].shift();
const unused_array_reverse_call = ["dead_array_reverse"].reverse();
const unused_array_fill_call = ["dead_array_fill", "dead_array_fill_tail"].fill("dead_array_fill_value", 0, 1);
const unused_array_copy_within_call = ["dead_array_copy_within", "dead_array_copy_within_tail"].copyWithin(0, 1);
const unused_array_push_call = ["dead_array_push"].push("dead_array_push_value");
const unused_array_unshift_call = ["dead_array_unshift"].unshift("dead_array_unshift_value");
const unused_array_sort_call = ["dead_array_sort_b", "dead_array_sort_a"].sort();
const unused_array_sort_comparator_call = [1].sort((a, b) => "dead_array_sort_comparator".length + a - b);
const unused_empty_array_map_call = [].map(() => "dead_empty_array_map");
const unused_empty_array_flat_map_call = [].flatMap(() => ["dead_empty_array_flat_map"]);
const unused_empty_array_filter_call = [].filter(() => "dead_empty_array_filter".length > 0);
const unused_empty_array_for_each_call = [].forEach(() => "dead_empty_array_for_each");
const unused_empty_array_some_call = [].some(() => "dead_empty_array_some".length > 0);
const unused_empty_array_every_call = [].every(() => "dead_empty_array_every".length > 0);
const unused_empty_array_find_call = [].find(() => "dead_empty_array_find".length > 0);
const unused_empty_array_find_index_call = [].findIndex(() => "dead_empty_array_find_index".length > 0);
const unused_empty_array_find_last_call = [].findLast(() => "dead_empty_array_find_last".length > 0);
const unused_empty_array_find_last_index_call = [].findLastIndex(() => "dead_empty_array_find_last_index".length > 0);
const unused_empty_array_reduce_call = [].reduce((acc: number) => acc + "dead_empty_array_reduce".length, 0);
const unused_empty_array_reduce_right_call = [].reduceRight((acc: number) => acc + "dead_empty_array_reduce_right".length, 0);
const unused_array_to_sorted_call = ["dead_array_to_sorted"].toSorted();
const unused_array_to_sorted_comparator_call = [1].toSorted((a, b) => "dead_array_to_sorted_comparator".length + a - b);
const unused_array_to_spliced_call = ["dead_array_to_spliced"].toSpliced(0, 0, "dead_array_to_spliced_insert");
const unused_array_to_reversed_call = ["dead_array_to_reversed"].toReversed();
const unused_array_with_call = ["dead_array_with", "dead_array_with_tail"].with(1, "dead_array_with_replacement");
const unused_array_to_string_call = ["dead_array_to_string", "dead_array_to_string_tail"].toString();
const unused_array_to_locale_string_call = ["dead_array_to_locale_string", "dead_array_to_locale_string_tail"].toLocaleString();
const unused_array_value_of_call = unused_spread_source_array.valueOf();
const unused_error_constructor = new Error("dead_error_constructor");
const unused_type_error_constructor = new TypeError("dead_type_error_constructor");
const unused_aggregate_error_constructor = new AggregateError(["dead_aggregate_error_item"], "dead_aggregate_error_message", { cause: "dead_aggregate_error_cause" });
const unused_aggregate_error_call = AggregateError(["dead_aggregate_error_call_item"], "dead_aggregate_error_call_message");
const unused_object_is = Object.is("dead", unused_label);
const unused_math_abs_call = Math.abs(-1);
const unused_math_max_call = Math.max(1, 2, 3);
const unused_math_hypot_call = Math.hypot(3, 4);
const unused_string_from_char_code = String.fromCharCode(65, 66);
const unused_string_from_code_point = String.fromCodePoint(0x41, 0x1f600);
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
const unused_object_primitive_keys_call = Object.keys("dead_object_primitive_keys");
const unused_object_primitive_values_call = Object.values("dead_object_primitive_values");
const unused_object_primitive_entries_call = Object.entries("dead_object_primitive_entries");
const unused_object_primitive_property_names_call = Object.getOwnPropertyNames("dead_object_primitive_property_names");
const unused_object_primitive_descriptor_call = Object.getOwnPropertyDescriptor("dead_object_primitive_descriptor", "0");
const unused_object_primitive_descriptors_call = Object.getOwnPropertyDescriptors("dead_object_primitive_descriptors");
const unused_object_primitive_has_own_call = Object.hasOwn("dead_object_primitive_has_own", "0");
const unused_object_primitive_get_prototype_call = Object.getPrototypeOf("dead_object_primitive_get_prototype");
const unused_object_primitive_is_extensible_call = Object.isExtensible("dead_object_primitive_is_extensible");
const unused_object_primitive_is_sealed_call = Object.isSealed("dead_object_primitive_is_sealed");
const unused_object_primitive_is_frozen_call = Object.isFrozen("dead_object_primitive_is_frozen");
const unused_object_primitive_prevent_extensions_call = Object.preventExtensions("dead_object_primitive_prevent_extensions");
const unused_object_primitive_seal_call = Object.seal("dead_object_primitive_seal");
const unused_object_primitive_freeze_call = Object.freeze("dead_object_primitive_freeze");
const unused_object_create_null_call = Object.create(null);
const unused_object_create_object_call = Object.create({ dead_object_create_object: 1 });
const unused_object_create_const_call = Object.create(unused_spread_source_object);
const unused_object_create_descriptors_call = Object.create({ dead_object_create_descriptors_proto: 1 }, { dead_object_create_descriptors_key: { value: "dead_object_create_descriptors_value", enumerable: true } });
const unused_object_assign_object_call = Object.assign({ dead_object_assign_target: 1 }, { dead_object_assign_source: 2 });
const unused_object_assign_array_call = Object.assign(["dead_object_assign_array_target"], ["dead_object_assign_array_source"]);
const unused_object_assign_const_source_call = Object.assign({ dead_object_assign_const_target: 1 }, unused_spread_source_object);
const unused_object_assign_primitive_source_call = Object.assign({ dead_object_assign_primitive_target: 1 }, "dead_object_assign_primitive_source");
const unused_object_assign_nullish_source_call = Object.assign({ dead_object_assign_nullish_target: 1 }, null, undefined, "dead_object_assign_nullish_primitive_source");
const unused_object_define_property_call = Object.defineProperty({ dead_object_define_property_target: 1 }, "dead_object_define_property_key", { value: "dead_object_define_property_value", enumerable: true });
const unused_object_define_properties_call = Object.defineProperties({ dead_object_define_properties_target: 1 }, { dead_object_define_properties_key: { value: "dead_object_define_properties_value", configurable: true } });
const unused_object_from_entries_call = Object.fromEntries([["dead_object_from_entries_key", "dead_object_from_entries_value"]]);
const unused_object_from_entries_const_call = Object.fromEntries(unused_from_entries_source);
const unused_object_from_entries_object_entries_call = Object.fromEntries(Object.entries({ dead_object_from_entries_object_entries_key: "dead_object_from_entries_object_entries_value" }));
const unused_object_from_entries_empty_map_call = Object.fromEntries(new Map<string, string>());
const unused_object_group_by_empty_call = Object.groupBy([] as number[], (value) => "dead_object_group_by_empty" + value);
const unused_map_group_by_empty_call = Map.groupBy([] as number[], (value) => "dead_map_group_by_empty" + value);
const unused_collection_object_keys_call = Object.keys(new Map<string, number>());
const unused_collection_object_has_own_call = Object.hasOwn(new Set<string>(), "dead_collection_has_own");
const unused_collection_reflect_own_keys_call = Reflect.ownKeys(new WeakRef<object>({ label: "dead_collection_reflect_weak_ref" }));
const unused_url_object_keys_call = Object.keys(new URL("https://dead-url-object-keys.test/path"));
const unused_url_reflect_own_keys_call = Reflect.ownKeys(new URL("https://dead-url-reflect-own-keys.test/path"));
const unused_reflect_has_call = Reflect.has({ dead_reflect_has: 1 }, "dead_reflect_has");
const unused_reflect_own_keys_call = Reflect.ownKeys({ dead_reflect_own_keys: 1 });
const unused_reflect_get_call = Reflect.get({ dead_reflect_get: 1 }, "dead_reflect_get");
const unused_reflect_get_array_call = Reflect.get(["dead_reflect_get_array"], "0");
const unused_reflect_set_call = Reflect.set({ dead_reflect_set_target: 1 }, "dead_reflect_set_key", "dead_reflect_set_value");
const unused_reflect_set_array_call = Reflect.set(["dead_reflect_set_array_target"], "0", "dead_reflect_set_array_value");
const unused_reflect_descriptor_call = Reflect.getOwnPropertyDescriptor({ dead_reflect_descriptor: 1 }, "dead_reflect_descriptor");
const unused_reflect_delete_property_call = Reflect.deleteProperty({ dead_reflect_delete_property: 1 }, "dead_reflect_delete_property");
const unused_reflect_define_property_call = Reflect.defineProperty({ dead_reflect_define_property_target: 1 }, "dead_reflect_define_property_key", { value: "dead_reflect_define_property_value", configurable: true });
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
[...new Map([["top_level_dead_spread_map_key", "top_level_dead_spread_map_value"]])];
[...new Set(["top_level_dead_spread_set", "top_level_dead_spread_set_tail"])];
"top_level_dead_in" in { top_level_dead_in: true };
delete ({ top_level_dead_delete: true } as any).top_level_dead_delete;
Array.isArray(["top_level_dead_array_is_array"]);
Array.of("top_level_dead_array_of", "top_level_dead_array_of_tail");
Array.from(["top_level_dead_array_from_array"]);
Array.from("top_level_dead_array_from_string");
Array.from(new Map([["top_level_dead_array_from_map_key", "top_level_dead_array_from_map_value"]]));
Array.from(new Set(["top_level_dead_array_from_set", "top_level_dead_array_from_set_tail"]));
Array.from([] as number[], (value) => value + "top_level_dead_array_from_empty_array_mapper".length);
Array.from("", (value) => value + "top_level_dead_array_from_empty_string_mapper");
Array.from(new Map<string, number>(), (entry) => entry[1] + "top_level_dead_array_from_empty_map_mapper".length);
Array.from(new Set<number>(), (value) => value + "top_level_dead_array_from_empty_set_mapper".length);
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
Date("top_level_dead_date_callable_ignored");
Date.now("top_level_dead_date_now_ignored");
Date.parse("2020-02-03T04:05:06Z");
Date.UTC(2020, 1, 3, 4, 5, 6, 7);
new Date("2020-02-04T05:06:07Z");
new Date(2234567);
new Date(2020, 1, 4, 5, 6, 7, 8);
new URL("https://top-level-dead-new-url.test/path");
new URL("child", "https://top-level-dead-new-url-base.test/root/");
new Map<string, number>();
new Map([["top_level_dead_new_map_entries_key", "top_level_dead_new_map_entries_value"]]);
new Map(Object.entries({ top_level_dead_new_map_object_entries_key: "top_level_dead_new_map_object_entries_value" }));
new Map(new Map([["top_level_dead_new_map_copy_key", "top_level_dead_new_map_copy_value"]]));
new Set<number>();
new Set(["top_level_dead_new_set_array", "top_level_dead_new_set_array_tail"]);
new Set(new Set(["top_level_dead_new_set_copy", "top_level_dead_new_set_copy_tail"]));
new WeakMap<object, string>();
new WeakSet<object>();
new WeakRef<object>({ label: "top_level_dead_weak_ref_target" });
new FinalizationRegistry<string>((held) => {
    "top_level_dead_finalization_registry_callback";
});
URL.canParse("https://top-level-dead-url-can-parse.test/path");
URL.canParse("top-level-dead-url-can-parse-child", "https://top-level-dead-url-can-parse-base.test/root/");
Promise.resolve("top_level_dead_promise_resolve", "top_level_dead_promise_resolve_ignored");
Promise.all([] as Promise<string>[]);
Promise.allSettled([] as Promise<string>[]);
Promise.race([] as Promise<string>[]);
Promise.resolve(987654321n);
Promise.resolve(+765432.25);
Promise.resolve(NaN, "top_level_dead_promise_resolve_nan_ignored");
Promise.resolve(Infinity, "top_level_dead_promise_resolve_infinity_ignored");
Promise.resolve(String("top_level_dead_promise_resolve_string_constructor"));
Promise.resolve(Number("top_level_dead_promise_resolve_number_constructor"));
Promise.resolve(Boolean("top_level_dead_promise_resolve_boolean_constructor"));
Promise.resolve(BigInt(567891234));
Promise.resolve(Symbol("top_level_dead_promise_resolve_symbol"));
Promise.resolve(Date("top_level_dead_promise_resolve_date_callable_ignored"));
Promise.resolve(Date.now("top_level_dead_promise_resolve_date_now_ignored"));
Promise.resolve(Date.parse("2099-02-03T04:05:06Z"));
Promise.resolve(Date.UTC(2099, 1, 3, 4, 5, 6, 7));
Promise.resolve(String.fromCharCode("top_level_dead_promise_resolve_string_static".length));
Promise.resolve(String.fromCodePoint(0x1f682));
Promise.resolve(RegExp.escape("top_level_dead_promise_resolve_regexp_escape"));
Promise.resolve(Array.isArray(["top_level_dead_promise_resolve_array_is_array"]));
Promise.resolve(Object.is("top_level_dead_promise_resolve_object_is", "top_level_dead_promise_resolve_object_is"));
Promise.resolve(Object.hasOwn({ top_level_dead_promise_resolve_object_has_own: 1 }, "top_level_dead_promise_resolve_object_has_own"));
Promise.resolve(Object.isExtensible({ top_level_dead_promise_resolve_object_extensible: 1 }));
Promise.resolve(Object.isSealed({ top_level_dead_promise_resolve_object_sealed: 1 }));
Promise.resolve(Object.isFrozen({ top_level_dead_promise_resolve_object_frozen: 1 }));
Promise.resolve(URL.canParse("https://top-level-dead-promise-resolve-url-can-parse.test/"));
Promise.resolve(Reflect.has({ top_level_dead_promise_resolve_reflect_has: 1 }, "top_level_dead_promise_resolve_reflect_has"));
Promise.resolve(Reflect.isExtensible({ top_level_dead_promise_resolve_reflect_extensible: 1 }));
Promise.resolve("top_level_dead_promise_resolve_string_method".trim());
Promise.resolve("top_level_dead_promise_resolve_string_replace".replace("replace", "done"));
Promise.resolve(/top_level_dead_promise_resolve_regexp_test/.test("top_level_dead_promise_resolve_regexp_test"));
Promise.resolve(/top_level_dead_promise_resolve_regexp_string/.toString());
Promise.resolve(["top_level_dead_promise_resolve_array_includes"].includes("missing"));
Promise.resolve(["top_level_dead_promise_resolve_array_index"].lastIndexOf("missing"));
Promise.resolve(["top_level_dead_promise_resolve_array_join"].join("|"));
Promise.resolve(["top_level_dead_promise_resolve_array_string"].toLocaleString());
Promise.resolve("top_level_dead_promise_resolve_string_length".length);
Promise.resolve(["top_level_dead_promise_resolve_array_length"].length);
Promise.resolve("top_level_dead_promise_resolve_string_element"[1]);
Promise.resolve(`top_level_dead_promise_resolve_template_${"value"}`);
Promise.resolve(false ? "top_level_dead_promise_resolve_conditional_true" : "top_level_dead_promise_resolve_conditional_false");
const top_level_dead_promise_resolve_logical_source: string = String("top_level_dead_promise_resolve_logical_left");
const top_level_dead_promise_resolve_nullish_source: string | undefined = String("top_level_dead_promise_resolve_nullish_left");
Promise.resolve(top_level_dead_promise_resolve_logical_source || "top_level_dead_promise_resolve_logical_right");
Promise.resolve(top_level_dead_promise_resolve_nullish_source ?? "top_level_dead_promise_resolve_nullish_right");
Promise.resolve((String("top_level_dead_promise_resolve_comma_left"), "top_level_dead_promise_resolve_comma_right"));
Promise.resolve("top_level_dead_promise_resolve_arithmetic".length * 2);
Promise.resolve("top_level_dead_promise_resolve_comparison".length <= 99);
Promise.resolve(String("top_level_dead_promise_resolve_equality") !== "missing");
Promise.resolve("top_level_dead_promise_resolve_in_key" in { top_level_dead_promise_resolve_in_key: true });
Promise.resolve(delete ({ top_level_dead_promise_resolve_delete_key: true } as { top_level_dead_promise_resolve_delete_key?: boolean }).top_level_dead_promise_resolve_delete_key);
Promise.resolve(void String("top_level_dead_promise_resolve_void"));
Promise.resolve(typeof String("top_level_dead_promise_resolve_typeof"));
Promise.resolve(!"top_level_dead_promise_resolve_prefix_bang".length);
Promise.resolve(~"top_level_dead_promise_resolve_prefix_tilde".length);
const top_level_dead_promise_resolve_object_shorthand = "top_level_dead_promise_resolve_object_shorthand";
Promise.resolve({ top_level_dead_promise_resolve_object_shorthand }.top_level_dead_promise_resolve_object_shorthand);
const top_level_dead_promise_resolve_object_spread_source = { top_level_dead_promise_resolve_object_spread: "top_level_dead_promise_resolve_object_spread" };
Promise.resolve({ ...top_level_dead_promise_resolve_object_spread_source }.top_level_dead_promise_resolve_object_spread);
const top_level_dead_promise_resolve_object_assign_source = { top_level_dead_promise_resolve_object_assign: "top_level_dead_promise_resolve_object_assign" };
Promise.resolve(Object.assign({}, top_level_dead_promise_resolve_object_assign_source).top_level_dead_promise_resolve_object_assign);
Promise.resolve(Object.fromEntries<{ top_level_dead_promise_resolve_object_from_entries: string }>([["top_level_dead_promise_resolve_object_from_entries", "top_level_dead_promise_resolve_object_from_entries"]]).top_level_dead_promise_resolve_object_from_entries);
Promise.resolve(Object.fromEntries<{ top_level_dead_promise_resolve_object_entries_from_entries: string }>(Object.entries({ top_level_dead_promise_resolve_object_entries_from_entries: "top_level_dead_promise_resolve_object_entries_from_entries" })).top_level_dead_promise_resolve_object_entries_from_entries);
Promise.resolve(Object.defineProperty({} as { top_level_dead_promise_resolve_object_define_property: string }, "top_level_dead_promise_resolve_object_define_property", { value: "top_level_dead_promise_resolve_object_define_property", writable: true }).top_level_dead_promise_resolve_object_define_property);
Promise.resolve(Object.defineProperties({} as { top_level_dead_promise_resolve_object_define_properties: string }, { top_level_dead_promise_resolve_object_define_properties: { value: "top_level_dead_promise_resolve_object_define_properties", enumerable: true } }).top_level_dead_promise_resolve_object_define_properties);
Promise.resolve(Object.create(null, { top_level_dead_promise_resolve_object_create_descriptor: { value: "top_level_dead_promise_resolve_object_create_descriptor", configurable: true } }).top_level_dead_promise_resolve_object_create_descriptor);
Promise.resolve({ top_level_dead_promise_resolve_object_property: "top_level_dead_promise_resolve_object_property" }.top_level_dead_promise_resolve_object_property);
Promise.resolve(({ top_level_dead_promise_resolve_object_property_missing_source: 1 } as { [key: string]: number }).top_level_dead_promise_resolve_object_property_missing);
const top_level_dead_promise_resolve_array_spread_source = ["top_level_dead_promise_resolve_array_spread"];
Promise.resolve([0, ...top_level_dead_promise_resolve_array_spread_source][1]);
Promise.resolve([..."top_level_dead_promise_resolve_string_spread"][3]);
Promise.resolve(["top_level_dead_promise_resolve_array_element"][0]);
Promise.resolve(["top_level_dead_promise_resolve_array_element_oob"][4]);
Promise.resolve(new Date("2102-01-02T03:04:05Z").getUTCFullYear("top_level_dead_promise_resolve_date_getter_ignored"));
Promise.resolve(new Date("2102-02-03T04:05:06Z").toDateString("top_level_dead_promise_resolve_date_string_ignored"));
Promise.resolve(new TypeError("top_level_dead_promise_resolve_error_message").toLocaleString("top_level_dead_promise_resolve_error_ignored"));
Promise.resolve(new AggregateError(["top_level_dead_promise_resolve_aggregate_error_item"], "top_level_dead_promise_resolve_aggregate_error_message").toString("top_level_dead_promise_resolve_aggregate_error_ignored"));
Promise.resolve(parseFloat("765432.25"));
Promise.resolve(Number.parseFloat("top_level_dead_promise_resolve_number_parse"));
Promise.resolve(Number.isInteger("top_level_dead_promise_resolve_number_predicate".length));
Promise.resolve(encodeURI("top level dead promise resolve uri"));
Promise.resolve(Math.max("top_level_dead_promise_resolve_math".length, 1));
encodeURI("top level dead encode uri");
encodeURIComponent("top-level-dead-encode-uri-component");
decodeURI("top-level-dead-decode-uri");
decodeURIComponent("top-level-dead-decode-uri-component");
BigInt("234567");
BigInt(43);
BigInt(false);
RegExp("top_level_dead_regexp_constructor", "i");
new RegExp("top_level_dead_new_regexp_constructor");
/top_level_dead_regexp_test/.test("top_level_dead_regexp_test_input");
new RegExp("top_level_dead_regexp_exec").exec("top_level_dead_regexp_exec_input");
/top_level_dead_regexp_to_string/.toString();
new RegExp("top_level_dead_regexp_to_locale_string").toLocaleString();
/top_level_dead_regexp_value_of/.valueOf();
Symbol("top_level_dead_symbol_constructor");
"top_level_dead_string_char_at".charAt(1);
"top_level_dead_string_includes".includes("string");
"top_level_dead_string_slice".slice(1, 4);
"top_level_dead_string_case".toLowerCase();
"top_level_dead_string_trim".trimStart();
"top_level_dead_string_normalize".normalize("NFD");
"top_level_dead_string_repeat".repeat(2);
"top_level_dead_string_pad".padEnd(28, ".");
"top_level_dead_string_replace".replace("replace", "replacement");
"top_level_dead_string_replace_all".replaceAll("dead", "replacement");
"top_level_dead_string_replace_regex".replace(/replace_regex/, "replacement");
"top_level_dead_string_replace_all_regex".replaceAll(/replace_all_regex/g, "replacement");
"top_level_dead_string_split/top_level_dead_string_split_tail".split("/");
"top_level_dead_string_split_regex top_level_dead_string_split_regex_tail".split(/\\s+/);
"top_level_dead_string_match".match("string_match");
"top_level_dead_string_match_all".matchAll("string_match_all");
"top_level_dead_string_search".search("string_search");
["top_level_dead_array_slice"].slice(0, 1);
["top_level_dead_array_at"].at(0);
["top_level_dead_array_includes"].includes("top_level_dead_array_includes");
["top_level_dead_array_keys_method"].keys();
["top_level_dead_array_concat"].concat(["top_level_dead_array_concat_tail"]);
[["top_level_dead_array_flat", "top_level_dead_array_flat_tail"]].flat();
["top_level_dead_array_join", "top_level_dead_array_join_tail"].join("/");
["top_level_dead_array_pop"].pop();
["top_level_dead_array_shift"].shift();
["top_level_dead_array_reverse"].reverse();
["top_level_dead_array_fill", "top_level_dead_array_fill_tail"].fill("top_level_dead_array_fill_value", 0, 1);
["top_level_dead_array_copy_within", "top_level_dead_array_copy_within_tail"].copyWithin(0, 1);
["top_level_dead_array_push"].push("top_level_dead_array_push_value");
["top_level_dead_array_unshift"].unshift("top_level_dead_array_unshift_value");
["top_level_dead_array_sort_b", "top_level_dead_array_sort_a"].sort();
[1].sort((a, b) => "top_level_dead_array_sort_comparator".length + a - b);
[].map(() => "top_level_dead_empty_array_map");
[].flatMap(() => ["top_level_dead_empty_array_flat_map"]);
[].filter(() => "top_level_dead_empty_array_filter".length > 0);
[].forEach(() => "top_level_dead_empty_array_for_each");
[].some(() => "top_level_dead_empty_array_some".length > 0);
[].every(() => "top_level_dead_empty_array_every".length > 0);
[].find(() => "top_level_dead_empty_array_find".length > 0);
[].findIndex(() => "top_level_dead_empty_array_find_index".length > 0);
[].findLast(() => "top_level_dead_empty_array_find_last".length > 0);
[].findLastIndex(() => "top_level_dead_empty_array_find_last_index".length > 0);
[].reduce((acc: number) => acc + "top_level_dead_empty_array_reduce".length, 0);
[].reduceRight((acc: number) => acc + "top_level_dead_empty_array_reduce_right".length, 0);
["top_level_dead_array_to_sorted"].toSorted();
[1].toSorted((a, b) => "top_level_dead_array_to_sorted_comparator".length + a - b);
["top_level_dead_array_to_spliced"].toSpliced(0, 0, "top_level_dead_array_to_spliced_insert");
["top_level_dead_array_to_reversed"].toReversed();
["top_level_dead_array_with", "top_level_dead_array_with_tail"].with(-1, "top_level_dead_array_with_replacement");
["top_level_dead_array_to_string", "top_level_dead_array_to_string_tail"].toString();
["top_level_dead_array_to_locale_string", "top_level_dead_array_to_locale_string_tail"].toLocaleString();
new Error("top_level_dead_error_constructor");
new RangeError("top_level_dead_range_error_constructor");
new AggregateError(["top_level_dead_aggregate_error_item"], "top_level_dead_aggregate_error_message", { cause: "top_level_dead_aggregate_error_cause" });
AggregateError(["top_level_dead_aggregate_error_call_item"], "top_level_dead_aggregate_error_call_message");
Object.is("top_level_dead_object_is", "dead");
Math.max("top_level_dead_math_call".length, 1);
String.fromCharCode("top_level_dead_from_char_code".length);
String.fromCodePoint(0x42, 0x1f601);
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
Object.keys("top_level_dead_object_primitive_keys");
Object.values("top_level_dead_object_primitive_values");
Object.entries("top_level_dead_object_primitive_entries");
Object.getOwnPropertyNames("top_level_dead_object_primitive_property_names");
Object.getOwnPropertyDescriptor("top_level_dead_object_primitive_descriptor", "0");
Object.getOwnPropertyDescriptors("top_level_dead_object_primitive_descriptors");
Object.hasOwn("top_level_dead_object_primitive_has_own", "0");
Object.getPrototypeOf("top_level_dead_object_primitive_get_prototype");
Object.isExtensible("top_level_dead_object_primitive_is_extensible");
Object.isSealed("top_level_dead_object_primitive_is_sealed");
Object.isFrozen("top_level_dead_object_primitive_is_frozen");
Object.preventExtensions("top_level_dead_object_primitive_prevent_extensions");
Object.seal("top_level_dead_object_primitive_seal");
Object.freeze("top_level_dead_object_primitive_freeze");
Object.create(null);
Object.create({ top_level_dead_create_object: 1 });
Object.create({ top_level_dead_create_descriptors_proto: 1 }, { top_level_dead_create_descriptors_key: { value: "top_level_dead_create_descriptors_value", configurable: true } });
Object.assign({ top_level_dead_assign_target: 1 }, { top_level_dead_assign_source: 2 });
Object.assign(["top_level_dead_assign_array_target"], ["top_level_dead_assign_array_source"]);
Object.assign({ top_level_dead_assign_primitive_target: 1 }, "top_level_dead_assign_primitive_source");
Object.assign({ top_level_dead_assign_nullish_target: 1 }, null, undefined, "top_level_dead_assign_nullish_primitive_source");
Object.defineProperty({ top_level_dead_define_property_target: 1 }, "top_level_dead_define_property_key", { value: "top_level_dead_define_property_value", writable: true });
Object.defineProperties({ top_level_dead_define_properties_target: 1 }, { top_level_dead_define_properties_key: { value: "top_level_dead_define_properties_value", enumerable: true } });
Object.fromEntries([["top_level_dead_from_entries_key", "top_level_dead_from_entries_value"]]);
Object.fromEntries(Object.entries({ top_level_dead_from_entries_object_entries_key: "top_level_dead_from_entries_object_entries_value" }));
Object.fromEntries(new Map<string, string>());
Object.groupBy([] as number[], (value) => "top_level_dead_object_group_by_empty" + value);
Map.groupBy([] as number[], (value) => "top_level_dead_map_group_by_empty" + value);
Object.keys(new WeakMap<object, string>());
Object.hasOwn(new FinalizationRegistry<string>(() => "top_level_dead_collection_finregistry"), "top_level_dead_collection_has_own");
Reflect.ownKeys(new WeakRef<object>({ label: "top_level_dead_collection_reflect_weak_ref" }));
Object.keys(new URL("https://top-level-dead-url-object-keys.test/path"));
Reflect.ownKeys(new URL("https://top-level-dead-url-reflect-own-keys.test/path"));
Reflect.has({ top_level_dead_reflect_has: 1 }, "top_level_dead_reflect_has");
Reflect.ownKeys({ top_level_dead_reflect_own_keys: 1 });
Reflect.get({ top_level_dead_reflect_get: 1 }, "top_level_dead_reflect_get");
Reflect.get(["top_level_dead_reflect_get_array"], "0");
Reflect.set({ top_level_dead_reflect_set_target: 1 }, "top_level_dead_reflect_set_key", "top_level_dead_reflect_set_value");
Reflect.set(["top_level_dead_reflect_set_array_target"], "0", "top_level_dead_reflect_set_array_value");
Reflect.deleteProperty({ top_level_dead_reflect_delete_property: 1 }, "top_level_dead_reflect_delete_property");
Reflect.defineProperty({ top_level_dead_reflect_define_property_target: 1 }, "top_level_dead_reflect_define_property_key", { value: "top_level_dead_reflect_define_property_value", enumerable: true });
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
    [...new Map([["local_dead_spread_map_key", "local_dead_spread_map_value"]])];
    [...new Set(["local_dead_spread_set", "local_dead_spread_set_tail"])];
    "local_dead_in" in { local_dead_in: true };
    delete ({ local_dead_delete: true } as any).local_dead_delete;
    Array.isArray(["local_dead_array_is_array"]);
    Array.of("local_dead_array_of", "local_dead_array_of_tail");
    Array.from(["local_dead_array_from_array"]);
    Array.from("local_dead_array_from_string");
    Array.from(new Map([["local_dead_array_from_map_key", "local_dead_array_from_map_value"]]));
    Array.from(new Set(["local_dead_array_from_set", "local_dead_array_from_set_tail"]));
    Array.from([] as number[], (value) => value + "local_dead_array_from_empty_array_mapper".length);
    Array.from("", (value) => value + "local_dead_array_from_empty_string_mapper");
    Array.from(new Map<string, number>(), (entry) => entry[1] + "local_dead_array_from_empty_map_mapper".length);
    Array.from(new Set<number>(), (value) => value + "local_dead_array_from_empty_set_mapper".length);
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
    Date("local_dead_date_callable_ignored");
    Date.now("local_dead_date_now_ignored");
    Date.parse("2020-03-04T05:06:07Z");
    Date.UTC(2020, 2, 4, 5, 6, 7, 8);
    new Date("2020-03-05T06:07:08Z");
    new Date(3234567);
    new Date(2020, 2, 5, 6, 7, 8, 9);
    new URL("https://local-dead-new-url.test/path");
    new URL("child", "https://local-dead-new-url-base.test/root/");
    new Map<string, number>();
    new Map([["local_dead_new_map_entries_key", "local_dead_new_map_entries_value"]]);
    new Map(Object.entries({ local_dead_new_map_object_entries_key: "local_dead_new_map_object_entries_value" }));
    new Map(new Map([["local_dead_new_map_copy_key", "local_dead_new_map_copy_value"]]));
    new Set<number>();
    new Set(["local_dead_new_set_array", "local_dead_new_set_array_tail"]);
    new Set(new Set(["local_dead_new_set_copy", "local_dead_new_set_copy_tail"]));
    new WeakMap<object, string>();
    new WeakSet<object>();
    new WeakRef<object>({ label: "local_dead_weak_ref_target" });
    new FinalizationRegistry<string>((held) => {
        "local_dead_finalization_registry_callback";
    });
    URL.canParse("https://local-dead-url-can-parse.test/path");
    URL.canParse("local-dead-url-can-parse-child", "https://local-dead-url-can-parse-base.test/root/");
    Promise.resolve("local_dead_promise_resolve", "local_dead_promise_resolve_ignored");
    Promise.all([] as Promise<string>[]);
    Promise.allSettled([] as Promise<string>[]);
    Promise.race([] as Promise<string>[]);
    Promise.resolve(234567891n);
    Promise.resolve(-345678.75);
    Promise.resolve(-NaN, "local_dead_promise_resolve_nan_ignored");
    Promise.resolve(+Infinity, "local_dead_promise_resolve_infinity_ignored");
    Promise.resolve(String("local_dead_promise_resolve_string_constructor"));
    Promise.resolve(Number("local_dead_promise_resolve_number_constructor"));
    Promise.resolve(Boolean("local_dead_promise_resolve_boolean_constructor"));
    Promise.resolve(BigInt(true));
    Promise.resolve(Symbol("local_dead_promise_resolve_symbol"));
    Promise.resolve(Date("local_dead_promise_resolve_date_callable_ignored"));
    Promise.resolve(Date.now("local_dead_promise_resolve_date_now_ignored"));
    Promise.resolve(Date.parse("2099-03-04T05:06:07Z"));
    Promise.resolve(Date.UTC(2099, 2, 4, 5, 6, 7, 8));
    Promise.resolve(String.fromCharCode("local_dead_promise_resolve_string_static".length));
    Promise.resolve(String.fromCodePoint(0x1f681));
    Promise.resolve(RegExp.escape("local_dead_promise_resolve_regexp_escape"));
    Promise.resolve(Array.isArray(["local_dead_promise_resolve_array_is_array"]));
    Promise.resolve(Object.is("local_dead_promise_resolve_object_is", "local_dead_promise_resolve_object_is"));
    Promise.resolve(Object.hasOwn({ local_dead_promise_resolve_object_has_own: 1 }, "local_dead_promise_resolve_object_has_own"));
    Promise.resolve(Object.isExtensible({ local_dead_promise_resolve_object_extensible: 1 }));
    Promise.resolve(Object.isSealed({ local_dead_promise_resolve_object_sealed: 1 }));
    Promise.resolve(Object.isFrozen({ local_dead_promise_resolve_object_frozen: 1 }));
    Promise.resolve(URL.canParse("https://local-dead-promise-resolve-url-can-parse.test/"));
    Promise.resolve(Reflect.has({ local_dead_promise_resolve_reflect_has: 1 }, "local_dead_promise_resolve_reflect_has"));
    Promise.resolve(Reflect.isExtensible({ local_dead_promise_resolve_reflect_extensible: 1 }));
    Promise.resolve("local_dead_promise_resolve_string_method".toLowerCase());
    Promise.resolve("local_dead_promise_resolve_string_prefix".startsWith("local"));
    Promise.resolve(/local_dead_promise_resolve_regexp_test/.test("local_dead_promise_resolve_regexp_test"));
    Promise.resolve(/local_dead_promise_resolve_regexp_string/.toString());
    Promise.resolve(["local_dead_promise_resolve_array_includes"].includes("missing"));
    Promise.resolve(["local_dead_promise_resolve_array_index"].indexOf("missing"));
    Promise.resolve(["local_dead_promise_resolve_array_join"].join("/"));
    Promise.resolve(["local_dead_promise_resolve_array_string"].toString());
    Promise.resolve("local_dead_promise_resolve_string_length".length);
    Promise.resolve(["local_dead_promise_resolve_array_length"].length);
    Promise.resolve("local_dead_promise_resolve_string_element"[2]);
    Promise.resolve(`local_dead_promise_resolve_template_${"value"}`);
    Promise.resolve(true ? "local_dead_promise_resolve_conditional_true" : "local_dead_promise_resolve_conditional_false");
    const local_dead_promise_resolve_logical_source: string = String("local_dead_promise_resolve_logical_left");
    const local_dead_promise_resolve_nullish_source: string | undefined = String("local_dead_promise_resolve_nullish_left");
    Promise.resolve(local_dead_promise_resolve_logical_source && "local_dead_promise_resolve_logical_right");
    Promise.resolve(local_dead_promise_resolve_nullish_source ?? "local_dead_promise_resolve_nullish_right");
    Promise.resolve((String("local_dead_promise_resolve_comma_left"), "local_dead_promise_resolve_comma_right"));
    Promise.resolve("local_dead_promise_resolve_arithmetic".length - 1);
    Promise.resolve("local_dead_promise_resolve_comparison".length >= 1);
    Promise.resolve(String("local_dead_promise_resolve_equality") == "missing");
    Promise.resolve("local_dead_promise_resolve_in_key" in { local_dead_promise_resolve_in_key: true });
    Promise.resolve(delete ({ local_dead_promise_resolve_delete_key: true } as { local_dead_promise_resolve_delete_key?: boolean }).local_dead_promise_resolve_delete_key);
    Promise.resolve(void String("local_dead_promise_resolve_void"));
    Promise.resolve(typeof String("local_dead_promise_resolve_typeof"));
    Promise.resolve(!"local_dead_promise_resolve_prefix_bang".length);
    Promise.resolve(~"local_dead_promise_resolve_prefix_tilde".length);
    const local_dead_promise_resolve_object_shorthand = "local_dead_promise_resolve_object_shorthand";
    Promise.resolve({ local_dead_promise_resolve_object_shorthand }.local_dead_promise_resolve_object_shorthand);
    const local_dead_promise_resolve_object_spread_source = { local_dead_promise_resolve_object_spread: "local_dead_promise_resolve_object_spread" };
    Promise.resolve({ ...local_dead_promise_resolve_object_spread_source }.local_dead_promise_resolve_object_spread);
    const local_dead_promise_resolve_object_assign_source = { local_dead_promise_resolve_object_assign: "local_dead_promise_resolve_object_assign" };
    Promise.resolve(Object.assign({}, local_dead_promise_resolve_object_assign_source).local_dead_promise_resolve_object_assign);
    Promise.resolve(Object.fromEntries<{ local_dead_promise_resolve_object_from_entries: string }>([["local_dead_promise_resolve_object_from_entries", "local_dead_promise_resolve_object_from_entries"]]).local_dead_promise_resolve_object_from_entries);
    Promise.resolve(Object.fromEntries<{ local_dead_promise_resolve_object_entries_from_entries: string }>(Object.entries({ local_dead_promise_resolve_object_entries_from_entries: "local_dead_promise_resolve_object_entries_from_entries" })).local_dead_promise_resolve_object_entries_from_entries);
    Promise.resolve(Object.defineProperty({} as { local_dead_promise_resolve_object_define_property: string }, "local_dead_promise_resolve_object_define_property", { value: "local_dead_promise_resolve_object_define_property", enumerable: true }).local_dead_promise_resolve_object_define_property);
    Promise.resolve(Object.defineProperties({} as { local_dead_promise_resolve_object_define_properties: string }, { local_dead_promise_resolve_object_define_properties: { value: "local_dead_promise_resolve_object_define_properties", configurable: true } }).local_dead_promise_resolve_object_define_properties);
    Promise.resolve(Object.create(null, { local_dead_promise_resolve_object_create_descriptor: { value: "local_dead_promise_resolve_object_create_descriptor", enumerable: true } }).local_dead_promise_resolve_object_create_descriptor);
    Promise.resolve({ local_dead_promise_resolve_object_property: "local_dead_promise_resolve_object_property" }.local_dead_promise_resolve_object_property);
    Promise.resolve(({ local_dead_promise_resolve_object_property_missing_source: 1 } as { [key: string]: number }).local_dead_promise_resolve_object_property_missing);
    const local_dead_promise_resolve_array_spread_source = ["local_dead_promise_resolve_array_spread"];
    Promise.resolve([0, ...local_dead_promise_resolve_array_spread_source][1]);
    Promise.resolve([..."local_dead_promise_resolve_string_spread"][4]);
    Promise.resolve(["local_dead_promise_resolve_array_element"][0]);
    Promise.resolve(["local_dead_promise_resolve_array_element_oob"][4]);
    Promise.resolve(new Date("2103-01-02T03:04:05Z").valueOf("local_dead_promise_resolve_date_getter_ignored"));
    Promise.resolve(new Date("2103-02-03T04:05:06Z").toTimeString("local_dead_promise_resolve_date_string_ignored"));
    Promise.resolve(new RangeError("local_dead_promise_resolve_error_message").toString("local_dead_promise_resolve_error_ignored"));
    Promise.resolve(new AggregateError(["local_dead_promise_resolve_aggregate_error_item"], "local_dead_promise_resolve_aggregate_error_message").toLocaleString("local_dead_promise_resolve_aggregate_error_ignored"));
    Promise.resolve(isFinite("123"));
    Promise.resolve(Number.parseInt("local_dead_promise_resolve_number_parse", 10));
    Promise.resolve(Number.isFinite("local_dead_promise_resolve_number_predicate".length));
    Promise.resolve(decodeURIComponent("local-dead-promise-resolve-uri"));
    Promise.resolve(Math.min("local_dead_promise_resolve_math".length, 1));
    encodeURI("local dead encode uri");
    encodeURIComponent("local-dead-encode-uri-component");
    decodeURI("local-dead-decode-uri");
    decodeURIComponent("local-dead-decode-uri-component");
    BigInt("345678");
    BigInt(44);
    BigInt(true);
    RegExp("local_dead_regexp_constructor", "m");
    new RegExp("local_dead_new_regexp_constructor");
    /local_dead_regexp_test/.test("local_dead_regexp_test_input");
    RegExp("local_dead_regexp_exec").exec("local_dead_regexp_exec_input");
    /local_dead_regexp_to_string/.toString();
    new RegExp("local_dead_regexp_to_locale_string").toLocaleString();
    /local_dead_regexp_value_of/.valueOf();
    Symbol("local_dead_symbol_constructor");
    "local_dead_string_char_at".charAt(1);
    "local_dead_string_starts_with".startsWith("local");
    "local_dead_string_substring".substring(1, 4);
    "local_dead_string_case".toUpperCase();
    "local_dead_string_trim".trimEnd();
    "local_dead_string_normalize".normalize("NFKC");
    "local_dead_string_repeat".repeat(2);
    "local_dead_string_pad".padStart(24, ".");
    "local_dead_string_replace".replace("replace", "replacement");
    "local_dead_string_replace_all".replaceAll("dead", "replacement");
    "local_dead_string_replace_regex".replace(/replace_regex/, "replacement");
    "local_dead_string_replace_all_regex".replaceAll(/replace_all_regex/g, "replacement");
    "local_dead_string_split:local_dead_string_split_tail".split(":", 1);
    "local_dead_string_split_regex local_dead_string_split_regex_tail".split(/\\s+/, 1);
    "local_dead_string_match".match("string_match");
    "local_dead_string_match_all".matchAll("string_match_all");
    "local_dead_string_search".search("string_search");
    ["local_dead_array_slice"].slice(0, 1);
    ["local_dead_array_at"].at(0);
    ["local_dead_array_includes"].includes("local_dead_array_includes");
    ["local_dead_array_values_method"].values();
    ["local_dead_array_entries_method"].entries();
    ["local_dead_array_concat"].concat(["local_dead_array_concat_tail"]);
    [["local_dead_array_flat"]].flat();
    ["local_dead_array_join", "local_dead_array_join_tail"].join(":");
    ["local_dead_array_pop"].pop();
    ["local_dead_array_shift"].shift();
    ["local_dead_array_reverse"].reverse();
    ["local_dead_array_fill", "local_dead_array_fill_tail"].fill("local_dead_array_fill_value", 0, 1);
    ["local_dead_array_copy_within", "local_dead_array_copy_within_tail"].copyWithin(0, 1);
    ["local_dead_array_push"].push("local_dead_array_push_value");
    ["local_dead_array_unshift"].unshift("local_dead_array_unshift_value");
    ["local_dead_array_sort_b", "local_dead_array_sort_a"].sort();
    [1].sort((a, b) => "local_dead_array_sort_comparator".length + a - b);
    [].map(() => "local_dead_empty_array_map");
    [].flatMap(() => ["local_dead_empty_array_flat_map"]);
    [].filter(() => "local_dead_empty_array_filter".length > 0);
    [].forEach(() => "local_dead_empty_array_for_each");
    [].some(() => "local_dead_empty_array_some".length > 0);
    [].every(() => "local_dead_empty_array_every".length > 0);
    [].find(() => "local_dead_empty_array_find".length > 0);
    [].findIndex(() => "local_dead_empty_array_find_index".length > 0);
    [].findLast(() => "local_dead_empty_array_find_last".length > 0);
    [].findLastIndex(() => "local_dead_empty_array_find_last_index".length > 0);
    [].reduce((acc: number) => acc + "local_dead_empty_array_reduce".length, 0);
    [].reduceRight((acc: number) => acc + "local_dead_empty_array_reduce_right".length, 0);
    ["local_dead_array_to_sorted"].toSorted();
    [1].toSorted((a, b) => "local_dead_array_to_sorted_comparator".length + a - b);
    ["local_dead_array_to_spliced"].toSpliced(0, 0, "local_dead_array_to_spliced_insert");
    ["local_dead_array_with", "local_dead_array_with_tail"].with(0, "local_dead_array_with_replacement");
    ["local_dead_array_to_string", "local_dead_array_to_string_tail"].toString();
    ["local_dead_array_to_locale_string", "local_dead_array_to_locale_string_tail"].toLocaleString();
    new Error("local_dead_error_constructor");
    new SyntaxError("local_dead_syntax_error_constructor");
    new AggregateError(["local_dead_aggregate_error_item"], "local_dead_aggregate_error_message", { cause: "local_dead_aggregate_error_cause" });
    AggregateError(["local_dead_aggregate_error_call_item"], "local_dead_aggregate_error_call_message");
    Object.is("local_dead_object_is", "dead");
    Math.min("local_dead_math_call".length, 1);
    String.fromCharCode("local_dead_from_char_code".length);
    String.fromCodePoint(0x43, 0x1f602);
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
    Object.keys("local_dead_object_primitive_keys");
    Object.values("local_dead_object_primitive_values");
    Object.entries("local_dead_object_primitive_entries");
    Object.getOwnPropertyNames("local_dead_object_primitive_property_names");
    Object.getOwnPropertyDescriptor("local_dead_object_primitive_descriptor", "0");
    Object.getOwnPropertyDescriptors("local_dead_object_primitive_descriptors");
    Object.hasOwn("local_dead_object_primitive_has_own", "0");
    Object.getPrototypeOf("local_dead_object_primitive_get_prototype");
    Object.isExtensible("local_dead_object_primitive_is_extensible");
    Object.isSealed("local_dead_object_primitive_is_sealed");
    Object.isFrozen("local_dead_object_primitive_is_frozen");
    Object.preventExtensions("local_dead_object_primitive_prevent_extensions");
    Object.seal("local_dead_object_primitive_seal");
    Object.freeze("local_dead_object_primitive_freeze");
    Object.create(null);
    Object.create({ local_dead_create_object: 1 });
    Object.create({ local_dead_create_descriptors_proto: 1 }, { local_dead_create_descriptors_key: { value: "local_dead_create_descriptors_value", writable: true } });
    Object.assign({ local_dead_assign_target: 1 }, { local_dead_assign_source: 2 });
    Object.assign(["local_dead_assign_array_target"], ["local_dead_assign_array_source"]);
    Object.assign({ local_dead_assign_primitive_target: 1 }, "local_dead_assign_primitive_source");
    Object.assign({ local_dead_assign_nullish_target: 1 }, null, undefined, "local_dead_assign_nullish_primitive_source");
    Object.defineProperty({ local_dead_define_property_target: 1 }, "local_dead_define_property_key", { value: "local_dead_define_property_value", enumerable: true });
    Object.defineProperties({ local_dead_define_properties_target: 1 }, { local_dead_define_properties_key: { value: "local_dead_define_properties_value", configurable: true } });
    Object.fromEntries([["local_dead_from_entries_key", "local_dead_from_entries_value"]]);
    Object.fromEntries(Object.entries({ local_dead_from_entries_object_entries_key: "local_dead_from_entries_object_entries_value" }));
    Object.fromEntries(new Map<string, string>());
    Object.groupBy([] as number[], (value) => "local_dead_object_group_by_empty" + value);
    Map.groupBy([] as number[], (value) => "local_dead_map_group_by_empty" + value);
    Object.keys(new Set<string>());
    Object.hasOwn(new FinalizationRegistry<string>(() => "local_dead_collection_finregistry"), "local_dead_collection_has_own");
    Reflect.ownKeys(new WeakRef<object>({ label: "local_dead_collection_reflect_weak_ref" }));
    Object.keys(new URL("https://local-dead-url-object-keys.test/path"));
    Reflect.ownKeys(new URL("https://local-dead-url-reflect-own-keys.test/path"));
    Reflect.get({ local_dead_reflect_get: 1 }, "local_dead_reflect_get");
    Reflect.get(["local_dead_reflect_get_array"], "0");
    Reflect.set({ local_dead_reflect_set_target: 1 }, "local_dead_reflect_set_key", "local_dead_reflect_set_value");
    Reflect.set(["local_dead_reflect_set_array_target"], "0", "local_dead_reflect_set_array_value");
    Reflect.getOwnPropertyDescriptor({ local_dead_reflect_descriptor: 1 }, "local_dead_reflect_descriptor");
    Reflect.ownKeys(["local_dead_reflect_array_keys"]);
    Reflect.deleteProperty({ local_dead_reflect_delete_property: 1 }, "local_dead_reflect_delete_property");
    Reflect.defineProperty({ local_dead_reflect_define_property_target: 1 }, "local_dead_reflect_define_property_key", { value: "local_dead_reflect_define_property_value", configurable: true });
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
