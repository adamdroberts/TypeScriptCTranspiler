# Property evidence

Add compact semantic-partition specifications as `*.property.test.ts`. `run.ts` discovers every such file recursively and fails when none exist, so an empty suite cannot satisfy the ECMAScript claim gate.

Each terminal matrix partition must reference the exact property specification that exercises its canonical collection, tree, graph, or worklist. An authored finite/unbounded label never changes that obligation. Property evidence is distinct from the generated representative stress cases under `tests/e2e/cases/`.

`async-cfg.property.test.ts` is the first architectural specification: it generates recursive combinations of statement and expression partitions, independently reconstructs the returned edge graph, and checks closure, reachability, one suspension owner per source `await`, and fail-closed rejection. It establishes the property gate itself; it is not clause evidence until an exact terminal clause partition reciprocally registers it with distinct stress and implementation evidence.

`call-activation.property.test.ts` generates JavaScript formal/actual argument plans and independently models expected argument counts, default initialization, mapped versus unmapped parameter writes, excess arguments, abrupt nested calls, and lexical arrow access. One representative wide input exercises the same activation worklist as a stress guard; its size is not used as completion evidence.

`script-global-binding.property.test.ts` generates Script binding plans and independently checks bidirectional identifier/property reflection, descriptors, updates, declaration instantiation, lexical non-reflection, and function `this` normalization against one canonical global-object environment. One representative deeply nested `var` guards the same source-tree worklist; its depth is not completion evidence. This remains architectural evidence until exact terminal clause partitions reciprocally register distinct implementation, generated-regression, stress, and E2E artifacts.
