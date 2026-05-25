const VOID = void 0;

// @ts-ignore: intentional always-falsy static-analysis probe.
const unused_void_bool = void 0 ? "dead_void_truthy" : "dead_void_falsy";
// @ts-ignore: intentional nullish static-analysis probe.
const unused_void_nullish = (void 0 as string | undefined) ?? "dead_void_nullish_fallback";
console.log("live static void");
