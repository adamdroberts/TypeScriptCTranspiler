import undefined from "./value.json" with { type: "json" };
import NaN from "./value.json" with { type: "json" };
import Promise from "./text.json" with { type: "json" };
import { customMath as Math } from "./owner";
import * as namespace from "./value.json" with { type: "json" };
const namespaceValue: any = namespace;

console.log(undefined === 262, typeof undefined);
console.log(Number.isNaN(NaN), NaN === namespaceValue.default);
console.log(Math.floor(1));
console.log(Promise);
