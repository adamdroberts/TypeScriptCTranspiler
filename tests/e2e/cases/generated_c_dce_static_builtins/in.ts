const symbolRegistry = Symbol.for("dead_dce_symbol_for_static");
const symbolKey = Symbol.keyFor(Symbol("dead_dce_symbol_keyfor_static"));
const symbolKnownKey = Symbol.keyFor(Symbol.iterator);
const objectProtoCheck = new Map().isPrototypeOf({ dead_dce_is_prototype_of_static: true });
const boxedObject = new (Object as any)({ dead_dce_new_object_static: true });
const boxedString = new (String as any)("dead_dce_new_string_static");
const boxedNumber = new (Number as any)("987654321");
const boxedBoolean = new (Boolean as any)("dead_dce_new_boolean_static");

console.log("kept static dce builtins");
