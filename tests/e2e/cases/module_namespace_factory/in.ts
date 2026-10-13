import * as root from "./root";
import * as again from "./root";
import * as leaf from "./leaf";
import data from "./data.json" with { type: "json" };
import * as json from "./data.json" with { type: "json" };
const jsonNamespace: any = json;

console.log("root:", root === again);
console.log("cycle:", root.next === root.alias, root.next.root === root);
console.log("json:", leaf.data === data, leaf.json === json, jsonNamespace.default === data);
console.log("names:", Object.keys(root).join("|"));
leaf.increment();
console.log("live:", root.next.value);
async function resumed() {
    await 0;
    console.log("retained:", root.next === leaf, root.next.value);
}
resumed();
