const choose = Date.now() >= 0;

const primaryName = choose ? "./logical_or_a" : "./logical_or_b";
const logicalOrName = primaryName || "./logical_or_fallback";
const logicalOr: any = require(logicalOrName);
console.log("logical or:", logicalOr.name);

const gateName = choose ? "./logical_and_gate_a" : "./logical_and_gate_b";
const logicalAndName = gateName && "./logical_and_value";
const logicalAnd: any = require(logicalAndName);
console.log("logical and:", logicalAnd.name);

const emptyName = "";
const logicalFallbackName = emptyName || "./logical_empty_fallback";
const logicalFallback: any = require(logicalFallbackName);
console.log("logical fallback:", logicalFallback.name);
