# Changelog

All meaningful changes to `typescriptc` land here. Newest at the top.

## Unreleased

### Added
- Added bounded POSIX `path.normalize(path)`, `path.isAbsolute(path)`, and `path.relative(from, to)` support, `path.sep` / `path.delimiter` constants, and named/namespace imports from `"path"` / `"node:path"` for the supported path subset. Tests: `path_normalize`, `path_import`, `path_constants`, `path_relative`.
- Added an immediate-settled `fs.promises` subset for global `fs.promises`, named `promises` imports, and namespace imports from `"fs"` / `"node:fs"`, covering `readFile`, `writeFile`, `appendFile`, `readdir`, `stat`, `lstat`, `realpath`, `readlink`, `symlink`, `link`, `mkdtemp`, `truncate`, `chmod`, `access`, `mkdir`, `unlink`, `rm`, `rmdir`, `copyFile`, and `rename` by wrapping the sync fs runtime in fulfilled Promise records. Also added path-only/string-data sync `mkdirSync`, `unlinkSync`, `rmSync`, `rmdirSync`, `appendFileSync`, `copyFileSync`, `renameSync`, `statSync`, `lstatSync`, `realpathSync`, `readlinkSync`, `symlinkSync`, `linkSync`, `mkdtempSync`, `truncateSync`, and `chmodSync`, with a small `Stats` subset (`size`, `mode`, `isFile()`, `isDirectory()`, `isSymbolicLink()`), plus bounded UTF-8 encoding options for read/write/append, recursive `mkdir`, and recursive/force `rm`. Tests: `fs_promises`, `fs_promises_import`, `fs_promises_mutation`, `fs_sync_mutation`, `fs_copy_rename`, `fs_append`, `fs_stat`, `fs_lstat`, `fs_realpath`, `fs_readlink`, `fs_symlink`, `fs_link`, `fs_mkdtemp`, `fs_truncate`, `fs_chmod`, `fs_recursive_options`, `fs_encoding_options`.
- Added a synchronous `EventEmitter` subset with global construction plus named and namespace imports from `"events"` / `"node:events"`, covering `on` / `addListener` / `prependListener` / `once` / `prependOnceListener` / `off` / `removeListener` / `removeAllListeners` / `emit` / `listenerCount(eventName, listener?)` / `eventNames` / `setMaxListeners` / `getMaxListeners` and module-level `events.listenerCount` / `setMaxListeners` / `getMaxListeners` with generated listener adapters for typed callback parameters. Unhandled `"error"` emits now throw the first emitted argument string when no listener is registered, duplicate listener removal now removes the most recently added matching listener, and once listeners are removed before invocation for reentrant emits. Tests: `event_emitter`, `event_emitter_import`, `event_emitter_more`, `event_emitter_namespace`, `event_emitter_max_listeners`, `event_emitter_listener_count_filter`, `event_emitter_error_event`, `event_emitter_remove_latest`, `event_emitter_once_reentrant`.
- Settled `Promise<T>` values now support `Promise.resolve(value)`, `Promise.reject(reason)`, synchronous `.then(...)` / `.catch(...)` / `.finally(...)`, and settled-array `Promise.all` / `allSettled` / `race` / `any` over compiler-known callbacks and promise arrays. Test: `promise_settled`.
- Synchronous `function*` declarations now support ordinary `yield expr` statements, bounded `yield*` over arrays, strings, or dynamic iterable values, and materialized `.next()` / `.return(value)` / `.throw(error)` cursor interactions. Test: `generator_functions`.
- Permanent AOT-limit coverage now separately verifies direct `Function(...)` runtime compilation rejection in addition to `new Function(...)`. Test: `runtime_function_call`.
- Buffer instances now expose numeric byte indexes through `Object.keys` / `values` / `entries` / `getOwnPropertyNames` / `getOwnPropertyDescriptor(s)` / `hasOwn`, inherited `hasOwnProperty` / `propertyIsEnumerable`, `Reflect.ownKeys` / `Reflect.getOwnPropertyDescriptor`, `Reflect.get` / `Reflect.has`, and the `in` operator; `length` remains non-own but is visible to `Reflect.get` / `Reflect.has` / `in`. Test: `buffer_object_methods`.
- URL instances now expose empty own-property results through `Object.keys` / `getOwnPropertyNames` / `getOwnPropertyDescriptor(s)` / `hasOwn`, inherited `hasOwnProperty` / `propertyIsEnumerable`, and `Reflect.ownKeys` / `Reflect.getOwnPropertyDescriptor`, while keeping URL fields as prototype-style accessors. Test: `url_object_methods`.
- Primitive `string`, `number`, `boolean`, `symbol`, and `bigint` receivers now support inherited `hasOwnProperty` / `propertyIsEnumerable`; strings report index and non-enumerable `length` ownership, while the other primitives evaluate the key and return false. Tests: `string_object_methods`, `primitive_object_methods`, `symbol_bigint_object_methods`.
- Collection-like built-ins (`Map`, `Set`, `WeakMap`, `WeakSet`, `WeakRef`, `FinalizationRegistry`) now return empty own-property results for `Object.keys` / `values` / `entries` / `getOwnPropertyNames` / `getOwnPropertyDescriptor(s)` / `hasOwn`, inherited `hasOwnProperty` / `propertyIsEnumerable`, plus `Reflect.ownKeys` / `Reflect.getOwnPropertyDescriptor`, while still evaluating the receiver/key. Test: `collection_object_methods`.
- `Object.assign(typedTarget, source)` now supports typed interface/class targets, copying matching typed source fields and matching own dynamic/array/string source properties while preserving target identity and primitive source evaluation. Test: `object_assign_typed_target`.
- `Array.from(dynamic, mapfn)` now maps boxed dynamic array and string sources through inline/block-body or named callbacks, preserving the usual value/index callback arguments. Test: `array_from_dynamic_mapper`.
- `Object.isExtensible` / `isSealed` / `isFrozen`, `Object.preventExtensions` / `seal` / `freeze`, and empty own-property helpers (`keys`, `values`, `entries`, `getOwnPropertyNames`, `getOwnPropertyDescriptor(s)`, `hasOwn`) now accept number, boolean, bigint, and symbol primitives with ES non-object primitive results while still evaluating the argument. Test: `object_primitive_extensibility`.
- The `in` operator now supports typed arrays, checking numeric indexes and the non-enumerable `length` own property through the typed-array own-key path. Test: `array_own_properties`.
- `Object.assign(typedArrayTarget, source)` now writes enumerable indexes from typed array, typed object, string, and dynamic object/array/string sources through typed-array-safe element assignment, ignores evaluated number/boolean/bigint/symbol primitive sources, and respects prevent-extensions, seal, and freeze state. Test: `object_assign_typed_array_target`.
- Typed arrays now support `Object.isExtensible` / `isSealed` / `isFrozen` and `Object.preventExtensions` / `seal` / `freeze`, with typed-array-safe `Object.defineProperty`, `Object.defineProperties`, `Reflect.get` / `set` / `deleteProperty` / `defineProperty`, `delete array[index]`, descriptor flags, and core mutators observing the same extensibility state. Test: `array_extensibility`.
- Generic instance/static class methods now support literal and const-literal computed method names. Test: `generic_methods`.
- Erased generic class methods now accept fixed-arity spread argument lists, coercing spread values through the erased `tsc_value_t` method boundary. Test: `generic_classes`.
- Direct fixed-arity function, namespace function, class/static method, and class constructor calls, including generic specializations, now accept spread arguments from typed arrays, dynamic arrays, and strings when the final runtime arity matches the target signature. Tests: `rest_spread`, `namespaces`, `classes`, `generic_functions`, `generic_methods`.
- Inline callback support now accepts single-return block bodies (`{ return expr; }`) for typed/dynamic array higher-order methods, typed/dynamic array comparators, `Array.from(..., mapfn)`, and typed `Map`/`Set.forEach`. Tests: `array_hof`, `array_to_sorted`, `array_from_mapper`, `dynamic_array_hof`, `dynamic_array_reduce`, `dynamic_array_sort_comparator`, `map_set_for_each`.
- `Object.groupBy` and `Map.groupBy` inline arrow/function-expression callbacks now accept single-return block bodies such as `{ return key; }`, in addition to expression bodies. Tests: `object_group_by`, `map_group_by`.
- Class fields and methods now accept string/number literal and const-literal computed names, including static members; static field initializers are evaluated in module init so non-constant values such as strings work correctly. Test: `class_computed_members`.
- First-class function value calls now support spread arguments from dynamic arrays/strings, with runtime arity checks and per-parameter coercion. Test: `function_value_spread`.
- Dynamic `for...of` array-binding destructuring now supports a trailing rest binding such as `[head, ...tail]` over boxed dynamic arrays. Test: `dynamic_for_of_rest`.
- `Reflect.apply` and `Reflect.construct` now accept spread elements inside array-literal argument lists, including typed-array, dynamic-array, and string spreads where the final runtime arity matches the target. Tests: `reflect_apply`, `reflect_construct`.
- Interface `extends` now emits inherited fields into interface-backed structs in base-first order, including multiple and nested base interfaces. Test: `interface_inheritance`.
- Typed `Array.prototype.concat(...)` now accepts spread elements inside array-literal arguments. Test: `array_concat_values`.
- Dynamic array literals typed as `any` now support spread from dynamic arrays, dynamic/typed strings, and typed arrays, boxing spread elements into `tsc_value_t`. Test: `dynamic_array_spread`.
- Dynamic pre/post `++`/`--` now work for local `any` variables plus dynamic property and index lvalues with JS-style numeric coercion and correct expression results. Test: `dynamic_update_ops`.
- The comma operator now evaluates left-to-right and returns the right-hand value while preserving left operand side effects. Test: `comma_operator`.
- The `void` operator now preserves operand side effects and produces `undefined` for typed coercion paths. Test: `void_operator`.
- Dynamic unary numeric operators (`+`, `-`, `~`) now work over `any` values with JS-style numeric coercion and int32 bitwise-not semantics. Test: `dynamic_unary_ops`.
- Dynamic bitwise operators (`&`, `|`, `^`, `<<`, `>>`, `>>>`) and matching compound assignments now work over `any` values, including dynamic property and index lvalues. Test: `dynamic_bitwise_ops`.
- Dynamic property and index assignments now support exponentiation assignment (`**=`) and logical assignment (`&&=`, `||=`, `??=`), preserving RHS short-circuiting through descriptor-aware writes. Test: `dynamic_property_logical_assign`.
- Logical assignment (`&&=`, `||=`, `??=`) now works for typed and dynamic lvalues while preserving RHS short-circuiting. Test: `logical_assign`.
- Exponentiation compound assignment (`**=`) now works for typed numbers, BigInt values, and dynamic values. Test: `exponent_assign`.
- Typed numeric bitwise compound assignments (`&=`, `|=`, `^=`, `<<=`, `>>=`, `>>>=`) now lower to JS-style int32/uint32 operations. Test: `bitwise_assign`.
- Custom iterators that yield `ObjectEntry<T>` values now support `for (const [key, value] of iterator)` destructuring. Test: `custom_iterator_entry_destructure`.
- Custom iterator classes can now inherit their `next()` method from a base class; for-of lowering resolves the owning method and casts the iterator receiver correctly. Test: `custom_iterator_inherited_next`.
- `Object.fromEntries(map)` now accepts typed `Map<string, V>` sources when rebuilding a contextual interface/class object. Test: `object_from_entries_map`.
- `Array.from(map)` and `Array.from(map, mapfn)` now work for typed `Map<string, V>` sources by materializing `ObjectEntry<V>[]` entries in insertion order. Test: `array_from_map`.
- `new Map(existingMap)` now copies typed Map entries into an independent Map, including non-string key maps. Test: `map_constructor_from_map`.
- `new Set(existingSet)` now copies typed Set values into an independent Set while preserving insertion order. Test: `set_constructor_from_set`.
- `Array.from(set)` and `Array.from(set, mapfn)` now work for typed `Set<T>` values, preserving insertion order and supporting inline or function-reference mappers. Test: `array_from_set`.
- Dynamic property descriptors now accept shorthand object-literal fields such as `{ value, writable }` plus boolean flag expressions, and shorthand accessor identifiers resolve to the underlying function values. Test: `object_descriptor_shorthand`.
- Dynamic property descriptor kind transitions are now covered for configurable data-to-accessor and accessor-to-data redefinitions, with non-configurable data-to-accessor rejection. Test: `object_descriptor_kind_transition`.
- Configurable dynamic accessor descriptors now preserve omitted `get`/`set` hooks and omitted `enumerable`/`configurable` flags during redefinition, while explicit `get: undefined` / `set: undefined` clears the hook. Test: `object_accessor_preserve`.
- Direct custom iterator objects whose `[Symbol.iterator]()` returns themselves are now covered end-to-end. Test: `custom_iterator_self`.
- Non-configurable dynamic accessor properties can now be redefined with the same getter/setter/enumerability, while changed accessor identities or enumerable/configurable flags are rejected. Test: `object_accessor_redefine`.
- `Object.assign(dynamicArrayTarget, source)` now writes enumerable object/array/string source properties onto dynamic array targets, extending or updating indexes through normal array property semantics. Test: `object_assign_array_target`.
- `Object.assign(dynamicTarget, source)` now copies enumerable index properties from dynamic array and string sources, not only dynamic object sources. Test: `object_assign_array_string`.
- Dynamic `for...of` now supports array-binding destructuring over boxed pair arrays, covering patterns such as `for (const [key, value] of Object.entries(anyValue))`. Test: `dynamic_for_of_entries`.
- `for...of` now supports dynamic `tsc_value_t` array and string receivers, yielding boxed elements through the existing loop lowering. Test: `dynamic_for_of`.
- `FinalizationRegistry<T>` is constructible against any cleanup-callback type. `.register(target, heldValue, unregisterToken?)` records an entry, `.unregister(unregisterToken)` removes matching entries and reports whether any were removed, and `.toString()` returns `[object FinalizationRegistry]`. The cleanup callback is accepted but never invoked — this AOT runtime has no GC-finalizer plumbing. Test: `finalization_registry`.
- ES2025 Set composition: `Set.prototype.union`, `intersection`, `difference`, `symmetricDifference`, `isSubsetOf`, `isSupersetOf`, and `isDisjointFrom` accept another `Set<T>` of the same element type, honoring SameValueZero element matching and insertion order. Test: `set_composition`.
- ES2024 `Map.groupBy(items, keyFn)` groups a typed array into a typed `Map<K, T[]>`, accepting inline arrow/function-expression callbacks with expression bodies and function references (including generic functions). Test: `map_group_by`.
- ES2024 `Object.groupBy(items, keyFn)` groups a typed array into a null-prototype dynamic object whose string keys map to dynamic arrays of boxed items. Items must be types boxable into `tsc_value_t`. Test: `object_group_by`.
- Typed `string +=` compound assignment now concatenates via `tsc_str_concat`, with implicit coercion of the right-hand side via the existing string-coercion path. Test: `string_compound_plus`.
- `Array.from(items, mapfn)` two-argument form now works for typed array sources and string code-point sequences, accepting inline arrow/function-expression callbacks with expression bodies and function references. Test: `array_from_mapper`.
- `for (const k in expr)` enumerates own enumerable string keys. Supports typed classes/interfaces (compile-time field-name lists), typed arrays (numeric index strings), and dynamic `tsc_value_t` objects via `tsc_value_object_keys`. Test: `for_in`.
- Typed `Map<string, V>.entries()` returns `ObjectEntry<V>[]` in insertion order, mirroring `Object.entries(...)` shape so the result can be passed back to `new Map(...)` for round-tripping. Test: `map_entries`.
- `console.warn(...)` now writes to stderr like `console.error(...)`; `console.info(...)` continues to write to stdout like `console.log(...)`.
- Typed strings now support Object/Reflect own-property helpers for string indexes and non-enumerable `length`, including keys, values, entries, descriptor maps, `Reflect.get`, `Reflect.has`, deletion refusal for indexes/length, and write refusal. Test: `string_object_enumeration`.
- Dynamic strings now expose string indexes and non-enumerable `length` through Object/Reflect own-property helpers, including keys, values, entries, descriptor maps, `Reflect.get`, `Reflect.has`, deletion refusal for indexes/length, and write refusal. Test: `dynamic_string_object_enumeration`.
- `Set` can now be constructed from typed arrays, and `Map` can be constructed from `Object.entries(...)` string-key entry arrays. Test: `map_set_constructors`.
- Numeric `Map` keys and `Set` values now use SameValueZero semantics, including `NaN` matching and `-0` / `0` coalescing. Test: `map_set_same_value_zero`.
- Typed and dynamic `Array.prototype.includes()` now use SameValueZero semantics, so `includes(NaN)` succeeds while `indexOf(NaN)` remains `-1`. Test: `array_includes_same_value_zero`.
- Dynamic `Array.prototype.slice()` and `reverse()` now have focused coverage for negative/clipped slice bounds, receiver mutation, and returned array identity. Test: `dynamic_array_slice_reverse`.
- Typed `Array.prototype.sort(compareFn)` / `toSorted(compareFn)` now accept first-class closure comparator values, not only inline arrows and direct function declarations. Test: `array_to_sorted`.
- Typed array higher-order callbacks now receive the standard receiver array argument (`array` for element callbacks, fourth argument for `reduce` / `reduceRight`) across inline, direct function, and closure callback paths. Test: `array_hof`.
- Dynamic array higher-order callbacks now receive the standard receiver array argument across inline callbacks, direct function references, closure callback values, and `reduce` / `reduceRight`. Tests: `dynamic_array_hof`, `dynamic_array_hof_refs`.
- Typed `Array.prototype.flatMap()` now accepts scalar callback results as well as array results, matching JavaScript's one-level flatten behavior. Test: `array_flat`.
- `String.prototype.split(RegExp)` now includes captured separator groups in the output, while still honoring split limits. Tests: `string_split_limit`, `dynamic_string_split_limit`.
- Typed and dynamic `String.prototype.split(separator, limit)` now honor result limits for string and RegExp separators. Tests: `string_split_limit`, `dynamic_string_split_limit`.
- Dynamic `Array.prototype.sort(compareFn)` and `toSorted(compareFn)` now support inline and named comparator callbacks over `tsc_value_t` arrays. Tests: `dynamic_array_sort_comparator`, `dynamic_array_to_sorted_comparator`.
- Plain string replacement now expands dollar, whole-match, prefix, and suffix tokens for typed and dynamic string `replace` / `replaceAll`. Tests: `string_replace_string_tokens`, `dynamic_string_replace_string_tokens`.
- RegExp replacement strings now expand dollar, whole-match, capture, prefix, and suffix tokens for typed and dynamic string `replace` / `replaceAll`. Tests: `string_replace_regex_groups`, `dynamic_string_replace_regex_groups`.
- `parseInt` / `Number.parseInt` now use JS-style omitted/zero radix inference, including `0x` hexadecimal prefixes and invalid-radix `NaN` results. Test: `number_static_more`.
- Dynamic `String.prototype.split()` now accepts RegExp separators over `tsc_value_t` string receivers, matching the typed string path. Test: `dynamic_string_split_regex`.
- Dynamic `String.prototype.replace()` / `replaceAll()` now accept RegExp patterns, matching the typed string path. Test: `dynamic_string_replace_regex`.
- Typed and dynamic `String.prototype.search()` now accepts string patterns by constructing a RegExp. Tests: `string_search_string`, `dynamic_string_search`.
- Typed and dynamic `String.prototype.match()` / `matchAll()` now accept string patterns by constructing a RegExp, with string `matchAll()` using global matching. Tests: `string_match_string`, `dynamic_string_match_string`.
- Dynamic `Reflect.get(target, key, receiver?)` and `Reflect.set(target, key, value, receiver?)` now accept receiver arguments; dynamic `Reflect.set` writes inherited or missing writable data properties onto the receiver instead of the target. Test: `reflect_receiver`.
- Direct, lifted, and closure-valued functions declared with a TypeScript `this: any` parameter now receive the runtime accessor receiver for dynamic `Object.defineProperty` / `Reflect.defineProperty` getters and setters. Test: `reflect_receiver`.
- Dynamic accessor descriptors now return stable boxed function identities for `get` and `set` from `Object.getOwnPropertyDescriptor(s)`, so `typeof`, `String(...)`, `Object.is`, and `===` behave consistently across repeated descriptor reads. Test: `reflect_receiver`.
- Dynamic `Reflect.apply` can now invoke boxed accessor function identities returned from descriptor `get`/`set` fields, binding the supplied `thisArg` as the accessor receiver. Test: `reflect_receiver`.
- Dynamic accessor descriptor objects now include own `get` and `set` fields with `undefined` when a hook is absent, matching accessor descriptor shape for getter-only, setter-only, and no-accessor cases. Test: `object_descriptor_defaults`.
- Dynamic `JSON.stringify` now omits object properties whose values are `undefined` or boxed function identities while preserving `null` entries for array slots. Test: `object_descriptor_defaults`.
- Dynamic object data descriptor redefinition now preserves omitted descriptor fields, allows compatible non-configurable writable updates, and rejects incompatible enumerable/configurable/writable changes. Test: `object_descriptor_redefine`.
- Dynamic data descriptors now support omitted `value` defaults (`undefined`) and accessor descriptors accept explicit `get: undefined` / `set: undefined` hooks. Test: `object_descriptor_defaults`.
- `Object.create(proto, descriptors)` now applies static descriptor maps while creating dynamic objects with a prototype, including closure-valued accessors. Test: `object_create_descriptors`.
- `Object.defineProperties(dynamic, descriptors)` now batches dynamic data and accessor descriptors, including closure-valued getters/setters, over static descriptor-map keys. Test: `object_define_properties`.
- Dynamic arrays now track bounded `Object.preventExtensions` / `Object.seal` / `Object.freeze` state for Reflect/Object index writes, dense-index definitions, descriptor flag reporting, `length` writes, deletion checks, and core mutator methods. Test: `dynamic_array_extensibility`.
- Dynamic accessor descriptors for `Object.defineProperty` / `Reflect.defineProperty` can now use function-scope closure values and inline closure expressions as getters/setters, preserving captured state after the defining function returns. Test: `object_accessor_closures`.
- Typed `Map.prototype.forEach()` and `Set.prototype.forEach()` now accept named callback references in addition to inline callbacks, including callback parameters for value/key-or-value2/receiver. Test: `map_set_for_each_refs`.
- Dynamic arrays now support bounded `Reflect.defineProperty` / `Object.defineProperty` data descriptors for dense array indexes and `length`; unsupported flag combinations return `false` through `Reflect.defineProperty`. Test: `dynamic_array_define_property`.
- Dynamic array higher-order methods (`map`, `filter`, `forEach`, `find*`, `some`, `every`, `flatMap`, `reduce`, and `reduceRight`) now accept named callback references as well as inline callbacks, coercing dynamic elements and accumulators into the callback's declared parameter types. Test: `dynamic_array_hof_refs`.
- Dynamic arrays now support string-key property writes through `arr["1"] = value` and `Reflect.set(arr, "1", value)`, length writes through `Reflect.set(arr, "length", n)`, and non-configurable `length` deletion checks. Test: `dynamic_array_property_writes`.
- `Array.prototype.entries()` support for typed and dynamic arrays, materializing `[string, value]` entry arrays alongside the existing `keys()`/`values()` behavior. Tests: `array_entries`, `dynamic_array_entries`.
- `Object.getOwnPropertyNames(array)` support for typed arrays, plus typed-array `Reflect.ownKeys` coverage in the existing enumeration test. Test: `object_array_enumeration`.
- `Reflect.apply` and `Reflect.construct` now accept typed-array and dynamic-array argument lists for statically known function/class targets, with runtime arity checks; `Reflect.apply` binds `thisArg` into function values that declare `this: any`. Tests: `reflect_apply`, `reflect_construct`.
- Dynamic `String.prototype.match()` and `matchAll()` support over `tsc_value_t` string receivers with RegExp arguments. Test: `dynamic_string_match`.
- Dynamic array `Object.keys`/`Object.values`/`Object.entries`, `Object.getOwnPropertyNames`, descriptor lookup, and `Reflect.ownKeys`/`Reflect.has`/`Reflect.get` coverage. Test: `dynamic_array_object_enumeration`.
- Typed array property descriptors for `Object.getOwnPropertyDescriptor(s)`, including `length`, plus `Reflect.getOwnPropertyDescriptor(array, key)`. Test: `array_property_descriptors`.
- Typed array own-property checks through `Object.hasOwn`, `Reflect.has`, `hasOwnProperty`, and `propertyIsEnumerable`. Test: `array_own_properties`.
- Typed `Array.prototype.concat(...)` now accepts both array arguments and single element arguments. Test: `array_concat_values`.
- `Object.keys(array)`, `Object.values(array)`, and `Object.entries(array)` support for typed arrays, with array-specific shim overloads for `[string, T]` entry reads. Test: `object_array_enumeration`.
- Dynamic `String.prototype.codePointAt()` support over `tsc_value_t` string receivers. Test: `dynamic_string_code_point_at`.
- Typed `Object.getOwnPropertyDescriptors(obj)` support for interface/class field descriptor maps. Test: `typed_property_descriptors`.
- E2e coverage for `typeof` narrowing over dynamic `string | number | boolean` primitive unions. Test: `typeof_boolean_union`.
- `Array.isArray(value)` is now declared as a type predicate, so guarded `unknown` dynamic values narrow to typed array operations. Test: `array_is_array_narrowing`.
- Typed `key in obj` field-list checks for interface/class objects, plus coverage for `in`-operator narrowing over interface-shaped unions.
- Dynamic accessor descriptors for `Object.defineProperty` / `Reflect.defineProperty` can now use module-scope lifted arrow consts as getters/setters.
- Bounded `Reflect.construct(Class, args)` support for statically known class constructors with array-literal argument lists.
- Bounded `Reflect.apply(fn, thisArg, args)` support for statically known function values with array-literal argument lists.
- Callable `Number(value?)` constructor coercion for typed and dynamic values.
- Callable `String(value?)` and `Boolean(value?)` constructor functions for typed and dynamic coercion.
- Typed `Object.getOwnPropertyDescriptor(obj, key)` and `Reflect.getOwnPropertyDescriptor(obj, key)` support for interface/class field data descriptors.
- Typed `Reflect.set(obj, key, value)` support for interface/class field writes.
- Typed `Reflect.get(obj, key)` support for interface/class field reads.
- Typed `Reflect.has(obj, key)` support for interface/class field checks.
- Global `isNaN(value)` and `isFinite(value)` now accept typed and dynamic non-number inputs using JS-style numeric coercion.
- Typed and dynamic `Number.prototype.toPrecision(precision?)` support for significant-digit formatting.
- Typed and dynamic `Number.prototype.toExponential(fractionDigits?)` support for scientific notation formatting.
- Typed and dynamic `Number.prototype.toFixed(fractionDigits?)` support for fixed-point formatting.
- Typed and dynamic `String.prototype.substr(start, length?)` support with JS-style negative-start and length clamping semantics.
- Typed `String.prototype.isWellFormed()` and `toWellFormed()` support for the runtime's validated UTF-8 string model.
- `Array.from(string)` support, returning an array of one-code-point strings via the existing string-iteration runtime.
- Typed interface/class `Reflect.ownKeys(...)` support using compile-time field-list expansion.
- Typed interface/class `Object.getOwnPropertyNames(...)` support using the same compile-time field lists as typed object key enumeration.
- Typed `Math.SQRT1_2` support, with direct `Math.trunc()` / `Math.sign()` e2e coverage.
- Typed `String.fromCodePoint(...)` support for constructing UTF-8 strings from Unicode scalar values.
- Typed `Math.imul()`, `Math.clz32()`, and `Math.fround()` support with JS-style int32/uint32 coercion helpers in the runtime.
- Additional typed `Math` methods backed by libm: `cbrt`, variadic `hypot(...)`, `log1p`, `log2`, `log10`, `expm1`, inverse-trig, and hyperbolic/inverse-hyperbolic functions.
- Typed `Number` static constants (`EPSILON`, safe integer bounds, infinities, `NaN`, min/max values).
- Typed `Number.isSafeInteger()` plus `Number.parseInt(value, radix)` support.
- Typed `RegExp.prototype.hasIndices` and `sticky` flag-property support for `d` and `y` regex flags.
- Typed `RegExp.prototype.exec(string)` support for full-match and capture-array results.
- Typed `String.prototype.search(RegExp)` support backed by PCRE2.
- Typed `Map.prototype.forEach()` and `Set.prototype.forEach()` inline callback support.
- Typed and dynamic `String.prototype.trimLeft()` / `trimRight()` aliases.
- Typed and dynamic `String.prototype.charCodeAt()` with UTF-16 code-unit semantics.
- Optional search-position arguments for typed and dynamic `String.prototype.indexOf()`, `lastIndexOf()`, `includes()`, `startsWith()`, `endsWith()`, and typed/dynamic array `indexOf()`/`includes()`/`lastIndexOf()`.
- Dynamic `Array.prototype.reduce()` and `reduceRight()` without an explicit initial value.
- Typed `Array.prototype.reduce()` and `reduceRight()` without an explicit initial value.
- Focused dynamic `Array.prototype.valueOf()` identity coverage over `tsc_value_t` arrays.
- Dynamic `Array.prototype.keys()` and `values()` support over `tsc_value_t` arrays.
- Typed `Array.prototype.valueOf()` support as receiver identity.
- Typed `Array.prototype.keys()` and `values()` support, returning index arrays and shallow value copies.
- Typed `Buffer.prototype.toLocaleString()` and `valueOf()` object methods.
- Typed `Set.prototype.keys()` as the standard alias for `Set.prototype.values()`.
- Typed `URL.prototype.toString()`, `toJSON()`, `toLocaleString()`, and `valueOf()` support.
- Typed `Map`, `Set`, `WeakMap`, `WeakSet`, and `WeakRef` `toString()`, `toLocaleString()`, and `valueOf()` object methods.
- Typed `RegExp` properties (`source`, `flags`, and flag booleans) plus `toString()`, `toLocaleString()`, and `valueOf()` support.
- Typed `Symbol.prototype.toLocaleString()` / `valueOf()` and `BigInt.prototype.toLocaleString()` / `valueOf()` object methods.
- Typed interface/class `Object.prototype.toString()`, `toLocaleString()`, and `valueOf()` fallback handling, while preserving user-defined class methods.
- Typed `Object.hasOwn`, `Object.prototype.hasOwnProperty`, and `Object.prototype.propertyIsEnumerable` field-list checks for interface/class values.
- Dynamic number `.toString(radix?)` support for `tsc_value_t` receivers.
- Typed `Number.prototype.toString(radix?)`, `toLocaleString()`, and `valueOf()` plus typed `Boolean.prototype.toString()`, `toLocaleString()`, and `valueOf()`.
- Typed `String.prototype.toString()`, `toLocaleString()`, and `valueOf()` identity methods.
- Typed `Array.prototype.toString()` and `toLocaleString()` support using the existing comma-join emitter.
- Dynamic array `toString()` / `toLocaleString()` now use comma-join stringification instead of the old `[array]` placeholder.
- Dedicated dynamic `Object.prototype.toString()` coverage for object, array, number, string, and boolean receivers.
- Dynamic `Object.prototype.toLocaleString()` and `valueOf()` support over boxed dynamic receivers.
- Dynamic `Object.prototype.isPrototypeOf(value)` support over dynamic prototype chains.
- Dynamic `Object.prototype.propertyIsEnumerable(key)` support over dynamic descriptor enumerable flags.
- Dynamic `Object.prototype.hasOwnProperty(key)` support over dynamic objects without walking prototypes.
- `Array.of(...items)` typed array construction, including `Array.of<any>(...)` values that can be coerced to dynamic arrays.
- `Array.prototype.reduceRight(...)` for typed arrays plus dynamic inline callbacks over `tsc_value_t` arrays with an explicit initial value.
- `Object.is(...)` support over boxed dynamic values with SameValue semantics for `NaN`, signed zero, strings, and object identity.
- Dynamic `Object.getOwnPropertyDescriptors(dynamic)` support for own data/accessor descriptor objects.
- `String.prototype.at(index)` for typed strings plus dynamic `tsc_value_t` string receivers.
- `Array.prototype.findLast(...)` and `findLastIndex(...)` for typed arrays plus dynamic inline callbacks over `tsc_value_t` arrays.
- `Array.prototype.at(index)` for typed arrays plus dynamic `tsc_value_t` array receivers.
- Dynamic `Object.fromEntries(dynamicEntries)` support for dynamic `[key, value]` arrays.
- Dynamic `Object.entries(dynamic)` support over enumerable dynamic data/accessor properties.
- Dynamic named-function accessor descriptors for `Object.defineProperty` / `Reflect.defineProperty`, including getter reads, setter writes, inherited accessors, enumerable accessor values, and JSON stringify behavior.
- `Array.prototype.toSpliced(...)` for typed arrays plus dynamic `tsc_value_t` array receivers.
- `Array.prototype.with(...)` for typed arrays plus dynamic `tsc_value_t` array receivers.
- `Array.prototype.toSorted()` for typed arrays plus default dynamic `tsc_value_t` array receivers.
- `Array.prototype.toReversed()` for typed arrays plus dynamic `tsc_value_t` array receivers.
- `Array.prototype.lastIndexOf(...)` for typed arrays.
- `Array.prototype.copyWithin(...)` for typed arrays plus dynamic `tsc_value_t` array receivers.
- `Array.prototype.fill(...)` for typed arrays plus dynamic `tsc_value_t` array receivers.
- `String.prototype.localeCompare(...)` for typed strings plus dynamic `tsc_value_t` string receivers.
- `String.prototype.lastIndexOf(...)` for typed strings.
- `String.prototype.concat(...)` for typed strings plus dynamic `tsc_value_t` string receivers.
- `String.prototype.trimStart()` and `String.prototype.trimEnd()` for typed strings plus dynamic `tsc_value_t` string receivers.
- `String.prototype.substring()` for typed strings plus dynamic `tsc_value_t` string receivers.
- Dynamic `String.prototype.normalize()` support over `tsc_value_t` string receivers.
- Dynamic `String.prototype.repeat`, `String.prototype.padStart`, and `String.prototype.padEnd` support over `tsc_value_t` string receivers.
- Dynamic `lastIndexOf` support over `tsc_value_t` string and array receivers.
- Dynamic `String.prototype.replace(string, value)` and `String.prototype.replaceAll(string, value)` support over `tsc_value_t` string receivers.
- Dynamic `String.prototype.split(string)` support over `tsc_value_t` string receivers, returning dynamic arrays.
- Dynamic default `Array.prototype.sort()` support over `tsc_value_t` arrays using JS-style string-conversion ordering.
- Dynamic `Array.prototype.splice` support over `tsc_value_t` arrays, returning removed elements and mutating the receiver.
- Dynamic array index assignment and compound numeric-index assignment for `tsc_value_t` arrays, including sparse extension with `undefined`.

### Fixed
- Typed interface/class `Object.keys(...)`, `Object.getOwnPropertyNames(...)`, and `Reflect.ownKeys(...)` now evaluate the receiver expression before returning the compile-time field list. Test: `typed_object_property_names`.
- Global and `Number.*` `parseInt` / `parseFloat` declarations now accept any value, matching the emitter's JS-style stringification before parsing.
- `Number.isFinite()`, `Number.isNaN()`, `Number.isInteger()`, and `Number.isSafeInteger()` now accept any typed or dynamic value and return `false` for non-number inputs.
- `Math.min()` and `Math.max()` now propagate `NaN` when any argument is `NaN`.
- `Math.sign()` now preserves JavaScript signed-zero and `NaN` behavior.
- `Math.round()` now preserves JavaScript negative-zero behavior for values in `[-0.5, 0)`.
- Preserved Map/Set insertion order after deletion while keeping bucket-table lookup acceleration.
- Preserved JS division semantics when integer-shaped globals participate in `/`, while still allowing integer `%` lowering.
- Dynamic direct property assignment and compound property assignment for `obj.x` / `obj["x"]` over `tsc_value_t` objects.
- Dynamic object prototype chains with `Object.create`, `Object.getPrototypeOf`, `Object.setPrototypeOf`, `Reflect.getPrototypeOf`, `Reflect.setPrototypeOf`, and prototype-walking property reads / `in` / `Reflect.has`.
- Dynamic `Reflect.getOwnPropertyDescriptor(dynamic, key)` support for descriptor lookup over dynamic object data properties.
- Dynamic `Object.seal`, `Object.freeze`, `Object.isSealed`, and `Object.isFrozen` support over dynamic data descriptors.
- Dynamic object extensibility tracking with `Object.preventExtensions`, `Object.isExtensible`, `Reflect.preventExtensions`, and `Reflect.isExtensible`, enforced for new data-property writes/definitions.
- Dynamic array `flatMap` support for inline expression-body callbacks over `tsc_value_t` arrays, plus mixed dynamic ternary branch boxing.
- Dynamic array `reduce` support with an explicit initial value for inline expression-body callbacks over `tsc_value_t` arrays.
- Dynamic array `forEach`, `some`, `every`, `find`, and `findIndex` support for inline expression-body callbacks over `tsc_value_t` arrays.
- Dynamic array `map` and `filter` support for inline expression-body callbacks over `tsc_value_t` arrays.
- Dynamic `Array.prototype.flat(depth?)` support for `tsc_value_t` arrays.
- Dynamic `Array.isArray(value)` and `Array.from(value)` support for `tsc_value_t` arrays.
- Dynamic `"key" in object` and `delete object.key` / `delete object["key"]` support over descriptor-aware dynamic object properties.
- Dynamic array `shift`, variadic `unshift`, variadic `push`, and `concat` support on `tsc_value_t` arrays.
- Dynamic `Object.assign`, `Object.hasOwn`, and `Object.getOwnPropertyNames` support over dynamic object data properties.
- Dynamic object data descriptor flags for `Object.defineProperty` / `Reflect.defineProperty`, including enumerable `Object.keys`/`Object.values`/JSON behavior, non-writable `Reflect.set` failures, non-configurable `Reflect.deleteProperty` failures, `Reflect.has`, `Reflect.ownKeys`, and `Object.getOwnPropertyDescriptor`.
- Basic `Reflect.get(dynamic, key)` and `Reflect.set(dynamic, key, value)` support for dynamic object property access.
- Basic `Object.defineProperty(dynamic, key, { value })` support for dynamic object data-property writes.
- `for...of` over classes whose `[Symbol.iterator]()` returns a custom iterator object with `next()` returning `{ done, value }`.
- Generic classes now work in an erased form, storing type-parameter fields/params/returns as `tsc_value_t` and coercing at typed boundaries.
- Generic top-level function references can now be assigned to concrete function-typed values through specialized adapter closures.
- User-defined type predicate narrowing for interface-shaped dynamic union values.
- Basic discriminated-union support over interface-shaped dynamic object storage with literal discriminant checks and typed field reads through dynamic coercion.
- `tsc_value_t` unbox/coercion bridges for assigning or passing dynamic values into typed `number`, `boolean`, `string`, and array destinations.
- Runtime dispatch for common dynamic string/array methods on `tsc_value_t`, including `includes`, `indexOf`, `slice`, `join`, `push`, `pop`, casing, trim, and related helpers.
- Dynamic `tsc_value_t` binary/logical/nullish operator dispatch for arithmetic, string concatenation, equality, relational comparison, and compound arithmetic assignment.
- Phase 3 dynamic-value foundation: NaN-boxed `tsc_value_t` for `any`/`unknown`, `JSON.parse`, dynamic JSON stringify, heterogeneous dynamic arrays/objects, dynamic property/index access, and `Object.keys`/`Object.values` over dynamic objects.
- `typeof` guard narrowing over `string | number` dynamic union storage, with unbox bridges back to specialized string/number reads.
- First-class typed closures for arrow/function expressions with function-scope captures, including returned closures, mutable captured state via ref cells, closure calls, and declared-function wrapping for function-typed parameters.
- Pre-emit diagnostics now reject literal package imports/requires when the installed package root contains `build/Release/*.node`.
- `for...of` over typed custom iterable classes with `[Symbol.iterator]()` returning an array-backed `IterableIterator<T>`.
- Generic instance/static class methods are monomorphized per concrete call signature, including inherited generic method calls.
- Generic top-level function references can be specialized in typed array callback contexts, including HOFs and `sort` comparators.
- Direct top-level generic function calls are monomorphized per concrete call signature, including simple `T` and `T[]` flows.
- `--release` build mode, using gcc `-Os -s`, plus a release-mode e2e case.
- Generated C `#line` directives for emitted TypeScript statements, with an e2e generated-C assertion.
- `for...of` over strings, yielding UTF-8 code point strings, plus fixed-width C escapes for non-BMP string literals.
- Pre-emit hard-error diagnostics for literal native addon imports/requires ending in `.node`.
- Pre-emit hard-error diagnostics for permanent AOT limits: `eval`, `Function` / `new Function`, and non-literal `require(variable)`.
- Typed `WeakRef<T>` construction and `.deref()` support.
- `symbol` values with `Symbol(description?)`, `Symbol.for`, `Symbol.keyFor`, `Symbol.iterator`, `Symbol.asyncIterator`, `.description`, `.toString()`, equality, and `typeof`.
- Typed `WeakMap<K, V>` and `WeakSet<T>` with object keys and the non-iterable weak-collection method surface.
- Rest parameters for user-defined functions/methods plus spread arguments into those rest parameters.
- Tagged template calls for tags with a `TemplateStringsArray` first parameter and fixed substitution parameters.
- Computed property names in typed object literals when the key resolves to a string or number literal.
- PCRE2-backed RegExp runtime with lookahead/lookbehind, named capture syntax, Unicode property escapes, `s`/`u` flags, and existing regex string APIs preserved.
- GMP-backed `bigint` support for literals, `BigInt(...)`, arithmetic/comparison/equality, `typeof`, and `.toString(radix?)`.
- Runtime-correct `typeof` equality/inequality guards for nullable pointer unions such as `string | null` and `string | undefined`.
- `Object.entries(obj)` / `Object.fromEntries(entries)` for homogeneous typed object fields using `[string, T]` entry arrays.
- `String.prototype.normalize()` for NFC/NFD/NFKC/NFKD using ICU.
- `String.prototype.matchAll(re)` as typed `string[][]` full-match and capture-group results.
- Direct self-tail-call optimization for top-level functions, lowering `return f(...)` to argument temporaries and a `goto` loop.
- Namespace declarations for scoped values/functions, lifted arrow consts, nested namespaces, and namespace member access/assignment.
- Exhaustiveness diagnostics for finite-domain switches over literal unions and booleans, plus expected-failure e2e support with `expected.exitcode`.
- Binary-safe `Buffer` subset: `from`, `alloc`, `concat`, `isBuffer`, `.length`, byte indexing/get-set, `.toString`, `.slice`/`.subarray`, and `.equals`.
- `new URL(input)` for absolute URL parsing with common readonly fields (`href`, `protocol`, `host`, `hostname`, `port`, `pathname`, `search`, `hash`, `origin`).
- `crypto.createHash("sha256").update(...).digest("hex")` via OpenSSL-backed runtime helpers.
- Left-to-right call argument evaluation through sequenced temporaries for supported call emitters.
- `String.fromCharCode(...)` and `String.prototype.codePointAt(...)` backed by UTF-8 runtime helpers.
- Direct `for...of` iteration over `Map` entries and `Set` values.
- `instanceof` for emitted class instances using runtime class ancestry tags.
- Console first-argument formatting for common `%` specifiers.
- `Array.prototype.flat()` / `.flatMap()` for homogeneous typed arrays.
- Numeric `enum` declarations and `Enum.Member` constant lowering.
- Regex capture groups on non-global `.match()` results.
- E2E coverage documenting `abstract` classes, access modifiers, and `readonly` fields as accepted TS-only modifiers.
- `typeof` in typed code — returns the JS type string while preserving operand side effects.
- `Array.prototype.sort()` with no comparator — defaults to JS-style string-conversion ordering.

### Added — deep documentation pass
- `docs/README.md` — documentation index routing by role/topic.
- `docs/architecture.md` — multi-pass pipeline, module graph, value model; includes Mermaid diagrams for pipeline, emission passes, module init chain, and the future dynamic-value bridge.
- `docs/cli.md` — complete CLI reference: every flag, exit code, env var; explains the `bin/tsc2c` dispatch.
- `docs/runtime-reference.md` — every `tsc_*` runtime symbol grouped by feature area, with signatures and memory semantics.
- `docs/testing.md` — how the e2e harness works, how to add a new case, debugging tips.
- `CHANGELOG.md` — this file.
- `llms.txt` — concise LLM-oriented index.
- `llms-full.txt` — single-file documentation bundle for ingestion.
- `.claude/skills/tsc2c-add-feature/SKILL.md` — repo-local agent skill for future LLMs adding a language feature.

### Added — examples (under `examples/`)
- `examples/hello.ts`, `fizzbuzz.ts` — minimal demonstrations.
- `examples/calc.ts` — CLI calculator: `process.argv`, `parseFloat`, switch fall-through, `process.exit`.
- `examples/tree.ts` — binary search tree with recursive class methods and `Node | null` fields.
- `examples/cart.ts` — interfaces, classes, `reduce`/`map`/`filter`, template literals.
- `examples/collections.ts` — every HOF, `Map`, `Set`, object literals, `padEnd`.
- `examples/wordcount.ts` — fs + regex split + `Map` counter + `Array.sort` with comparator.
- `examples/README.md` — index with run commands.

## Session 4 — real-world programming

### Added
- `Array.prototype.sort` with user comparator — inline insertion sort; accepts inline arrows or function references.
- `process.env.VAR` — maps to `getenv` via `tsc_process_env_get`.
- `process.cwd()` — `tsc_process_cwd`.
- `wordcount` e2e test — tokenize via regex, count via `Map`, sort by comparator, read env var.

## Session 3 — full functional style

### Added
- Function references as HOF callbacks. `arr.map(declaredFn)` or `arr.map(liftedArrowConst)` works as well as inline arrows.
- Top-level `const f = (x) => ...` lifts to a static C function. Usable as a call target and as an HOF callback.
- Module-level `const/let` promoted to file-scope statics. Top-level functions and lifted arrows can now read/write them as captures.
- Spread in array literals: `[0, ...a, 6]`.
- `Object.keys`/`values` on typed interfaces (compile-time expansion from the TypeScript type's property list).
- `Array.from`, `Array.isArray`.
- String methods: `padStart`, `padEnd`, `replace`/`replaceAll` with both string and regex patterns.
- RegExp via POSIX ERE (`<regex.h>`): `/pattern/flags` literals, `re.test`, `s.replace`/`.match`/`.split` with regex, flag handling for `g`/`i`/`m`, JS escape class translation (`\d`, `\D`, `\w`, `\W`, `\s`, `\S`).
- Nullish coalescing `??` — null-aware for pointer types.
- Optional chaining `?.` — null-aware property access with zero-sentinel fallback.
- `null` literal as a real runtime value: cross-type equality (`arr !== null`), coercion to any pointer type.
- Declared-type preference for identifier references — enables `const s: string | null = null; s ?? "x"` to compile.

### Fixed
- `cstr_dup` forward declaration so regex code (earlier in the file) can call it.

## Session 2 — the typed-TS core

### Added
- Phase 2a: typed arrays. Literal, indexing, `.length`, `push`/`pop`/`shift`/`unshift`, `for-of`, `reverse`, `slice`, `concat`, `join`, `indexOf`, `includes`.
- Phase 2b: classes. Fields, constructor, methods, `new`, `this`, `extends`/`super()`, static fields, static methods, inherited method dispatch.
- Phase 2c: higher-order array methods with inline arrow callbacks — `forEach`/`map`/`filter`/`reduce`/`find`/`findIndex`/`some`/`every`. Expansion via GCC statement expressions.
- Phase 2.5: interfaces emitted as C structs; object literals with typed shape; shorthand property assignment `{ x, y }`.
- Phase 4: multi-file module graph. `ts.Program` walks imports, topo-sorted, each module's top-level code wrapped in `mod_init_<id>()`, called from `main` in dependency order.
- Phase 5: exceptions. `throw`/`try`/`catch`/`finally` via setjmp/longjmp with a single global error string.
- Phase 7 (partial): `Map<K,V>` and `Set<T>` via type-erased linear-scan with key-kind tag for equality.
- Phase 7 (partial): `JSON.stringify` — type-driven, recurses through arrays and class/interface fields.
- Phase 10: sync-core Node stdlib. `fs.readFileSync`/`writeFileSync`/`existsSync`/`readdirSync`, `path.join`/`resolve`/`basename`/`dirname`/`extname`, `Math.*` (floor/ceil/round/abs/sqrt/pow/min/max/log/sin/cos/tan/atan/atan2/exp/random/trunc/sign + PI, E, LN2, LN10, LOG2E, LOG10E, SQRT2), `os.platform`/`arch`/`hostname`/`tmpdir`/`homedir`/`cpus`, `Date.now`, `Number.isInteger`/`isFinite`/`isNaN`/`parseInt`/`parseFloat`.
- Shortest round-trip number formatting (`tsc_str_from_num` probes `%.*g` precisions 1–17).
- Fall-through switch/case semantics: consecutive empty cases merge via `||`.
- `NaN`, `Infinity`, `undefined` globals.

## Session 1 — bootstrap

### Added
- Phase 0: CLI (`bin/tsc2c` → `src/cli.ts`), TypeScript compiler API integration (`src/program.ts`), emitter scaffolding (`src/emit/index.ts`), gcc driver (`src/link/cc.ts`), runtime skeleton (`runtime/tsc_runtime.c/.h`), `stdlib/lib.core.d.ts` shim replacing `@types/node`.
- Phase 1: typed core — `number`/`string`/`boolean`/`void`, literals, operators (arithmetic, comparison, logical, bitwise, assignment + compound, pre/post `++ --`), ternary, template literals, if/while/do-while/for/break/continue, top-level function declarations with recursion, `console.log`/`error`/`warn`/`info`, `process.exit`/`argv`, `parseInt`/`parseFloat`/`isNaN`/`isFinite`.
- `--no-gc` compile flag using `-DTSC_NO_GC` as a fallback for environments without `libgc-dev`.
- e2e test harness at `tests/e2e/run.ts` with `hello`, `fizzbuzz`, `arith`, `greet` cases.

## Permanent limits

Features that will never be supported, documented once and referenced from [`docs/todo.md`](docs/todo.md):

- Native C++ addons (`node_modules/*/build/Release/*.node`) — linked against Node's V8 ABI.
- Runtime code compilation (JS constructs that compile strings at runtime) — `tsc2c` is ahead-of-time.
- Dynamic `require(variable)` with a non-literal argument — can't be walked statically.

These are hard limits, not backlog items. The plan explicitly acknowledges them.
