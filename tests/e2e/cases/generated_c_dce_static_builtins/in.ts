const symbolRegistry = Symbol.for("dead_dce_symbol_for_static");
const symbolKey = Symbol.keyFor(Symbol("dead_dce_symbol_keyfor_static"));
const symbolKnownKey = Symbol.keyFor(Symbol.iterator);
const objectProtoCheck = new Map().isPrototypeOf({ dead_dce_is_prototype_of_static: true });
const boxedObject = new (Object as any)({ dead_dce_new_object_static: true });
const boxedString = new (String as any)("dead_dce_new_string_static");
const boxedNumber = new (Number as any)("987654321");
const boxedBoolean = new (Boolean as any)("dead_dce_new_boolean_static");
const callableObject = Object({ dead_dce_callable_object_static: true });
const callableError = Error("dead_dce_callable_error_static");
const callableTypeError = TypeError("dead_dce_callable_type_error_static");
Array.isArray(new RegExp("dead_dce_array_is_regexp_static"));
Array.isArray(new Error("dead_dce_array_is_error_static"));
Array.isArray(new Date("2020-01-01T00:00:00.000Z"));
Array.isArray(new URL("https://example.com/dead_dce_array_is_url_static"));
Array.isArray(new Map([["dead_dce_array_is_map_static", 1]]));
Array.isArray(new Set(["dead_dce_array_is_set_static"]));
Array.isArray(new WeakMap([[{}, "dead_dce_array_is_weakmap_static"]]));
Array.isArray(new WeakSet([{}]));
Array.isArray(new WeakRef({ marker: "dead_dce_array_is_weakref_static" }));
Array.isArray(Buffer.from("dead_dce_array_is_buffer_static"));
if (Array.isArray(new FinalizationRegistry(() => "dead_dce_array_is_finreg_static"))) {
    console.log("dead_dce_array_is_finreg_branch_static");
}
if (Number.isFinite("dead_dce_number_isfinite_string_static")) {
    console.log("dead_dce_number_isfinite_string_branch_static");
}
if (Number.isFinite(Infinity)) {
    console.log("dead_dce_number_isfinite_infinity_branch_static");
}
if (Number.isInteger("dead_dce_number_isinteger_string_static")) {
    console.log("dead_dce_number_isinteger_string_branch_static");
}
if (Number.isInteger(1.5)) {
    console.log("dead_dce_number_isinteger_fraction_branch_static");
}
if (Number.isNaN("dead_dce_number_isnan_string_static")) {
    console.log("dead_dce_number_isnan_string_branch_static");
}
if (Number.isNaN(0)) {
    console.log("dead_dce_number_isnan_zero_branch_static");
}
if (Number.isSafeInteger("dead_dce_number_issafeinteger_string_static")) {
    console.log("dead_dce_number_issafeinteger_string_branch_static");
}
if (Number.isSafeInteger(9007199254740992)) {
    console.log("dead_dce_number_issafeinteger_large_branch_static");
}
if (isFinite("dead_dce_global_isfinite_string_static")) {
    console.log("dead_dce_global_isfinite_string_branch_static");
}
if (isFinite(Infinity)) {
    console.log("dead_dce_global_isfinite_infinity_branch_static");
}
if (isNaN("123")) {
    console.log("dead_dce_global_isnan_numeric_string_branch_static");
}
if (isNaN(0)) {
    console.log("dead_dce_global_isnan_zero_branch_static");
}

console.log("kept static dce builtins");
