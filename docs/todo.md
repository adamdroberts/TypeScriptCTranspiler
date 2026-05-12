# TODO — remaining work

Scope of the full project (from the approved plan): **full ECMAScript 2026 + transpile arbitrary `node_modules`**. At the current pace, what's done is roughly 65–75% of the 15-phase plan. The rest is measured in weeks and months, not hours.

Items are grouped by how soon they unblock the most user value. Within each group the ordering reflects dependency + estimated effort.

---

## 1. Next-up unblockers

This is the next item that most directly expands what programs can be written against `tsc2c`.

- **NaN-boxed dynamic value runtime — Phase 3 remainder** (~1–2+ weeks)
  - Done foundation: `tsc_value_t` exists as a NaN-boxed `uint64_t`; `any` / `unknown` and heterogeneous unions map to it; `JSON.parse`, dynamic JSON stringify with object-property omission for `undefined`/function values, heterogeneous arrays/objects, dynamic property/index access, dynamic property writes/compound/logical/exponent writes, dynamic array index writes/compound writes, dynamic array string-key and `length` writes, dynamic `in`/`delete`, dynamic unary/binary/bitwise/logical/nullish/update operators, broader dynamic string/array methods including `at`, `codePointAt`, `concat`, `copyWithin`, `entries`, `fill`, `keys`, `values`, `lastIndexOf`, `localeCompare`, `normalize`, `padStart`/`padEnd`, `repeat`, `replace`, `replaceAll`, `split(limit?)`, `substr`, `substring`, `slice`, `reverse`, `toReversed`, `toSorted`, `toSpliced`, `with`, `trimStart`/`trimEnd`, `flat`, default/comparator `sort`, `splice`, `toString`/`toLocaleString`/`valueOf`, dynamic number `toString(radix)`/`toFixed`/`toExponential`/`toPrecision`, and inline-arrow/named-callback array HOFs including `reduce`/`reduceRight` with optional initial values and `findLast`/`findLastIndex`, typed/dynamic string `charCodeAt`/`codePointAt`, typed/dynamic `trimLeft`/`trimRight`, typed/dynamic string and array search-position arguments, typed/dynamic array `includes(NaN)` SameValueZero semantics, typed `String.fromCodePoint`/`isWellFormed`/`toWellFormed`, typed array `keys`/`values`/`entries`/`concat(value)`/own-property checks/`from(string)`/typed `Array.from(Set)`/`toString`/`toLocaleString`/`valueOf`, typed array `Object.keys`/`Object.values`/`Object.entries`, typed `reduce`/`reduceRight` without initial values, typed string `search(RegExp)`/`substr`/`toString`/`toLocaleString`/`valueOf`, typed number `toString`/`toFixed`/`toExponential`/`toPrecision`/`toLocaleString`/`valueOf`, typed boolean/symbol/bigint `toString`/`toLocaleString`/`valueOf`, typed `Number` constants/`Number.isSafeInteger`/`Number.parseInt` radix/default inference, global `isNaN`/`isFinite` coercion, broader typed `Math` libm/int32/fround/constants methods, typed RegExp `exec`/properties/`hasIndices`/`sticky`/`toString`/`toLocaleString`/`valueOf`, typed collection `forEach` inline and named callback references, SameValueZero numeric Map/Set keys, typed Map/Set constructor initialization plus Map/Set copy construction, plus object prototype methods, typed `Set.keys`, typed URL object methods, typed Buffer object methods, typed `Object.hasOwn`/`hasOwnProperty`/`propertyIsEnumerable`/`getOwnPropertyDescriptor`/`getOwnPropertyDescriptors`/`getOwnPropertyNames`/`toString`/`toLocaleString`/`valueOf`, typed `Reflect.get`/`Reflect.set`/`Reflect.has`/`Reflect.ownKeys`/`Reflect.getOwnPropertyDescriptor`, typed `in` field checks, static `Reflect.apply`/`Reflect.construct` over known function/class values, mixed dynamic ternary boxing, dynamic `Array.isArray`/`Array.from`/`Array.from(..., mapfn)`/`Array.of`, dynamic `for...of` over boxed arrays/strings plus destructured and rest-destructured boxed pair arrays, first-class function value spread calls over dynamic arrays/strings, `Array.isArray` type-predicate narrowing for unknown dynamic arrays, typed unbox/coercion bridges, callable `Number`/`String`/`Boolean` coercion, enumerable `Object.keys`/`Object.values`/`Object.entries`, dynamic `Object.fromEntries`, `Object.is`, `Object.assign` including dynamic array/string sources, dynamic array targets, typed interface/class targets, and typed array targets for typed object/array, dynamic, and primitive sources, `Object.getOwnPropertyNames`/`Object.getOwnPropertyDescriptors`/`Object.hasOwn`/`Object.defineProperties`, dynamic `Object.prototype.hasOwnProperty`/`isPrototypeOf`/`propertyIsEnumerable`/`toLocaleString`/`toString`/`valueOf`, dynamic data descriptor flags, omitted-value defaults, configurable data/accessor descriptor transitions, descriptor shorthand fields/boolean flag expressions, and compatible non-configurable redefinition, bounded dynamic array `defineProperty` data descriptors, named-function/lifted-arrow/closure-valued/undefined accessor descriptors with boxed `get`/`set` identities and own undefined absent-hook fields, dynamic object and bounded dynamic array extensibility/seal/freeze state, dynamic `Object.create` with descriptor maps/prototype-chain lookup, and Reflect object helpers including receiver-aware dynamic data writes are implemented. Tests: `dynamic_values`, `dynamic_ops`, `dynamic_bitwise_ops`, `dynamic_unary_ops`, `dynamic_update_ops`, `dynamic_property_assignment`, `dynamic_property_logical_assign`, `dynamic_index_assignment`, `dynamic_property_ops`, `dynamic_methods`, `dynamic_number_to_string`, `dynamic_last_index_of`, `dynamic_string_at`, `dynamic_string_code_point_at`, `dynamic_string_concat`, `dynamic_string_locale_compare`, `dynamic_string_normalize`, `dynamic_string_pad_repeat`, `dynamic_string_replace`, `dynamic_string_replace_string_tokens`, `dynamic_string_replace_regex`, `dynamic_string_replace_regex_groups`, `dynamic_string_split`, `dynamic_string_split_limit`, `dynamic_string_split_regex`, `dynamic_string_substr`, `dynamic_string_substring`, `dynamic_string_trim_edges`, `array_concat_values`, `array_own_properties`, `dynamic_array_methods`, `dynamic_array_at`, `dynamic_array_copy_within`, `dynamic_array_define_property`, `dynamic_array_entries`, `dynamic_array_extensibility`, `dynamic_array_fill`, `dynamic_array_find_last`, `dynamic_array_flat`, `dynamic_array_keys_values`, `dynamic_array_of`, `dynamic_array_property_writes`, `dynamic_array_sort`, `dynamic_array_sort_comparator`, `dynamic_array_splice`, `dynamic_array_slice_reverse`, `dynamic_array_to_reversed`, `dynamic_array_to_sorted`, `dynamic_array_to_sorted_comparator`, `dynamic_array_to_spliced`, `dynamic_array_to_string`, `dynamic_array_value_of`, `dynamic_array_with`, `dynamic_array_flatmap`, `dynamic_for_of`, `dynamic_for_of_entries`, `dynamic_for_of_rest`, `function_value_spread`, `dynamic_array_hof`, `dynamic_array_hof_more`, `dynamic_array_hof_refs`, `dynamic_array_reduce`, `dynamic_array_reduce_right`, `dynamic_array_reduce_no_initial`, `dynamic_search_positions`, `array_from_dynamic_mapper`, `map_set_constructors`, `map_constructor_from_map`, `set_constructor_from_set`, `map_set_for_each`, `map_set_for_each_refs`, `map_set_same_value_zero`, `array_keys_values`, `array_entries`, `array_from_string`, `array_from_set`, `array_search_from_index`, `array_includes_same_value_zero`, `string_well_formed`, `string_search_positions`, `string_search_regex`, `string_split_limit`, `string_replace_regex_groups`, `string_replace_string_tokens`, `string_substr`, `string_boolean_constructors`, `string_from_code_point`, `string_char_code_at`, `string_trim_aliases`, `regexp_exec`, `regexp_extra_flags`, `number_constants`, `number_constructor`, `number_static_more`, `global_number_predicates`, `number_to_exponential`, `number_to_fixed`, `number_to_precision`, `math_more`, `math_int32_float`, `math_constants_more`, `array_reduce_no_initial`, `array_to_string`, `array_value_of`, `object_array_enumeration`, `object_assign_array_target`, `object_assign_array_string`, `object_assign_typed_target`, `object_assign_typed_array_target`, `string_object_methods`, `primitive_object_methods`, `symbol_bigint_object_methods`, `regexp_object_methods`, `collection_object_methods`, `set_keys`, `url_object_methods`, `buffer_object_methods`, `typed_object_has_own`, `typed_object_methods`, `typed_object_property_names`, `typed_property_descriptor`, `typed_property_descriptors`, `typed_reflect_get`, `typed_reflect_set`, `typed_reflect_has`, `typed_reflect_own_keys`, `in_operator_narrowing`, `array_static_dynamic`, `array_is_array_narrowing`, `dynamic_coercions`, `dynamic_object_entries`, `dynamic_object_from_entries`, `object_accessor_arrows`, `object_accessor_closures`, `object_accessor_preserve`, `object_accessor_redefine`, `object_accessors`, `object_create_descriptors`, `object_define_properties`, `object_descriptor_defaults`, `object_descriptor_kind_transition`, `object_descriptor_shorthand`, `object_descriptor_redefine`, `object_descriptors`, `object_extensibility`, `object_get_own_property_descriptors`, `object_has_own_property`, `object_is_prototype_of`, `object_property_is_enumerable`, `object_to_locale_string`, `object_to_string`, `object_value_of`, `object_is`, `object_prototypes`, `object_seal_freeze`, `object_static_methods`, `reflect_apply`, `reflect_construct`, `reflect_get_own_property_descriptor`, `reflect_receiver`.
  - Additional typed array descriptor and own-key coverage is implemented for `Object.getOwnPropertyDescriptor(array, key)`, `Object.getOwnPropertyDescriptors(array)`, `Reflect.getOwnPropertyDescriptor(array, key)`, and the `in` operator. Tests: `array_property_descriptors`, `array_own_properties`.
  - Additional typed array extensibility coverage is implemented for `Object.isExtensible` / `Object.isSealed` / `Object.isFrozen`, `Object.preventExtensions` / `Object.seal` / `Object.freeze`, and typed-array-safe Object/Reflect property definitions including `Object.defineProperties`, writes, `delete array[index]`, Reflect deletions, descriptor flags, and core mutators observing the same runtime state. Test: `array_extensibility`.
  - Additional typed string Object/Reflect coverage is implemented for numeric string own keys, non-enumerable `length`, read-only descriptors, `Object.keys`/`values`/`entries`, `Object.getOwnPropertyNames`, `Object.hasOwn`, `Reflect.get`, `Reflect.has`, `Reflect.ownKeys`, deletion refusal for indexes/length, and write refusal. Test: `string_object_enumeration`.
  - Additional primitive Object-prototype coverage is implemented for inherited `hasOwnProperty` / `propertyIsEnumerable` on strings, numbers, booleans, symbols, and bigints. Tests: `string_object_methods`, `primitive_object_methods`, `symbol_bigint_object_methods`.
  - Additional URL own-property helper coverage is implemented for empty `Object.keys` / `Object.getOwnPropertyNames` / `Object.getOwnPropertyDescriptor(s)` / `Object.hasOwn` / inherited `hasOwnProperty` / `propertyIsEnumerable` / `Reflect.ownKeys` / `Reflect.getOwnPropertyDescriptor` results while URL fields remain prototype-style accessors. Test: `url_object_methods`.
  - Additional Buffer own-property helper coverage is implemented for numeric byte indexes through `Object.keys` / `Object.values` / `Object.entries` / `Object.getOwnPropertyNames` / `Object.getOwnPropertyDescriptor(s)` / `Object.hasOwn` / inherited `hasOwnProperty` / `propertyIsEnumerable` / `Reflect.ownKeys` / `Reflect.getOwnPropertyDescriptor`, plus Buffer `Reflect.get` / `Reflect.has` / `in` coverage where `length` remains non-own but visible. Test: `buffer_object_methods`.
  - Additional dynamic array Object/Reflect coverage is implemented for `Object.keys`/`Object.values`/`Object.entries`, `Object.getOwnPropertyNames`, `Object.getOwnPropertyDescriptor(s)`, `Object.hasOwn`, `hasOwnProperty`, `propertyIsEnumerable`, `Reflect.get`, `Reflect.has`, and `Reflect.ownKeys`. Test: `dynamic_array_object_enumeration`.
  - Additional dynamic string Object/Reflect coverage is implemented for numeric string own keys, non-enumerable `length`, descriptor lookup, own-key enumeration, `Reflect.get`, `Reflect.has`, deletion refusal for string indexes/length, and write refusal. Test: `dynamic_string_object_enumeration`.
  - Additional dynamic string RegExp coverage is implemented for `match()` and `matchAll()`. Test: `dynamic_string_match`.
  - Additional dynamic string RegExp coverage is implemented for `replace()` and `replaceAll()`. Test: `dynamic_string_replace_regex`.
  - Additional typed and dynamic RegExp replacement-string expansion is implemented for dollar, whole-match, capture, prefix, and suffix replacement tokens. Tests: `string_replace_regex_groups`, `dynamic_string_replace_regex_groups`.
  - Additional typed and dynamic string-pattern replacement-string expansion is implemented for dollar, whole-match, prefix, and suffix replacement tokens. Tests: `string_replace_string_tokens`, `dynamic_string_replace_string_tokens`.
  - Additional typed and dynamic `Array.prototype.includes` coverage is implemented for SameValueZero `NaN` matching while keeping `indexOf(NaN)` at `-1`. Test: `array_includes_same_value_zero`.
  - Additional dynamic array `slice`/`reverse` coverage is implemented for negative/clipped slice bounds, receiver mutation, and returned array identity. Test: `dynamic_array_slice_reverse`.
  - Additional dynamic array comparator coverage is implemented for mutating `sort(compareFn)` and non-mutating `toSorted(compareFn)`, including single-return block-body inline comparators. Tests: `dynamic_array_sort_comparator`, `dynamic_array_to_sorted_comparator`.
  - Additional typed array comparator coverage is implemented for first-class closure comparator values and single-return block-body inline comparators passed to `sort(compareFn)` / `toSorted(compareFn)`. Test: `array_to_sorted`.
  - Additional dynamic string RegExp coverage is implemented for `split()`. Test: `dynamic_string_split_regex`.
  - Additional typed and dynamic string split coverage is implemented for result limits and captured RegExp separator groups. Tests: `string_split_limit`, `dynamic_string_split_limit`.
  - Additional typed Map/Set constructor coverage is implemented for `new Set(valuesArray)` and `new Map(Object.entries(obj))` over string-key entry arrays. Test: `map_set_constructors`.
  - Additional collection own-property helper coverage is implemented for empty `Object.keys` / `Object.values` / `Object.entries` / `Object.getOwnPropertyNames` / `Object.getOwnPropertyDescriptor(s)` / `Object.hasOwn` / inherited `hasOwnProperty` / `propertyIsEnumerable` / `Reflect.ownKeys` / `Reflect.getOwnPropertyDescriptor` results on `Map`, `Set`, `WeakMap`, `WeakSet`, `WeakRef`, and `FinalizationRegistry` instances. Test: `collection_object_methods`.
  - Additional typed Map/Set numeric key coverage is implemented for SameValueZero `NaN` matching and `-0`/`0` coalescing. Test: `map_set_same_value_zero`.
  - Additional typed `Array.prototype.flatMap()` coverage is implemented for scalar callback results as well as array callback results. Test: `array_flat`.
  - Additional typed array higher-order callback coverage is implemented for the standard receiver array argument across inline expression/single-return-block callbacks, direct function references, and closure callback values. Test: `array_hof`.
  - Additional dynamic array higher-order callback coverage is implemented for the standard receiver array argument across inline expression/single-return-block callbacks, direct function references, closure callback values, and `reduce`/`reduceRight`. Tests: `dynamic_array_hof`, `dynamic_array_hof_refs`.
  - Additional typed and dynamic string-pattern coverage is implemented for `match("pattern")` and `matchAll("pattern")`. Tests: `string_match_string`, `dynamic_string_match_string`.
  - Additional typed and dynamic string-pattern coverage is implemented for `search("pattern")`. Tests: `string_search_string`, `dynamic_string_search`.
  - Additional static `Reflect.apply`/`Reflect.construct` coverage is implemented for typed-array, dynamic-array, and array-literal-spread argument lists. Tests: `reflect_apply`, `reflect_construct`.
  - Additional typed array property-name coverage is implemented for `Object.getOwnPropertyNames(array)` and `Reflect.ownKeys(array)`. Test: `object_array_enumeration`.
  - Additional typed and dynamic `Array.prototype.entries()` coverage is implemented as materialized `[string, value]` entry arrays. Tests: `array_entries`, `dynamic_array_entries`.
  - Additional typed `Array.prototype.concat()` coverage is implemented for spread elements inside array-literal arguments. Test: `array_concat_values`.
  - Additional dynamic array-literal spread coverage is implemented for dynamic arrays, dynamic/typed strings, and typed arrays. Test: `dynamic_array_spread`.
  - Additional dynamic array string-key write and `length` write coverage is implemented for `arr["1"] = value` and `Reflect.set`. Test: `dynamic_array_property_writes`.
  - Additional dynamic array HOF callback-reference coverage is implemented for named callbacks with declared parameter coercion. Test: `dynamic_array_hof_refs`.
  - Additional bounded dynamic array `defineProperty` coverage is implemented for dense indexes and `length`. Test: `dynamic_array_define_property`.
  - Additional typed Map/Set `forEach` coverage is implemented for single-return block-body inline callbacks and named callback references with value/key-or-value2/receiver parameters. Tests: `map_set_for_each`, `map_set_for_each_refs`.
  - Additional dynamic accessor descriptor coverage is implemented for function-scope closure-valued getters/setters and inline closure expressions. Test: `object_accessor_closures`.
  - Additional configurable accessor descriptor redefinition coverage is implemented for omitted hook/flag preservation and explicit undefined hook clearing. Test: `object_accessor_preserve`.
  - Additional dynamic `Object.defineProperties` coverage is implemented for static descriptor maps containing data and closure-valued accessor descriptors. Test: `object_define_properties`.
  - Additional dynamic `Object.create(proto, descriptors)` coverage is implemented for static descriptor maps on newly created prototype-linked objects. Test: `object_create_descriptors`.
  - Additional descriptor-default coverage is implemented for omitted data `value` defaults, explicit undefined accessor hooks, and own undefined `get`/`set` fields for absent accessor hooks. Test: `object_descriptor_defaults`.
  - Additional descriptor kind-transition coverage is implemented for configurable data-to-accessor/accessor-to-data redefinitions and non-configurable data-to-accessor rejection. Test: `object_descriptor_kind_transition`.
  - Additional descriptor object-literal coverage is implemented for shorthand fields, shorthand accessor identifiers, and boolean flag expressions. Test: `object_descriptor_shorthand`.
  - Additional data descriptor redefinition coverage is implemented for omitted-field preservation, compatible non-configurable writable updates, and incompatible flag/value changes. Test: `object_descriptor_redefine`.
  - Additional accessor descriptor redefinition coverage is implemented for compatible non-configurable getter/setter identity preservation and incompatible flag/accessor changes. Test: `object_accessor_redefine`.
  - Additional bounded dynamic array extensibility coverage is implemented for `Object.preventExtensions`, `Object.seal`, `Object.freeze`, Reflect/Object index writes, dense-index definitions, index/length descriptor flags, `length` writes, deletion checks, and core mutator-method guards. Primitive Object extensibility and empty own-property helpers are implemented for non-object values, including empty key/value/entry enumeration for non-string primitives. Tests: `dynamic_array_extensibility`, `object_primitive_extensibility`.
  - Additional receiver-bound accessor coverage is implemented for direct, lifted, and closure-valued accessor functions with a TypeScript `this: any` parameter. Test: `reflect_receiver`.
  - Additional accessor descriptor identity coverage is implemented for stable boxed `get`/`set` function identities across repeated `Object.getOwnPropertyDescriptor` reads, including `typeof`, `String(...)`, `Object.is`, and `===`. Test: `reflect_receiver`.
  - Additional dynamic `Reflect.apply` coverage is implemented for invoking boxed accessor descriptor `get`/`set` identities with a supplied receiver. Test: `reflect_receiver`.
  - Additional `Reflect.apply` coverage is implemented for binding `thisArg` into function values that declare `this: any`. Test: `reflect_apply`.
  - Still missing: hidden classes / shape trees, inline caches and diagnostics, complete built-in object/array prototype behavior, broader prototype method coverage, remaining descriptor/prototype edge cases, and clean source split into `runtime/tsc_value.*` / `runtime/tsc_object.*`.
  - Still blocks: production-quality untyped npm packages, `Proxy`, full `Reflect`, remaining property descriptor edge cases, and high-performance dynamic property access.

---

## 2. Medium-term phases (weeks each)

- **Phase 6 — `async`/`await` + libuv event loop** (~3 weeks)
  - State-machine lowering of each `async` function. `await` becomes a suspend/resume point that chains a `.then` onto the awaited promise.
  - `Promise` runtime with `resolve`/`reject`/`then`/`catch`/`finally`/`all`/`allSettled`/`race`/`any`.
  - Microtask queue + process.nextTick queue, drained in the right order each tick.
  - libuv (`libuv1-dev`) bound for `setTimeout`/`setInterval`/`setImmediate` and all future async I/O.
  - **Depends on Phase 3** for the `Promise<T>` value representation (mixed boxed + unboxed).

- **Phase 7 remainder — ES language features** (~3 weeks)
  - Synchronous `function*` declarations with ordinary `yield expr` statements and bounded `yield*` over arrays, strings, or dynamic iterable values are implemented as eager materialized `Iterator<T>` / `IterableIterator<T>` arrays. Test: `generator_functions`
  - Still missing: lazy generator state-machine lowering with suspend/resume semantics, `.next()` protocol interaction, generator `return` / `throw`, and `async function*`.
  - `FinalizationRegistry<T>` is implemented with `.register(target, heldValue, unregisterToken?)`, `.unregister(unregisterToken)`, and `[object FinalizationRegistry]` stringification; the cleanup callback is accepted by the constructor but never invoked because this AOT runtime has no GC-finalizer plumbing. Test: `finalization_registry`
  - Array-backed custom iterable classes, class iterator objects with direct or inherited `next()`, direct self-iterable iterator objects, and `ObjectEntry<T>` destructuring over custom iterators are implemented. Tests: `custom_iterable`, `custom_iterator_object`, `custom_iterator_inherited_next`, `custom_iterator_self`, `custom_iterator_entry_destructure`
  - Broader iterator protocol edge cases remain, including lazy generator-backed iterables and async iterables.

- **Phase 9 — `Proxy` + `Reflect`** (~2 weeks)
  - All 13 `Proxy` traps (`get`, `set`, `has`, `deleteProperty`, `apply`, `construct`, etc.)
  - `Reflect.*` API; dynamic `Reflect.get`/`Reflect.set`/`Reflect.has`/`Reflect.deleteProperty`/`Reflect.ownKeys`/`Reflect.defineProperty`/`Reflect.getPrototypeOf`/`Reflect.setPrototypeOf`/`Reflect.getOwnPropertyDescriptor`/`Reflect.isExtensible`/`Reflect.preventExtensions` are implemented, dynamic get/set accept receiver arguments for data/accessor dispatch, dynamic `Reflect.apply` can invoke boxed accessor descriptor functions, and bounded static `Reflect.apply`/`Reflect.construct` over known function/class values accepts array-literal, array-literal-spread, typed-array, and dynamic-array argument lists
  - `Object.defineProperty` with full property descriptor semantics; dynamic data descriptors enforce `writable`/`configurable`/`enumerable`, named-function, lifted-arrow/function-expression, and closure-valued accessors work, accessors can observe receiver-bound `this` through `this: any`, descriptor `get`/`set` values expose stable boxed function identities, and those boxed accessor identities are callable through dynamic `Reflect.apply`
  - **Depends on Phase 3** heavily — proxies intercept dynamic property access.

---

## 3. Long-term phases (months)

- **Phases 11–13 — async Node stdlib** (~2 months total)
  - Phase 11: `fs.promises`, `events.EventEmitter`, `stream` (readable/writable/transform/pipe), `net`, `dns`
  - Phase 12: `http` / `https` (OpenSSL), `http2` (best-effort)
  - Phase 13: `child_process`, `cluster` (spawn model), `worker_threads` (pthread-backed, `structuredClone` for messages)

- **Phase 14 — npm integration** (~2 weeks *on top of* Phases 3 + 6 + 7)
  - Walk `node_modules/` and honor `package.json` `exports`/`imports`/`conditions`
  - Dual CJS/ESM resolution
  - `allowJs: true` so pure-JS packages are type-erased to `any` (needs Phase 3)
  - Native addon package detection for literal imports/requires now rejects installed package roots containing `build/Release/*.node`; broader package export/condition resolution remains

- **Phase 15 — perf & polish** (ongoing)
  - Inline-caching stats and diagnostics
  - Basic escape analysis to stack-allocate objects that don't outlive their frame
  - Dead-code elimination on the generated C
  - Further binary-size optimization and CI matrix (Linux ✓, macOS, Windows later)

---

## 4. Smaller missing pieces

Within-phase gaps that can be picked off individually without the big phase-level investments:

- Broader type guards / narrowing for deeper discriminated-union patterns. Basic user-defined type predicates over interface-shaped dynamic unions, basic literal-discriminant unions over interface-shaped dynamic objects, nullable pointer `typeof` guards such as `string | null` / `string | undefined`, dynamic `string | number | boolean` `typeof` guards, `in`-operator narrowing over interface-shaped unions, and `Array.isArray` type-predicate narrowing over unknown dynamic values are implemented.
- More complex generic type relationships. Direct top-level generic function calls, typed array callback references, concrete generic function-value adapters, erased generic classes, and generic instance/static method calls with concrete `T` / `T[]` specializations are implemented, including literal/const-literal computed generic method names, fixed-arity spread calls for generic functions/methods, and erased generic class methods. Tests: `generic_functions`, `generic_methods`, `generic_classes`.
- Spread calls through direct fixed-arity function/namespace/method/constructor calls and first-class function values are implemented for typed-array, dynamic-array, and string argument sources where the final runtime arity matches the target signature. Tests: `rest_spread`, `namespaces`, `classes`, `generic_functions`, `generic_methods`, `function_value_spread`.
- Literal and const-literal computed class fields/methods are implemented for instance and static members, with static field initializers evaluated in module init. Test: `class_computed_members`.
- `new Map(existingMap)` copy construction for typed Map sources is implemented. Test: `map_constructor_from_map`.
- ES2024 `Object.groupBy(items, keyFn)` returning a dynamic null-prototype object and `Map.groupBy(items, keyFn)` returning a typed `Map<K, T[]>` are implemented, including inline expression-body and single-return block-body callbacks. Tests: `object_group_by`, `map_group_by`.
- ES2025 Set composition methods (`union`, `intersection`, `difference`, `symmetricDifference`, `isSubsetOf`, `isSupersetOf`, `isDisjointFrom`) over `Set<T>` of matching element types are implemented. Test: `set_composition`.
- `new Set(existingSet)` copy construction for typed Set sources is implemented. Test: `set_constructor_from_set`.
- `Array.from(items, mapfn)` two-argument form for typed array, typed `Map<string, V>` entry, typed Set, string code-point, and boxed dynamic array/string sources is implemented, including single-return block-body inline mapper callbacks. Tests: `array_from_mapper`, `array_from_map`, `array_from_set`, `array_from_dynamic_mapper`.
- `Array.from(set)` and `Array.from(set, mapfn)` for typed Set sources are implemented. Test: `array_from_set`.
- `Array.from(map)` for typed `Map<string, V>` sources is implemented, returning `ObjectEntry<V>[]` in insertion order. Test: `array_from_map`.
- `Object.fromEntries(map)` for typed `Map<string, V>` sources is implemented for contextual interface/class object targets. Test: `object_from_entries_map`.
- Interface `extends` is implemented for inherited interface fields, including multiple and nested base interfaces. Test: `interface_inheritance`.
- Custom iterator objects whose `next()` method is inherited from a base class are implemented for `for...of`. Test: `custom_iterator_inherited_next`.
- Custom iterators yielding `ObjectEntry<T>` values support `[key, value]` destructuring in `for...of`. Test: `custom_iterator_entry_destructure`.
- Typed numeric bitwise compound assignments are implemented. Test: `bitwise_assign`.
- Dynamic bitwise binary and compound assignments are implemented, including property and index lvalues. Test: `dynamic_bitwise_ops`.
- Dynamic unary numeric operators are implemented over `any` values. Test: `dynamic_unary_ops`.
- Dynamic pre/post update operators are implemented over local `any` variables plus dynamic property and index lvalues. Test: `dynamic_update_ops`.
- Dynamic `for...of` array-binding rest destructuring is implemented for boxed dynamic arrays. Test: `dynamic_for_of_rest`.
- The `void` operator is implemented with operand side-effect preservation. Test: `void_operator`.
- The comma operator is implemented with left-to-right side-effect preservation and right-hand value result. Test: `comma_operator`.
- Exponentiation compound assignment is implemented for typed number, BigInt, and dynamic values. Test: `exponent_assign`.
- Logical assignment is implemented with RHS short-circuiting for typed and dynamic lvalues. Test: `logical_assign`.
- Dynamic property/index exponent and logical assignment is implemented with descriptor-aware writes and RHS short-circuiting. Test: `dynamic_property_logical_assign`.
- `for (const k in expr)` enumeration over typed classes/interfaces, typed arrays, and dynamic `tsc_value_t` objects is implemented. Test: `for_in`.
- Typed `string +=` compound assignment is implemented. Test: `string_compound_plus`.
- Decorators — requires metadata + Proxy support.

---

## 5. Permanent limits (will never be done)

These are genuinely impossible to AOT-compile at any engineering investment. The plan documents them, and `tsc2c` emits hard errors for the limits it can see before emission.

- **Native C++ addons under `node_modules/*/build/Release/*.node`.** They're compiled against Node's V8 ABI and the embedder's internals. We can't transpile their source because we don't have it — they're binary `.node` files. Literal `.node` import/require specifiers and literal package imports/requires whose installed package root contains `build/Release/*.node` are rejected now; broader package export/condition handling remains Phase 14. Suggested workaround is to document pure-JS alternatives.
- **Runtime code compilation** — JavaScript offers two constructs that require compiling source text at runtime. `tsc2c` is ahead-of-time and has no compiler in the produced binary, so `eval`, `Function(...)`, and `new Function(...)` are rejected before TypeScript diagnostics.
- **Dynamic `require(variable)`** where the argument isn't a string literal. The import graph is walked statically; a variable-valued specifier is unknowable at compile time, so non-literal `require(...)` is rejected before emission.

---

## How to pick

If the next session has **hours**, pick from section 4 (smaller pieces).

If it has **a few days to a week**, pick a bounded item from section 2, such as generator-backed iterables, unless the session is large enough to start Phase 3.

If it has **a week or more** to invest in one thing, do **Phase 3 (NaN-boxing)** from section 1. That one item unblocks about half of what's in sections 2–4.

If the goal is **"run a real npm package"**, the sequential chain is: Phase 3 → Closures → Phase 6 → Phase 14. Expect roughly two months of focused work for that end-to-end.
