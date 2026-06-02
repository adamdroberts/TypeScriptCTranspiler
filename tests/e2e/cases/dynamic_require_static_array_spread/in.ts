// @ts-nocheck: dynamic require proof coverage intentionally exercises static array spreads.
const prefix = ["./", "spread"] as const;
const suffix = ["_a", ""] as const;
const firstPair = ["./spread_a", "./spread_b"] as const;
const secondPair = ["./spread_c", "./spread_d"] as const;

const joined = require([...prefix, ...suffix].join(""));
const indexed = require([...firstPair, ...secondPair][1]);
const last = require([...firstPair, ...secondPair].at(-2));

console.log(joined.label, indexed.label, last.label);
