# Property evidence

Add compact semantic-partition specifications as `*.property.test.ts`. `run.ts` discovers every such file recursively and fails when none exist, so an empty suite cannot satisfy the ECMAScript claim gate.

Each terminal matrix partition must reference the exact property specification that exercises its canonical collection, tree, graph, or worklist. An authored finite/unbounded label never changes that obligation. Property evidence is distinct from the generated representative stress cases under `tests/e2e/cases/`.
