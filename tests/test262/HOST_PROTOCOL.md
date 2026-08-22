# Test262 host protocol

`run.ts` owns pin verification, Test262 discovery, YAML parsing, edition classification, strict/sloppy/module/raw scenario expansion, harness ordering, sharding, timeouts, result-set identity, and exact negative-result judging. A host owns only faithful execution in generated C and the tsc2c runtime.

The host executable must support two calls:

- `HOST ... --describe` prints one JSON `HostDescription` matching the reviewed `compliance/ecmascript-2026/host-profile.json` exactly.
- `HOST ... --request FILE` reads one JSON `HostRequest` from the named runner-owned temporary file and prints one JSON `HostObservation` to stdout.

For a claim-eligible profile, the host must evaluate each `setupScripts` entry as a separate global Script, in order, in one fresh Realm; then evaluate `testSource` as the root named by `testPath` with the requested Script or Module goal. It must not concatenate or wrap these sources. `raw` requests have no setup scripts and the test source is byte-for-byte unchanged, while host-defined `print` and `$262` bindings still exist out of band.

For Module-goal and dynamic-import scenarios, `moduleFiles` is the complete pinned sibling-resource directory derived from the independently verified Test262 Git tree. It includes JavaScript and non-JavaScript resources and may include files whose names do not contain `_FIXTURE`; those files are dependencies, never extra standalone scenarios in this request. Resolve every Test262 `./name` specifier against `moduleBasePath` and only to the exact supplied path. The root `testPath` is supplied separately as `testSource`. A missing supplied path is a resolution failure, and the host must not read alternate module sources from the ambient filesystem. If a future pin introduces query/fragment module identities, the runner protocol must be revised and self-tested before that pin is accepted; the current pinned corpus has no such relative specifier.

The host reports observations, not pass/fail. A throw must identify the exact `parse`, `resolution`, or `runtime` phase and the thrown value's constructor name. Unsupported compiler diagnostics are `unsupported`; they never satisfy negative tests. Async `normal` is valid only after the `$DONE` print protocol reports completion. The host must configure the current Agent Record's `[[CanBlock]]` value from `canBlock` when it is non-null. A timeout, crash, missing host hook, or unclassifiable result is explicit and claim-blocking.

The current `diagnostic-host.ts` deliberately reports an infrastructure error. Changing `claimEligible` to true requires implementing and independently testing every capability in the baseline. Executing the tested semantics in embedded Node, another JavaScript engine, or an unsafe-eval fallback is semantic delegation and is forbidden as conformance evidence.
