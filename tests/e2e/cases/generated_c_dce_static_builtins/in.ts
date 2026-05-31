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

console.log("kept static dce builtins");
