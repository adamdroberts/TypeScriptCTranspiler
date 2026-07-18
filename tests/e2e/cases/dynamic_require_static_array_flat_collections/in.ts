const defaultSource: any[] = ["head", ["middle"]];
const explicitSource: any[] = [["deep", ["value"]]];
const zeroSource: any[] = [["kept"]];
const undefinedSource: any[] = [["undef"]];
const joinedSource: any[] = [["a"], ["b", ["c"]]];

const defaultDepth = require("./array_flat_" + defaultSource.flat()[1]);
const explicitDepth = require("./array_flat_" + explicitSource.flat(2)[1]);
const zeroDepth = require("./array_flat_zero_" + zeroSource.flat(0)[0][0]);
const undefinedDepth = require("./array_flat_" + undefinedSource.flat(undefined)[0]);
const joined = require("./array_flat_join_" + joinedSource.flat(2).join(""));
const entry = require("./array_flat_entry_" + Object.entries([["drop"], ["value"]].flat())[1][1]);
const composed = require("./array_flat_composed_" + Array.of(["old"]).concat([["new"]] as any).flat()[1]);

console.log(defaultDepth.label, explicitDepth.label, zeroDepth.label, undefinedDepth.label, joined.label, entry.label, composed.label);
