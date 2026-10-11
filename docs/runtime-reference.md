The canonical `tsc_global_bindings.def` function rows supply length, native operation, construction, global enumerability and required arguments. `btoa`/`atob` now own ordinary retained Realm function values. Missing arguments reject before coercion; provided values and ignored arguments use the shared call argument list. The existing base64 codec implementation is unchanged.

`tsc_module_graph_new`, `tsc_module_evaluate` and `tsc_module_require_sync` retain Module Records and requested-module edges, evaluate through an iterative DFS/SCC worklist and cache completion/rejection. Async Module bodies return a continuation Promise; parent records become available in their recorded evaluation order. Dynamic import observes the same completion capability. CommonJS synchronous require rejects a pending asynchronous ES Module.

`tsc_module_error_source_index(graph, index)` returns the retained executing record's graph index for a failed module, or the queried index when no failure is recorded. Error values and source identities propagate together through synchronous, cyclic, cached and asynchronous graph rejection. Out-of-graph indices use the shared module TypeError diagnostic.

Class definitions now lower through one ordered stage plan shared by ordinary evaluation, native member definition and the continuation worklist. Heritage and computed element keys are definition-time expressions; retained constructor, method and initializer bodies remain separate. Async functions, generators and async generators preserve the constructor, actual property keys and immutable inner name through these stages, including abrupt/abandoned definitions. Dynamic inner-name value/root/TDZ storage belongs to the retained constructor rather than separate temporary allocations. The obsolete suspension diagnostic fixture is removed; resumable_class_definition_stages supplies imported typed consumers, and the independent resumable-class-definition property covers semantic partitions and one deep retained owner graph in both memory modes. Top-level awaiting module evaluation, private elements, complete eval environments and eligible full target coverage remain open.

JavaScript class declarations now use the same ClassDefinitionEvaluation factory as expressions and local declarations. Script lexical cells, ES module live bindings, anonymous default exports and CommonJS bindings retain the canonical constructor value; JavaScript declarations no longer emit parallel native structs, constructor adapters or member bodies. A worklist over superclass dependencies also routes TypeScript subclasses of these classes through the same factory. Construction aliases and instanceof use that value without native casts. The shared ordered ClassElement List and retained constructor environment provide formal/actual arguments, element order, inner names, super, return completions and actual newTarget across these source records. Compact Node differential properties cover the semantic partitions with both memory modes and one deep inheritance/owner graph; global_class_definition checks JavaScript exports imported by typed consumers. TypeScript native class optimization, private elements, suspended heritage/member keys, eval environments and eligible full target coverage remain open.

Dynamic class heritage and derived construction now use the canonical ClassElement List, actual argument List and retained Function Environment Record. Heritage validates a live constructor/prototype or null and establishes both prototype links before member keys. Explicit/default bodies share one construct adapter; derived this stays uninitialized until super construction returns, is bound before instance elements run, and retains one status/value/root through escaped or suspended arrows. The lexical descriptor collection now preserves physical binding storage, with an internal environment CType and a read projection rather than eager this snapshots. Super calls use the same argument/continuation graph and retained newTarget, including delayed calls after an object return, duplicate-call errors and object/primitive return completion rules. Native boxed construction now attaches its allocated receiver through one new-with-receiver allocation helper before base initialization, preserving alternate/derived prototypes; the direct native entry is a wrapper over that helper. Compact independent Node semantic partitions and one deep inheritance/owner graph cover represented contexts in typed/erased CLI/native observation hosts and both memory modes. Global native derived-constructor semantics, awaited heritage/member keys, TypeScript parameter properties, private elements, eval environments and eligible full target coverage remain open.

Public super property References now retain their callable home object and a separate actual receiver. Class methods, accessors, constructors and element initializers, plus ordinary object methods/accessors, share the same rooted home slot; lexical arrows and suspended activations retain it through the existing descriptor collection. One captured property-reference projection drives reads, writes, updates, calls, tags, deletion and source assignment-pattern targets. The resumable graph uses the same Reference with an optional receiver and explicit receiver/base operations, deleting its separate property-call operand builder. GetValue normalizes and retains the ReferencedName as required by the pinned ECMAScript 2026 text; a directed fixture records the current Node 26 difference for repeated key conversion and null-base precedence. Independent Node comparisons cover the aligned semantic partitions, imported typed owners, suspension and one deep retained arrow/home graph in both memory modes. Dynamic heritage/derived receiver binding, private/super calls, eval environments and eligible full target coverage remain open.

Dynamic base-class constructors now reuse the canonical source closure/FormalParameters plan, retained class body slot and shared invocation record. Default and explicit bodies use one adapter: instance elements run before parameters, while invocation retains the logical class callee, receiver, actual argument List and newTarget. Constructor captures enter the same class-member collection, and callable source-owner classification now drives both metadata and activation creation. Meta-property tokens are excluded from lexical capture analysis. Strict activations are configured before defaults can create an arguments object. Constructor metadata precedes static member definitions, preserving static length overrides. Native base initialization also runs fields before defaults and exposes its receiver/newTarget to defaults; derived receiver/heritage semantics remain open. Compact independent Node semantic partitions cover formal trees, defaults/rest/arguments, TDZ, strictness, field/body ordering, return completions, Reflect.construct and suspended factories, with one retained deep binding/owner graph and imported GC/no-GC consumers. Dynamic TypeScript parameter properties, heritage, private elements, HomeObject/super/eval, full native constructor return/newTarget semantics and eligible full target coverage remain open; unsupported initialization keeps the canonical diagnostic.

Dynamic class expressions and direct lexical class declarations now lower public fields and static blocks through one retained ClassElement List on the existing callable owner. The shared member collection evaluates keys and creates initializer closures before initializing the inner class name; the runtime replays static records once and instance records for each default construction in source order. Records retain actual String/Symbol keys, boxed closures and decoded GC roots, and field definition uses ordinary own data descriptors. Initializer source owners keep static-block locals separate from factory captures; suspended factories retain the same cells. Anonymous class field names are applied before their own static definitions in both dynamic and native paths, preserving static name overrides. Compact independent Node semantic partitions and one retained deep owner graph plus imported GC/no-GC consumers provide local evidence. Explicit dynamic constructors, heritage, private elements, HomeObject/super/eval and eligible full target coverage remain open; unsupported initialization elements retain the canonical diagnostic.

Native class declarations now share the immutable inner-name Environment Record and initialization projection with dynamic class definitions. Native storage has static duration; dynamic evaluations retain escaping heap cells through the same binding record. Computed member keys observe the uninitialized inner and outer bindings, while fields, static blocks, constructors, methods and suspended callbacks retain the initialized inner constructor independently of later outer writes. Ordinary top-level class declarations use the existing mutable outer lexical cells in typed and erased sources. The old native constructor-read shortcut is deleted. Compact independent Node semantic partitions cover reads, writes, TDZ, captures and suspension, with one retained deep owner graph and an imported consumer in both memory modes. This provides local evidence; complete heritage, initialization, HomeObject/super/private/eval semantics and eligible full target coverage remain open.

Admitted class declarations and expressions now enter the existing async/generator control-flow graph through one shared dynamic-definition predicate. Method captures recognize the class factory's own name binding instead of requiring an enclosing-function cell, and the blanket nested-class rejection is deleted. The retained binding record marks definition environments created inside the active continuation: their immutable inner cells take precedence during definition, while later method continuations resolve their own retained handles. The same definition factory, lexical scope-entry cells and rooted element algorithm serve ordinary, async, generator and async-generator contexts. Continuation formals now project every bound name from FormalParameters into one Symbol-keyed retained-cell collection; the identifier-only predecessor is deleted. Anonymous defaults infer their binding name through the shared source syntax projection. Local declaration and pattern/iteration names share the same storage projection, preserving actual callable kinds instead of casting a checker function union to the first Promise ABI. `tests/property/resumed-class-definition.property.test.ts` compares independent Node definition forms/scopes, actual keys and captures, immutable inner names, method continuation/generator activation, forward and abrupt TDZ, protected descriptors, repeated evaluation, destructured/default/rest formals with later-parameter captures and one deep binding/retained-class input across typed/erased CLI and native observation hosts with both memory modes. `resumed_class_definition` covers imported typed consumers. Awaited computed keys still fail closed through the missing canonical suspension-state diagnostic in `resumed_class_key_suspension_diagnostic`; local initialization/heritage/private state, complete eval/HomeObject/super semantics and eligible full target coverage remain open. Existing CType, runtime and declaration surfaces suffice.

Ordinary function bodies, Blocks and CaseBlocks now lower admitted local class declarations through the same class-definition factory as expressions. The canonical direct declaration collection supplies mutable outer value/root/TDZ cells; each named definition owns a separate immutable inner cell, initialized after element keys and retained by method closures. JavaScript transient self-reference Symbols resolve to the declaration's binding. Public methods/accessors retain actual keys, captured values, strict receivers and fresh identities. The separate empty-switch-class factory is deleted; unrepresented initialization elements fail closed with `class element requires the canonical initialization plan`. `tests/property/lexical-class-definition.property.test.ts` compares independent Node scope/capture, inner-name mutation, TDZ, abrupt/protected definitions, repeated evaluation and one deep retained lexical-class input in typed/erased CLI and native observation profiles with both memory modes. `lexical_class_definition` covers imported typed consumers; `lexical_class_initialization_diagnostic` preserves the shared boundary. Existing CType, declaration and runtime APIs suffice. Local constructor bodies/fields/static blocks/heritage/private state, direct resumable class-definition contexts, complete eval/HomeObject/super semantics and eligible full target coverage remain open.

Class declarations and admitted class expressions now share one source-ordered class-element definition algorithm. Computed keys pass through the same ToPropertyKey and callable-name kernels; declaration field keys remain retained for initialization, while expression method/accessor keys belong to the current definition. Callable values receive decoded roots before name or descriptor allocation. The separate method-only expression vector and definition loop are deleted. Class expressions now admit public methods/getters/setters with actual String/Symbol keys, strict receivers, captures and ordinary descriptors; accessor-definition failures throw TypeError. Purity checks preserve the observable failure of replacing a constructor's protected prototype instead of silently pruning it, and unrepresented local environments fail closed. `tests/property/class-expression-elements.property.test.ts` compares independent Node key/coercion/order, function-kind metadata, fresh identity, actual formals/receivers, accessor merging, abrupt/protected descriptors and one deep retained element-owner input across typed/erased CLI and native observation hosts in both memory modes. `tests/e2e/cases/class_expression_elements` covers an imported typed consumer, with `class_expression_initialization_diagnostic` preserving the unsupported initialization boundary. Class-expression constructor bodies/fields/static blocks/heritage, private and complete local/lexical-class/HomeObject/eval contexts and eligible full target coverage remain open.

Public computed instance fields in admitted source class declarations now use the ordered class-member tree, retained evaluated keys and declaration-owned value cells. The native storage projection allocates collision-free cells independently of public String/Symbol keys, so distinct runtime keys cannot share an inferred-name slot; repeated actual keys still follow ordinary own-data definition order. The old computed-name inference gate is deleted. Field initialization, callable name inference, inherited-prefix layout and decoded roots use the existing kernels. Native projections of source class spreads read the ordinary owner rather than inferred physical spellings. `tests/property/computed-instance-field-key.property.test.ts` compares independent Node results for key coercion/order, fresh values, names/descriptors, uninitialized fields, mutation, repeated definitions, inherited setters, derived layout, abrupt completion, spread and one deep retained class-field input across typed/erased CLI and native observation hosts in both memory modes. `tests/e2e/cases/computed_instance_field_key` covers imported typed owners. Private fields, complete class-expression/local/heritage and lexical-class/TDZ contexts, initializer eval/HomeObject semantics, constructor activation details and eligible full target coverage remain open.

Computed static fields now participate in the same source-ordered class-element key pass as methods and accessors. Each computed expression undergoes ToPropertyKey once, and its retained String/Symbol carrier survives until the later field definition. All element keys evaluate before static field values and blocks. Anonymous field callables use the shared runtime name kernel with the evaluated key, preserving explicit names and existing references. `tests/property/computed-class-field-key.property.test.ts` compares independent Node results for coercion, key/value order, mutation, Symbol descriptions, name descriptors, abrupt completion and one deep class-element/owner stress input across typed/erased CLI and native observation hosts in both memory modes. `tests/e2e/cases/computed_class_field_key` exercises an imported typed owner. The null computed-field key crash is removed. Dynamic instance keys, broader class expressions, early eval/HomeObject/private contexts and eligible full target coverage remain open.

Anonymous callables in admitted instance/static field initializers now receive their field name through the existing source syntax name projection. Property assignments and declarations share one parent-owner branch; source wrappers use the same outward traversal, and explicit names and existing callable references retain their identity/name. Admitted anonymous class expressions receive the name when their constructor identity is created, before member calls. The callback owner, name descriptor and retained storage kernels are unchanged. `tests/property/field-callable-name.property.test.ts` compares independent Node callable-kind, key encoding, instance/static placement, descriptor, explicit-name/reference and anonymous-class partitions in typed/erased CLI/native observation and both memory modes with one deep retained name-owner graph. `field_callable_name` covers imported typed consumers. No new CType, runtime API or declaration surface is needed. Runtime computed-key named evaluation, complete anonymous class element/eval/HomeObject contexts, private names and eligible full target coverage remain open. Source/compliance builds, the independent field-name property and retained graph, imported consumers in both memory modes and independent Node output, the neighboring field-definition property and generated coverage-reference checks pass. The pinned class and arrow variable-name selections (`/tmp/tsc2c-name125-pinned-class.json`, `/tmp/tsc2c-name125-pinned-arrow.json`) pass strict/sloppy native execution and independent unchanged-source, implementation/corpus/containment and runner-owned C/executable artifact audits. Their legacy es6id 13.3.2.4 metadata remains unmapped and diagnostic on the ineligible host; whole-clause and full target coverage remain open.

Source instance field declarations now lower from the ordered class-member tree through one field-definition kernel. The canonical source-value graph supplies actual-domain storage, and a keyed physical-field projection prevents repeated definitions from duplicating native slots. Each initializer evaluates with the actual instance this and undefined new.target; its retained result reaches an own writable/enumerable/configurable data definition in source order. Uninitialized fields define undefined. Derived fields run after successful super initialization, including the implicit zero-argument base path. Parameter properties use the same definition kernel. The native owner initializer establishes the prototype without advertising future or inferred fields; ordinary constructor writes and inherited setters therefore observe actual presence. The old constructor initializer loop and eager source field descriptor collection are deleted. Keys outside the current canonical key representation fail closed with one stable diagnostic; private/dynamic keys, complete field eval/HomeObject/name contexts, constructor receiver/newTarget/return, default-derived actual forwarding, weak ownership and eligible full-target coverage remain open. No new CType, C runtime API or declaration surface is needed. `tests/property/class-field-definition.property.test.ts` compares independent Node presence/order, this/capture, descriptors, inherited setters, repeated definitions, abrupt completion and encoded-key partitions in typed/erased CLI/native observation and both memory modes with one deep retained owner graph. `class_field_definition` covers imported typed consumers; `class_field_definition_key_diagnostic` covers the stable boundary. Source/compliance builds, the independent field property and deep retained graph, imported consumers and the stable diagnostic in both memory modes, independent Node output, neighboring constructor/class-member properties and class E2E, and generated coverage-reference checks pass. The pinned initializer and post-super abrupt-completion selections (`/tmp/tsc2c-field124-pinned-abrupt.json`, `/tmp/tsc2c-field124-pinned-super.json`) pass strict/sloppy native execution and independent unchanged-source, implementation/corpus/containment and runner-owned C/executable artifact audits. Their modern anchors resolve exactly to sec-ecmascript-function-objects-construct-argumentslist-newtarget and sec-super-keyword-runtime-semantics-evaluation. These remain local diagnostic records on an ineligible host; full class and target coverage remain open.

Source constructor formals now enter the same retained FormalParameters binding plan as ordinary functions. Their actual values, omitted undefined slots, default and binding-tree initialization, captured writes and decoded roots no longer depend on scalar annotations. Parameter properties read that shared binding storage. Non-template source class calls evaluate the actual constructor and retained argument List, and boxed constructor adapters enter a strict call record and project rest tails from the retained actual List and use source formal syntax for length metadata. The private constructor-body bypass and caller-side default evaluation on canonical signature calls are removed. No new CType, runtime API or declaration surface is needed. `tests/property/constructor-formal-domain.property.test.ts` compares independent Node semantic partitions in typed and erased CLI/native-observation input, both memory modes and one deep retained owner graph; `constructor_formal_domain` covers imported typed consumers. Complete class field definition/order/this, actual call activation/newTarget/return, derived construction and eligible full target coverage remain open. Source/compliance builds, the constructor property, imported consumers and neighboring class E2E in both memory modes, independent Node output, neighboring ordinary-function/class-member properties and generated coverage-reference checks pass. The pinned constructor and static length selections (`/tmp/tsc2c-constructor123-pinned-constructor.json`, `/tmp/tsc2c-constructor123-pinned-length.json`) pass strict/sloppy native execution and independent unchanged-source, implementation/corpus/containment and runner-owned C/executable artifact audits. The length selection resolves exactly to sec-runtime-semantics-classdefinitionevaluation; legacy es6id 14.5 remains unmapped. These are local diagnostic records on an ineligible host, not a whole-class or full-target coverage claim.

Timer Promise calls now project one native operation descriptor collection into compiler admission and runtime activation. The existing retained actual-argument List evaluates ordinary arguments and iterator spreads in source order; the runtime consumes actual delay, payload and option values. One option descriptor List governs ordered validation and projection, including getters, aliases, mutation, ignored fields and abrupt completion. The shared activation record owns source arguments and projected options through the canonical array codec and decoded-root vector. Interval activation defers validation and scheduling until next; one-shot validation rejects its Promise while later projection errors remain synchronous. Unreferenced timer jobs no longer keep the process alive. Native signal branding prevents unrelated class contexts from being read as private AbortSignal state; foreign signal owners fail closed with one stable diagnostic. Generated callback/environment variants, static option-shape admission and private signal extraction are deleted. `tests/property/timers-promises-activation.property.test.ts` compares independent Node semantic partitions and one deep expanded actual List through typed CLI/native observation and erased CLI in both memory modes. `tests/property/timers-promises-unref.property.test.ts` verifies process lifetime and microtasks; `tests/property/timers-promises-signal-boundary.property.test.ts` verifies the foreign-owner boundary. The retained-owner property remains a regression check. `timers_promises_activation` verifies imported typed options, getters and spreads in both memory modes. Existing timer/scheduler option-alias diagnostics are repaired. Zero-delay fixtures now wait for completion instead of assuming cross-queue timing, with independent Node confirmation. Scheduler receiver fixtures had already failed on the earlier immutable source; their sloppy-this expectations and completion barriers now match independent Node execution. Erased host module/global owners, complete foreign signal/AbortError protocol, complete async-generator semantics and eligible signed host/report coverage remain open. The pinned resolving-function and thenable/deferred Promise selections (`/tmp/tsc2c-timers122-pinned-resolving.json`, `/tmp/tsc2c-timers122-pinned-thenable.json`, `/tmp/tsc2c-timers122-pinned-deferred.json`) pass natively with independently audited unchanged source fingerprints, exact modern/legacy metadata, a complete tracked implementation-source manifest and runner-owned C/executable attestations. Legacy numeric anchors remain unmapped; the host remains ineligible.

Deferred timer Promise environments now use one retained field descriptor List for struct declarations and field-aligned initialization. Every boxed value or signal receives a decoded GC root beside its field; native pointer fields remain directly visible to the collector. The manual timer/scheduler environment declarations and assignments are deleted, and a mismatched initializer List fails closed with one stable diagnostic. Deferred boxed payloads enter the shared Promise resolution kernel, preserving actual Promise adoption rather than fulfilling with an encoded Promise object. Existing native pointer result conventions remain intact. `tests/property/deferred-environment-owner.property.test.ts` compares independent Node heap-owner, primitive and adoption partitions through typed CLI/native observation and erased CLI in both memory modes, and native signal owners in typed input, with forced collection and one deep retained owner graph. `deferred_environment_owner` verifies typed imports and suspension in both memory modes. This repairs the independently reproduced pre-existing GC crash in `async_await_branch_return_await_loop_uninitialized_let`; its no-GC baseline already passed. Full class activation, ordinary host owners across erased AbortController, erased host module bindings and inline awaited calls, complete WeakRef/finalization semantics and eligible signed host/report coverage remain open. The pinned Promise resolving-function and deferred/thenable selections (`/tmp/tsc2c-deferred121-pinned-resolving.json`, `/tmp/tsc2c-deferred121-pinned-deferred.json`, `/tmp/tsc2c-deferred121-pinned-thenable.json`) pass natively with independently audited unchanged source fingerprints, exact modern/legacy metadata and runner-owned C/executable manifests. Legacy numeric metadata remains unmapped, and the host remains ineligible. Existing timer/scheduler const-option diagnostics are independently reproduced on the earlier immutable source and remain open.

Hoisted var bindings and executed declarations/class fields without initializers now seed the canonical source-value dependency graph with the undefined domain. Hoisted bindings preserve undefined before their initializer executes, and initializer-free var redeclarations preserve the existing value. The private scalar-default fallback was deleted; unsupported physical storage fails closed with one stable diagnostic. The same worklist propagates that storage through annotations, aliases, parameters, fields and captures; existing declaration/field initialization kernels then preserve actual undefined and later source writes instead of choosing a scalar zero or typed null default. Ambient/type-only declarations remain excluded. Existing value storage and initializer lowering suffice, so no new CType, C API or declaration surface is needed. The independent Node property checks var/let domains, pre-initializer hoisting and redeclaration preservation, later heterogeneous writes, module and own instance/static fields, per-iteration captures, TDZ, suspension and one high-depth retained callable-alias graph carrying an initially undefined binding and a later actual BigInt owner. Compact partitions run in typed/erased CLI/observation profiles and both memory modes; the representative deep graph runs with collection. Imported typed consumers are in uninitialized_source_value. Complete declaration/class algorithms and eligible full target coverage remain open. The existing async_await_branch_return_await_loop_uninitialized_let regression passes allocation-only execution but fails with a native SIGSEGV during console output on both the prior immutable snapshot and this worktree under GC; that separate retained async-result regression remains open for the next repair. Final source/compliance builds, the independent undefined/hoisting property with its deep retained graph, imported typed consumers in both memory modes and independent Node comparison, neighboring declaration/numeric-write properties, and generated coverage-reference checks pass. Independently audited strict/sloppy native let-initialization and captured TDZ probes pass as unmapped legacy es6id 13.1 evidence. The class-field declaration probe also passes, with prod-FieldDefinition resolving exactly to its sec-class-definitions production owner; this remains diagnostic evidence rather than a whole-class claim on the ineligible host. The separately reproduced GC-only async-result regression, complete algorithms and full target coverage remain open.

Relational source expressions now use the canonical numeric-operation descriptor collection and retained postorder tree. Descriptor predicates interpret the shared comparison kernel's ordered, equal and incomparable results; all operand Types follow ordered runtime ToPrimitive/ToNumeric and actual String/Number/BigInt semantics. The typed Number/String/BigInt relational branches and private emitRelational predecessor were deleted. Comparison results join the same source-value dependency graph, preserving the actual Boolean domain through narrower annotations and retained owners. The native comparison kernel now retains decoded roots at each conversion boundary so freshly returned primitive owners survive later conversion hooks and collection. Existing value/Boolean storage, C comparison entrypoint and declarations suffice; no new CType, C API or declaration surface is needed. The independent Node property checks primitive domains, UTF-16 string order, StringIntegerLiteral and exact Number/BigInt boundaries, incomparable and abrupt values, operand/conversion order, fresh converted owners, suspension and one high-depth mixed numeric/relational tree. Compact semantic partitions run in typed/erased CLI/observation profiles and both memory modes; the representative deep tree runs with collection. Imported typed consumers are in relational_expression_tree. Complete comparison/Reference algorithms and eligible full target coverage remain open. Final source/compliance builds, the independent relational property with its deep retained mixed tree, the imported typed consumer in both memory modes and independent Node comparison, neighboring numeric-tree/numeric-write properties, and generated coverage-reference checks pass. Independently audited strict/sloppy native Number/BigInt and String/BigInt comparison probes pass; their sec-abstract-relational-comparison anchors resolve exactly to sec-islessthan in the pinned edition. The Boolean/Number legacy probe also passes and remains unmapped clause evidence. The host remains ineligible and complete algorithms/full target coverage remain open.

Numeric source results and numeric PutValue operations now seed the same canonical source-value dependency graph. One complete source pass supplies write edges for numeric compound assignments and prefix/postfix updates, and one worklist propagates the actual value domain through declarations, parameters, fields, aggregates, aliases and captures. A source annotation no longer converts a Number/BigInt update result back to predecessor String/Boolean storage. Update descriptors join the canonical numeric-operation collection and both update forms share one Reference dispatcher and actual ToNumeric kernels; private raw-C Number updates and BigInt/Symbol update predecessors were removed. Existing value storage, native conversion kernels and declarations suffice, so no new CType, C API or declaration surface is needed. The independent Node property checks primitive conversion, returned versus stored values, actual domains, property/reference ordering, abrupt preservation, native fields, compound writes, suspension and one high-depth typed alias graph retaining an actual BigInt owner through typed/erased CLI/observation profiles with collection and allocation-only execution. The imported typed consumer is numeric_write_storage. Saved property References retain the pinned edition's normalized key rule. Complete Reference environments, private/super access, complete numeric algorithms and eligible full target coverage remain open. Final source/compliance builds, the independent numeric-write property with its retained deep alias graph, the imported typed consumer in both memory modes and independent Node comparison, neighboring declaration/string/numeric-tree and suspension-Reference properties, and generated coverage-reference checks pass. Independently audited pinned prefix/postfix increment BigInt probes pass in strict/sloppy native profiles (sec-prefix-increment-operator-runtime-semantics-evaluation and sec-postfix-increment-operator-runtime-semantics-evaluation). The Boolean conversion legacy probe also passes and remains unmapped clause evidence; the host is still ineligible and complete algorithms/full target coverage remain open.

Unary numeric forms now join the same canonical numeric-operation collection and retained postorder tree. Descriptor projections distinguish binary, assignment and prefix syntax and the native result convention without choosing semantics from TypeScript annotations. Unary minus/complement use the existing ToNumeric kernels; unary plus uses ToNumber and encodes its binary64 result. The old scalar/typed-BigInt unary dispatch and private plus-conversion helper were deleted, removing compile-time rejection of valid Boolean, String and ordinary-object operands. Independent Node comparison covers primitive and wrapped domains, Number/BigInt results, signed zero, coercion hints/fallback/abrupt completion, mixed-tree evaluation and suspension, with one deep prefix/binary tree retaining freshly created conversion owners during collection through typed/erased CLI/observation profiles and allocation-only execution. Imported typed consumers use existing operator declarations; no new CType or C API is required. Complete conversion/intrinsic algorithms and eligible full target conformance remain open. Final source/compliance builds, the independent unary property, imported typed consumers in both memory modes, neighboring numeric-tree and rounding properties, and generated coverage-reference checks pass. Independently audited strict/sloppy native probes pass for unary-plus BigInt rejection (sec-unary-plus-operator-runtime-semantics-evaluation) and unary-minus object conversion (sec-unary-minus-operator-runtime-semantics-evaluation). The Boolean-minus legacy probe also passes and remains unmapped clause evidence; the host remains ineligible and complete unary algorithms/full target coverage are still open.

Numeric expressions now use one canonical operator/assignment collection and one postorder expression-tree worklist. Leaves and intermediate actual values remain rooted through left-to-right evaluation and arbitrary conversion callbacks. Existing value-add/ToNumeric kernels own String/Number/BigInt partitioning, arithmetic and portable bitwise conversion/masked shifts. The raw C binary numeric and bitwise emitters, typed binary BigInt operator dispatch, addition-only predecessor and duplicate compound-operation selection have been deleted; unary complement joins the same tree. A generated independent Node oracle crosses scalar domains, literal/typed/compound contexts, actual BigInt results, evaluation/conversion order, abrupt completion and saved Reference semantics through suspension, with one representative deep retained BigInt expression tree in typed/erased CLI/observation profiles under forced collection and allocation-only execution. Imported typed consumers use existing declarations. No new CType or C runtime API is needed. Complete unary/numeric conversions, intrinsic algorithms and eligible full target conformance remain open; this provides the common tree representation rather than an operator inventory denominator. Final source/compliance builds, the independent numeric-tree property with deep retained BigInt owners, typed imported consumers in both memory modes, addition/BigInt-owner/Number-storage neighbours and coverage-reference checks pass. Pinned strict/sloppy native unsigned-shift evaluation-order (sec-unsigned-right-shift-operator-runtime-semantics-evaluation), BigInt complement (sec-numeric-types-bigint-bitwiseNOT) and legacy shift-boundary (11.7.3_A5.1_T1) tests pass with independently audited frozen source/corpus/implementation/dependency/containment fingerprints and runner-owned native artifacts. The legacy metadata remains unmapped and the host remains ineligible. The new numeric-tree path may change performance; no performance or whole-clause conformance claim is made.

Source Number storage now uses binary64 T_NUMBER or the same encoded Number value throughout declarations, reads, captures and suspension. The syntactic integer-shape analyser, bounded inference passes, int64 CType, integer expression re-emission, storage casts and integer-only Set paths have been deleted. Typed, boxed and compound remainder now share tsc_num_mod/fmod, preserving signed zero and rounded arithmetic intermediates and handling NaN, infinities and zero divisors without undefined integer conversions or signed overflow. The generated property uses an independent Node oracle over scalar semantic partitions, literal/typed/boxed/compound contexts, source storage and updates, conversion order/abrupt completion, Number/BigInt separation and one deep retained source-dependency graph. Imported typed consumers use the existing primitive/operator declarations in both memory modes. Whole Number/bitwise/intrinsic algorithms and eligible full target conformance remain open. Final source/compliance builds, the independent storage/remainder property, typed imported consumers in both memory modes, exponentiation/rounding/binary-format and declaration-storage neighbours, and coverage-reference checks pass. Pinned strict/sloppy native remainder evaluation-order tests (sec-multiplicative-operators-runtime-semantics-evaluation) and legacy zero-divisor/signed-zero tests (11.5.3_A4_T4 and 11.5.3_A4_T6) pass with independently audited frozen fingerprints, corpus/containment digests and runner-owned native artifacts. The legacy metadata remains unmapped to normative clauses and the host remains ineligible. The broader numeric regression also exposed an obsolete eager CommonJS initialization golden; independent Node output verifies on-demand ordering, and the corrected regression passes in both memory modes. Integer-path removal may change performance; no performance or whole Number conformance claim is made.

Ordinary function own-prototype materialization now allocates through the shared object constructor in the callable identity's retained creation Realm, with the function owner rooted across allocation. Reads, descriptor reads and construction all use this one metadata path; the reader Realm no longer determines the prototype object's parent, while actual newTarget still determines the function's internal prototype. Independent Node comparison covers default/property/descriptor/foreign-reader access, fresh dynamic and ordinary source functions, replacement prototypes, mutated global intrinsics and one deep retained-owner graph through typed/erased native profiles with forced collection and allocation-only execution. Imported typed consumers exercise the existing constructor and descriptor declaration surface in both memory modes. No new CType, C API or declaration is needed. Full CreateDynamicFunction grammar, opaque runtime sources and eligible full target conformance remain open. Final source/compliance builds, the independent creation-Realm property, imported typed consumer in both memory modes, dynamic-function-kind neighbours and coverage-reference checks pass. Independently audited pinned strict/sloppy native Function prototype and newTarget fallback tests now pass (sec-createdynamicfunction and sec-function-p1-p2-pn-body), repairing the previously recorded prototype case. Source/implementation/dependency/corpus/containment fingerprints and runner-owned native artifacts were independently verified on the still-ineligible host; these focused results do not promote a complete dynamic-function or Realm clause.

Declarations, reads, capture descriptors and compound-assignment References now use one physical variable-storage decision; the obsolete declaration/capture-specific integer-layout choices were removed after the Date consumer exposed an address-type mismatch. Final builds, the generated binding property, imported consumers in both memory modes, shared declaration-storage regression and coverage-reference checks pass. Independently audited pinned JSON.parse object coercion (sec-json.parse) and initial Map binding (sec-map-constructor) pass in strict/sloppy native profiles on the still-ineligible host. The equally audited Function Realm prototype case (sec-createdynamicfunction, proto-from-ctor-realm-prototype.js) fails with a runtime Test262Error in both profiles and remains open; successful binding admission is not a whole dynamic-function/Realm conformance claim.

The native Realm initializer and compiler Reference admission share runtime/tsc_global_bindings.def. All available bindings retain actual owners, callees, arguments and results; a source spelling no longer captures an intrinsic. Function applies source construction only after actual callee selection. Its finite-source callback still rejects unknown intrinsic bodies with the runtime EvalError diagnostic when the external bridge is disabled.

Source Array call/new/static/prototype reads obtain the actual Realm binding and retain ordinary callees and results. The runtime links its immutable constructor prototype once through the shared callable metadata owner; sparse numeric lengths and element Lists use the same constructor kernel.

Source Symbol uses ordinary Realm bindings and descriptors, including mutable well-known-property reads and actual typed results. Object.prototype.toString boxes primitives, computes its builtin brand before ordinary @@toStringTag Get, and uses Object fallback for untagged BigInt/Symbol wrappers. The shared in operator validates its RHS before key conversion; computed class method keys and their names retain the evaluated String/Symbol identity.

Source Number/String/Boolean construction obtains the actual Realm binding and retains its callee and argument List. The shared primitive descriptor defers receiver allocation: conversion completes before newTarget.prototype lookup. One wrapper initializer is shared with Object boxing; String's raw Symbol exception applies only to calls, and its constructed exotic indices/length come from the canonical UTF-16 code-unit collection.

# Runtime reference

The `tsc_*` C runtime — everything in `runtime/tsc_runtime.h` and `runtime/tsc_runtime.c` — linked into every produced binary.

Conventions:

- All allocations go through `TSC_GC_MALLOC` (Boehm GC) or `TSC_GC_MALLOC_ATOMIC` (raw bytes, no pointer scan). Under `-DTSC_NO_GC` these expand to `calloc` and the binary leaks.
- Strings are immutable **WTF-8** with an explicit storage-byte length and a lazy UTF-16 code-unit-length cache. Every `tsc_str_*` mutation returns a fresh `tsc_str_t*`.
- `double` is the numeric type for all JS numbers (IEEE 754).
- `bool` comes from `<stdbool.h>`.

## Runtime source context

`tsc_parse_unit_t` is an opaque identity for one runtime parse. Finite AOT source evaluators reuse compiled code while each Function construction or native-host eval allocates a fresh token. A statically parsed source uses the default null token. Callable registry keys retain parse ownership separately from code, environment and Realm; built-ins and bound forwarding enter source callbacks through their own owners.

Physical source closures call `tsc_callable_owner_capture` at creation, before any deferred boxing. Owners retain their creation Realm and parse unit; boxing publishes metadata in that context. Calls and construction enter it, resumable environments retain it across callbacks, and exception frames restore it before `longjmp`. Fresh parse tokens remain decoded roots during source evaluation. Script function declarations use fresh closure owners at each evaluation.

| Symbol | Signature | Purpose |
|--------|-----------|---------|
| `tsc_parse_unit_new` | `tsc_parse_unit_t*(void)` | Allocate a distinct runtime parse identity. |
| `tsc_parse_unit_current` | `tsc_parse_unit_t*(void)` | Read the current source context. |
| `tsc_parse_unit_swap` | `tsc_parse_unit_t*(tsc_parse_unit_t*)` | Enter a source context and return the previous token, including null. |
| `tsc_callable_owner_capture` | `void(tsc_callable_owner_t*)` | Capture physical callable creation context once. |

Tagged-template descriptors and Realm TemplateMap construction remain separate work; parse ownership alone does not implement GetTemplateObject.

## Bootstrap

| Symbol | Signature | Purpose |
|--------|-----------|---------|
| `tsc_bootstrap` | `void(int argc, char** argv)` | Called once from `main`. Initializes GC, stores argv for `process.argv` / `process.exit`, seeds `rand()`. |
| `tsc_panic` | `void(const char* msg)` | Fatal error. Prints `"tsc: panic: <msg>"` to stderr and `abort()`s. |
| `tsc_argc` / `tsc_argv` | globals | Populated by `tsc_bootstrap`. |

## Strings (`tsc_str_t`)

```c
typedef struct tsc_str {
    size_t len;                  // immutable WTF-8 storage bytes
    const char* data;            // NUL-terminated for C interop; len is authoritative
    uint64_t hash;               // lazy content hash
    struct tsc_symbol* symbol_key;
    size_t utf16_len_plus_one;   // 0 until derived; otherwise ECMAScript length + 1
} tsc_str_t;
```

### Construction

| Symbol | Signature | Notes |
|--------|-----------|-------|
| `tsc_str_from_lit` | `(const char*, size_t) -> tsc_str_t*` | Wraps a string literal with no copy. |
| `tsc_str_from_cstr` | `(const char*) -> tsc_str_t*` | Copies a null-terminated C string. |
| `tsc_str_from_num` | `(double) -> tsc_str_t*` | JS-compatible shortest round-trip number formatting. |
| `tsc_str_from_num_radix` | `(double, double) -> tsc_str_t*` | `Number.prototype.toString(radix)` formatting with 2..36 radix validation. |
| `tsc_str_from_num_fixed` | `(double, double) -> tsc_str_t*` | `Number.prototype.toFixed(fractionDigits)` fixed-point formatting with 0..100 digit validation. |
| `tsc_str_from_num_exponential` | `(double, double, bool) -> tsc_str_t*` | `Number.prototype.toExponential(fractionDigits?)` scientific formatting with JS-style exponent normalization. |
| `tsc_str_from_num_precision` | `(double, double, bool) -> tsc_str_t*` | `Number.prototype.toPrecision(precision?)` significant-digit formatting with fixed/exponential selection. |
| `tsc_str_from_bool` | `(bool) -> tsc_str_t*` | `"true"` / `"false"`. |
| `tsc_str_from_char_code_values` | `(const tsc_array_t*) -> tsc_str_t*` | `String.fromCharCode(...)`, applying ordered `ToNumber`/modulo-2^16 conversion to one arbitrary value collection and encoding UTF-16 code units as WTF-8. |
| `tsc_str_from_code_point_values` | `(const tsc_array_t*) -> tsc_str_t*` | `String.fromCodePoint(...)`, applying ordered `ToNumber`, validating integer code points with native `RangeError`, and encoding WTF-8. |

### Equality and comparison

| Symbol | Signature |
|--------|-----------|
| `tsc_str_eq` | `(const tsc_str_t*, const tsc_str_t*) -> bool` |
| `tsc_str_cmp` | `(const tsc_str_t*, const tsc_str_t*) -> int` (strcmp-style) |
| `tsc_str_locale_compare` | `(const tsc_str_t*, const tsc_str_t*) -> double` (`localeCompare`-style -1/0/1) |
| `tsc_str_utf16_length` | `(const tsc_str_t*) -> size_t` (cached ECMAScript code-unit length) |

### Methods (match JS `String.prototype`)

| Symbol | Returns | JS equivalent |
|--------|---------|---------------|
| `tsc_str_length` | `double` | `.length` |
| `tsc_str_char_at(s, i)` | `tsc_str_t*` | `.charAt(i)` |
| `tsc_str_at(s, i)` | nullable `tsc_str_t*` | `.at(i)`, negative indices OK and `NULL` for the ECMAScript `undefined` range result |
| `tsc_str_char_code_at(s, i)` | `double` | `.charCodeAt(i)`, using JS UTF-16 indices |
| `tsc_str_code_point_at(s, i)` | `double` | `.codePointAt(i)`, using JS UTF-16 indices |
| `tsc_str_index_of(h, n, position)` | `double` | `.indexOf(n, position?)` (-1 if missing) |
| `tsc_str_last_index_of(h, n, position)` | `double` | `.lastIndexOf(n, position?)` |
| `tsc_str_includes(h, n, position)` | `bool` | `.includes(n, position?)` |
| `tsc_str_starts_with(s, p, position)` | `bool` | `.startsWith(p, position?)` |
| `tsc_str_ends_with(s, p, end_position)` | `bool` | `.endsWith(p, endPosition?)` |
| `tsc_str_slice(s, start, end)` | `tsc_str_t*` | `.slice(start, end)`, negative indices OK |
| `tsc_str_substring(s, start, end)` | `tsc_str_t*` | `.substring(start, end)`, clamp/swap semantics |
| `tsc_str_substr(s, start, length)` | `tsc_str_t*` | `.substr(start, length)`, negative-start and length clamping semantics |
| `tsc_str_to_upper` | `tsc_str_t*` | `.toUpperCase()` (ASCII only) |
| `tsc_str_to_lower` | `tsc_str_t*` | `.toLowerCase()` (ASCII only) |
| `tsc_str_normalize(s, form)` | `tsc_str_t*` | `.normalize(form)`, ICU-backed NFC/NFD/NFKC/NFKD |
| `tsc_str_trim` | `tsc_str_t*` | `.trim()` |
| `tsc_str_trim_start` | `tsc_str_t*` | `.trimStart()` |
| `tsc_str_trim_end` | `tsc_str_t*` | `.trimEnd()` |
| `tsc_str_repeat(s, n)` | `tsc_str_t*` | `.repeat(n)` |
| `tsc_str_is_well_formed(s)` | `bool` | Tests the canonical UTF-8/WTF-8 representation for isolated UTF-16 surrogates. |
| `tsc_str_to_well_formed(s)` | `tsc_str_t*` | Replaces every isolated surrogate with U+FFFD while preserving scalar sequences. |
| `tsc_str_encode_uri(s)` / `tsc_str_encode_uri_component(s)` | `tsc_str_t*` | URI Encode over the shared strict scalar codec, with the URI/component unescaped-set partition. |
| `tsc_str_decode_uri(s)` / `tsc_str_decode_uri_component(s)` | `tsc_str_t*` | URI Decode with canonical UTF-8 validation and URI reserved-escape preservation. |
| `tsc_str_pad_start(s, len, pad)` | `tsc_str_t*` | `.padStart(len, pad)` |
| `tsc_str_pad_end(s, len, pad)` | `tsc_str_t*` | `.padEnd(len, pad)` |
| `tsc_str_replace(s, needle, repl)` | `tsc_str_t*` | `.replace("a", "b")` (first match), with JS replacement-string tokens |
| `tsc_str_replace_all(s, needle, repl)` | `tsc_str_t*` | `.replaceAll("a", "b")` (all matches), with JS replacement-string tokens |
| `tsc_str_concat(a, b)` | `tsc_str_t*` | Pairwise internal/string-addition concatenation |
| `tsc_str_concat_parts(parts)` | `tsc_str_t*` | Single-allocation join of the canonical `tsc_str_t*` argument collection used by generic `String.prototype.concat` |
| `tsc_str_split(s, sep)` | `tsc_array_t*` | `.split("a")` → array of strings |
| `tsc_str_split_limit(s, sep, limit)` | `tsc_array_t*` | Bounded split helper using an already-normalized uint32 limit |
| `tsc_str_split_limit_num(s, sep, limit)` | `tsc_array_t*` | `.split("a", limit)` with JS-style `ToUint32` limit coercion |
| `tsc_str_chars(s)` | `tsc_array_t*` | string `for...of` values, one code-point String per element |
| `tsc_str_code_units(s)` | `tsc_array_t*` | one canonical collection of one-unit Strings for indexed exotic properties and reflective projections |

## Numbers

| Symbol | Signature | Purpose |
|--------|-----------|---------|
| `tsc_num_mod` | `(double, double) -> double` | `fmod` — JS-style modulo for the `%` operator. |
| `tsc_parse_float` | `(const tsc_str_t*) -> double` | Length-driven `parseFloat` decimal/Infinity-prefix scan with ECMAScript leading whitespace, partial parsing, signed zero, and `NaN` on failure. |
| `tsc_parse_int` | `(const tsc_str_t*, double radix) -> double` | Length-driven `parseInt` digit scan with ECMAScript leading whitespace, ToInt32 radix inference/validation, exact GMP accumulation, and binary64 rounding. |
| `tsc_string_to_number` | `(const tsc_str_t*) -> double` | Complete-input StringNumericLiteral conversion after ECMAScript trimming, with locale-stable decimal parsing and exact arbitrary-length binary/octal/hex rounding. |
| `tsc_math_random` | `() -> double` | `Math.random()`, exact nonnegative 53-bit samples in [0, 1) from the creation Realm's retained Weyl/SplitMix64 progression; other Realms cannot advance it. |
| `tsc_math_sum_precise` | `(tsc_value_t items) -> double` | One rooted synchronous IteratorRecord, exact finite GMP accumulation in 2^-1074 units, Number-only validation and prescribed IteratorClose error precedence. |
| `tsc_bigint_to_number_scaled` | `(const tsc_bigint_t*, int binary_scale) -> double` | The binary64 format descriptor selects one ties-to-even rounding of an exact integer times 2^binary_scale, including subnormal, carry and overflow boundaries. Existing BigInt conversion delegates with scale zero. |
| `tsc_math_round` | `(double) -> double` | Preserves integral inputs and signed zero; rounds from the lower integer with ties toward positive infinity, avoiding x + 0.5 rounding. |
| `tsc_number_exponentiate` | `(double base, double exponent) -> double` | Shared Number::exponentiate for Math.pow and numeric operators; prescribed exceptional values and integral parity precede the approximated finite pow result. |
| `tsc_math_sign` | `(double) -> double` | `Math.sign()`, preserving signed zero and `NaN`. |
| `tsc_math_imul` | `(double, double) -> double` | `Math.imul`, using JS ToInt32 coercion and signed 32-bit result wrapping. |
| `tsc_math_clz32` | `(double) -> double` | `Math.clz32`, using JS ToUint32 coercion. |
| `tsc_math_fround` | `(double) -> double` | `Math.fround`, direct roundTiesToEven to the binary32 descriptor in the shared exact integer/significand kernel; represented exactly as binary64 afterward. |
| `tsc_math_f16round` | `(double) -> double` | Direct roundTiesToEven to the binary16 descriptor, including subnormal, signed zero and finite/overflow boundaries, without a binary32 intermediate. |

Math creation installs the actual Symbol.toStringTag descriptor and initializes its retained pseudorandom state before publishing the namespace. Borrowed built-in functions enter their creation Realm through the shared activation.

Source Math calls obtain the actual Realm global and descriptor-backed callee, evaluate one rooted actual argument List, and enter the existing intrinsic descriptor dispatcher. ToNumber occurs inside the operation; binary arguments convert in order and min/max complete all conversions before NaN disposition. Native class boxing retains the class prototype and defines native field data handles; source instance methods and accessors live as ordinary closures on the prototype and use actual receivers and formals.

## Arrays (`tsc_array_t`)

One Array owner retains logical length independently of an initialized native-cell prefix and ordinary indexed descriptors. The canonical own-index collection merges those representations in numeric order; holes do not allocate cells. Ordinary Get/Set/Define/Delete operations use that owner, while `TSC_ARR(T, arr, i)` accesses verified native storage.

The canonical C/C++ layout is declared once in `runtime/tsc_array_abi.h`. It retains logical length/native prefix/capacity/element width, extensibility and length-writability flags, prototype/property/hole owners, element codecs, data and decoded value roots. Generator lifecycle and protocol state belong to ordinary generator owners, outside this Array ABI.


| Symbol | Signature | Notes |
|--------|-----------|-------|
| `tsc_array_new(es, cap)` | `tsc_array_t*` | Empty array with capacity. |
| `tsc_array_from_buf(es, src, n)` | `tsc_array_t*` | Copy `n` elements from `src`. |
| `tsc_array_reserve(arr, cap)` | `void` | Grow capacity to at least `cap`. |
| `tsc_array_push_raw(arr, &elem)` | `void` | Append; grows if needed. |
| `tsc_array_unshift_raw(arr, &elem)` | `void` | Prepend. |
| `tsc_array_slice(arr, start, end)` | `tsc_array_t*` | New array with copied range. |
| `tsc_array_append(dst, src)` | `tsc_array_t*` | Append `src`'s elements to `dst`. |
| `tsc_array_length(arr)` | `double` | For `.length` property. |
| `tsc_array_own_indices(arr)` | `tsc_array_t*` | Sorted List of actual own array indices; independent of virtual holes. |
| `tsc_array_has_own_key(arr, key)` | `bool` | Own-property test for typed array indexes and `length`. |
| `tsc_array_property_is_enumerable_key(arr, key)` | `bool` | Enumerable own-property test for typed array indexes. `length` is non-enumerable. |
| `TSC_ARR(T, arr, i)` | lvalue | Macro for typed element access — `((T*)arr->data)[(size_t)i]`. |
| `tsc_array_oob(arr, i)` | `void` | Placeholder bounds-check hook (silent today, planned to throw `RangeError`). |

Array members use ordinary mutable property lookup and actual argument Lists. Realm prototype callables implement callback algorithms in the runtime; result-producing methods share the rooted Array species output record. ArraySetLength applies ordered ToUint32/ToNumber conversions and descending deletion over actual own indices, restoring the blocked index and requested writability on failure.

`Object.entries` uses `tsc_object_entry_t` elements inside a normal `tsc_array_t`. The struct stores the string key plus one typed value slot (`num`, `boolean`, or `ptr`) chosen by the emitter for the homogeneous object field type.

## Dynamic Values (`tsc_value_t`)

NaN-boxed `uint64_t` used for `any`, `unknown`, heterogeneous unions, dynamic JSON results, heterogeneous dynamic arrays/objects, and boxed accessor function identities returned from descriptor reads.

| Symbol | Signature | Purpose |
|--------|-----------|---------|
| `tsc_value_num/bool/string/array/object(...)` | `tsc_value_t` | Box specialized values into the dynamic representation |
| `tsc_value_null()` / `tsc_value_undefined()` | `tsc_value_t` | Dynamic nullish sentinels |
| `tsc_value_as_num/bool/string/array(v)` | varies | Unbox dynamic values after TypeScript narrowing, typed assignment/call coercion, or runtime coercion |
| `tsc_value_to_string(v)` | `tsc_str_t*` | JS-like string conversion for console/template coercion; dynamic arrays use comma-join conversion |
| `tsc_value_method_to_string(v, radix)` | `tsc_str_t*` | Dynamic `.toString(...)`; number receivers honor `radix`, while other values use ordinary dynamic string conversion |
| `tsc_value_method_to_fixed(v, digits)` | `tsc_str_t*` | Dynamic number `.toFixed(...)` formatting |
| `tsc_value_method_to_exponential(v, digits)` | `tsc_str_t*` | Dynamic number `.toExponential(...)` formatting |
| `tsc_value_method_to_precision(v, precision)` | `tsc_str_t*` | Dynamic number `.toPrecision(...)` formatting |
| `tsc_value_typeof(v)` | `tsc_str_t*` | Runtime `typeof` result for dynamic values |
| `tsc_value_is_truthy(v)` | `bool` | JS truthiness for dynamic values |
| `tsc_value_is_nullish(v)` | `bool` | Dynamic `??` null/undefined test |
| `tsc_value_is_array(v)` | `bool` | Runtime check used by dynamic `Array.isArray` |
| `tsc_value_add/sub/mul/div/mod/pow(a, b)` | `tsc_value_t` | Dynamic arithmetic and `+` string concatenation |
| `tsc_value_to_number(v)` | `double` | Object-aware `ToNumber`, including ordinary/exotic primitive conversion and StringNumericLiteral parsing |
| `tsc_value_neg/bit_not(v)` | `tsc_value_t` | Dynamic unary `-` and `~` using JS-style numeric coercion |
| `tsc_value_bit_and/bit_or/bit_xor/shl/shr/ushr(a, b)` | `tsc_value_t` | Dynamic bitwise operators with JS-style numeric coercion, int32/uint32 conversion, and masked shift counts |
| `tsc_value_eq(a, b)` | `bool` | Strict dynamic equality for numbers, booleans, strings, nullish sentinels, object identity, and boxed function identity |
| `tsc_value_abstract_eq(a, b)` | `bool` | Abstract dynamic equality over the runtime value representation, including primitive coercion and the Test262 HTMLDDA host object's nullish-equality exception |
| `tsc_value_object_is(a, b)` | `bool` | SameValue comparison used by `Object.is`, including `NaN` and signed-zero handling |
| `tsc_value_cmp(a, b)` | `int` | Dynamic relational comparison; returns `2` for unordered/NaN comparisons |
| `tsc_value_method_*(recv, ...)` | `tsc_value_t` | Runtime dispatch for common dynamic string/array methods such as `includes`, `indexOf`, `lastIndexOf`, `localeCompare`, `match`, `matchAll`, `normalize`, `padStart`, `padEnd`, `repeat`, `replace`, `replaceAll`, `slice`, `split`, `split(RegExp)`, `substr`, `substring`, `trimStart`, `trimEnd`, `join`, `push`, `pop`, `shift`, `unshift`, Array `concat`, `copyWithin`, `fill`, `flat`, `keys`, `values`, `sort`, `splice`, `toReversed`, `toSorted`, `toSpliced`, `with`, and casing/trim helpers. Realm-owned ordinary String methods, including String `concat`, enter through `tsc_value_apply_function`. |
| `tsc_value_json_stringify(v)` | `tsc_str_t*` | Recursive dynamic JSON stringify; object properties whose values are `undefined` or boxed function identities are omitted, while array slots stringify as `null` |
| `tsc_value_apply_function(fn, this_arg, args)` | `tsc_value_t` | Dynamic `Reflect.apply` dispatch for boxed accessor function identities returned from descriptor `get`/`set` fields |
| `tsc_value_dispose_sync(value)` | `void` | Calls a dynamic value's `[Symbol.dispose]()` method, skipping nullish values and throwing when the value is not synchronously disposable |
| `tsc_value_dispose_async(value)` | `tsc_promise_t*` | Calls a dynamic value's `[Symbol.asyncDispose]()` method with the value as receiver and assimilates its result into a Promise |
| `tsc_promise_resolve/reject(result)` | `tsc_promise_t*` | Allocates an immediately fulfilled/rejected Promise record used by the settled Promise subset |
| `tsc_promise_after_async_dispose_many(resources, count, result)` | `tsc_promise_t*` | Disposes dynamic resources sequentially in reverse order, continues after cleanup rejection, and settles with the first cleanup rejection or the body result |
| `tsc_promise_resolve_fs_stats(result)` | `tsc_promise_t*` | Allocates an immediately fulfilled typed `Promise<FSStats>` side-channel record |
| `tsc_promise_resolve_buffer(result)` | `tsc_promise_t*` | Allocates an immediately fulfilled typed `Promise<Buffer>` side-channel record |
| `tsc_async_iterator_open(value)` | `tsc_iterator_record_t` | GetIterator with async lookup or a receiver-owned async-from-sync fallback; captures next and decoded roots |
| `tsc_async_iterator_next(record)` | `tsc_value_t` | Calls the captured next with an empty actual List before the consumer performs Await |
| `tsc_async_iterator_close(record, preserve_throw)` | `tsc_promise_t*` | Conditional return invocation/Await; NULL skips suspension when absent, with incoming-throw precedence |
| `tsc_sync_iterator_open/step/close(...)` | `tsc_sync_iterator_t` / `bool` / `void` | Owns one rooted synchronous iterator record for array, string, and dynamic `@@iterator` binding initialization; validates iterator results and invokes `return` on early normal or abrupt completion |
| `tsc_promise_is_fulfilled/is_rejected(p)` | `bool` | State checks used by synchronous `then`/`catch`/`finally` lowering |
| `tsc_promise_value/reason(p)` | `tsc_value_t` | Reads the stored fulfilled value or rejection reason |
| `tsc_promise_fs_stats_value(p)` | `tsc_fs_stats_t*` | Reads the typed `FSStats` fulfilled value side-channel |
| `tsc_promise_buffer_value(p)` | `tsc_buffer_t*` | Reads the typed `Buffer` fulfilled value side-channel |
| `tsc_value_get_prop(v, key)` | `tsc_value_t` | Dynamic object property read through the prototype chain plus array/string own-property reads, returning `undefined` when absent |
| `tsc_value_get_prop_cached(v, key, cache)` | `tsc_value_t` | Shape-validated dynamic own-property read cache helper used by generated literal property and string-key element read sites; falls back to `tsc_value_get_prop` semantics for proxies, arrays, strings, functions, prototype lookups, and absent keys |
| `tsc_value_get_prop_receiver(v, key, receiver)` | `tsc_value_t` | Dynamic `Reflect.get` read with an explicit receiver argument for accessor dispatch |
| `tsc_value_get_prop_receiver_cached(v, key, receiver, cache)` | `tsc_value_t` | Shape-validated dynamic own-property read cache helper for generated receiver-aware `Reflect.get(...)` sites; falls back to receiver-aware lookup for proxies, prototypes, arrays, strings, functions, and absent keys |
| `tsc_value_get_index(v, index)` | `tsc_value_t` | Dynamic array or string index read, returning `undefined` when absent |
| `tsc_value_copy_data_properties(source, excluded_keys)` | `tsc_value_t` | Implements object-rest CopyDataProperties over the canonical own-key collection, retaining String/Symbol keys, enumerability, accessors, and Proxy observations while excluding an evaluated PropertyKey collection |
| `tsc_value_set_index(v, index, value)` | `bool` | Dynamic array index write, extending with `undefined` for skipped slots |
| `tsc_value_set_prop(v, key, value)` | `bool` | Dynamic object data/accessor-property write used by direct dynamic property assignment and three-argument `Reflect.set(...)` |
| `tsc_value_set_prop_cached(v, key, value, cache)` | `bool` | Shape-validated dynamic own-property write cache helper used by generated direct dynamic property/string-key assignments; falls back to descriptor-aware `tsc_value_set_prop` semantics for proxies, arrays, inherited writes, and absent keys |
| `tsc_value_set_prop_receiver(v, key, value, receiver)` | `bool` | Dynamic `Reflect.set` write with an explicit receiver; inherited or missing writable data properties are written to the receiver |
| `tsc_value_set_prop_receiver_cached(v, key, value, receiver, cache)` | `bool` | Shape-validated dynamic own-property write cache helper for receiver-aware `Reflect.set`; cached writable data properties still write through the explicit receiver |
| `tsc_reflect_set_prop_cached(v, key, value, cache)` | `bool` | `Reflect.set` target-validated wrapper around `tsc_value_set_prop_cached` for generated three-argument dynamic `Reflect.set(...)` sites |
| `tsc_reflect_set_prop_receiver_cached(v, key, value, receiver, cache)` | `bool` | `Reflect.set` target-validated wrapper around `tsc_value_set_prop_receiver_cached` for generated four-argument dynamic `Reflect.set(...)` sites |
| `tsc_value_define_property_desc(v, key, value, has_value, writable, has_writable, enumerable, has_enumerable, configurable, has_configurable)` | `bool` | Dynamic data descriptor definition used by `Object.defineProperty`, `Object.defineProperties`, and `Reflect.defineProperty`; presence bits preserve omitted fields on existing descriptors, omitted new-property values are lowered as `undefined`, compatible non-configurable writable data redefinitions are allowed, and Arrays share ordinary indexed descriptor owners and ordered ArraySetLength with extensibility/writability checks |
| `tsc_value_define_accessor_desc(v, key, getter, getter_env, has_getter, setter, setter_env, has_setter, enumerable, has_enumerable, configurable, has_configurable)` | `bool` | Dynamic accessor descriptor definition used by `Object.defineProperty`, `Object.defineProperties`, and `Reflect.defineProperty`; presence bits preserve omitted hooks/flags on configurable redefinition, explicit undefined hooks become null callbacks, compatible non-configurable accessor redefinitions are allowed, and descriptor reads expose stable boxed `get`/`set` identities or own `undefined` fields for absent hooks |
| `tsc_value_object_create(proto)` | `tsc_value_t` | Dynamic object allocation with an object/null prototype |
| `tsc_value_is_prototype_of(proto, object)` | `bool` | Dynamic `Object.prototype.isPrototypeOf` prototype-chain query |
| `tsc_value_get/set_prototype_of(v, proto)` | `tsc_value_t` / `bool` | Dynamic `Object`/`Reflect` prototype access and mutation |
| `tsc_value_has_prop(v, key)` | `bool` | Dynamic property existence through the prototype chain, plus array/string own properties |
| `tsc_value_has_own_prop(v, key)` | `bool` | Own-property existence used by `Object.hasOwn` and `Object.prototype.hasOwnProperty`, including dynamic array/string indexes and `length` |
| `tsc_value_property_is_enumerable(v, key)` | `bool` | Own enumerable-property check used by `Object.prototype.propertyIsEnumerable`; dynamic string/array indexes are enumerable and `length` is not |
| `tsc_value_delete_prop(v, key)` | `bool` | Own-property descriptor-aware deletion; dynamic array/string `length` and string indexes return false |
| `tsc_value_is_extensible/prevent_extensions(v)` | `bool` | Dynamic object/array extensibility state used by `Object` / `Reflect` APIs |
| `tsc_value_seal/freeze/is_sealed/is_frozen(v)` | `bool` | Shared rooted SetIntegrityLevel/TestIntegrityLevel over actual own keys and live descriptors; ordinary descriptor attributes enforce writes/deletes, including manually locked Arrays/callables and ordered Proxy traps |
| `tsc_value_own_keys(v)` | `tsc_array_t*` | Reflect-style own string keys including non-enumerable properties; dynamic arrays/strings include numeric indexes plus `length` |
| `tsc_value_get_own_property_descriptor(v, key)` | `tsc_value_t` | Dynamic data/accessor descriptor object or `undefined`; accessor descriptors expose stable boxed `get`/`set` identities or own `undefined` fields for absent hooks, Arrays expose actual indexed descriptor attributes and the current `length` descriptor, and dynamic strings expose read-only index/length descriptors |
| `tsc_value_get_own_property_descriptors(v)` | `tsc_value_t` | Dynamic object containing descriptor objects for all own dynamic object/array/string properties, including accessor `get`/`set` identities or own `undefined` absent-hook fields and array seal/freeze-aware flags |
| `tsc_value_object_assign(target, source)` | `tsc_value_t` | Shared rooted ToObject/own-key/live-descriptor/Get/Set projection used by Object.assign; retains actual target/source/value owners, String/Symbol properties and abrupt partial writes with actual TypeError |
| `tsc_value_length(v)` | `double` | `.length` for dynamic arrays/strings |
| `tsc_value_iter_values(v)` | `tsc_array_t*` | Dynamic `for...of` value list for boxed arrays and strings; non-iterable values throw catchable runtime exceptions |
| `tsc_value_method_entries(v)` | `tsc_value_t` | Dynamic `Array.prototype.entries()`, returning dynamic `[key, value]` arrays with string index keys |
| `tsc_object_new/set/define/define_accessor/get(...)` | varies | Runtime backing store for dynamic objects, data descriptors, and accessor descriptors with optional callback environments |
| `tsc_value_object_keys/values(v)` | `tsc_array_t*` | Enumerable `Object.keys` / `Object.values` for dynamic objects, arrays, and strings |
| `tsc_value_object_entries(v)` | `tsc_array_t*` | Enumerable `Object.entries` for dynamic objects/arrays/strings, returning dynamic `[key, value]` arrays |
| `tsc_dynamic_import_collect_attributes(options)` | `tsc_dynamic_import_attribute_type_t` | Performs runtime ImportCall `options.with` access plus enumerable-own string entry collection; preserves Proxy/accessor abrupt completions and throws `TypeError` for invalid host attributes |
| `tsc_dynamic_import_validate_resource(attributes, json_resource)` | `void` | Enforces the finite-AOT host's JavaScript/JSON resource-type policy after runtime attribute collection |
| `tsc_value_object_from_entries(entries)` | `tsc_value_t` | Dynamic `Object.fromEntries`, accepting dynamic arrays of dynamic `[key, value]` pairs |
| `tsc_json_parse(text)` | `tsc_value_t` | Recursive JSON parser for objects, arrays, strings, numbers, booleans, and null |

## Errors (`tsc_error_t`)

| Symbol | Signature | Purpose |
|--------|-----------|---------|
| `tsc_suppressed_error_new(error, suppressed, message)` | `tsc_error_t*` | Creates a `SuppressedError`-named Error value with dynamic `error` and `suppressed` fields |
| `tsc_error_to_string(error)` | `tsc_str_t*` | Formats the Error name and message for `.toString()` and exception stringification |

## BigInt (`tsc_bigint_t`)

GMP-backed arbitrary-precision integers. `bigint` values are heap-allocated wrappers around `mpz_t`. Source constructor and prototype/static calls use actual Realm and descriptor owners. One rooted ToPrimitive conversion plan distinguishes constructor Number admission from ToBigInt; one complete-input StringIntegerLiteral parser serves conversion and non-throwing comparisons. Numeric failure objects preserve their standard classes.

| Symbol | Signature | Purpose |
|--------|-----------|---------|
| `tsc_bigint_from_lit(lit)` | `tsc_bigint_t*` | BigInt literal construction, including `0x`, `0o`, and `0b` prefixes |
| `tsc_bigint_from_str(s)` | `tsc_bigint_t*` | `BigInt(string)` |
| `tsc_bigint_from_num(n)` | `tsc_bigint_t*` | `BigInt(number)`, finite integers only |
| `tsc_bigint_from_bool(b)` | `tsc_bigint_t*` | `BigInt(boolean)` |
| `tsc_value_to_bigint(value)` | `tsc_value_t` | Rooted ToPrimitive with Number hint, followed by ToBigInt; rejects Number input and preserves abrupt identity. |
| `tsc_value_to_index(value)` | `double` | Ordered ToIntegerOrInfinity with the prescribed non-negative safe-integer range check. |
| `tsc_bigint_as_n(value, bits, is_signed)` | `tsc_bigint_t*` | Shared GMP modular reduction for asIntN/asUintN; bits must be validated by ToIndex. Already fitting inputs avoid unnecessary allocation. |
| `tsc_bigint_add/sub/mul/div/mod/pow(a, b)` | `tsc_bigint_t*` | BigInt arithmetic |
| `tsc_bigint_cmp(a, b)` | `int` | Relational comparison |
| `tsc_bigint_eq(a, b)` | `bool` | Equality comparison |
| `tsc_bigint_to_string(a, radix)` | `tsc_str_t*` | `.toString(radix?)` |

## Symbols (`tsc_symbol_t`)

Heap-allocated unique symbol identities with an optional description, a small global registry for `Symbol.for`, and one opaque identity-bearing `tsc_str_t` PropertyKey carrier per identity. Ordinary strings always have a null carrier marker, so a Symbol cannot collide with its description, an empty string, or a runtime-looking string. Ordinary objects, arrays, functions, Reflect, Proxy traps, descriptor maps, and copy operations consume the same canonical internal PropertyKey worklist; public key APIs project carriers back to the original Symbol identity.

| Symbol | Signature | Purpose |
|--------|-----------|---------|
| `tsc_symbol_new(description)` | `tsc_symbol_t*` | `Symbol(description?)`, always creates a new identity |
| `tsc_symbol_for(key)` | `tsc_symbol_t*` | `Symbol.for(key)` global registry lookup/create |
| `tsc_symbol_key_for(sym)` | `tsc_str_t*` | `Symbol.keyFor(sym)`, `NULL` for non-global symbols |
| `tsc_symbol_property_key(sym)` | `tsc_str_t*` | Returns the Symbol identity's opaque internal PropertyKey carrier |
| `tsc_property_key_symbol(key)` | `tsc_symbol_t*` | Projects a carrier back to its public Symbol identity, or `NULL` for a String key |
| `tsc_symbol_iterator()` | `tsc_symbol_t*` | Singleton `Symbol.iterator` |
| `tsc_symbol_async_iterator()` | `tsc_symbol_t*` | Singleton `Symbol.asyncIterator` |
| `tsc_symbol_dispose()` | `tsc_symbol_t*` | Singleton `Symbol.dispose` |
| `tsc_symbol_async_dispose()` | `tsc_symbol_t*` | Singleton `Symbol.asyncDispose` |
| `tsc_symbol_description(sym)` | `tsc_str_t*` | `.description`, `NULL` when absent |
| `tsc_symbol_to_string(sym)` | `tsc_str_t*` | `.toString()` / console stringification |

## WeakRef (`tsc_weakref_t`)

Typed weak-reference wrappers store a target pointer and return it from `.deref()`.

| Symbol | Signature | Purpose |
|--------|-----------|---------|
| `tsc_weakref_new(target)` | `tsc_weakref_t*` | `new WeakRef(target)` |
| `tsc_weakref_deref(ref)` | `void*` | `.deref()`, cast back to the typed target by the emitter |

## FinalizationRegistry (`tsc_finregistry_t`)

A stub registry that tracks `unregister` tokens but never fires the cleanup callback (no GC-finalizer plumbing). The cleanup callback supplied to `new FinalizationRegistry<T>(cb)` is evaluated for side effects at construction time and discarded.

| Symbol | Signature | Purpose |
|--------|-----------|---------|
| `tsc_finregistry_new()` | `tsc_finregistry_t*` | `new FinalizationRegistry(cb)` (the callback is not stored). |
| `tsc_finregistry_register(r, token)` | `void` | Records a token (`NULL` when `register(target, heldValue)` is called without an explicit token). |
| `tsc_finregistry_unregister(r, token)` | `bool` | Removes every registration whose token matches and reports whether any were removed. |

## Maps and Sets (`tsc_map_t`, `tsc_set_t`)

Type-erased linear-scan collections. Key equality is chosen by a `tsc_key_kind_t` tag passed at construction:

| Tag | Value | Equality |
|-----|-------|----------|
| `TSC_KEY_NUM` | 0 | `double ==` |
| `TSC_KEY_STR` | 1 | `tsc_str_eq` |
| `TSC_KEY_PTR` | 2 | pointer `==` (for class instances) |
| `TSC_KEY_BOOL` | 3 | `bool ==` |

### Map

| Symbol | Signature |
|--------|-----------|
| `tsc_map_new(ks, vs, kk, cap)` | `tsc_map_t*` |
| `tsc_map_set_raw(m, &k, &v)` | `void` |
| `tsc_map_get_raw(m, &k, &out)` | `bool` (true if present) |
| `tsc_map_has_raw(m, &k)` | `bool` |
| `tsc_map_delete_raw(m, &k)` | `bool` |
| `tsc_map_clear(m)` | `void` |
| `tsc_map_size(m)` | `double` |
| `tsc_map_keys(m)` | `tsc_array_t*` — array of keys |
| `tsc_map_values(m)` | `tsc_array_t*` — array of values |

### Set

| Symbol | Signature |
|--------|-----------|
| `tsc_set_new(es, kk, cap)` | `tsc_set_t*` |
| `tsc_set_add_raw(s, &v)` | `void` |
| `tsc_set_has_raw(s, &v)` | `bool` |
| `tsc_set_delete_raw(s, &v)` | `bool` |
| `tsc_set_clear(s)` | `void` |
| `tsc_set_size(s)` | `double` |
| `tsc_set_values(s)` | `tsc_array_t*` |
| `tsc_set_union(a, b)` | `tsc_set_t*` — new Set with all elements from both inputs (insertion order preserved). |
| `tsc_set_intersection(a, b)` | `tsc_set_t*` — new Set with elements present in both inputs. |
| `tsc_set_difference(a, b)` | `tsc_set_t*` — new Set with elements of `a` not in `b`. |
| `tsc_set_symmetric_difference(a, b)` | `tsc_set_t*` — new Set with elements present in exactly one of `a` or `b`. |
| `tsc_set_is_subset_of(a, b)` | `bool` — every element of `a` is in `b`. |
| `tsc_set_is_superset_of(a, b)` | `bool` — every element of `b` is in `a`. |
| `tsc_set_is_disjoint_from(a, b)` | `bool` — `a` and `b` share no elements. |

Typed `WeakMap<K, V>` and `WeakSet<T>` reuse these map/set tables with pointer-key kinds and expose only the JavaScript weak-collection methods (`get`/`set`/`has`/`delete` or `add`/`has`/`delete`). There is no iteration API for weak collections.

## Regex (`tsc_regexp_t`)

`runtime/tsc_regexp.c` parses one UTF-16 pattern tree and compiles character-set expressions through an explicit worklist. Matching uses immutable continuation tasks, ordered alternatives, reversible capture writes, and backward traversal for lookbehind. `runtime/tsc_regexp_api.c` routes native consumers through that representation and the shared String code-unit projection. There is no PCRE2 dependency.

`tsc_regexp_t` owns its compiled representation, capture cardinality, normalized flags, source, creation-Realm prototype, and stable boxed object identity. Flags include `d`, `g`, `i`, `m`, `s`, `u`, `v`, and `y`; unknown, duplicate, and combined `u`/`v` flags throw `SyntaxError`. Native matches and captures use UTF-16 positions; Unicode matching and zero-width consumer advancement treat surrogate pairs as code points. RegExp callback replacement first collects matches, then supplies captures, code-unit positions, original input, and null-prototype named-capture objects in order. String replacement tokens and split captures use the same spans.

Ordinary creation-Realm `exec`/`test` descriptors and typed calls share mutable method lookup. Built-in execution reads `lastIndex` through `ToLength`, respects global/sticky state and strict writes, and returns ordinary `index`, `input`, `groups`, and optional `indices` metadata. Missing captures are `undefined`; named capture objects have null prototypes, and named indices reference the corresponding index pair. Scoped `i`/`m`/`s` modifiers use immutable lexical records on the pattern nodes.

Names are source-ordered records containing all disjoint capture indices. Persistent enclosing-disjunction paths reject definitions that might both participate; named references, result groups, index aliases, and replacement groups select from the same record. Raw and escaped group identifiers share one Unicode scalar decoder; the whole-pattern named-reference grammar parameter is selected through the same parser.

String `match`/`search` use ordinary mutable method lookup and symbol dispatch, including boxed RegExp arguments and generic custom methods. RegExp `[Symbol.match]`/`[Symbol.search]` share `RegExpExec`; global matching collects results and advances empty matches from `u`/`v` flags, while search restores the exact prior `lastIndex` identity before reading the returned index. The direct matcher/search paths are deleted.

The complete RegExp object-model and clause-level contract remains open: replace/split/matchAll symbol consumers, constructor/prototype access and cross-Realm semantics, and exhaustive syntax/legacy partitions still require implementation and exact pinned evidence. These native operations do not establish whole-RegExp conformance.

| Symbol | Signature |
|--------|-----------|
| `tsc_regexp_new(pattern, flags)` | `tsc_regexp_t*` |
| `tsc_regexp_exec(re, s)` | `tsc_array_t*` — full match plus capture groups, or `NULL` if none |
| `tsc_regexp_test(re, s)` | `bool` |
| `tsc_value_method_match(receiver, pattern)` | `tsc_value_t` — ordinary symbol dispatch, native result metadata, custom values, or `null` |
| `tsc_str_match_all_regex(s, re)` | `tsc_array_t*` — array of per-match capture arrays |
| `tsc_value_method_search(receiver, pattern)` | `tsc_value_t` — ordinary symbol dispatch with exact lastIndex restoration |
| `tsc_str_replace_regex(s, re, repl)` | `tsc_str_t*` — honors the `g` flag and expands JS replacement-string tokens |
| `tsc_str_split_regex(s, re)` | `tsc_array_t*` |
| `tsc_str_split_regex_limit(s, re, limit)` | `tsc_array_t*` |
| `tsc_str_split_regex_limit_num(s, re, limit)` | `tsc_array_t*` |

## Classes

| Symbol | Signature | Purpose |
|--------|-----------|---------|
| `tsc_instanceof(type_chain, class_name)` | `(const char*, const char*) -> bool` | Runtime ancestry check for emitted class instances. |

## Exceptions (`tsc_try_frame_t`)

Thin `setjmp`/`longjmp` wrapper with a current `tsc_value_t` plus a compatibility string view. No stack traces yet; canonical resumable completions retain raw values and decoded roots.

```c
typedef struct tsc_try_frame {
    jmp_buf jb;
    struct tsc_try_frame* prev;
} tsc_try_frame_t;
```

| Symbol | Signature | Notes |
|--------|-----------|-------|
| `tsc_try_push(&frame)` | `void` | Push frame onto the try-chain. |
| `tsc_try_pop()` | `void` | Pop after successful try body. |
| `tsc_throw_str(msg)` | `noreturn-ish` | Stores a string value plus its compatibility string view, then longjmps to the top frame. If none, prints `Uncaught:` and exits 1. |
| `tsc_throw_value(value)` | `noreturn-ish` | Stores the original dynamic value plus its string view, then longjmps to the top frame. Synchronous catch bindings use the original value. |
| `tsc_current_error()` | `tsc_str_t*` | Read inside `catch` to get the thrown value. |
| `tsc_current_error_value()` | `tsc_value_t` | Read the original thrown value inside a synchronous catch boundary. |
| `tsc_rethrow()` | `void` | Re-throw the current value (used for try without catch + finally). |

Generated `try { } catch (e) { }` expands to:

```c
tsc_try_frame_t _eh0;
tsc_try_push(&_eh0);
if (setjmp(_eh0.jb) == 0) {
    /* try body */
    tsc_try_pop();
} else {
    tsc_str_t* e = tsc_current_error();
    /* catch body */
}
```

## Console

| Symbol | Signature |
|--------|-----------|
| `tsc_console_log_n(n, ...)` | `void` — n stringified args, first-arg format substitutions, newline |
| `tsc_console_error_n(n, ...)` | `void` — same but to stderr |

The emitter stringifies each argument to `tsc_str_t*` at the call site, then invokes with the count plus the pointers.

## Test262 native host

Linked only for conformance observations. `tsc_test262_begin()` installs `$262`, `print`, and a Realm-bound native-host `%eval%` identity as writable, configurable, non-enumerable properties of the ordinary runtime global object. Binder-isolated Script records submit a `tsc_global_declaration_t` collection to `tsc_global_declaration_instantiation`, which preflights the complete collection before creating object-backed or declarative bindings in the shared Global Environment Record. Declarative values retain TDZ, mutability, and an explicit decoded GC root. Finite sloppy direct- and indirect-eval records reuse the same collection with deletable function/`var` declaration kinds; strict eval records remain evaluator-local. Indirect calls reach a distinct exact-source dispatcher through ordinary dynamic invocation, so comma/conditional expressions, aliases, `.call`, `.apply`, bound functions, and foreign-Realm global properties all retain the runtime `%eval%` identity decision and enter the callee Realm. Sloppy Annex B block-function candidates separately ask the same record to fix an activation decision during instantiation; a suppressed candidate never creates or later updates an outer binding. Global Script and direct CaseBlock binding patterns consume the same source-ordered `BoundNames` collection and recursive `BindingInitialization` tree for object/array reads, defaults, rest, iterator closing, and final writes; only the leaf sink differs between the Global Environment Record and preallocated CaseBlock TDZ/root cells. Direct ordinary, generator, and async CaseBlock functions enter that declaration collection as mutable pre-selector bindings: fresh named function objects, recursion, escape, reassignment, and Annex B updates all use the same value/root/initialization cells, including the outer async-CFG carrier, the generator's capture-induced lazy resume environment, and the async function's function-bounded continuation entry cells. The `print` built-in consumes the same `tsc_array_t` argument collection used by ordinary dynamic calls and stringifies only its first argument as required by Test262, so direct, aliased, `.call`, `.apply`, and `globalThis.print` invocation share one implementation.

The runtime current-Realm pointer is thread-local. Each opaque `tsc_realm_t` owns its global object, global lexical list, and a key-addressed subsystem-state collection; this avoids a fixed host-feature field list. `tsc_realm_swap` returns the prior context for normal restoration, while every `tsc_try_frame_t` records the active Realm so abrupt completion restores it before `longjmp`. `$262.createRealm()` uses this path and binds its `evalScript` method to the created context. Function identities retain their creation Realm, calls/constructs enter it, and bound/proxy target chains feed one iterative `GetFunctionRealm` path. The currently materialized Object, Function, Array, primitive-wrapper, Date, native-error, Math, JSON, and Reflect intrinsic state is Realm-owned. `Array.prototype` stores its well-known-symbol descriptors in its actual property collection: `@@iterator` points at that Realm's `values` identity and `@@unscopables` points at its Realm-owned null-prototype object. Raw own-key projection walks that one collection and partitions string and Symbol carriers for Object versus Reflect APIs; no current-Realm side table participates in foreign-object lookup or mutation. Each constructable identity also records its intrinsic default-prototype category, which the shared construction algorithm resolves in the `newTarget` Realm when `.prototype` is not an Object. Remaining intrinsic families and host-evaluation partitions still keep the claim-profile capability disabled.

| Symbol | Signature | Purpose |
|--------|-----------|---------|
| `tsc_test262_begin()` | `void` | Starts observation capture and installs the reviewed host-global binding collection |
| `tsc_test262_host_object()` | `tsc_value_t` | Returns the stable `$262` object for the current native process/Realm, including the hidden `%AbstractModuleSource%` intrinsic reference and implemented host hooks |
| `tsc_global_declaration_instantiation(declarations, length)` | `void` | Atomically preflights and creates one Script's lexical, function, and `var` binding collection in the shared Global Environment Record |
| `tsc_global_annex_b_function_instantiation(key)` | `bool` | Fixes whether a sloppy Annex B block function may create/update its outer global var binding, suppressing rather than throwing on an existing lexical binding or non-extensible absent property |
| `tsc_test262_set_eval_script_callback(callback)` | `void` | Installs the generated exact-source dispatcher for the finite AOT `$262.evalScript` source graph; each reusable Script evaluator returns its UpdateEmpty completion value and runtime sources outside that graph fail closed |
| `tsc_test262_set_direct_eval_callback(callback)` | `void` | Installs the generated source-and-caller-strictness dispatcher derived by the same transitive finite source-record worklist |
| `tsc_test262_set_indirect_eval_callback(callback)` | `void` | Installs the generated exact-source dispatcher for finite indirect PerformEval records; the Realm-bound `%eval%` returns non-Strings unchanged and invokes this only for String input |
| `tsc_test262_direct_eval(source, strictCaller)` | `tsc_value_t` | Returns non-String input unchanged or evaluates an exact finite direct-eval record; unrepresented String sources fail closed |
| `tsc_test262_direct_eval_call(callee, args, strictCaller)` | `tsc_value_t` | Performs the direct-eval identity guard after evaluating one canonical argument collection; a reassigned `eval` is called normally |
| `tsc_test262_write_normal(...)` / `tsc_test262_write_throw(...)` | `void` | Emits the single structured observation owned by the native execution boundary |

## Process

| Symbol | Signature | JS equivalent |
|--------|-----------|---------------|
| `tsc_process_exit(code)` | `noreturn` | `process.exit(code)` |
| `tsc_process_argv()` | `tsc_array_t*` | `process.argv` — returns new array each call |
| `tsc_process_env_get(name)` | `tsc_str_t*` | `process.env[name]` — NULL if unset |
| `tsc_process_cwd()` | `tsc_str_t*` | `process.cwd()` |
| `tsc_process_stdio_is_tty(fd)` | `bool` | `process.stdout.isTTY` / `process.stderr.isTTY` |
| `tsc_process_next_tick(fn, env)` / `tsc_process_drain_next_ticks()` | `void` | Bounded before-exit `process.nextTick(callback, ...args)` queue |
| `tsc_queue_microtask(fn, env)` / `tsc_drain_microtasks()` | `void` | Bounded before-exit `queueMicrotask(callback)` queue drained after next ticks |
| `tsc_set_timeout(fn, env)` / `tsc_set_interval(fn, env)` / `tsc_clear_timeout(id)` / `tsc_ref_timeout(id)` / `tsc_unref_timeout(id)` / `tsc_drain_timeouts()` | `double` / `void` | Timer queue with numeric cancellation and ref/unref liveness controls; unrefed timers still run while another refed handle keeps the event loop alive |
| `tsc_set_immediate(fn, env)` / `tsc_clear_immediate(id)` / `tsc_drain_immediates()` | `double` / `void` | Bounded before-exit `setImmediate(callback, ...args)` queue drained after next ticks, microtasks, and zero-delay timeouts, with numeric handles cancellable before drain |
| `tsc_abort_error_value()` | `tsc_value_t` | Creates the bounded default AbortSignal reason: an error-shaped `AbortError` with message `This operation was aborted` and code `20` |
| `tsc_abort_signal_add_callback(signal, fn, env)` | `void` | Registers a runtime cancellation callback invoked when the bounded AbortSignal aborts; libuv-backed requests use it to reject and cancel pending work |

## child_process (bounded asynchronous spawn subset)

| Symbol | Signature | Purpose |
|--------|-----------|---------|
| `tsc_child_process_spawn` | `(file, args, cwd, env, shell, argv0, pipeStdin, ignoreStdin, pipeStdout, ignoreStdout, inheritStdout, pipeStderr, ignoreStderr, inheritStderr, detached, uid, gid, killSignal, signal) -> tsc_value_t` | Creates a POSIX child handle, polls nonblocking stdio through the runtime loop, gates `spawn` on successful exec, emits one launch error without `spawn` for setup/exec failure, forwards `argv0`, accepts POSIX-inert Windows compatibility options, exposes a live `stdio` array aliasing `[stdin, stdout, stderr]`, and exposes `spawnfile` / `spawnargs` launch metadata plus dynamic `kill` / `ref` / `unref` methods whose polling/timeout handles participate in event-loop liveness. This bounded subset supports compiler-selected stdio modes, UTF-8 stream opt-in, nonblocking string/Buffer stdin writes with 16 KiB queue state, `write()` / `end()` callbacks, `drain` / `finish`, one `error` event for failed pipes, stdout/stderr `pause()` / `resume()` read gates with readable state, `destroy(error?, callback?)`, one `close` event after EOF or destruction, bounded `read(size?)` pulls, one-destination readable-stream `pipe(destination, { end? })` / `unpipe(destination?)` forwarding with destination `drain` resumption, and AbortSignal cancellation with configured kill-signal/error ordering; broader child-process options, multi-destination piping, AbortSignal exception-channel semantics, stream backpressure, and read-error semantics remain deferred. |

## net (bounded IPv4/IPv6 TCP subset)

| Symbol | Signature | JS equivalent |
|--------|-----------|---------------|
| `tsc_net_create_server(connection_listener)` | `tsc_value_t` | `net.createServer(connectionListener?)` — creates a timer-polled POSIX IPv4/IPv6 server with dynamic EventEmitter-compatible lifecycle methods, positional or bounded `{ port, host?, backlog?, ipv6Only?, signal? }` `listen` address-family, native listen-queue, and IPv6-only selection, `close` including from the `listening` callback, `address`, synchronized `listening`, assignment-compatible `maxConnections` admission limits, live `connections` state, asynchronous `getConnections(callback)`, chainable `ref()` / `unref()` control over the polling handle's event-loop liveness, and pre-aborted/in-flight `signal` cancellation that emits the signal reason once as `error` before `close` |
| `tsc_net_connect(port, host, connect_listener)` / `tsc_net_connect_options(options, connect_listener)` | `tsc_value_t` | `net.connect` / `net.createConnection` — creates a nonblocking POSIX IPv4/IPv6 socket from positional or bounded `{ port, host?, family?, noDelay?, keepAlive?, keepAliveInitialDelay?, localAddress?, localPort?, timeout?, signal? }` options, constrains host resolution to a requested IPv4/IPv6 family, applies requested TCP controls before connecting, binds the requested local endpoint before connecting, starts the requested timeout after `connect`, cancels pre-aborted and in-flight sockets through the bounded signal callback path, emits the signal reason once as `error` before `close`, emits `connect` / `data` / `end` / `close` / `error` / `timeout` / `drain` / `finish`, and exposes UTF-8, string/Buffer write/end callbacks, bounded `writableHighWaterMark` / `writableLength` / `writableNeedDrain` state with queued writes and deferred end completion, half-close, `destroy(error?, callback?)` error-before-close delivery, endpoint metadata, byte counters, `setNoDelay` / `setKeepAlive` controls, chainable idle `setTimeout` scheduling, `pause` / `resume` read gates, lifecycle flags, IPv4/IPv6 endpoint-family metadata, and chainable `ref()` / `unref()` control over polling and recreated idle-timeout handles |
| `tsc_net_tls_connect(port, host, reject_unauthorized, servername, connect_listener)` | `tsc_value_t` | Internal HTTPS transport helper — creates a nonblocking POSIX IPv4 socket, negotiates an OpenSSL client session, and emits the underlying socket lifecycle after the TLS handshake |

## http (bounded HTTP/1.1 client/server and validation subset)

| Symbol | Signature | JS equivalent |
|--------|-----------|---------------|
| `tsc_http_request(options, response_listener)` | `tsc_value_t` | `http.request(options, callback?)` — opens or reuses an endpoint-keyed native TCP connection, accepts bounded `hostname` / `host` / `port` / `path` / `method` / `headers` / `auth` / `signal` options, synthesizes Basic authorization unless an explicit authorization header is present, exposes case-insensitive `ClientRequest` header mutation/introspection before headers are sent plus synchronized `headersSent` and `aborted`, supports validated `addTrailers(...)` for chunked requests, chainable `ClientRequest.setTimeout(timeout, callback?)`, `setNoDelay(noDelay?)`, `setSocketKeepAlive(enable?, initialDelay?)`, `abort()`, and `destroy(error?, callback?)` forwarding native socket controls/cancellation and bounded error/callback teardown, buffers ordinary bounded string/Buffer request writes until `end`, preserves individual writes as framed chunks when `Transfer-Encoding: chunked` is selected, propagates bounded 16 KiB `ClientRequest` writable state and `drain` for queued chunked writes, and parses one HTTP/1.1 response with status/version/headers/body/trailers metadata including decoded chunks; pre-aborted and in-flight signals emit the signal reason once as a request error, explicit chunked responses also expose `data` / `end` events; sequential pooling covers ordinary and framed chunked requests/responses, while concurrent pooling, pipelining, broader streaming/backpressure, and `http2` remain deferred |
| `tsc_http_get(options, response_listener)` | `tsc_value_t` | `http.get(options, callback?)` — creates the same bounded client request, reusing an eligible idle endpoint connection, and automatically ends it |
| `tsc_http_create_server(request_listener)` | `tsc_value_t` | `http.createServer(requestListener?)` — creates an HTTP/1.1 server over the native TCP runtime, parsing bounded requests including chunked bodies and exposing request metadata plus decoded `trailers`, case-insensitive `ServerResponse` header mutation/introspection with synchronized `headersSent`, chainable `ServerResponse.setTimeout(timeout, callback?)`, and validated `addTrailers(...)` for chunked responses; response timeout events/callbacks forward the native socket idle timer and the bridge is cleared when the response ends; explicit chunked response writes flush framed chunks, propagate bounded socket backpressure, expose writable high-water state, and forward `drain`, while explicit `Connection: keep-alive` requests with `Content-Length` or chunked bodies may be processed sequentially on one connection; concurrent pooling, pipelining, and broader streaming/backpressure remain deferred |
| `tsc_http_validate_header_name(name)` | `void` | `http.validateHeaderName(name)` — validates an HTTP token name and throws through the runtime error path on invalid input |
| `tsc_http_validate_header_value(name, value)` | `void` | `http.validateHeaderValue(name, value)` — validates header content and throws through the runtime error path on invalid control characters |

## https (bounded OpenSSL HTTP/1.1 transport subset)

| Symbol | Signature | JS equivalent |
|--------|-----------|---------------|
| `tsc_https_create_server(options, request_listener)` | `tsc_value_t` | `https.createServer({ key, cert }, requestListener?)` — loads PEM certificate/private-key strings, creates a native nonblocking IPv4 server, negotiates OpenSSL server sessions, and reuses the bounded HTTP/1.1 parser and response lifecycle; general streaming/backpressure and `http2` remain deferred |
| `tsc_https_request(options, response_listener)` | `tsc_value_t` | `https.request(options, callback?)` — opens or reuses an endpoint-keyed TLS client session over the native nonblocking socket runtime, defaults to port 443, supports the bounded HTTP request options including `auth` / `signal` plus `rejectUnauthorized` and `servername`, synthesizes Basic authorization unless an explicit authorization header is present, emits a pre-aborted or in-flight signal reason once as a request error, and reuses the HTTP/1.1 request/response parser including bounded chunked request writes and response `data` / `end` events; sequential pooling is limited to ordinary non-chunked requests, while concurrent pooling, chunked keep-alive reuse, general streaming/backpressure, and `http2` remain deferred |
| `tsc_https_get(options, response_listener)` | `tsc_value_t` | `https.get(options, callback?)` — creates the same bounded OpenSSL client request, reusing an eligible idle endpoint session, and automatically ends it |

## fs (sync and bounded async subset)

| Symbol | Signature | JS equivalent |
|--------|-----------|---------------|
| `tsc_fs_read_file_sync(path)` | `tsc_str_t*` | `fs.readFileSync(path[, utf8OrFlagOptions])` — throws via `tsc_throw_str` on error |
| `tsc_fs_read_file_buffer_sync(path)` | `tsc_buffer_t*` | `fs.readFileSync(path, "buffer" | null | { encoding: "buffer" \| null[, flag] })` |
| `tsc_fs_promises_read_file_async(path, want_buffer, signal)` | `tsc_promise_t*` | Libuv-backed `fs.promises.readFile(path[, "utf8" \| "buffer" \| null \| { encoding, flag, signal }])` for UTF-8 and Buffer/null results; opens, reads in chunks, closes, then fulfills or rejects the pending Promise, with in-flight AbortSignal rejection/cancellation |
| `tsc_fs_promises_read_file_encoded_async(path, encoding, signal)` | `tsc_promise_t*` | Libuv-backed `fs.promises.readFile(path, "hex" \| "base64")`; opens, reads in chunks, closes, encodes the bytes, then fulfills or rejects the pending Promise, with in-flight AbortSignal rejection/cancellation |
| `tsc_fs_promises_write_file_string_async(path, data, append, exclusive, update, mode, flush, signal)` | `tsc_promise_t*` | Libuv-backed `fs.promises.writeFile` / `appendFile` for UTF-8 string data and the supported flag/mode combinations; `flush: true` runs `uv_fs_fsync` before close, with in-flight AbortSignal rejection/cancellation |
| `tsc_fs_promises_write_file_buffer_async(path, data, append, exclusive, update, mode, flush, signal)` | `tsc_promise_t*` | Libuv-backed `fs.promises.writeFile` / `appendFile` for Buffer data, including emitter-decoded hex/base64 strings; `flush: true` runs `uv_fs_fsync` before close, with in-flight AbortSignal rejection/cancellation |
| `tsc_fs_promises_readdir_async(path, want_buffer, signal)` | `tsc_promise_t*` | Libuv-backed non-recursive `fs.promises.readdir` for UTF-8 string or Buffer filename results; scans asynchronously, rejects on AbortSignal cancellation, asks the active scanner to cancel, and suppresses late fulfillment |
| `tsc_fs_promises_readdir_recursive_async(path, want_buffer, signal)` | `tsc_promise_t*` | Libuv-backed recursive `fs.promises.readdir` for UTF-8 string or Buffer relative filename results; walks directory entries with sequential `uv_fs_scandir` requests without following symlink entries, rejects on AbortSignal cancellation, and suppresses late fulfillment |
| `tsc_fs_promises_readdir_encoded_async(path, encoding, signal)` | `tsc_promise_t*` | Libuv-backed non-recursive `fs.promises.readdir` for hex/base64 string filename results; scans raw names asynchronously, applies the requested encoding at completion, and rejects/cancels on AbortSignal cancellation |
| `tsc_fs_promises_readdir_recursive_encoded_async(path, encoding, signal)` | `tsc_promise_t*` | Libuv-backed recursive `fs.promises.readdir` for hex/base64 relative filename results; walks directory entries with sequential `uv_fs_scandir` requests without following symlink entries, applies encoding at completion, and rejects/cancels on AbortSignal cancellation |
| `tsc_fs_promises_readdir_dirents_async(path, encoding, signal)` | `tsc_promise_t*` | Libuv-backed non-recursive `fs.promises.readdir(path, { withFileTypes: true })`; scans typed `FSDirent` records asynchronously with `parentPath` and deprecated `path` aliases, applies the requested name encoding, and rejects/cancels on AbortSignal cancellation |
| `tsc_fs_promises_readdir_recursive_dirents_async(path, encoding, signal)` | `tsc_promise_t*` | Libuv-backed recursive `fs.promises.readdir(path, { recursive: true, withFileTypes: true })`; walks typed directory entries with physical `parentPath`/`path` aliases through sequential `uv_fs_scandir` requests without following symlink entries, applies name encoding, and rejects/cancels on AbortSignal cancellation |
| `tsc_fs_promises_opendir_async(path, recursive, encoding, buffer_size, signal)` | `tsc_promise_t*` | Libuv-backed `fs.promises.opendir(...)` implementation for Promise-chain call sites; opens root and recursive child handles with `uv_fs_opendir`, supports pre-aborted/in-flight root-open cancellation through `signal`, services bounded `Dir.read()` and async-iterator requests with `uv_fs_readdir`, restores parent frames depth-first, and disposes active/parent handles with `uv_fs_closedir`; direct-await call sites retain the POSIX fallback until broader pending-await lowering is available |
| `tsc_fs_promises_access_async(path, mode, signal)` | `tsc_promise_t*` | Libuv-backed `fs.promises.access(path[, mode])`; performs the access check asynchronously, rejects/cancels on AbortSignal cancellation, and suppresses late fulfillment |
| `tsc_fs_promises_stat_async(path, throw_if_no_entry, signal)` | `tsc_promise_t*` | Libuv-backed `fs.promises.stat(path)`; fulfills the typed `FSStats` side-channel or, when `throwIfNoEntry` is false, a null side-channel for a missing path, and rejects/cancels on AbortSignal cancellation |
| `tsc_fs_promises_lstat_async(path, throw_if_no_entry, signal)` | `tsc_promise_t*` | Libuv-backed `fs.promises.lstat(path)` with the same missing-entry behavior, without following the final symbolic link, and rejects/cancels on AbortSignal cancellation |
| `tsc_fs_promises_statfs_async(path, signal)` | `tsc_promise_t*` | Libuv-backed `fs.promises.statfs(path)`; fulfills a dynamic object with numeric `bsize`, `frsize`, `blocks`, `bfree`, `bavail`, `files`, and `ffree` fields, rejects/cancels on AbortSignal cancellation, and suppresses late fulfillment |
| `tsc_fs_promises_copy_file_async(src, dest, mode)` | `tsc_promise_t*` | Libuv-backed `fs.promises.copyFile(src, dest, mode?)`; fulfills after the copy completes or rejects with the bounded copy error contract |
| `tsc_fs_promises_cp_async(src, dest, recursive, force, errorOnExist, dereference, verbatimSymlinks, mode, preserveTimestamps)` | `tsc_promise_t*` | Libuv-backed `fs.promises.cp(src, dest, options)` for the supported recursive and nonrecursive forms; regular files use `uv_fs_copyfile` with destination-existence and optional timestamp requests, directories use sequential scandir/mkdir traversal, and symlinks use asynchronous readlink/realpath/symlink requests |
| `tsc_fs_promises_rename_async(old_path, new_path)` | `tsc_promise_t*` | Libuv-backed `fs.promises.rename(oldPath, newPath)`; fulfills after the rename completes or rejects with the bounded rename error contract |
| `tsc_fs_promises_realpath_async(path, encoding, signal)` | `tsc_promise_t*` | Libuv-backed `fs.promises.realpath(path[, options])`; fulfills a UTF-8, encoded-string, or Buffer result after asynchronous resolution, rejects with the bounded realpath error contract, and requests cancellation on AbortSignal cancellation |
| `tsc_fs_promises_readlink_async(path, encoding, signal)` | `tsc_promise_t*` | Libuv-backed `fs.promises.readlink(path[, options])`; fulfills a UTF-8, encoded-string, or Buffer target after asynchronous resolution, rejects with the bounded readlink error contract, and requests cancellation on AbortSignal cancellation |
| `tsc_fs_promises_mkdtemp_async(prefix, encoding, signal)` | `tsc_promise_t*` | Libuv-backed `fs.promises.mkdtemp(prefix[, options])`; fulfills a UTF-8, encoded-string, or Buffer directory path after asynchronous creation, rejects with the bounded mkdtemp error contract, and requests cancellation on AbortSignal cancellation |
| `tsc_fs_promises_symlink_async(target, path)` | `tsc_promise_t*` | Libuv-backed `fs.promises.symlink(target, path[, type])`; fulfills after asynchronous link creation or rejects with the bounded symlink error contract |
| `tsc_fs_promises_link_async(existing_path, new_path)` | `tsc_promise_t*` | Libuv-backed `fs.promises.link(existingPath, newPath)`; fulfills after asynchronous hard-link creation or rejects with the bounded link error contract |
| `tsc_fs_promises_utimes_async(path, atime, mtime)` | `tsc_promise_t*` | Libuv-backed `fs.promises.utimes(path, atime, mtime)`; fulfills after asynchronous timestamp update or rejects with the bounded utimes error contract |
| `tsc_fs_promises_lutimes_async(path, atime, mtime)` | `tsc_promise_t*` | Libuv-backed `fs.promises.lutimes(path, atime, mtime)`; fulfills after asynchronous symlink timestamp update or rejects with the bounded lutimes error contract |
| `tsc_fs_promises_chmod_async(path, mode)` | `tsc_promise_t*` | Libuv-backed `fs.promises.chmod(path, mode)`; fulfills after asynchronous mode update or rejects with the bounded chmod error contract |
| `tsc_fs_promises_chown_async(path, uid, gid)` | `tsc_promise_t*` | Libuv-backed `fs.promises.chown(path, uid, gid)`; fulfills after asynchronous ownership update or rejects with the bounded chown error contract |
| `tsc_fs_promises_lchown_async(path, uid, gid)` | `tsc_promise_t*` | Libuv-backed `fs.promises.lchown(path, uid, gid)`; fulfills after asynchronous symlink ownership update or rejects with the bounded lchown error contract |
| `tsc_fs_promises_mkdir_async(path, mode, signal)` | `tsc_promise_t*` | Libuv-backed nonrecursive `fs.promises.mkdir(path[, mode])`; fulfills after asynchronous directory creation, rejects with the bounded mkdir error contract, and requests cancellation on AbortSignal cancellation |
| `tsc_fs_promises_mkdir_recursive_async(path, mode, signal)` | `tsc_promise_t*` | Libuv-backed recursive `fs.promises.mkdir(path, { recursive: true, mode })`; walks path prefixes with sequential `uv_fs_mkdir` requests, accepts existing components, rejects with the bounded recursive mkdir error contract, and requests cancellation on AbortSignal cancellation |
| `tsc_fs_promises_unlink_async(path)` | `tsc_promise_t*` | Libuv-backed `fs.promises.unlink(path)`; fulfills after asynchronous file removal or rejects with the bounded unlink error contract |
| `tsc_fs_promises_rmdir_async(path, signal)` | `tsc_promise_t*` | Libuv-backed nonrecursive `fs.promises.rmdir(path)`; fulfills after asynchronous empty-directory removal, rejects with the bounded rmdir error contract, and requests cancellation on AbortSignal cancellation |
| `tsc_fs_promises_rmdir_recursive_async(path, signal)` | `tsc_promise_t*` | Libuv-backed recursive `fs.promises.rmdir(path, { recursive: true })`; walks directories with sequential lstat/scandir/unlink/rmdir requests, rejects a non-directory root or with the bounded rmdir error contract, and requests cancellation on AbortSignal cancellation |
| `tsc_fs_promises_rm_async(path, force, signal)` | `tsc_promise_t*` | Libuv-backed nonrecursive `fs.promises.rm(path[, { force }])`; fulfills after asynchronous file/symlink removal, resolves a missing path when `force` is true, rejects with the bounded rm error contract, and requests cancellation on AbortSignal cancellation |
| `tsc_fs_promises_rm_recursive_async(path, force, signal)` | `tsc_promise_t*` | Libuv-backed recursive `fs.promises.rm(path[, { recursive, force }])`; walks directories with sequential lstat/scandir/unlink/rmdir requests, resolves missing paths when `force` is true, rejects with the bounded rm error contract, and requests cancellation on AbortSignal cancellation |
| `tsc_fs_promises_truncate_async(path, len)` | `tsc_promise_t*` | Libuv-backed `fs.promises.truncate(path, len?)` open/ftruncate/close request; fulfills after asynchronous truncation or rejects with the bounded truncate error contract |
| `tsc_fs_write_file_sync(path, data)` / `tsc_fs_write_file_sync_opts(_mode)(path, data, append, exclusive[, mode])` | `void` | `fs.writeFileSync(path, data[, utf8OrFlagOrModeOptions])` |
| `tsc_fs_append_file_sync(path, data)` / `tsc_fs_write_file_sync_opts(_mode)(path, data, true, exclusive[, mode])` | `void` | `fs.appendFileSync(path, data[, utf8OrAppendFlagOrModeOptions])` |
| `tsc_fs_exists_sync(path)` | `bool` | `fs.existsSync(path)` |
| `tsc_fs_readdir_sync(path)` | `tsc_array_t*` | `fs.readdirSync(path)` — array of filenames |
| `tsc_fs_opendir_sync(path, recursive, encoding, buffer_size)` | `tsc_value_t` | `fs.opendirSync(path[, { recursive, encoding, bufferSize }])` — bounded POSIX directory handle with per-frame prefetch capped by `buffer_size`, sync/Promise reads returning Dirent `parentPath`/deprecated `path` aliases, depth-first recursive traversal, UTF-8/hex/base64/Buffer names, async-iterator methods, and idempotent sync/async disposal; the emitter accepts literal/const buffer sizes from 1 through 4,294,967,295 and defaults to 32 |
| `tsc_fs_readdir_buffer_sync(path)` | `tsc_array_t*` | `fs.readdirSync(path, "buffer" \| { encoding: "buffer" })` — array of Buffer filenames |
| `tsc_fs_readdir_recursive_sync(path)` | `tsc_array_t*` | `fs.readdirSync(path, { recursive: true })` — recursive relative filename strings |
| `tsc_fs_readdir_recursive_buffer_sync(path)` | `tsc_array_t*` | `fs.readdirSync(path, { recursive: true, encoding: "buffer" })` — recursive relative Buffer filenames |
| `tsc_fs_readdir_encode_names(entries, encoding)` | `tsc_array_t*` | Applies hex/base64 string encoding to each filename in a readdir string array |
| `tsc_fs_readdir_dirents_sync(path)` | `tsc_array_t*` | `fs.readdirSync(path, { withFileTypes: true })` — array of bounded `Dirent` records with `parentPath` and deprecated `path` aliases |
| `tsc_fs_stat_sync(path)` | `tsc_fs_stats_t*` | `fs.statSync(path)` — small `Stats` subset |
| `tsc_fs_lstat_sync(path)` | `tsc_fs_stats_t*` | `fs.lstatSync(path)` — small `Stats` subset without following symlinks |
| `tsc_fs_statfs_sync(path)` | `tsc_value_t` | `fs.statfsSync(path)` — bounded numeric filesystem-stat object |
| `tsc_fs_realpath_sync(path)` | `tsc_str_t*` | `fs.realpathSync(path[, "utf8" \| "buffer" \| { encoding }])` |
| `tsc_fs_readlink_sync(path)` | `tsc_str_t*` | `fs.readlinkSync(path[, "utf8" \| "buffer" \| { encoding }])` |
| `tsc_fs_symlink_sync(target, path)` | `void` | `fs.symlinkSync(target, path)` |
| `tsc_fs_link_sync(existingPath, newPath)` | `void` | `fs.linkSync(existingPath, newPath)` |
| `tsc_fs_mkdtemp_sync(prefix)` | `tsc_str_t*` | `fs.mkdtempSync(prefix[, "utf8" \| "buffer" \| { encoding }])`; explicit Buffer encodings wrap the string result with `tsc_buffer_from_str` |
| `tsc_fs_truncate_sync(path, len)` | `void` | `fs.truncateSync(path, len?)` |
| `tsc_fs_utimes_sync(path, atime, mtime)` | `void` | `fs.utimesSync(path, atime, mtime)` |
| `tsc_fs_lutimes_sync(path, atime, mtime)` | `void` | `fs.lutimesSync(path, atime, mtime)` |
| `tsc_fs_chown_sync(path, uid, gid)` | `void` | `fs.chownSync(path, uid, gid)` |
| `tsc_fs_lchown_sync(path, uid, gid)` | `void` | `fs.lchownSync(path, uid, gid)` |
| `tsc_fs_stats_dev(st)` / `tsc_fs_stats_ino(st)` | `double` | `Stats.dev` / `Stats.ino` |
| `tsc_fs_stats_size(st)` / `tsc_fs_stats_mode(st)` | `double` | `Stats.size` / `Stats.mode` |
| `tsc_fs_stats_nlink(st)` / `uid` / `gid` / `rdev` / `blksize` / `blocks` | `double` | `Stats.nlink` / `uid` / `gid` / `rdev` / `blksize` / `blocks` |
| `tsc_fs_stats_atime_ms(st)` | `double` | `Stats.atimeMs` |
| `tsc_fs_stats_mtime_ms(st)` | `double` | `Stats.mtimeMs` |
| `tsc_fs_stats_ctime_ms(st)` | `double` | `Stats.ctimeMs` |
| `tsc_fs_stats_birthtime_ms(st)` | `double` | `Stats.birthtimeMs` |
| `tsc_fs_stats_is_file(st)` | `bool` | `Stats.isFile()` |
| `tsc_fs_stats_is_directory(st)` | `bool` | `Stats.isDirectory()` |
| `tsc_fs_stats_is_symbolic_link(st)` | `bool` | `Stats.isSymbolicLink()` |
| `tsc_fs_access_sync(path)` | `void` | `fs.accessSync(path)` with the default `F_OK` mode; throws via `tsc_throw_str` when the path is not accessible |
| `tsc_fs_chmod_sync(path, mode)` | `void` | `fs.chmodSync(path, mode)` |
| `tsc_fs_mkdir_sync(path)` | `void` | `fs.mkdirSync(path)` |
| `tsc_fs_mkdir_sync_opts(path, recursive, mode)` | `void` | `fs.mkdirSync(path, mode \| { recursive, mode })` bounded options subset |
| `tsc_fs_unlink_sync(path)` | `void` | `fs.unlinkSync(path)` |
| `tsc_fs_rm_sync(path)` | `void` | `fs.rmSync(path)` |
| `tsc_fs_rm_sync_opts(path, recursive, force)` | `void` | `fs.rmSync(path, { recursive, force })` |
| `tsc_fs_rmdir_sync(path)` | `void` | `fs.rmdirSync(path)` |
| `tsc_fs_rmdir_sync_opts(path, recursive)` | `void` | `fs.rmdirSync(path, { recursive })` |
| `tsc_fs_cp_sync_opts(src, dest, recursive, force, errorOnExist, dereference, verbatimSymlinks, mode, preserveTimestamps)` | `void` | `fs.cpSync(src, dest, { recursive, force, errorOnExist, dereference, verbatimSymlinks, mode, preserveTimestamps })` |
| `tsc_fs_copy_file_sync(src, dest)` | `void` | `fs.copyFileSync(src, dest)` |
| `tsc_fs_rename_sync(oldPath, newPath)` | `void` | `fs.renameSync(oldPath, newPath)` |

`fs.promises.readFile` uses a libuv-backed open/read/close chain for default UTF-8, hex/base64, and explicit Buffer/null results; encoded strings are produced after the asynchronous byte read completes. Its supported AbortSignal path rejects queued/in-flight reads and requests cancellation of the active libuv request, closing an already-open descriptor without allowing a later completion to fulfill the Promise. `fs.promises.writeFile` and `appendFile` use libuv-backed open/write/close chains for the supported string/Buffer data, encoding, flag, exclusive, update, and mode combinations; their supported AbortSignal path rejects queued/in-flight writes, requests cancellation of the active libuv request, closes an already-open descriptor, and suppresses late fulfillment. Non-recursive and recursive UTF-8/Buffer, hex/base64, and `withFileTypes` `fs.promises.readdir` calls use libuv-backed scanners; their supported AbortSignal path rejects queued/in-flight scans, requests cancellation of the active scanner, and suppresses late fulfillment. The libuv-backed `fs.promises.stat` / `lstat` and `fs.promises.realpath` / `readlink` / `mkdtemp` requests also reject queued/in-flight work, request cancellation of the active request, and suppress late fulfillment on AbortSignal cancellation. Signal-bearing nonrecursive/recursive `fs.promises.mkdir` and `fs.promises.rm` / `rmdir` state machines likewise reject queued/in-flight work, request cancellation of the active request, and suppress late fulfillment. Default/mode `fs.promises.access` calls, `fs.promises.statfs`, `fs.promises.symlink` / `link`, `fs.promises.truncate`, `fs.promises.utimes` / `lutimes` / `chmod` / `chown` / `lchown`, `fs.promises.unlink`, `fs.promises.copyFile` / `rename`, and all supported recursive/nonrecursive `fs.promises.cp` option forms use libuv-backed requests or state machines; recursive `readdir` walks directory entries sequentially without following symlink entries, recursive `mkdir` walks path prefixes sequentially, recursive `cp` walks directories sequentially, copies regular files with `uv_fs_copyfile`, and recreates symlinks through asynchronous link-target requests. Recursive `rmdir` rejects non-directory roots. Stat/lstat, the libuv Buffer-returning read, and the libuv string/Dirent-returning readdir paths use typed promise side-channel records. Broader AbortSignal semantics and broader libuv-backed filesystem I/O remain deferred.

The bounded AbortSignal contract also covers libuv-backed `fs.promises.access(path[, { signal }])` and `statfs(path[, { bigint, signal }])`: queued requests reject with the signal reason, active requests are asked to cancel, and late fulfillment is suppressed.

Supported fs path arguments use a bounded `PathLike` subset: strings pass through directly, Buffer paths are coerced to UTF-8 strings, and `file:` URL objects are resolved to their filesystem pathname before calling the same runtime helpers. Non-file URLs are rejected at runtime.

## path

| Symbol | Signature |
|--------|-----------|
| `tsc_path_join(n, ...)` | `tsc_str_t*` — variadic |
| `tsc_path_resolve(n, ...)` | `tsc_str_t*` — variadic, absolute |
| `tsc_path_normalize(p)` | `tsc_str_t*` — bounded POSIX segment cleanup |
| `tsc_path_is_absolute(p)` | `bool` — leading-slash absolute check |
| `tsc_path_relative(from, to)` | `tsc_str_t*` — bounded POSIX relative path construction |
| `tsc_path_basename(p)` | `tsc_str_t*` |
| `tsc_path_dirname(p)` | `tsc_str_t*` |
| `tsc_path_extname(p)` | `tsc_str_t*` |

## os

| Symbol | Returns |
|--------|---------|
| `tsc_os_platform()` | `tsc_str_t*` — `"linux"`, `"darwin"`, `"win32"`, or `"unknown"` |
| `tsc_os_arch()` | `tsc_str_t*` — `"x64"`, `"arm64"`, `"ia32"`, `"arm"`, `"unknown"` |
| `tsc_os_hostname()` | `tsc_str_t*` |
| `tsc_os_tmpdir()` | `tsc_str_t*` — `$TMPDIR` or `/tmp` |
| `tsc_os_homedir()` | `tsc_str_t*` — `$HOME` or `/` |
| `tsc_os_cpu_count()` | `double` — from `sysconf(_SC_NPROCESSORS_ONLN)` |
| `tsc_date_now()` | `double` — ms since epoch via `clock_gettime(CLOCK_REALTIME)` |
| `tsc_date_local(year, month, day, hours, minutes, seconds, ms)` | `double` — local-time `new Date(year, month, ...)` epoch milliseconds |
| `tsc_date_set_local_part(date, part, a, b, c, e, arg_count)` | `double` — local-time Date setter helper with normalized overflow |
| `tsc_date_get_utc_part(date, part)` | `double` — UTC year/month/date/day/hour/minute/second/ms component |
| `tsc_date_get_local_part(date, part)` | `double` — local year/month/date/day/hour/minute/second/ms component |
| `tsc_date_get_timezone_offset(date)` | `double` — JavaScript `Date#getTimezoneOffset()` minutes |

## crypto

| Symbol | Signature | JS equivalent |
|--------|-----------|---------------|
| `tsc_crypto_create_hash(algorithm)` | `tsc_hash_t*` | `crypto.createHash("sha256")` |
| `tsc_crypto_get_hashes()` | `tsc_array_t*` | `crypto.getHashes()` |
| `tsc_hash_update(hash, data)` | `tsc_hash_t*` | `.update(data)` |
| `tsc_hash_digest(hash, encoding)` | `tsc_str_t*` | `.digest("hex")` |

## EventEmitter

| Symbol | Signature | JS equivalent |
|--------|-----------|---------------|
| `tsc_event_emitter_new()` | `tsc_event_emitter_t*` | `new EventEmitter()` |
| `tsc_event_emitter_on(ee, event, fn, env, identity, once, prepend)` | `void` | `on` / `addListener` / `prependListener` / `once` / `prependOnceListener`; `fn` is a generated adapter and `identity` preserves listener removal semantics |
| `tsc_event_emitter_off(ee, event, fn, identity)` | `void` | `off` / `removeListener` |
| `tsc_event_emitter_remove_all(ee, event)` | `void` | `removeAllListeners(event?)` |
| `tsc_event_emitter_emit(ee, event, args)` | `bool` | `emit(event, ...args)`; `args` is a boxed `tsc_value_t` array; unhandled `"error"` emits throw |
| `tsc_event_emitter_once_promise(ee, event, signal)` | `tsc_promise_t*` | `events.once(ee, event, { signal })`; settles on the event/error or rejects on AbortSignal cancellation |
| `tsc_timers_promises_set_interval(value, delay, signal)` | `tsc_value_t` | `timers/promises.setInterval(delay, value, { signal })`; returns a bounded async iterator with interval ticks, iterator close, and AbortSignal cancellation |
| `tsc_event_emitter_on_async_iterator(ee, event, signal, close_events, high_water_mark, low_water_mark)` | `tsc_value_t` | `events.on(ee, event, { signal, close, highWaterMark, lowWaterMark })`; returns a dynamic queued/pending async iterator with bounded pause/resume backpressure |
| `tsc_event_emitter_listener_count(ee, event)` | `double` | `listenerCount(event)` |
| `tsc_event_emitter_listener_count_identity(ee, event, identity)` | `double` | `listenerCount(event, listener)` filtered by preserved listener identity |
| `tsc_event_emitter_event_names(ee)` | `tsc_array_t*` | `eventNames()` as a string array |
| `tsc_event_emitter_pause(ee)` / `tsc_event_emitter_resume(ee)` | `void` | pause/resume state used by `events.on` watermark backpressure |
| `tsc_event_emitter_is_paused(ee)` | `bool` | `isPaused()` for the bounded pauseable emitter subset |
| `tsc_event_emitter_set_max_listeners(ee, n)` | `void` | `setMaxListeners(n)`; stores the configured count but does not emit warnings yet |
| `tsc_event_emitter_get_max_listeners(ee)` | `double` | `getMaxListeners()` |

## Event / EventTarget

| Symbol | Signature | JS equivalent |
|--------|-----------|---------------|
| `tsc_event_new(type, cancelable)` | `tsc_event_t*` | `new Event(type, { cancelable })` |
| `tsc_event_type(event)` | `tsc_str_t*` | `event.type` |
| `tsc_event_target(event)` | `tsc_event_target_t*` | `event.target` |
| `tsc_event_current_target(event)` | `tsc_event_target_t*` | `event.currentTarget` |
| `tsc_event_default_prevented(event)` | `bool` | `event.defaultPrevented` |
| `tsc_event_cancelable(event)` | `bool` | `event.cancelable` |
| `tsc_event_prevent_default(event)` | `void` | `event.preventDefault()` |
| `tsc_event_target_new()` | `tsc_event_target_t*` | `new EventTarget()` |
| `tsc_event_target_add(target, type, fn, env, identity, once)` | `void` | `addEventListener(type, listener[, options])` with generated typed-listener adapters, identity-based duplicate suppression, and bounded `{ once: true }` support |
| `tsc_event_target_remove(target, type, fn, identity)` | `void` | `removeEventListener(type, listener)` |
| `tsc_event_target_dispatch(target, event)` | `bool` | `dispatchEvent(event)` synchronous same-target dispatch; returns false for cancelable default-prevented events |

## URL

`tsc_url_t` stores the parsed fields exposed by `URL` instances: `href`, `protocol`, `host`, `hostname`, `port`, `pathname`, `search`, `hash`, and `origin`.

| Symbol | Signature | JS equivalent |
|--------|-----------|---------------|
| `tsc_url_new(input)` | `tsc_url_t*` | `new URL(input)` for absolute URLs with `//` authority |

## Buffer

`tsc_buffer_t` is a byte vector with explicit length. It is binary-safe; UTF-8 conversion is only applied by `toString("utf8")`/string coercion.

| Symbol | Signature | JS equivalent |
|--------|-----------|---------------|
| `tsc_buffer_from_str(input, encoding)` | `tsc_buffer_t*` | `Buffer.from(string, "utf8" | "hex")` |
| `tsc_buffer_from_array(input)` | `tsc_buffer_t*` | `Buffer.from(number[])` |
| `tsc_buffer_alloc(size, fill)` | `tsc_buffer_t*` | `Buffer.alloc(size, fill)` |
| `tsc_buffer_concat(list)` | `tsc_buffer_t*` | `Buffer.concat(Buffer[])` |
| `tsc_buffer_to_string(buffer, encoding)` | `tsc_str_t*` | `.toString("utf8" | "hex")` |
| `tsc_buffer_slice(buffer, start, end)` | `tsc_buffer_t*` | `.slice()` / `.subarray()` |
| `tsc_buffer_equals(a, b)` | `bool` | `.equals(other)` |
| `tsc_buffer_length(buffer)` | `double` | `.length` |
| `tsc_buffer_get(buffer, idx)` | `double` | `buffer[idx]` |

## JSON helpers

| Symbol | Purpose |
|--------|---------|
| `tsc_json_escape_string(s)` | Returns `s` wrapped in `"..."` with JSON escape sequences. |
| `tsc_json_num(n)` | Number formatted for JSON. `NaN` / `±Infinity` → `"null"` per spec. |

`JSON.stringify` itself is not a runtime function — it's expanded at emit time by walking the TS type and emitting the right nested helpers. See `stringifyJsonValue` in `src/emit/index.ts`.

## Memory-management macros

```c
#define TSC_GC_MALLOC(n)         GC_MALLOC(n)        /* or calloc under -DTSC_NO_GC */
#define TSC_GC_MALLOC_ATOMIC(n)  GC_MALLOC_ATOMIC(n) /* raw bytes, no scan */
#define TSC_GC_REALLOC(p, n)     GC_REALLOC((p), (n))
#define TSC_GC_INIT()            GC_INIT()
```

The `-DTSC_NO_GC` define in `src/link/cc.ts` switches all of these to `calloc`/`realloc`/`ε`. This is what `--no-gc` does at the CLI.

## Embedded Node Bridge

The embedded Node bridge is linked only when `--unsafe-eval` or manifest-allowed native addons require it. First-class Function constructors share one finite AOT registry keyed by ordinary/generator/async/async-generator kind and joined parameter/body strings. Manifest entries accept `kind` alongside `parameters` and `body`, defaulting to ordinary. Only registry misses route already-converted parameter/body strings to the embedded bridge when `--unsafe-eval` is enabled. First-class eval bridge admission remains separately gated.

| Symbol | Signature | Purpose |
|--------|-----------|---------|
| `tsc_node_eval` | `(tsc_str_t*) -> tsc_value_t` | Dynamic `eval(...)` execution through V8, gated by `TSC_UNSAFE_EVAL`. |
| `tsc_node_function_source` | `(int kind, tsc_str_t*, tsc_str_t*) -> tsc_value_t` | Kind-selected joined parameters/body compilation through the corresponding V8 constructor, gated by `TSC_UNSAFE_EVAL`. |
| `tsc_node_native_addon` | `(tsc_str_t*) -> tsc_value_t` | Manifest-backed native addon load through the embedded Node `require` hook. Does not require `TSC_UNSAFE_EVAL`. |
| `tsc_builtin_eval` | `(void*, tsc_value_t, tsc_array_t*) -> tsc_value_t` | Generic function wrapper for first-class global `eval` references. |
| `tsc_function_set_source_callback` | `(tsc_function_source_callback_t) -> void` | Register the compilation-wide finite source dispatcher used in every Realm. |
| `tsc_function_create_from_source` | `(tsc_dynamic_function_kind_t, tsc_value_t (*)(void), tsc_str_t*, tsc_str_t*) -> tsc_value_t` | Resolve actual newTarget/fallback in its Realm, allocate a fresh kind-specific function and retain anonymous SourceText. |
| `tsc_value_function_with_source` | `(tsc_value_t, tsc_str_t*) -> tsc_value_t` | Retain available definition text in the canonical callable owner without changing ordinary properties or identity. |
| `tsc_value_to_internal_property_key` | `(tsc_value_t) -> tsc_str_t*` | Ordinary ToPropertyKey and canonical String/Symbol descriptor-key encoding, evaluated once at class member definition. |
| `tsc_value_function_with_property_name` | `(tsc_value_t, const tsc_str_t*, const tsc_str_t*) -> tsc_value_t` | Set the callable name from the evaluated property key and optional accessor prefix. |
| `tsc_value_in` | `(tsc_value_t, tsc_value_t) -> bool` | Validate the actual object RHS before ordinary key conversion and HasProperty. |
| `tsc_value_object_to_string_tag` | `(tsc_value_t) -> tsc_str_t*` | ToObject, builtin-brand selection, then ordinary @@toStringTag Get and String-only override. |

## Adding a new runtime function

1. Declare in `runtime/tsc_runtime.h` under an appropriate section.
2. Implement in `runtime/tsc_runtime.c`.
3. Teach the emitter to call it — through the ordinary Array method registry or an applicable `emitStringMethod` or native dispatcher in `src/emit/index.ts`.
4. If it exposes a new TS API, also add the TS declaration in `stdlib/lib.core.d.ts` so the type checker accepts user code using it.
5. Add an e2e case under `tests/e2e/cases/<feature>/` — see [`testing.md`](testing.md).
`tsc_environment_reference_capture(name, strict)` returns a stack Reference Record with a retained decoded base. The `get_captured`, `set_captured` and `delete_captured` APIs consume that record without resolving the name through a different environment chain. An absent binding in a captured declarative environment follows SetMutableBinding's strict rejection or sloppy recreation; unresolved strict stores remain unresolved after RHS side effects. The name-based convenience APIs capture a record immediately and share the same implementation.

`tsc_environment_object_enter(scope, object)` applies ToObject and enters a retained with environment. `tsc_environment_reference_read(key, strict)` captures and reads with the original strict flag; `tsc_environment_reference_receiver(reference)` returns an object binding receiver or undefined. Captured object reads recheck HasProperty before Get, while writes retain the resolved base across RHS side effects. `tsc_environment_reference_typeof_strict(key, strict)` preserves unresolvable typeof behavior and strict object-binding errors; the existing one-argument typeof API delegates to it. `tsc_environment_lexical_clone()` replaces the active declarative loop scope with a fresh sibling before cells are copied.

Finite-source eval admission rejects invalid syntax before the native dispatch enters an evaluation environment. A supplied source entry follows the same EvalSourceRequest validator as an inferred entry; rejected source roots are excluded from AOT construction and dispatch reports SyntaxError before declarations publish bindings.

WithStatement now applies UpdateEmpty to the shared script completion accumulator after object-environment entry. Empty normal and abrupt bodies contribute undefined; expression values remain intact. The generated completion property uses an independent semantic model and Node observations across normal, break, continue, return and throw contexts, plus a deep nested tree. with_completion exercises CLI execution with GC enabled and disabled.

Source-value analysis now recovers declarative binder identities independently of with object records. One ancestor walk adds conservative object-record read, write and call-receiver edges to the existing value/location/List graph; runtime Reference capture selects the actual binding. The shared admission predicate recognizes lexical eval shadowing. Generated source-flow partitions compare independent values and Node execution in both memory modes, retain unknown-intrinsic-source rejection and exercise a deep environment tree; with_source_flow verifies CLI execution. Precise admission of unknown calls selected from dynamic object environments remains open.

Property operations now share nullish-base validation with the existing prepared property-reference path. Named and symbol reads, stores and deletion reject null or undefined; computed operations validate the base before key coercion. Prototype-chain termination remains an ordinary miss. The generated property-base specification compares independent completion/order models and Node observations in both memory modes, forces GC during key coercion and traverses a deep object graph; property_base verifies CLI execution.

Source binding ownership now follows one grammar-declaration predicate shared by source-value analysis, eval admission and emitter reference selection. Checker metadata for assignments or property definitions cannot create a declarative binding. Implicit globals use the canonical global Reference path; real lexical, parameter and private function/class bindings keep their owners. Removed the API-specific synthetic-property predecessor. Generated ownership partitions use independent models and Node execution in both memory modes, including deletion, retained closures and a deep lexical tree; source_binding_ownership verifies CLI execution. The host implementation fingerprint includes the shared source-bindings module.

Contextual let normalization and Statement-role early errors are frontend operations. They reuse the existing Reference and completion runtime paths; this change adds no public runtime API. See statement_body_grammar and statement-body-grammar.property for scope and ASI evidence.

Duplicate simple formals share the existing parameter cell and mapped-arguments runtime representation. The frontend supplies unique positional ABI slots and the canonical binding identity; no new public runtime API is required.

Non-String eval argument admission now uses the source graph normal-result category and the existing eval identity return path. Numeric magnitudes require no source registry entries; text-converting host and constructor consumers still require a finite source proof. No new public runtime API is added.

Merged unknown source facts are frontend admission evidence. Explicit eval manifests continue to select the existing native registry, and unregistered runtime strings retain the existing dispatch guard. No public runtime API changes.

Catch-pattern initialization reuses ordinary environment aliases, TDZ cells and GC roots. Computed object literal keys use the existing ToPropertyKey operation before initializing their values. No public runtime API changes.

The canonical global binding definition includes frontend normal call-result categories; native Realm initialization consumes its existing value and attribute projections. Source reflection operations use ordinary owner fields. No public runtime API changes.

Var initialization uses the shared binding tree and assignment Reference factory. Each leaf resolves in its active catch or with scope, so catch shadows receive initializer assignments while outer var storage remains intact. No public runtime API changes.

Rest binding grammar is validated before native lowering. The existing binding initialization and iterator operations remain unchanged; no public runtime API changes.

Source List analysis now shares length and index locations with property analysis. Native arrays, argument Lists and Function source dispatch retain their existing runtime operations; no public runtime API changes.

Protected boxed bindings reuse existing GC-backed retained value cells and companion roots. Native exception frames, iterator closing and resource disposal keep their existing operations; no public runtime API changes.

Declarative binding and non-Reference delete lowering uses existing captured environment deletion and ordinary operand evaluation. Native property deletion retains its existing operations; no public runtime API changes.

Optional chains reuse existing ordinary property, captured environment Reference, call argument List and deletion operations through the canonical expression graph. Ordinary and resumable execution share operation emission; no public runtime API changes.

`tsc_value_tail_call(callee, receiver, arguments)` records a terminal ordinary-call request on the current canonical invocation and returns a placeholder consumed by the invocation loop. Generated strict tail returns and terminal native forwarding use this operation; it must not be used where source evaluation continues with the placeholder. The record retains decoded operand roots, materializes the actual argument List before handoff, and restores caller Realm/parse/environment context between iterations. Constructor invocation resolves a requested ordinary call before interpreting its result.

The String row in `tsc_global_bindings.def` supplies the primitive-conversion normal-result trait used by compiler source admission. Primitive conversion and prefix facts use the shared dependency tree; immutable global data facts follow the same binding attributes. Native String/number conversion operations and public runtime APIs are unchanged.
Callable source metadata and source admission share `src/callable-source-text.ts`, which extracts an available JavaScript definition span. Source-analysis callable owners inherit the toString identity through their prototype cells, and bound invocation records preserve the bound receiver. Dynamic Function factory analysis uses the anonymous display source installed by the existing runtime path. This change adds no public runtime API.
Source admission represents classes as callable definitions with constructor activation and ordinary prototype cells. Static inheritance and instance prototype reads use the shared property worklist and own-property presence cells. Default instance prototype parents retain an opaque Object identity; extends null retains null. Source mutations wait for the enclosing activation, and instance initializers use constructor activation; unresolved inactive-body facts do not poison global bindings. Ordinary construction and Reflect.construct preserve the Object result category and omit primitive constructor returns. Native class SourceText metadata and public APIs are unchanged.

Protected completion planning retains automatic binding cells. Native static file/namespace bindings keep their existing static storage and lexical/root metadata. Namespace qualification resolves to the same symbol-backed storage for reads and writes; calls cross the shared callable-value argument List and existing native ABI adapters. No public runtime API changes.

Public instance-field source values now attach to constructed receiver owners through the class-member collection. Default derived constructors forward the actual argument List through the shared invocation worklist; delegation remains reactive when heritage facts arrive later. Explicit super calls use the same base target and receiver cells. Object.prototype methods come from `runtime/tsc_object_prototype_methods.def` for both native descriptors and source identities, replacing opaque default-prototype facts and fixed native installation calls. Proven abrupt callable outcomes contribute no normal source choice, and private field reads remain unknown. Pending AOT eval/Function expansions retain a distinct graph fact: downstream reads/calls propagate it without inventing opaque prototype effects, and source admission stays incomplete until expansion resolves. `instance-field-source.property` compares generated semantic partitions with independent Node facts and native GC/no-GC observations, including one deep inheritance graph; `eval_instance_field_source` checks nested CLI eval closure. Complete private fields, constructor replacement/newTarget, opaque-effect precision and eligible exhaustive target coverage remain open.

Getter property reads now connect the canonical owner/prototype lookup to the getter activation cell. The read rule watches its enclosing activation and publishes getter activity only when that source activation can run, retaining shared receiver, return and throw cells. Active getter mutations therefore participate in finite eval admission; reads in inactive functions do not taint source identities. `getter-source-effects.property` compares generated semantic partitions with independent Node facts and native observations in both memory modes, including one deep getter activation graph; `eval_getter_source_effects` checks the CLI source registry. Complete descriptor/coercion/private effects, lexical/eval partitions and eligible exhaustive target coverage remain open.

Local class declarations now enter the canonical retained-binding collection before class members are visited. Direct eval aliases the same boxed value, decoded root and initialization cells used by closures and lexical reads, even when no member body explicitly captures the declaration. The shared declaration traversal supplies bindings independently of class/member cardinality. `local-class-eval-bindings.property` compares independent Node results with native GC/no-GC observations for read/write identity, TDZ, escaped and per-iteration cells, immutable inner names and one deep retained binding collection. `eval_local_class_bindings` checks the formerly rejected CLI case, and getter-effect native partitions again run in their original local block scopes. Complete lexical/eval/constructor/private/Realm partitions and eligible exhaustive target coverage remain open.

Setter source effects now use canonical accessor records and the same invocation worklist as ordinary calls. Property writes follow the owner/prototype graph, preserve the actual receiver and RHS argument, activate reachable setter bodies and route their throws; data definition and deletion bypass setter invocation. Descriptor-defined and bound accessors, global identifier accessors and indirect eval through a setter use these shared edges. Active opaque calls and unrepresented private effects invalidate affected source facts conservatively. `setter-source-effects.property` compares generated semantic partitions with independent Node results and native observations in both memory modes, including one deep setter activation graph; `eval_setter_source_effects` checks CLI source closure. Complete descriptor attributes, coercion, spread/private effects and eligible exhaustive target coverage remain open.

Own descriptor source results now project the canonical owner fields, accessor records and presence cells through one reactive collection. `Object.getOwnPropertyDescriptor`, `Reflect.getOwnPropertyDescriptor` and `Object.getOwnPropertyDescriptors` retain represented data/get/set callable identities without invoking accessors; ordinary call adapters retain their receiver and argument edges. Array indices and intrinsic operation fields now publish their own presence through the shared definition helper. Unrepresented spread, key coercion, exact descriptor attribute values and intrinsic/exotic own-key metadata remain incomplete rather than proving a finite source. `source-descriptor-facts.property` compares generated semantic partitions with independent Node observations and native GC/no-GC results, including one deep owner projection graph; `eval_source_descriptors` checks CLI source closure. Complete descriptor/private/coercion semantics and eligible exhaustive target coverage remain open.

Returned descriptor flags now carry one shared Boolean normal-result cell in source admission. The data-descriptor writable field and every returned enumerable/configurable field retain the Boolean domain independently of their exact attribute values, so non-String eval preserves them. Later writes to the returned ordinary descriptor still contribute String or unresolved facts through the same owner graph. `source-descriptor-facts.property` compares generated data/accessor/default/explicit attribute partitions with independent Node observations and native results in both memory modes; the existing deep owner projection also checks a returned flag. `eval_source_descriptors` verifies the CLI path. Exact attribute values, intrinsic/exotic own-key metadata, coercion/private semantics and eligible exhaustive target coverage remain open.

Callable length metadata now uses the canonical ordered parameter prefix through `expectedArgumentCount`, shared by source admission and native callable/class boxing. The emitter-only predecessor is removed. Function/class owners retain length in ordinary property cells; bound owners derive non-negative length from the same actual List and reactive own-property lookup, preserving metadata getter activation and throws. Name lookup also participates in binding effects, and opaque bound-target effects remain incomplete. `callable-length-facts.property` compares generated formal, descriptor, binding and scalar partitions with independent Node/native observations in both memory modes, including one deep bound forwarding graph; `eval_callable_length` checks source closure and erased TypeScript this parameters. Exact name/attribute/exotic metadata, typed-source erasure and eligible exhaustive target coverage remain open. CommonJS require-alias classification now reuses declaration-identity facts and avoids rescanning the resolved declaration through a name fallback; the deep native bound graph exposed and verifies this repair.

Callable name facts now share one syntactic SetFunctionName input calculation between source admission and native boxing; the emitter-only predecessor is removed. Ordinary function/class/accessor owners retain names in the property graph, and bound owners derive the bound prefix from reactive target name cells, including non-String fallback and getter effects/throws. `callable-name-facts.property` compares generated naming, descriptor and override partitions with independent Node/native observations and one deep bound graph in both memory modes; `eval_callable_name` verifies CLI source closure. Dynamic/private/Symbol name keys, exact attributes, typed-source erasure and eligible exhaustive target coverage remain open.

Assignment callable names now follow the shared NamedEvaluation calculation. One canonical assignment-production set links identifier naming with ordinary and logical assignment source-flow writes and result cells; logical writes use the existing binding/property assignment path. Parenthesized and member references do not infer names, while explicit names and existing value identities are retained. `assignment-callable-name.property` compares generated reference, initializer, default, explicit-name and alias partitions with independent Node/native observations, plus one deep bound owner graph in both memory modes; `eval_assignment_callable_name` checks the CLI path. Dynamic/private/Symbol name keys, exact attributes, coercion and eligible exhaustive target coverage remain open.

Computed property source reads now share one primitive ToPropertyKey projection with writes and single-property reflection, replacing separate conversion logic. Mutable and destructured aliases use the canonical assignment-target tree; ordinary/logical/compound assignments, increment/decrement and property deletion now retain write and accessor effects through the existing property path. Pending key dependencies defer projection until AOT source expansion resolves them; registered invalid eval sources contribute abrupt results and exception facts. Unresolved numeric mutation, iteration/rest keys and coercion remain closed instead of admitting stale literal sources. `computed-property-source.property` compares generated primitive, alias, descriptor and accessor partitions with independent Node/native observations and one deep key forwarding graph in both memory modes; `eval_computed_property_source` checks CLI execution. Dynamic definitions, Symbol/private keys, exact attributes and eligible exhaustive target coverage remain open.

Computed object and class definitions now use the shared reactive primitive ToPropertyKey projection, including methods, accessors and field templates. One syntactic callable-name input feeds both source admission and native naming; computed object members use the evaluated key before initializer evaluation, preserving explicit names and early anonymous-class naming. Definition dependencies defer reads and reflection until their keys are published. `computed-definition-source.property` compares generated key, naming, mutable-alias and accessor-effect partitions with independent Node/native observations and one deep forwarding graph in both memory modes; `eval_computed_definition_source` checks CLI source closure. Symbol/private keys, user coercion, exact attributes, typed-source erasure and eligible exhaustive target coverage remain open.

Ordinary object property-key coercion now follows one reactive string-hint method worklist through the existing property lookup, getter activation, receiver and call graph. Primitive results stop conversion; non-callable methods and object results advance to the next method. Source reads, writes, definitions and single-property reflection consume the same conversion facts, including method/getter throws and effects; known coercions no longer acquire an artificial unknown exception from the raw Object operand. `property-key-coercion-source.property` compares generated receiver, alias, primitive, fallback, effect, exception and ordering partitions with independent Node/native observations and one deep prototype graph in both memory modes; `eval_property_key_coercion_source` checks typed CLI source closure. Opaque shapes, Symbol hooks, other coercion hints, exact descriptors, typed-source erasure and eligible exhaustive target coverage remain open.

String-hint source conversion now shares one reactive primitive/text projection across computed keys, String call/construction, dynamic-function argument Lists and host source operations. The former primitive-only String text operation is deleted. Dynamic-function arguments advance through one ordered conversion worklist; known receivers, fallback methods, getter/method effects and thrown source values use the existing call graph. Direct eval retains non-String values, while source operations requiring ToString consume converted cells. Host print conversion does not invent unknown exceptions for already-abrupt arguments. `string-hint-source.property` compares generated conversion, forwarding, source-operation, effect, exception and ordering partitions with independent Node/native observations and one high-depth argument List in both memory modes; `eval_string_hint_source` checks typed CLI closure. Opaque shapes, Symbol conversion, other hints, exact completion precision, typed-source erasure and eligible exhaustive target coverage remain open.

Function body source facts now follow one canonical statement tree and iterative completion worklist instead of scanning for value-return syntax. Sequence, branch, loop, label, switch and try/finally composition retain normal fall-through, bare returns and abrupt-only outcomes; unreachable statements do not activate source effects, while hoisted function declarations remain available. Empty exception cells represent no thrown outcome. Ordered dynamic-function conversion stops after an abrupt argument, and pending eval results stay pending through shared String/print conversion rather than becoming unknown. `function-body-completion-source.property` compares generated semantic partitions with independent Node/native observations and one deep statement tree in both memory modes; `eval_function_body_completion_source` checks typed CLI closure. Correlated branch precision, general expression/completion values, opaque coercion, typed-source erasure and eligible exhaustive target coverage remain open.

Source properties now share one String-or-Symbol key collection across computed definitions, reads, writes, binding trees and descriptor projection. The native well-known Symbol descriptor table supplies canonical identities; registry keys retain identity, and fresh allocation-site Symbols retain possible absence so repeated calls cannot prove equality. ToPrimitive looks up Symbol.toPrimitive through the same getter, receiver and call graph before ordinary string-hint methods; null/undefined hooks fall back, invalid hooks/results are abrupt, and throws/effects remain ordered. Accessor absence is sealed after graph dependencies settle. String calls preserve direct Symbol descriptive conversion, while abstract ToString, concatenation and templates exclude Symbol normal results. `symbol-key-source.property` compares generated identity, naming, descriptor, binding, hook and exception partitions with independent Node/native observations and one deep prototype tree in both memory modes; `eval_symbol_key_source` checks typed CLI closure. Opaque shapes, private keys, correlated fresh identity precision, other coercion hints, exact descriptors, typed-source erasure and eligible exhaustive target coverage remain open.
